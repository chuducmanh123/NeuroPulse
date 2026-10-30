from typing import Dict, Any, List
from pydantic import BaseModel

from core.common.base import BaseCore
from core.common.contracts import (
    DocumentLifecycleState,
    VerificationStatus,
    RecommendationVerificationDetail,
    VerifiedRecommendation,
    VerifyInput,
    VerifyOutput,
)
from core.verify.rules import verify_grounding, verify_classification, verify_numerical_values


class VerifyCore(BaseCore):
    """
    Lõi Kiểm chứng Độc lập (VerifyCore).
    Chốt chặn an toàn y khoa:
    - 100% Code logic thuần túy (Rule-based), không phụ thuộc vào LLM.
    - Đối chiếu văn bản gốc (Grounding provenance) để loại bỏ hoàn toàn hallucination.
    - Kiểm tra tính hợp lệ của thang đo COR/LOE và Quality/Strength/Voting.
    - Phát hiện các sai lệch số liệu lâm sàng (ngưỡng thời gian, liều thuốc, huyết áp).
    """

    name: str = "verify"
    version: str = "1.0.0"

    def _execute(self, input_data: BaseModel) -> Dict[str, Any]:
        if not isinstance(input_data, VerifyInput):
            input_data = VerifyInput(**input_data.model_dump())

        # Tạo tra cứu văn bản gốc theo số trang
        page_text_map: Dict[int, str] = {
            cp.page_num: cp.page_text for cp in input_data.candidate_pages
        }

        verified_recs: List[VerifiedRecommendation] = []
        passed_count = 0
        warning_count = 0
        failed_count = 0

        for rec in input_data.recommendations:
            page_text = page_text_map.get(rec.page_num, "")
            issues: List[str] = []

            # 1. Kiểm tra Grounding với văn bản gốc
            grounding_score, g_issues = verify_grounding(
                statement=rec.statement,
                verbatim_quote=rec.verbatim_quote or "",
                page_text=page_text,
            )
            issues.extend(g_issues)

            # 2. Kiểm tra tính hợp lệ của hệ thống phân loại
            class_valid, c_issues = verify_classification(rec)
            issues.extend(c_issues)

            # 3. Kiểm tra số liệu định lượng lâm sàng
            nums_valid, n_issues = verify_numerical_values(
                statement=rec.statement,
                page_text=page_text,
            )
            issues.extend(n_issues)

            # 4. Xác định trạng thái tổng thể
            if not class_valid or grounding_score < 0.40:
                status = VerificationStatus.FAILED
                failed_count += 1
            elif not nums_valid or grounding_score < 0.70 or issues:
                status = VerificationStatus.WARNING
                warning_count += 1
            else:
                status = VerificationStatus.PASSED
                passed_count += 1

            v_detail = RecommendationVerificationDetail(
                rec_id=rec.rec_id,
                status=status,
                grounding_score=grounding_score,
                classification_valid=class_valid,
                numbers_verified=nums_valid,
                issues=issues,
            )

            rec_dict = rec.model_dump()
            rec_dict["verification_detail"] = v_detail
            rec_dict["state"] = DocumentLifecycleState.VERIFIED

            verified_recs.append(VerifiedRecommendation(**rec_dict))

        output = VerifyOutput(
            file_id=input_data.file_id,
            total_verified=len(verified_recs),
            passed_count=passed_count,
            warning_count=warning_count,
            failed_count=failed_count,
            verified_recommendations=verified_recs,
            state=DocumentLifecycleState.VERIFIED,
        )

        return output.model_dump()
