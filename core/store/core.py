from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from core.common.base import BaseCore
from core.common.contracts import (
    DocumentLifecycleState,
    CoreException,
    StoredRecommendation,
    GuidelineDocumentRecord,
    ApprovalStatus,
    StoreInput,
    StoreOutput,
)
from core.store.manager import GuidelineStoreManager


class StoreCore(BaseCore):
    """
    Lõi Lưu trữ & Quản lý Phiên bản (StoreCore).
    Đặc tính nâng cấp cho bài toàn văn:
    - Quality Gate: Chặn triệt để việc lưu các tài liệu rác hoặc bóc tách dở dang (< 3 khuyến cáo).
    - Lưu trữ có cấu trúc 3 tầng: Top Takeaways, High-Impact Changes và Section Recommendations.
    - Quản lý phiên bản bất biến (v1, v2...) và cập nhật Catalog cho Web NeuroGuide.
    """

    name: str = "store"
    version: str = "2.0.0"

    def __init__(self, manager: Optional[GuidelineStoreManager] = None):
        self.manager = manager or GuidelineStoreManager()

    def _execute(self, input_data: BaseModel) -> Dict[str, Any]:
        if not isinstance(input_data, StoreInput):
            input_data = StoreInput(**input_data.model_dump())

        # 1. Quality Gate: Kiểm tra tính hoàn thiện của tài liệu trước khi đưa vào kho
        min_recs_threshold = 3
        if len(input_data.verified_recommendations) < min_recs_threshold:
            raise CoreException(
                code="QUALITY_GATE_REJECTED",
                message=f"Chặn lưu tài liệu chưa hoàn chỉnh: Số lượng khuyến cáo quá ít ({len(input_data.verified_recommendations)} < {min_recs_threshold}).",
                retryable=False,
                details={"rec_count": len(input_data.verified_recommendations)},
            )

        now_iso = datetime.now(timezone.utc).isoformat()

        # 2. Xác định số phiên bản mới
        latest_version = self.manager.get_latest_version(input_data.file_id)
        current_version = latest_version + 1

        # 3. Đóng gói StoredRecommendations
        stored_recs: List[StoredRecommendation] = []
        for v_rec in input_data.verified_recommendations:
            rec_dict = v_rec.model_dump()
            rec_dict["approval_status"] = ApprovalStatus.PENDING_REVIEW
            stored_recs.append(StoredRecommendation(**rec_dict))

        # Trích xuất Top Takeaways từ metadata nếu có
        top_takeaways = getattr(input_data.metadata, "top_takeaways", []) or []

        # 4. Tạo bản ghi GuidelineDocumentRecord
        record = GuidelineDocumentRecord(
            guideline_id=input_data.file_id,
            version=current_version,
            metadata=input_data.metadata,
            total_recommendations=len(stored_recs),
            pending_count=len(stored_recs),
            approved_count=0,
            rejected_count=0,
            top_takeaways=top_takeaways,
            recommendations=stored_recs,
            created_at=now_iso,
            updated_at=now_iso,
        )

        # 5. Lưu trữ an toàn
        saved_path = self.manager.save_record(record)

        output = StoreOutput(
            file_id=input_data.file_id,
            version=current_version,
            storage_path=str(saved_path),
            total_stored=len(stored_recs),
            pending_count=len(stored_recs),
            approved_count=0,
            state=DocumentLifecycleState.PENDING_REVIEW,
        )

        return output.model_dump()
