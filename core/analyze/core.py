import re
from typing import Dict, Any, List, Optional, Tuple
from pydantic import BaseModel

from core.common.base import BaseCore
from core.common.contracts import (
    DocumentLifecycleState,
    CoreException,
    GradingSystemType,
    CandidatePage,
    AnalyzedRecommendation,
    AnalyzeInput,
    AnalyzeOutput,
)
from core.analyze.gemini_client import GeminiClient
from core.analyze.prompts import SYSTEM_INSTRUCTION, get_prompt_for_grading_system


def normalize_cor(cor_val: Optional[Any]) -> Tuple[Optional[str], Optional[str]]:
    """
    Chuẩn hóa nhãn COR về dạng chuẩn '1', '2a', '2b', '3' cùng nhãn cor_label.
    Chấp nhận: 'Class 1', 'Class I', 'I', '1', 'Class 2a', 'Class IIa', 'IIa', '3:Harm', '3: No Benefit', etc.
    """
    if not cor_val:
        return None, None
    s = str(cor_val).strip()
    s_low = s.lower()

    if "harm" in s_low:
        return "3", "Harm"
    if "no benefit" in s_low:
        return "3", "No Benefit"
    if re.search(r"\b(2a|iia)\b", s_low):
        return "2a", "Moderate"
    if re.search(r"\b(2b|iib)\b", s_low):
        return "2b", "Weak"
    if re.search(r"\b(3|iii)\b", s_low):
        return "3", "Harm / No Benefit"
    if re.search(r"\b(1|i)\b", s_low):
        return "1", "Strong"

    return s, None


def normalize_loe(loe_val: Optional[Any]) -> Tuple[Optional[str], Optional[str]]:
    """
    Chuẩn hóa LOE: 'Level B-R', 'B-R', 'BR' -> 'B-R'.
    """
    if not loe_val:
        return None, None
    s = str(loe_val).strip()
    s_clean = re.sub(r"^level\s+", "", s, flags=re.IGNORECASE).strip().upper()
    if s_clean in {"B-R", "BR"}:
        return "B-R", "Moderate Quality (RCT)"
    if s_clean in {"B-NR", "BNR"}:
        return "B-NR", "Moderate Quality (Non-RCT)"
    if s_clean in {"C-LD", "CLD"}:
        return "C-LD", "Limited Data"
    if s_clean in {"C-EO", "CEO"}:
        return "C-EO", "Expert Opinion"
    if s_clean == "A":
        return "A", "High Quality (Multiple RCTs)"
    if s_clean == "B":
        return "B", "Moderate Quality"
    if s_clean == "C":
        return "C", "Limited / Expert"
    return s_clean, None


class AnalyzeCore(BaseCore):
    """
    Lõi Phân tích & Trích xuất Khuyến cáo Bằng Google Gemini AI (AnalyzeCore).
    Đặc điểm:
    - Sử dụng mô hình thác nước (Waterfall Model) của Gemini.
    - Ép kiểu JSON schema 100%.
    - Phân biệt prompt chính xác giữa AHA (COR/LOE) và ESO (GRADE, Quality, Strength, Voting, PICO).
    - Chuẩn hóa đầu ra thành danh sách AnalyzedRecommendation độc lập.
    """

    name: str = "analyze"
    version: str = "1.0.0"

    def __init__(self, gemini_client: Optional[GeminiClient] = None):
        self.client = gemini_client or GeminiClient()

    def _execute(self, input_data: BaseModel) -> Dict[str, Any]:
        if not isinstance(input_data, AnalyzeInput):
            input_data = AnalyzeInput(**input_data.model_dump())

        if not input_data.candidate_pages:
            return AnalyzeOutput(
                file_id=input_data.file_id,
                total_recommendations=0,
                recommendations=[],
                total_tokens_used=0,
                model_used="none",
                state=DocumentLifecycleState.ANALYZED,
            ).model_dump()

        all_recommendations: List[AnalyzedRecommendation] = []
        total_tokens = 0
        last_model_used = "gemini"

        for page in input_data.candidate_pages:
            # 1. Chuẩn bị nội dung bóc tách từ trang
            content_parts: List[str] = []

            # Nếu có bảng có cấu trúc từ pdfplumber
            if page.extracted_tables:
                for tbl in page.extracted_tables:
                    if tbl.raw_markdown:
                        content_parts.append(f"### BẢNG CÓ CẤU TRÚC #{tbl.table_index}:\n{tbl.raw_markdown}")

            # Kết hợp với text layout của trang
            if page.page_text:
                content_parts.append(f"### VĂN BẢN TRANG {page.page_num}:\n{page.page_text}")

            combined_content = "\n\n".join(content_parts)
            if not combined_content.strip():
                continue

            # 2. Sinh prompt theo hệ thống phân loại của trang
            prompt = get_prompt_for_grading_system(
                system=page.grading_system,
                page_num=page.page_num,
                content=combined_content,
            )

            # 3. Gọi Gemini AI
            try:
                ai_response = self.client.generate_json(
                    prompt=prompt,
                    system_instruction=SYSTEM_INSTRUCTION,
                )
                last_model_used = ai_response.get("model", "gemini")
                total_tokens += ai_response.get("tokens_used", 0)
                parsed_json = ai_response.get("data", {})
            except Exception as e:
                # Nếu một trang lỗi mạng, wrap thành CoreException hoặc log
                raise CoreException(
                    code="AI_ANALYSIS_FAILED",
                    message=f"Lỗi khi gọi Gemini phân tích trang {page.page_num}: {str(e)}",
                    retryable=True,
                    details={"page_num": page.page_num, "grading_system": page.grading_system},
                )

            # 4. Chuẩn hóa dữ liệu khuyến cáo sang AnalyzedRecommendation
            raw_recs = parsed_json.get("recommendations", [])
            for r_idx, r in enumerate(raw_recs):
                rec_idx = r.get("rec_index", r_idx + 1)
                rec_id = f"{input_data.file_id[:8]}-P{page.page_num}-R{rec_idx}"

                # Chuẩn hóa nhãn COR và LOE nếu là AHA
                raw_cor = r.get("cor")
                norm_cor, cor_label = normalize_cor(raw_cor)

                raw_loe = r.get("loe")
                norm_loe, loe_label = normalize_loe(raw_loe)

                rec_obj = AnalyzedRecommendation(
                    rec_id=rec_id,
                    guideline_id=input_data.file_id,
                    grading_system=page.grading_system,
                    page_num=page.page_num,
                    is_high_impact_change=bool(r.get("is_high_impact_change", False)),
                    change_type=r.get("change_type"),
                    previous_grade=r.get("previous_grade"),
                    section=r.get("section"),
                    topic=r.get("topic"),
                    pico_id=r.get("pico_id"),
                    statement=r.get("statement", "").strip(),
                    cor=norm_cor,
                    cor_label=cor_label,
                    loe=norm_loe,
                    loe_label=loe_label,
                    quality_of_evidence=r.get("quality_of_evidence"),
                    strength_of_recommendation=r.get("strength_of_recommendation"),
                    consensus_statement=r.get("consensus_statement"),
                    voting=r.get("voting"),
                    target_population=r.get("target_population"),
                    action_type=r.get("action_type"),
                    driving_trials=r.get("driving_trials", []),
                    verbatim_quote=r.get("verbatim_quote"),
                    state=DocumentLifecycleState.ANALYZED,
                )

                if rec_obj.statement:  # Chỉ giữ các khuyến cáo có nội dung
                    all_recommendations.append(rec_obj)

        output = AnalyzeOutput(
            file_id=input_data.file_id,
            total_recommendations=len(all_recommendations),
            recommendations=all_recommendations,
            total_tokens_used=total_tokens,
            model_used=last_model_used,
            state=DocumentLifecycleState.ANALYZED,
        )

        return output.model_dump()
