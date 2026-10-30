import pytest
from typing import Dict, Any, Optional
from core.analyze.core import AnalyzeCore, AnalyzeInput
from core.analyze.gemini_client import GeminiClient
from core.common.contracts import (
    CandidatePage,
    GradingSystemType,
    ExtractedTable,
    DocumentLifecycleState,
)


class MockGeminiClient(GeminiClient):
    """Giả lập Gemini AI để test unit test siêu tốc và ổn định không phụ thuộc mạng."""

    def __init__(self):
        self.api_key = "dummy_key"
        self.models_priority = ["mock-gemini"]
        self.call_count = 0

    def generate_json(self, prompt: str, system_instruction: Optional[str] = None) -> Dict[str, Any]:
        self.call_count += 1
        if "WHAT IS NEW AND OF HIGH IMPACT" in prompt:
            # Mô phỏng bóc tách bảng High Impact
            return {
                "model": "gemini-flash-lite-latest",
                "tokens_used": 250,
                "data": {
                    "recommendations": [
                        {
                            "rec_index": 1,
                            "page_num": 4,
                            "is_high_impact_change": True,
                            "change_type": "UPGRADED",
                            "previous_grade": "Class IIb, Level B-R",
                            "section": "4.6.2. Choice of Thrombolytic Agent",
                            "topic": "Reperfusion Therapy",
                            "cor": "1",
                            "loe": "B-R",
                            "statement": "Tenecteplase (0.25 mg/kg single bolus, max 25 mg) is recommended within 4.5 hours.",
                            "target_population": "Adults with acute ischemic stroke",
                            "driving_trials": ["AcT", "TRACE-2", "ORIGINAL"],
                            "verbatim_quote": "Tenecteplase is recommended",
                        }
                    ]
                },
            }
        elif "PICO" in prompt or "GRADE_ESO" in prompt or "ESO" in prompt or "Strength of recommendation" in prompt:
            # Mô phỏng phản hồi bóc tách guideline ESO
            return {
                "model": "gemini-flash-lite-latest",
                "tokens_used": 150,
                "data": {
                    "recommendations": [
                        {
                            "rec_index": 1,
                            "page_num": 5,
                            "pico_id": "PICO 5",
                            "section": "Table 8 Continued",
                            "topic": "Stroke Associated Pneumonia",
                            "quality_of_evidence": "Very Low",
                            "strength_of_recommendation": "Weak for intervention",
                            "consensus_statement": None,
                            "voting": "8/8",
                            "statement": "We suggest using validated clinical prediction scores or biomarkers to identify patients at increased risk of SAP...",
                            "target_population": "Hospitalised adults with acute ischaemic or haemorrhagic stroke within 7 days",
                            "driving_trials": [],
                            "verbatim_quote": "We suggest using validated clinical prediction scores...",
                        }
                    ]
                },
            }
        else:
            # Mô phỏng phản hồi bóc tách guideline AHA chuẩn
            return {
                "model": "gemini-flash-lite-latest",
                "tokens_used": 200,
                "data": {
                    "recommendations": [
                        {
                            "rec_index": 1,
                            "page_num": 2,
                            "section": "2.1 Stroke Awareness",
                            "topic": "Prehospital Management",
                            "cor": "1",
                            "loe": "B-R",
                            "statement": "For the general public, educational programs on stroke recognition are recommended.",
                            "target_population": "General public",
                            "driving_trials": ["FAST-ED", "RACE"],
                            "verbatim_quote": "For the general public, educational programs...",
                        }
                    ]
                },
            }


def test_analyze_empty_candidate_pages():
    mock_client = MockGeminiClient()
    core = AnalyzeCore(gemini_client=mock_client)
    res = core.run(AnalyzeInput(file_id="test_empty", candidate_pages=[]))

    assert res.ok is True
    assert res.data["total_recommendations"] == 0
    assert len(res.data["recommendations"]) == 0
    assert res.data["state"] == "ANALYZED"


def test_analyze_aha_page():
    mock_client = MockGeminiClient()
    core = AnalyzeCore(gemini_client=mock_client)

    cand_page = CandidatePage(
        page_num=2,
        grading_system=GradingSystemType.AHA_ACC,
        matched_signals=["COR_LOE_HEADER", "COR_1_2_3"],
        page_text="COR 1 | LOE B-R | Educational programs on stroke recognition are recommended.",
    )

    res = core.run(AnalyzeInput(file_id="aha_doc_1234", candidate_pages=[cand_page]))

    assert res.ok is True
    data = res.data
    assert data["total_recommendations"] == 1
    rec = data["recommendations"][0]
    assert rec["grading_system"] == "AHA_ACC"
    assert rec["cor"] == "1"
    assert rec["cor_label"] == "Strong"
    assert rec["loe"] == "B-R"
    assert "FAST-ED" in rec["driving_trials"]


def test_analyze_batch_chunking_efficiency():
    """Kiểm tra: 6 trang ứng viên được chia thành các batch 3 trang giúp giảm số lần gọi AI."""
    mock_client = MockGeminiClient()
    core = AnalyzeCore(gemini_client=mock_client, batch_size=3)

    pages = [
        CandidatePage(page_num=i, grading_system=GradingSystemType.AHA_ACC, page_text=f"Rec text on page {i}")
        for i in range(10, 16) # 6 trang: 10, 11, 12, 13, 14, 15
    ]

    res = core.run(AnalyzeInput(file_id="aha_batch_test", candidate_pages=pages))

    assert res.ok is True
    # Với 6 trang và batch_size=3, số lần gọi API là 2 (thay vì 6 lần)
    assert mock_client.call_count == 2
    assert res.data["total_recommendations"] == 2


def test_analyze_high_impact_priority_batch():
    """Kiểm tra: trang có tín hiệu WHAT_IS_NEW được tách vào batch riêng và gán is_high_impact_change = True."""
    mock_client = MockGeminiClient()
    core = AnalyzeCore(gemini_client=mock_client, batch_size=3)

    hi_page = CandidatePage(
        page_num=4,
        grading_system=GradingSystemType.AHA_ACC,
        matched_signals=["AHA_WHAT_IS_NEW"],
        page_text="WHAT IS NEW AND OF HIGH IMPACT: Tenecteplase is recommended.",
    )
    reg_page = CandidatePage(
        page_num=10,
        grading_system=GradingSystemType.AHA_ACC,
        page_text="General stroke recommendation",
    )

    res = core.run(AnalyzeInput(file_id="aha_hi_test", candidate_pages=[hi_page, reg_page]))

    assert res.ok is True
    recs = res.data["recommendations"]
    assert len(recs) == 2

    # Khuyến cáo từ trang High-Impact
    hi_rec = next(r for r in recs if r["page_num"] == 4)
    assert hi_rec["is_high_impact_change"] is True
    assert hi_rec["change_type"] == "UPGRADED"
    assert "AcT" in hi_rec["driving_trials"]
