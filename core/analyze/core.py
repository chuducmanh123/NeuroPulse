import re
import time
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
from core.analyze.prompts import (
    SYSTEM_INSTRUCTION,
    get_prompt_for_grading_system,
    get_prompt_for_batch,
)


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
    Đặc tính nâng cấp cho bài toàn văn:
    - Cơ chế Batch Chunking (3–5 trang/lô): Giảm số lần gọi AI gấp 4 lần, chống nghẽn Rate-limit.
    - Phân lô ưu tiên: Tách riêng bảng High-Impact (What Is New) và các nhóm khuyến cáo chuyên đề.
    - Chuẩn hóa đầu ra thành danh sách AnalyzedRecommendation độc lập.
    - Ép kiểu JSON schema 100% với cơ chế thử lại (Exponential Backoff).
    """

    name: str = "analyze"
    version: str = "2.0.0"

    def __init__(self, gemini_client: Optional[GeminiClient] = None, batch_size: int = 3):
        self.client = gemini_client or GeminiClient()
        self.batch_size = max(1, batch_size)

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

        # 1. Phân nhóm trang ứng viên thành các Batch
        # Ưu tiên: Tách các trang High-Impact (What is new) thành một batch riêng biệt
        high_impact_batch: List[CandidatePage] = []
        regular_pages: List[CandidatePage] = []

        for p in input_data.candidate_pages:
            is_hi = any("WHAT_IS_NEW" in sig for sig in p.matched_signals) or "what is new" in p.page_text.lower()
            if is_hi:
                high_impact_batch.append(p)
            else:
                regular_pages.append(p)

        batches: List[Tuple[List[CandidatePage], bool]] = []
        if high_impact_batch:
            batches.append((high_impact_batch, True))

        # Chia các trang thường thành các batch theo batch_size
        for i in range(0, len(regular_pages), self.batch_size):
            chunk = regular_pages[i : i + self.batch_size]
            batches.append((chunk, False))

        # 2. Xử lý từng batch qua Gemini AI
        for batch_pages, is_hi_batch in batches:
            if not batch_pages:
                continue

            # Chuẩn bị nội dung tổng hợp của cả batch
            content_parts: List[str] = []
            page_nums: List[int] = []
            primary_sys = batch_pages[0].grading_system

            for p in batch_pages:
                page_nums.append(p.page_num)
                # Bảng có cấu trúc
                if p.extracted_tables:
                    for tbl in p.extracted_tables:
                        if tbl.raw_markdown:
                            content_parts.append(f"### [TRANG {p.page_num}] BẢNG CÓ CẤU TRÚC #{tbl.table_index}:\n{tbl.raw_markdown}")
                # Văn bản trang
                if p.page_text:
                    content_parts.append(f"### [TRANG {p.page_num}] VĂN BẢN GỐC:\n{p.page_text}")

            combined_content = "\n\n".join(content_parts)
            if not combined_content.strip():
                continue

            # Sinh prompt tối ưu theo batch
            if len(page_nums) == 1 and not is_hi_batch:
                prompt = get_prompt_for_grading_system(
                    system=primary_sys,
                    page_num=page_nums[0],
                    content=combined_content,
                )
            else:
                prompt = get_prompt_for_batch(
                    system=primary_sys,
                    page_nums=page_nums,
                    content=combined_content,
                    is_high_impact_batch=is_hi_batch,
                )

            # Gọi Gemini AI kèm cơ chế thử lại (Retry with Backoff)
            max_retries = 2
            parsed_json = {}
            for attempt in range(max_retries):
                try:
                    ai_response = self.client.generate_json(
                        prompt=prompt,
                        system_instruction=SYSTEM_INSTRUCTION,
                    )
                    last_model_used = ai_response.get("model", "gemini")
                    total_tokens += ai_response.get("tokens_used", 0)
                    parsed_json = ai_response.get("data", {})
                    break
                except Exception as e:
                    if attempt < max_retries - 1:
                        time.sleep(1.5 * (attempt + 1))
                        continue
                    # Nếu thử lại vẫn thất bại, ném ngoại lệ có cấu trúc
                    pages_str = ", ".join(str(p) for p in page_nums)
                    raise CoreException(
                        code="AI_ANALYSIS_FAILED",
                        message=f"Lỗi khi gọi Gemini phân tích lô trang ({pages_str}): {str(e)}",
                        retryable=True,
                        details={"pages": page_nums, "grading_system": primary_sys},
                    )

            # 3. Chuẩn hóa dữ liệu khuyến cáo sang AnalyzedRecommendation
            raw_recs = parsed_json.get("recommendations", [])
            for r_idx, r in enumerate(raw_recs):
                rec_page = r.get("page_num", page_nums[0])
                rec_idx = r.get("rec_index", r_idx + 1)
                rec_id = f"{input_data.file_id[:8]}-P{rec_page}-R{rec_idx}"

                raw_cor = r.get("cor")
                norm_cor, cor_label = normalize_cor(raw_cor)

                raw_loe = r.get("loe")
                norm_loe, loe_label = normalize_loe(raw_loe)

                # Xác định is_high_impact_change
                is_high_impact = is_hi_batch or bool(r.get("is_high_impact_change", False))
                change_type = r.get("change_type")
                if is_high_impact and not change_type:
                    change_type = "UPGRADED" if norm_cor in ["1", "2a"] else "REVISED"

                rec_obj = AnalyzedRecommendation(
                    rec_id=rec_id,
                    guideline_id=input_data.file_id,
                    grading_system=primary_sys,
                    page_num=rec_page,
                    is_high_impact_change=is_high_impact,
                    change_type=change_type or "STANDARD",
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

                if rec_obj.statement and len(rec_obj.statement) > 10:
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
