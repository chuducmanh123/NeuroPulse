from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from core.common.base import BaseCore
from core.common.contracts import (
    DocumentLifecycleState,
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
    Đặc điểm:
    - Lưu trữ theo phiên bản (v1, v2...) chống ghi đè làm mất lịch sử.
    - Tự động gắn trạng thái PENDING_REVIEW chờ Bác sĩ duyệt.
    - Cập nhật mục lục tổng Catalog phục vụ Web NeuroGuide.
    """

    name: str = "store"
    version: str = "1.0.0"

    def __init__(self, manager: Optional[GuidelineStoreManager] = None):
        self.manager = manager or GuidelineStoreManager()

    def _execute(self, input_data: BaseModel) -> Dict[str, Any]:
        if not isinstance(input_data, StoreInput):
            input_data = StoreInput(**input_data.model_dump())

        now_iso = datetime.now(timezone.utc).isoformat()

        # 1. Xác định số phiên bản mới
        latest_version = self.manager.get_latest_version(input_data.file_id)
        current_version = latest_version + 1

        # 2. Đóng gói StoredRecommendations
        stored_recs: List[StoredRecommendation] = []
        for v_rec in input_data.verified_recommendations:
            rec_dict = v_rec.model_dump()
            rec_dict["approval_status"] = ApprovalStatus.PENDING_REVIEW
            stored_recs.append(StoredRecommendation(**rec_dict))

        # 3. Tạo bản ghi GuidelineDocumentRecord
        record = GuidelineDocumentRecord(
            guideline_id=input_data.file_id,
            version=current_version,
            metadata=input_data.metadata,
            total_recommendations=len(stored_recs),
            pending_count=len(stored_recs),
            approved_count=0,
            rejected_count=0,
            recommendations=stored_recs,
            created_at=now_iso,
            updated_at=now_iso,
        )

        # 4. Lưu trữ an toàn
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
