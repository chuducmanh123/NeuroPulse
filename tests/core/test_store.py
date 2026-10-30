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
    rec3 = VerifiedRecommendation(
        rec_id="test_rec_3",
        guideline_id="doc_stroke_001",
        grading_system=GradingSystemType.AHA_ACC,
        page_num=6,
        statement="Mechanical thrombectomy is recommended within 6-24 hours for LVO.",
        cor="1",
        loe="A",
        verification_detail=RecommendationVerificationDetail(
            rec_id="test_rec_3",
            status=VerificationStatus.PASSED,
            grounding_score=1.0,
            classification_valid=True,
            numbers_verified=True,
        ),
    )
    return [rec1, rec2, rec3]


def test_store_quality_gate_rejects_stub(temp_store_manager, sample_verified_recs):
    """Kiểm tra: Quality Gate tự động chặn các tài liệu stub (< 3 khuyến cáo)."""
    core = StoreCore(manager=temp_store_manager)
    metadata = GuidelineMetadata(
        guideline_id="doc_stub",
        title="Stub Guideline",
        society="TEST",
    )

    # Chỉ truyền 1 khuyến cáo
    res = core.run(StoreInput(
        file_id="doc_stub",
        metadata=metadata,
        verified_recommendations=[sample_verified_recs[0]],
    ))

    assert res.ok is False
    assert res.error.code == "QUALITY_GATE_REJECTED"


def test_store_initial_save_v1(temp_store_manager, sample_verified_recs):
    core = StoreCore(manager=temp_store_manager)
    metadata = GuidelineMetadata(
        guideline_id="doc_stroke_001",
        title="2026 Acute Stroke Guidelines",
        society="AHA/ASA",
        year=2026,
        top_takeaways=["1. Mobile stroke units are beneficial.", "2. Tenecteplase is noninferior to Alteplase."],
    )

    res = core.run(StoreInput(
        file_id="doc_stroke_001",
        metadata=metadata,
        verified_recommendations=sample_verified_recs,
    ))

    assert res.ok is True
    data = res.data
    assert data["version"] == 1
    assert data["total_stored"] == 3
    assert data["pending_count"] == 3
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


def test_store_review_workflow_approval_and_rejection(temp_store_manager, sample_verified_recs):
    core = StoreCore(manager=temp_store_manager)
    metadata = GuidelineMetadata(
        guideline_id="doc_stroke_001",
        title="2026 Acute Stroke Guidelines",
        society="AHA/ASA",
        year=2026,
    )
    core.run(StoreInput(file_id="doc_stroke_001", metadata=metadata, verified_recommendations=sample_verified_recs))

    # 1. Kiểm tra hàng đợi ban đầu
    initial_queue = temp_store_manager.get_review_queue()
    assert len(initial_queue) == 3

    # 2. Bác sĩ duyệt khuyến cáo số 1 (APPROVED)
    ok_approve = temp_store_manager.update_recommendation_status(
        file_id="doc_stroke_001",
        rec_id="test_rec_1",
        action=ApprovalStatus.APPROVED,
        reviewer="BS. Chuyên khoa Thần kinh",
        notes="Chỉ định chính xác theo ACT trial.",
    )
    assert ok_approve is True

    # 3. Bác sĩ từ chối khuyến cáo số 2 (REJECTED)
    ok_reject = temp_store_manager.update_recommendation_status(
        file_id="doc_stroke_001",
        rec_id="test_rec_2",
        action=ApprovalStatus.REJECTED,
        reviewer="BS. Chuyên khoa Thần kinh",
        notes="Bằng chứng Very Low chưa đủ tin cậy.",
    )
    assert ok_reject is True

    # 4. Kiểm tra hàng đợi sau khi duyệt
    remaining_queue = temp_store_manager.get_review_queue()
    assert len(remaining_queue) == 1
    assert remaining_queue[0].rec_id == "test_rec_3"

    # 5. Kiểm tra bản ghi record cập nhật đúng
    record = temp_store_manager.load_latest_record("doc_stroke_001")
    assert record.pending_count == 1
    assert record.approved_count == 1
    assert record.rejected_count == 1
