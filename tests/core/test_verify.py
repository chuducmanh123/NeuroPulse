import pytest
from core.verify.core import VerifyCore, VerifyInput
from core.common.contracts import (
    CandidatePage,
    AnalyzedRecommendation,
    GradingSystemType,
    VerificationStatus,
)


@pytest.fixture
def mock_candidate_page():
    return CandidatePage(
        page_num=4,
        grading_system=GradingSystemType.AHA_ACC,
        matched_signals=["COR_1_2_3", "LOE_A_B_C"],
        page_text=(
            "In patients with acute ischemic stroke presenting within 4.5 hours of symptom onset, "
            "intravenous thrombolysis with tenecteplase 0.25 mg/kg is recommended. "
            "Class of Recommendation: 1. Level of Evidence: A."
        ),
    )


def test_verify_valid_recommendation_passed(mock_candidate_page):
    """Khuyến cáo chuẩn mực, khớp văn bản gốc -> PASSED."""
    rec = AnalyzedRecommendation(
        rec_id="test-p4-r1",
        guideline_id="doc123",
        grading_system=GradingSystemType.AHA_ACC,
        page_num=4,
        cor="1",
        loe="A",
        statement="Intravenous thrombolysis with tenecteplase 0.25 mg/kg is recommended within 4.5 hours.",
        verbatim_quote="intravenous thrombolysis with tenecteplase 0.25 mg/kg is recommended.",
    )

    core = VerifyCore()
    res = core.run(VerifyInput(file_id="doc123", recommendations=[rec], candidate_pages=[mock_candidate_page]))

    assert res.ok is True
    data = res.data
    assert data["passed_count"] == 1
    assert data["failed_count"] == 0

    v_rec = data["verified_recommendations"][0]
    detail = v_rec["verification_detail"]
    assert detail["status"] == VerificationStatus.PASSED
    assert detail["classification_valid"] is True
    assert detail["numbers_verified"] is True
    assert detail["grounding_score"] >= 0.70


def test_verify_invalid_cor_fails(mock_candidate_page):
    """Cố ý gài COR sai (COR '4' hoặc 'Level X') -> FAILED."""
    rec = AnalyzedRecommendation(
        rec_id="test-p4-r2",
        guideline_id="doc123",
        grading_system=GradingSystemType.AHA_ACC,
        page_num=4,
        cor="4",  # Sai chuẩn AHA (chỉ chấp nhận 1, 2a, 2b, 3)
        loe="A",
        statement="Intravenous thrombolysis with tenecteplase is recommended.",
    )

    core = VerifyCore()
    res = core.run(VerifyInput(file_id="doc123", recommendations=[rec], candidate_pages=[mock_candidate_page]))

    assert res.ok is True
    data = res.data
    assert data["failed_count"] == 1

    v_rec = data["verified_recommendations"][0]
    detail = v_rec["verification_detail"]
    assert detail["status"] == VerificationStatus.FAILED
    assert detail["classification_valid"] is False
    assert any("không hợp lệ" in iss for iss in detail["issues"])


def test_verify_hallucinated_numbers_triggers_warning(mock_candidate_page):
    """Cố ý gài số liệu sai không có trong trang gốc (ví dụ: '99.5 mg' hoặc '72 hours') -> WARNING."""
    rec = AnalyzedRecommendation(
        rec_id="test-p4-r3",
        guideline_id="doc123",
        grading_system=GradingSystemType.AHA_ACC,
        page_num=4,
        cor="1",
        loe="A",
        statement="Intravenous thrombolysis is recommended within 72 hours with dose 99.5 mg.",
    )

    core = VerifyCore()
    res = core.run(VerifyInput(file_id="doc123", recommendations=[rec], candidate_pages=[mock_candidate_page]))

    assert res.ok is True
    data = res.data
    assert data["warning_count"] == 1

    v_rec = data["verified_recommendations"][0]
    detail = v_rec["verification_detail"]
    assert detail["status"] == VerificationStatus.WARNING
    assert detail["numbers_verified"] is False
    assert any("KHÔNG xuất hiện" in iss for iss in detail["issues"])


def test_verify_complete_hallucination_fails(mock_candidate_page):
    """Cố ý đưa câu hoàn toàn bịa đặt không dính líu gì đến trang gốc -> FAILED (Grounding score thấp)."""
    rec = AnalyzedRecommendation(
        rec_id="test-p4-r4",
        guideline_id="doc123",
        grading_system=GradingSystemType.AHA_ACC,
        page_num=4,
        cor="1",
        loe="A",
        statement="Astronauts should consume vitamin supplements during lunar orbital missions.",
    )

    core = VerifyCore()
    res = core.run(VerifyInput(file_id="doc123", recommendations=[rec], candidate_pages=[mock_candidate_page]))

    assert res.ok is True
    data = res.data
    assert data["failed_count"] == 1

    v_rec = data["verified_recommendations"][0]
    detail = v_rec["verification_detail"]
    assert detail["status"] == VerificationStatus.FAILED
    assert detail["grounding_score"] < 0.40
    assert any("ảo giác" in iss for iss in detail["issues"])
