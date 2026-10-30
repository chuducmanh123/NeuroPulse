from typing import Dict, Any, List, Optional
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

                # Chuẩn hóa nhãn COR nếu là AHA
                cor_val = r.get("cor")
                cor_label = None
                if cor_val:
                    cor_str = str(cor_val).strip()
                    if cor_str == "1":
                        cor_label = "Strong"
                    elif cor_str == "2a":
                        cor_label = "Moderate"
                    elif cor_str == "2b":
                        cor_label = "Weak"
                    elif cor_str == "3":
                        cor_label = "Harm / No Benefit"

                rec_obj = AnalyzedRecommendation(
                    rec_id=rec_id,
                    guideline_id=input_data.file_id,
                    grading_system=page.grading_system,
                    page_num=page.page_num,
                    section=r.get("section"),
                    topic=r.get("topic"),
                    pico_id=r.get("pico_id"),
                    statement=r.get("statement", "").strip(),
                    cor=str(r.get("cor")) if r.get("cor") else None,
                    cor_label=cor_label,
                    loe=str(r.get("loe")) if r.get("loe") else None,
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
