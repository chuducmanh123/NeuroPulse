import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional

from core.common.contracts import (
    DocumentLifecycleState,
    CoreResult,
    CoreError,
    GuidelineMetadata,
    CandidatePage,
    AnalyzedRecommendation,
    VerifiedRecommendation,
)
from core.fetch.core import FetchCore, FetchInput
from core.extract.core import ExtractCore, ExtractInput
from core.analyze.core import AnalyzeCore, AnalyzeInput
from core.verify.core import VerifyCore, VerifyInput
from core.store.core import StoreCore, StoreInput
from core.store.manager import GuidelineStoreManager
from core.discovery.core import DiscoveryCore, DiscoveryInput


class GuidelineOrchestrator:
    """
    Bộ điều phối toàn trình (Pipeline Orchestrator).
    Thực thi máy trạng thái vòng đời tài liệu:
    FETCH -> EXTRACT -> ANALYZE -> VERIFY -> STORE.
    - Quản lý retry tự động khi gặp lỗi có cờ retryable.
    - Lưu vết tiến trình (Job audit trail) vào data/guidelines_store/jobs.json.
    """

    def __init__(self, store_manager: Optional[GuidelineStoreManager] = None):
        self.store_manager = store_manager or GuidelineStoreManager()
        self.fetch_core = FetchCore()
        self.extract_core = ExtractCore()
        self.analyze_core = AnalyzeCore()
        self.verify_core = VerifyCore()
        self.store_core = StoreCore(manager=self.store_manager)
        self.discovery_core = DiscoveryCore(store_manager=self.store_manager)

        self.jobs_file = self.store_manager.base_dir / "jobs.json"

    def _log_job(self, job_id: str, step: str, status: str, details: Optional[Dict[str, Any]] = None):
        """Ghi nhận tiến trình thực thi vào tệp jobs.json."""
        now_iso = datetime.now(timezone.utc).isoformat()
        jobs_data = {}
        if self.jobs_file.exists():
            try:
                jobs_data = json.loads(self.jobs_file.read_text(encoding="utf-8"))
            except Exception:
                jobs_data = {}

        if job_id not in jobs_data:
            jobs_data[job_id] = {
                "job_id": job_id,
                "created_at": now_iso,
                "steps": [],
                "final_status": "RUNNING",
            }

        jobs_data[job_id]["steps"].append({
            "step": step,
            "status": status,
            "timestamp": now_iso,
            "details": details or {},
        })
        jobs_data[job_id]["final_status"] = status
        jobs_data[job_id]["updated_at"] = now_iso

        self.jobs_file.write_text(json.dumps(jobs_data, indent=2, ensure_ascii=False), encoding="utf-8")

    def process_single_guideline(
        self,
        source_url: Optional[str] = None,
        local_path: Optional[str] = None,
        society: str = "AHA",
        title: Optional[str] = None,
        year: Optional[int] = None,
        max_retries: int = 2,
    ) -> CoreResult:
        """
        Thực thi toàn bộ chuỗi 5 bước cho 1 guideline (tải URL hoặc file upload).
        """
        start_time = time.perf_counter()
        job_id = f"job_{int(time.time())}_{society}"
        self._log_job(job_id, "INIT", "STARTED", {"url": source_url, "file": local_path, "society": society})

        try:
            # ==============================
            # BƯỚC 1: FETCH
            # ==============================
            fetch_res: Optional[CoreResult] = None
            for attempt in range(max_retries + 1):
                fetch_res = self.fetch_core.run(
                    FetchInput(
                        source_url=source_url,
                        local_path=local_path,
                        society=society,
                        title_hint=title,
                        year_hint=year,
                    )
                )
                if fetch_res.ok:
                    break
                if fetch_res.error and not fetch_res.error.retryable:
                    break
                time.sleep(1)

            if not fetch_res or not fetch_res.ok:
                err = fetch_res.error if fetch_res else CoreError(code="FETCH_FAILED", message="Lỗi không thể tải file")
                self._log_job(job_id, "FETCH", "FAILED", {"error": err.model_dump()})
                return CoreResult(ok=False, error=err, meta={"job_id": job_id})

            file_id = fetch_res.data["file_id"]
            storage_path = fetch_res.data["storage_path"]
            page_count = fetch_res.data["page_count"]
            self._log_job(job_id, "FETCH", "SUCCESS", {"file_id": file_id, "pages": page_count})

            # ==============================
            # BƯỚC 2: EXTRACT
            # ==============================
            extract_res = self.extract_core.run(
                ExtractInput(
                    file_id=file_id,
                    storage_path=storage_path,
                    society_hint=society,
                )
            )
            if not extract_res.ok:
                self._log_job(job_id, "EXTRACT", "FAILED", {"error": extract_res.error.model_dump()})
                return CoreResult(ok=False, error=extract_res.error, meta={"job_id": job_id})

            cand_pages_raw = extract_res.data.get("candidate_pages", [])
            cand_pages = [CandidatePage(**p) for p in cand_pages_raw]
            self._log_job(job_id, "EXTRACT", "SUCCESS", {"candidate_pages": len(cand_pages)})

            if not cand_pages:
                self._log_job(job_id, "ANALYZE", "SKIPPED", {"reason": "Không phát hiện trang khuyến cáo nào"})
                return CoreResult(
                    ok=True,
                    data={"message": "Tài liệu không chứa bảng khuyến cáo phù hợp", "file_id": file_id},
                    meta={"job_id": job_id},
                )

            # ==============================
            # BƯỚC 3: ANALYZE (GEMINI AI)
            # ==============================
            analyze_res = self.analyze_core.run(
                AnalyzeInput(
                    file_id=file_id,
                    candidate_pages=cand_pages,
                    society_hint=society,
                )
            )
            if not analyze_res.ok:
                self._log_job(job_id, "ANALYZE", "FAILED", {"error": analyze_res.error.model_dump()})
                return CoreResult(ok=False, error=analyze_res.error, meta={"job_id": job_id})

            analyzed_recs_raw = analyze_res.data.get("recommendations", [])
            analyzed_recs = [AnalyzedRecommendation(**r) for r in analyzed_recs_raw]
            tokens_used = analyze_res.data.get("total_tokens_used", 0)
            self._log_job(job_id, "ANALYZE", "SUCCESS", {"recs_count": len(analyzed_recs), "tokens": tokens_used})

            # ==============================
            # BƯỚC 4: VERIFY (RULE-BASED LOGIC)
            # ==============================
            verify_res = self.verify_core.run(
                VerifyInput(
                    file_id=file_id,
                    recommendations=analyzed_recs,
                    candidate_pages=cand_pages,
                )
            )
            if not verify_res.ok:
                self._log_job(job_id, "VERIFY", "FAILED", {"error": verify_res.error.model_dump()})
                return CoreResult(ok=False, error=verify_res.error, meta={"job_id": job_id})

            verified_recs_raw = verify_res.data.get("verified_recommendations", [])
            verified_recs = [VerifiedRecommendation(**r) for r in verified_recs_raw]
            passed_cnt = verify_res.data.get("passed_count", 0)
            warning_cnt = verify_res.data.get("warning_count", 0)
            self._log_job(job_id, "VERIFY", "SUCCESS", {"passed": passed_cnt, "warning": warning_cnt})

            # ==============================
            # BƯỚC 5: STORE & REVIEW QUEUE
            # ==============================
            doc_metadata = GuidelineMetadata(
                guideline_id=file_id,
                title=title or fetch_res.data.get("title_hint") or f"{society} Clinical Guideline",
                society=society,
                year=year or fetch_res.data.get("year_hint"),
                source_url=source_url,
                top_takeaways=extract_res.data.get("top_takeaways", []),
                full_text_status="FULL_TEXT_PARSED",
                state=DocumentLifecycleState.PENDING_REVIEW,
            )

            store_res = self.store_core.run(
                StoreInput(
                    file_id=file_id,
                    metadata=doc_metadata,
                    verified_recommendations=verified_recs,
                )
            )
            if not store_res.ok:
                self._log_job(job_id, "STORE", "FAILED", {"error": store_res.error.model_dump()})
                return CoreResult(ok=False, error=store_res.error, meta={"job_id": job_id})

            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            self._log_job(job_id, "PIPELINE_COMPLETE", "SUCCESS", {
                "file_id": file_id,
                "version": store_res.data["version"],
                "total_stored": store_res.data["total_stored"],
                "elapsed_ms": elapsed_ms,
            })

            return CoreResult(
                ok=True,
                data={
                    "job_id": job_id,
                    "file_id": file_id,
                    "version": store_res.data["version"],
                    "total_recommendations": store_res.data["total_stored"],
                    "pending_review_count": store_res.data["pending_count"],
                    "storage_path": store_res.data["storage_path"],
                    "state": DocumentLifecycleState.PENDING_REVIEW,
                },
                meta={
                    "elapsed_ms": elapsed_ms,
                    "tokens_used": tokens_used,
                    "model_used": analyze_res.data.get("model_used"),
                },
            )

        except Exception as e:
            self._log_job(job_id, "CRITICAL_ERROR", "FAILED", {"exception": str(e)})
            return CoreResult(
                ok=False,
                error=CoreError(
                    code="ORCHESTRATOR_PIPELINE_ERROR",
                    message=f"Lỗi không mong muốn trong bộ điều phối: {str(e)}",
                    retryable=False,
                ),
                meta={"job_id": job_id},
            )

    def run_discovery_scan(
        self,
        societies: Optional[List[str]] = None,
        limit_per_source: int = 5,
        year_min: int = 2020,
    ) -> CoreResult:
        """Chạy quét phát hiện guideline mới từ các hội chuyên khoa."""
        return self.discovery_core.run(
            DiscoveryInput(
                societies=societies,
                limit_per_source=limit_per_source,
                year_min=year_min,
            )
        )
