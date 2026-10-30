from pathlib import Path
from typing import Dict, Any, List, Optional
import pymupdf  # Quét nhanh trang và xử lý text layout theo block
import pdfplumber  # Bóc tách bảng đa cột có cấu trúc
from pydantic import BaseModel

from core.common.base import BaseCore
from core.common.contracts import (
    DocumentLifecycleState,
    CoreException,
    GradingSystemType,
    ExtractedTable,
    CandidatePage,
    ExtractInput,
    ExtractOutput,
)
from core.common.storage import StorageAdapter
from core.fetch.storage_adapter import LocalFileStorageAdapter
from core.extract.detector import is_recommendation_candidate_page


class ExtractCore(BaseCore):
    """
    Lõi Bóc tách & Phân tích Cấu trúc (ExtractCore).
    Đặc tính chuyên sâu:
    - Hỗ trợ đa hệ thống phân loại: AHA/ACC (COR/LOE), ESO (GRADE / Quality of Evidence / Consensus), AAN.
    - Lọc trang mục tiêu: Chỉ giữ lại các trang thực sự chứa khuyến cáo (tiết kiệm chi phí & tăng độ chính xác cho AI).
    - Phối hợp PyMuPDF (quét layout siêu tốc) + pdfplumber (bóc bảng chi tiết).
    """

    name: str = "extract"
    version: str = "1.0.0"

    def __init__(self, storage_adapter: Optional[StorageAdapter] = None):
        self.storage = storage_adapter or LocalFileStorageAdapter()

    def _execute(self, input_data: BaseModel) -> Dict[str, Any]:
        if not isinstance(input_data, ExtractInput):
            input_data = ExtractInput(**input_data.model_dump())

        # 1. Xác định đường dẫn file PDF
        file_path: Path
        if input_data.storage_path:
            file_path = Path(input_data.storage_path)
        else:
            try:
                path_str = self.storage.get_path_or_url(input_data.file_id, extension="pdf")
                file_path = Path(path_str)
            except Exception as e:
                raise CoreException(
                    code="FILE_NOT_FOUND_IN_STORAGE",
                    message=f"Không tìm thấy file {input_data.file_id} trong kho lưu trữ: {str(e)}",
                    retryable=False,
                )

        if not file_path.exists():
            raise CoreException(
                code="PDF_FILE_MISSING",
                message=f"Tệp PDF vật lý không tồn tại: {file_path}",
                retryable=False,
            )

        # 2. Quét nhanh toàn bộ tài liệu bằng PyMuPDF để lọc Candidate Pages
        try:
            doc = pymupdf.open(str(file_path))
            total_pages = doc.page_count
        except Exception as e:
            raise CoreException(
                code="PYMUPDF_OPEN_ERROR",
                message=f"Lỗi khi mở tài liệu PDF bằng PyMuPDF: {str(e)}",
                retryable=False,
            )

        candidate_page_indices: List[int] = []
        page_system_map: Dict[int, GradingSystemType] = {}
        page_signals_map: Dict[int, List[str]] = {}
        page_texts: Dict[int, str] = {}
        all_detected_systems = set()

        prev_is_cand = False
        prev_sys = GradingSystemType.UNKNOWN

        for idx in range(total_pages):
            page_num = idx + 1
            page = doc[idx]

            # Bóc tách text giữ nguyên thứ tự luồng đọc tự nhiên chuẩn đa cột của PyMuPDF
            # page.get_text("text") tự động phân tích layout và đọc hết cột 1 trước khi sang cột 2
            natural_text = page.get_text("text").strip()

            is_cand, grad_sys, signals = is_recommendation_candidate_page(
                natural_text,
                prev_page_is_candidate=prev_is_cand,
                prev_system=prev_sys,
            )
            if is_cand:
                candidate_page_indices.append(page_num)
                page_system_map[page_num] = grad_sys
                page_signals_map[page_num] = signals
                page_texts[page_num] = natural_text
                all_detected_systems.add(grad_sys)
                prev_is_cand = True
                prev_sys = grad_sys
            else:
                prev_is_cand = False
                prev_sys = GradingSystemType.UNKNOWN

        doc.close()

        # 3. Dùng pdfplumber trích xuất bảng có cấu trúc cho các Candidate Pages
        extracted_candidate_pages: List[CandidatePage] = []

        if candidate_page_indices:
            try:
                with pdfplumber.open(str(file_path)) as plumber_pdf:
                    for p_num in candidate_page_indices:
                        plumber_page = plumber_pdf.pages[p_num - 1]
                        # 1. Thử bóc theo đường kẻ vector mặc định
                        raw_tables = plumber_page.extract_tables() or []

                        # 2. Nếu không thấy bảng (do AHA dùng màu nền ô thay vì đường kẻ), thử trích xuất theo text-alignment
                        if not raw_tables:
                            try:
                                text_tables = plumber_page.extract_tables(table_settings={
                                    "vertical_strategy": "text",
                                    "horizontal_strategy": "text",
                                    "snap_tolerance": 5,
                                    "join_tolerance": 5,
                                })
                                if text_tables:
                                    # Chỉ nhận bảng nếu có ít nhất 2 cột
                                    raw_tables = [t for t in text_tables if t and len(t[0]) >= 2]
                            except Exception:
                                pass

                        tables_list: List[ExtractedTable] = []
                        for t_idx, raw_table in enumerate(raw_tables):
                            if not raw_table or len(raw_table) < 1:
                                continue

                            # Lọc dòng trống
                            cleaned_rows = [
                                [cell.strip() if cell else "" for cell in row]
                                for row in raw_table
                                if any(cell and cell.strip() for cell in row)
                            ]
                            if not cleaned_rows:
                                continue

                            headers = cleaned_rows[0]
                            data_rows = cleaned_rows[1:] if len(cleaned_rows) > 1 else []

                            # Tạo markdown table view
                            md_lines = [
                                "| " + " | ".join(headers) + " |",
                                "| " + " | ".join(["---"] * len(headers)) + " |",
                            ]
                            for r in data_rows:
                                md_lines.append("| " + " | ".join(r) + " |")
                            table_md = "\n".join(md_lines)

                            tables_list.append(
                                ExtractedTable(
                                    table_index=t_idx + 1,
                                    page_num=p_num,
                                    headers=headers,
                                    rows=data_rows,
                                    raw_markdown=table_md,
                                )
                            )

                        cand_page_obj = CandidatePage(
                            page_num=p_num,
                            grading_system=page_system_map.get(p_num, GradingSystemType.UNKNOWN),
                            matched_signals=page_signals_map.get(p_num, []),
                            extracted_tables=tables_list,
                            page_text=page_texts.get(p_num, ""),
                        )
                        extracted_candidate_pages.append(cand_page_obj)
            except Exception as e:
                raise CoreException(
                    code="PDFPLUMBER_EXTRACTION_ERROR",
                    message=f"Lỗi khi trích xuất bảng từ pdfplumber: {str(e)}",
                    retryable=False,
                )

        output = ExtractOutput(
            file_id=input_data.file_id,
            total_pages=total_pages,
            candidate_page_count=len(extracted_candidate_pages),
            detected_grading_systems=list(all_detected_systems),
            candidate_pages=extracted_candidate_pages,
            state=DocumentLifecycleState.EXTRACTED,
        )

        return output.model_dump()
