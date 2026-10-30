import re
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


RE_TOP_TAKEAWAYS_HEADER = re.compile(
    r"\b(top\s+(?:10\s+)?take[\-\s]home\s+messages|key\s+clinical\s+takeaways|take[\-\s]home\s+messages)\b",
    re.IGNORECASE,
)

RE_HIGH_IMPACT_HEADER = re.compile(
    r"\b(what\s+is\s+new(\s+and\s+of\s+high\s+impact)?|practice[\-\s]changing\s+recommendations?|table\s+3[\s\S]{0,30}what\s+is\s+new)\b",
    re.IGNORECASE,
)


def extract_top_takeaways_from_doc(doc: pymupdf.Document) -> List[str]:
    """
    Quét 6 trang đầu để bóc tách Top 10 Take-Home Messages hoặc Key Messages từ văn bản gốc.
    """
    takeaways: List[str] = []
    max_scan_pages = min(6, doc.page_count)

    for p_idx in range(max_scan_pages):
        text = doc[p_idx].get_text("text")
        match = RE_TOP_TAKEAWAYS_HEADER.search(text)
        if match:
            start_pos = match.start()
            section_text = text[start_pos:]
            # Tìm danh sách đánh số 1. ... 2. ...
            raw_items = re.findall(r"(?:^|\n)\s*(\d+)\.\s+([\s\S]+?)(?=\n\s*\d+\.|\n\s*[A-Z\s]{4,}:?|\Z)", section_text)
            for num, item_txt in raw_items:
                clean_txt = " ".join(item_txt.split()).strip()
                clean_txt = clean_txt.replace("\x08", "").replace("\u2003", " ").replace("\u2002", " ")
                if len(clean_txt) > 20:
                    takeaways.append(f"{num}. {clean_txt}")
            if takeaways:
                break

    return takeaways


class ExtractCore(BaseCore):
    """
    Lõi Bóc tách & Phân tích Cấu trúc (ExtractCore).
    Đặc tính nâng cấp cho bài toàn văn:
    - Bóc tách 3 tầng: Tầng 1 (Top Takeaways), Tầng 2 (Bảng What Is New / High Impact), Tầng 3 (Bảng khuyến cáo chuyên đề).
    - Phối hợp PyMuPDF text layout siêu tốc và pdfplumber có chọn lọc trên các trang trọng điểm.
    - Chống tràn bộ nhớ khi xử lý tài liệu 100+ trang.
    """

    name: str = "extract"
    version: str = "2.0.0"

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

        # 2. Quét nhanh bằng PyMuPDF để lọc Candidate Pages và bóc Top Takeaways
        try:
            doc = pymupdf.open(str(file_path))
            total_pages = doc.page_count
        except Exception as e:
            raise CoreException(
                code="PYMUPDF_OPEN_ERROR",
                message=f"Lỗi khi mở tài liệu PDF bằng PyMuPDF: {str(e)}",
                retryable=False,
            )

        # Bóc Tầng 1: Top Takeaways
        top_takeaways = extract_top_takeaways_from_doc(doc)

        candidate_page_indices: List[int] = []
        high_impact_page_indices: List[int] = []
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
            natural_text = page.get_text("text").strip()

            # Nhận diện trang What is new / High impact
            if RE_HIGH_IMPACT_HEADER.search(natural_text):
                high_impact_page_indices.append(page_num)

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

        # Đảm bảo các trang High-Impact nằm trong danh sách Candidate Pages
        for hi_p in high_impact_page_indices:
            if hi_p not in candidate_page_indices:
                candidate_page_indices.append(hi_p)
                candidate_page_indices.sort()
                page_system_map[hi_p] = GradingSystemType.AHA_ACC
                page_signals_map[hi_p] = ["AHA_WHAT_IS_NEW"]

        # 3. Dùng pdfplumber có chọn lọc: ưu tiên các trang bảng High-Impact hoặc mẫu ngắn
        # Để bảo toàn tốc độ trên tài liệu 100+ trang
        extracted_candidate_pages: List[CandidatePage] = []

        # Chỉ áp dụng pdfplumber cho tối đa 15 trang bảng then chốt để đảm bảo hiệu năng
        plumber_target_pages = set(high_impact_page_indices + candidate_page_indices[:12])

        tables_by_page: Dict[int, List[ExtractedTable]] = {}
        if plumber_target_pages:
            try:
                with pdfplumber.open(str(file_path)) as plumber_pdf:
                    for p_num in plumber_target_pages:
                        if p_num > len(plumber_pdf.pages):
                            continue
                        plumber_page = plumber_pdf.pages[p_num - 1]
                        raw_tables = plumber_page.extract_tables() or []

                        if not raw_tables:
                            try:
                                text_tables = plumber_page.extract_tables(table_settings={
                                    "vertical_strategy": "text",
                                    "horizontal_strategy": "text",
                                    "snap_tolerance": 5,
                                    "join_tolerance": 5,
                                })
                                if text_tables:
                                    raw_tables = [t for t in text_tables if t and len(t[0]) >= 2]
                            except Exception:
                                pass

                        tables_list: List[ExtractedTable] = []
                        for t_idx, raw_table in enumerate(raw_tables):
                            if not raw_table or len(raw_table) < 1:
                                continue

                            cleaned_rows = [
                                [cell.strip() if cell else "" for cell in row]
                                for row in raw_table
                                if any(cell and cell.strip() for cell in row)
                            ]
                            if not cleaned_rows:
                                continue

                            headers = cleaned_rows[0]
                            data_rows = cleaned_rows[1:] if len(cleaned_rows) > 1 else []

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
                        if tables_list:
                            tables_by_page[p_num] = tables_list
            except Exception:
                # Nếu pdfplumber lỗi, vẫn tiếp tục với PyMuPDF text
                pass

        for p_num in candidate_page_indices:
            cand_page_obj = CandidatePage(
                page_num=p_num,
                grading_system=page_system_map.get(p_num, GradingSystemType.UNKNOWN),
                matched_signals=page_signals_map.get(p_num, []),
                extracted_tables=tables_by_page.get(p_num, []),
                page_text=page_texts.get(p_num, ""),
            )
            extracted_candidate_pages.append(cand_page_obj)

        output = ExtractOutput(
            file_id=input_data.file_id,
            total_pages=total_pages,
            candidate_page_count=len(extracted_candidate_pages),
            detected_grading_systems=list(all_detected_systems),
            top_takeaways=top_takeaways,
            high_impact_pages=high_impact_page_indices,
            candidate_pages=extracted_candidate_pages,
            state=DocumentLifecycleState.EXTRACTED,
        )

        return output.model_dump()
