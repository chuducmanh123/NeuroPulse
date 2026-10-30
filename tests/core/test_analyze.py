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

    def generate_json(self, prompt: str, system_instruction: Optional[str] = None) -> Dict[str, Any]:
        if "PICO" in prompt or "GRADE" in prompt or "ESO" in prompt:
            # Mô phỏng phản hồi bóc tách guideline ESO từ ảnh mẫu
            return {
                "model": "gemini-flash-lite-latest",
                "tokens_used": 150,
                "data": {
                    "recommendations": [
                        {
                            "rec_index": 1,
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
            # Mô phỏng phản hồi bóc tách guideline AHA
            return {
                "model": "gemini-flash-lite-latest",
                "tokens_used": 200,
                "data": {
                    "recommendations": [
                        {
                            "rec_index": 1,
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
    assert rec["page_num"] == 2
    assert rec["rec_id"] == "aha_doc_-P2-R1"


def test_analyze_eso_grade_page_from_user_sample():
    """Kiểm tra độ chính xác khi phân tích bảng ESO y hệt ảnh người dùng gửi."""
    mock_client = MockGeminiClient()
    core = AnalyzeCore(gemini_client=mock_client)

    cand_page = CandidatePage(
        page_num=8,
        grading_system=GradingSystemType.GRADE_ESO,
        matched_signals=["QUALITY_OF_EVIDENCE", "STRENGTH_OF_REC", "VOTING_RATIO", "PICO_QUESTION"],
        page_text=(
            "Table 8 Continued.\n"
            "Quality of evidence: Very Low\n"
            "Strength of recommendation: Weak for intervention\n"
            "Voting: 8/8\n"
            "PICO 5: In hospitalised adults with stroke associated pneumonia..."
        ),
    )

    res = core.run(AnalyzeInput(file_id="eso_sap_2026", candidate_pages=[cand_page]))

    assert res.ok is True
    data = res.data
    assert data["total_recommendations"] == 1
    rec = data["recommendations"][0]
    assert rec["grading_system"] == "GRADE_ESO"
    assert rec["pico_id"] == "PICO 5"
    assert rec["quality_of_evidence"] == "Very Low"
    assert rec["strength_of_recommendation"] == "Weak for intervention"
    assert rec["voting"] == "8/8"
    assert "SAP" in rec["statement"]
