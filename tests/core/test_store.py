import pytest
from core.store.core import StoreCore, StoreInput
from core.store.manager import GuidelineStoreManager
from core.common.contracts import (
    GuidelineMetadata,
    VerifiedRecommendation,
    RecommendationVerificationDetail,
    GradingSystemType,
    VerificationStatus,
    ApprovalStatus,
)


@pytest.fixture
def temp_store_manager(tmp_path):
    store_dir = tmp_path / "guidelines_store"
    return GuidelineStoreManager(base_dir=str(store_dir))


@pytest.fixture
def sample_verified_recs():
    rec1 = VerifiedRecommendation(
        rec_id="test_rec_1",
        guideline_id="doc_stroke_001",
        grading_system=GradingSystemType.AHA_ACC,
        page_num=2,
        statement="Intravenous thrombolysis is recommended within 4.5 hours.",
        cor="1",
        loe="A",
        verification_detail=RecommendationVerificationDetail(
            rec_id="test_rec_1",
            status=VerificationStatus.PASSED,
            grounding_score=1.0,
            classification_valid=True,
            numbers_verified=True,
        ),
    )
    rec2 = VerifiedRecommendation(
        rec_id="test_rec_2",
        guideline_id="doc_stroke_001",
        grading_system=GradingSystemType.GRADE_ESO,
        page_num=5,
        statement="We suggest using biomarkers to predict pneumonia.",
        quality_of_evidence="Very Low",
        strength_of_recommendation="Weak for intervention",
        voting="8/8",
        verification_detail=RecommendationVerificationDetail(
            rec_id="test_rec_2",
            status=VerificationStatus.PASSED,
            grounding_score=0.9,
            classification_valid=True,
            numbers_verified=True,
        ),
    )
    return [rec1, rec2]


def test_store_initial_save_v1(temp_store_manager, sample_verified_recs):
    core = StoreCore(manager=temp_store_manager)
    metadata = GuidelineMetadata(
        guideline_id="doc_stroke_001",
        title="2026 Acute Stroke Guidelines",
        society="AHA/ASA",
        year=2026,
    )

    res = core.run(StoreInput(
        file_id="doc_stroke_001",
        metadata=metadata,
        verified_recommendations=sample_verified_recs,
    ))

    assert res.ok is True
    data = res.data
    assert data["version"] == 1
    assert data["total_stored"] == 2
    assert data["pending_count"] == 2
    assert data["approved_count"] == 0

    # Kiểm tra các file đã được ghi trên đĩa
    assert (temp_store_manager.base_dir / "doc_stroke_001_v1.json").exists()
    assert (temp_store_manager.base_dir / "doc_stroke_001_latest.json").exists()
    assert temp_store_manager.catalog_path.exists()


def test_store_version_increment(temp_store_manager, sample_verified_recs):
    core = StoreCore(manager=temp_store_manager)
    metadata = GuidelineMetadata(
        guideline_id="doc_stroke_001",
        title="2026 Acute Stroke Guidelines",
        society="AHA/ASA",
        year=2026,
    )

    # Lần 1: version 1
    res1 = core.run(StoreInput(file_id="doc_stroke_001", metadata=metadata, verified_recommendations=sample_verified_recs))
    assert res1.data["version"] == 1

    # Lần 2 (ví dụ chạy lại phân tích với prompt nâng cấp): version 2
    res2 = core.run(StoreInput(file_id="doc_stroke_001", metadata=metadata, verified_recommendations=sample_verified_recs))
    assert res2.data["version"] == 2

    # Bản v1 vẫn tồn tại nguyên vẹn, không bị mất
    assert (temp_store_manager.base_dir / "doc_stroke_001_v1.json").exists()
    assert (temp_store_manager.base_dir / "doc_stroke_001_v2.json").exists()


def test_store_review_workflow_approval_and_rejection(temp_store_manager, sample_verified_recs):
    core = StoreCore(manager=temp_store_manager)
    metadata = GuidelineMetadata(
        guideline_id="doc_stroke_001",
        title="2026 Acute Stroke Guidelines",
        society="AHA/ASA",
    )
    core.run(StoreInput(file_id="doc_stroke_001", metadata=metadata, verified_recommendations=sample_verified_recs))

    # 1. Kiểm tra Hàng đợi chờ duyệt
    queue = temp_store_manager.get_review_queue()
    assert len(queue) == 2
    assert queue[0].approval_status == ApprovalStatus.PENDING_REVIEW

    # 2. Bác sĩ DUYỆT khuyến cáo 1
    approved_rec = temp_store_manager.review_recommendation(
        file_id="doc_stroke_001",
        rec_id="test_rec_1",
        new_status=ApprovalStatus.APPROVED,
        reviewer_id="Dr. Nguyen (Stroke Neurologist)",
        notes="Khuyến cáo chuẩn theo thử nghiệm lâm sàng.",
    )
    assert approved_rec is not None
    assert approved_rec.approval_status == ApprovalStatus.APPROVED
    assert approved_rec.reviewed_by == "Dr. Nguyen (Stroke Neurologist)"

    # 3. Bác sĩ TỪ CHỐI khuyến cáo 2
    rejected_rec = temp_store_manager.review_recommendation(
        file_id="doc_stroke_001",
        rec_id="test_rec_2",
        new_status=ApprovalStatus.REJECTED,
        reviewer_id="Dr. Nguyen (Stroke Neurologist)",
        notes="Bằng chứng Very Low chưa phù hợp đưa vào phác đồ trực.",
    )
    assert rejected_rec is not None
    assert rejected_rec.approval_status == ApprovalStatus.REJECTED

    # 4. Kiểm tra lại hàng đợi (queue phải rỗng vì cả 2 đã được duyệt / từ chối)
    new_queue = temp_store_manager.get_review_queue()
    assert len(new_queue) == 0

    # 5. Kiểm tra record cập nhật số đếm
    record = temp_store_manager.load_latest_record("doc_stroke_001")
    assert record.pending_count == 0
    assert record.approved_count == 1
    assert record.rejected_count == 1
