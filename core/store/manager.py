import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional
from core.common.contracts import (
    GuidelineDocumentRecord,
    StoredRecommendation,
    ApprovalStatus,
    GuidelineMetadata,
)


class GuidelineStoreManager:
    """
    Quản lý lưu trữ tệp, phiên bản và quy trình phê duyệt y khoa (Review Workflow).
    Thực hiện:
    - Quản lý phiên bản không ghi đè: v1, v2, v3...
    - Tra cứu Hàng đợi chờ duyệt (Review Queue) dành cho Bác sĩ.
    - Cập nhật phê duyệt (Approve), Từ chối (Reject), hoặc Chỉnh sửa (Modify).
    - Đồng bộ danh mục Catalog cho Web NeuroGuide.
    """

    def __init__(self, base_dir: str = "data/guidelines_store"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self.catalog_path = self.base_dir / "catalog.json"

    def get_latest_version(self, file_id: str) -> int:
        """Tìm số phiên bản mới nhất hiện có của file_id."""
        matching_files = list(self.base_dir.glob(f"{file_id}_v*.json"))
        if not matching_files:
            return 0
        versions = []
        for mf in matching_files:
            stem = mf.stem
            try:
                v_part = stem.split("_v")[-1]
                versions.append(int(v_part))
            except ValueError:
                continue
        return max(versions) if versions else 0

    def save_record(self, record: GuidelineDocumentRecord) -> Path:
        """
        Lưu bản ghi guideline theo số phiên bản và cập nhật file latest + catalog.
        """
        versioned_path = self.base_dir / f"{record.guideline_id}_v{record.version}.json"
        latest_path = self.base_dir / f"{record.guideline_id}_latest.json"

        data_json = record.model_dump()
        json_str = json.dumps(data_json, indent=2, ensure_ascii=False)

        versioned_path.write_text(json_str, encoding="utf-8")
        latest_path.write_text(json_str, encoding="utf-8")

        self._update_catalog(record)
        return versioned_path

    def load_latest_record(self, file_id: str) -> Optional[GuidelineDocumentRecord]:
        """Tải bản ghi mới nhất của một guideline."""
        latest_path = self.base_dir / f"{file_id}_latest.json"
        if not latest_path.exists():
            return None
        data = json.loads(latest_path.read_text(encoding="utf-8"))
        return GuidelineDocumentRecord(**data)

    def _update_catalog(self, record: GuidelineDocumentRecord):
        """Cập nhật tệp catalog.json phục vụ hiển thị nhanh danh sách trên Web."""
        catalog: Dict[str, Any] = {}
        if self.catalog_path.exists():
            try:
                catalog = json.loads(self.catalog_path.read_text(encoding="utf-8"))
            except Exception:
                catalog = {}

        catalog[record.guideline_id] = {
            "guideline_id": record.guideline_id,
            "title": record.metadata.title,
            "society": record.metadata.society,
            "year": record.metadata.year,
            "source_url": record.metadata.source_url,
            "latest_version": record.version,
            "total_recommendations": record.total_recommendations,
            "pending_count": record.pending_count,
            "approved_count": record.approved_count,
            "rejected_count": record.rejected_count,
            "updated_at": record.updated_at,
        }

        self.catalog_path.write_text(json.dumps(catalog, indent=2, ensure_ascii=False), encoding="utf-8")

    def get_review_queue(self, society: Optional[str] = None) -> List[StoredRecommendation]:
        """Lấy tất cả các khuyến cáo đang chờ duyệt trên toàn hệ thống."""
        queue: List[StoredRecommendation] = []
        for latest_file in self.base_dir.glob("*_latest.json"):
            try:
                data = json.loads(latest_file.read_text(encoding="utf-8"))
                rec_list = data.get("recommendations", [])
                for r in rec_list:
                    if r.get("approval_status") == ApprovalStatus.PENDING_REVIEW.value:
                        stored_r = StoredRecommendation(**r)
                        if society and r.get("society", "").upper() != society.upper():
                            continue
                        queue.append(stored_r)
            except Exception:
                continue
        return queue

    def review_recommendation(
        self,
        file_id: str,
        rec_id: str,
        new_status: ApprovalStatus,
        reviewer_id: str,
        notes: Optional[str] = None,
        modified_statement: Optional[str] = None,
    ) -> Optional[StoredRecommendation]:
        """Bác sĩ duyệt hoặc từ chối một khuyến cáo lâm sàng."""
        record = self.load_latest_record(file_id)
        if not record:
            return None

        target_rec: Optional[StoredRecommendation] = None
        for r in record.recommendations:
            if r.rec_id == rec_id:
                target_rec = r
                break

        if not target_rec:
            return None

        # Cập nhật thông tin phê duyệt
        now_iso = datetime.now(timezone.utc).isoformat()
        target_rec.approval_status = new_status
        target_rec.reviewed_by = reviewer_id
        target_rec.reviewed_at = now_iso
        target_rec.review_notes = notes

        if modified_statement and new_status == ApprovalStatus.MODIFIED:
            target_rec.statement = modified_statement

        # Đếm lại các trạng thái
        record.pending_count = sum(1 for r in record.recommendations if r.approval_status == ApprovalStatus.PENDING_REVIEW)
        record.approved_count = sum(1 for r in record.recommendations if r.approval_status in (ApprovalStatus.APPROVED, ApprovalStatus.MODIFIED))
        record.rejected_count = sum(1 for r in record.recommendations if r.approval_status == ApprovalStatus.REJECTED)
        record.updated_at = now_iso

        self.save_record(record)
        return target_rec
