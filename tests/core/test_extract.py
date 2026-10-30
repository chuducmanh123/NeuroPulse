import pytest
import pymupdf
from pathlib import Path
from core.extract.core import ExtractCore, ExtractInput
from core.extract.detector import detect_grading_signatures, is_recommendation_candidate_page
from core.common.contracts import GradingSystemType


@pytest.fixture
def multi_guideline_pdf(tmp_path):
    """
    Tạo tài liệu PDF 6 trang mô phỏng bài toàn văn thực tế:
    - Trang 1: Bìa & Dẫn nhập
    - Trang 2: Top 10 Take-Home Messages (Tầng 1)
    - Trang 3: Bảng What Is New and of High Impact (Tầng 2)
    - Trang 4: Bảng AHA/ASA chuẩn (COR 1, LOE B-R) (Tầng 3)
    - Trang 5: Hộp ESO (GRADE, Quality of evidence, Strength of recommendation, Voting 8/8)
    - Trang 6: Tài liệu tham khảo (References)
    """
    pdf_path = tmp_path / "mixed_guidelines.pdf"
    doc = pymupdf.open()

    # Trang 1: Introduction
    p1 = doc.new_page()
    p1.insert_text((50, 50), "European & American Stroke Guidelines Overview")
    p1.insert_text((50, 100), "1. Introduction\nStroke is a leading cause of death and disability worldwide.")

    # Trang 2: Top 10 Take-Home Messages
    p2 = doc.new_page()
    p2.insert_text((50, 50), "TOP 10 TAKE-HOME MESSAGES")
    p2.insert_text((50, 100), "1. Mobile stroke units enable rapid identification and thrombolysis treatment.")
    p2.insert_text((50, 150), "2. Tenecteplase is recommended as safe and noninferior to Alteplase within 4.5 hours.")

    # Trang 3: What Is New and of High Impact
    p3 = doc.new_page()
    p3.insert_text((50, 50), "WHAT IS NEW AND OF HIGH IMPACT")
    p3.insert_text((50, 100), "Section title | 2026 Recommendation")
    p3.insert_text((50, 130), "4.6.2. Choice of Thrombolytic Agent COR 1. Tenecteplase is recommended.")

    # Trang 4: Bảng AHA/ASA chuẩn
    p4 = doc.new_page()
    p4.insert_text((50, 50), "2.1 Stroke Awareness (Population Level)")
    p4.insert_text((50, 80), "Recommendations for Stroke Awareness (Population Level)")
    p4.insert_text((50, 110), "COR: 1 | LOE: B-R | Class of Recommendation: Strong")
    p4.insert_text((50, 140), "1. For the general public, educational programs on stroke recognition are recommended.")

    # Trang 5: Hộp ESO
    p5 = doc.new_page()
    p5.insert_text((50, 50), "Table 8 Continued - Stroke Associated Pneumonia")
    p5.insert_text((50, 80), "PICO 5: In hospitalised adults with stroke associated pneumonia within 7 days...")
    p5.insert_text((50, 120), "Quality of evidence: Very Low")
    p5.insert_text((50, 150), "Strength of recommendation: Weak for intervention")
    p5.insert_text((50, 180), "Please refer to the Expert Consensus Statement below.")
    p5.insert_text((50, 210), "Voting: 8/8")

    # Trang 6: References
    p6 = doc.new_page()
    p6.insert_text((50, 50), "References")
    p6.insert_text((50, 100), "1. Sacco RL, et al. Stroke. 2013;44:2064-2089.\n2. Powers WJ, et al. Stroke. 2019;50:e344-e418.")

    doc.save(str(pdf_path))
    doc.close()
    return str(pdf_path)


def test_detector_aha_signatures():
    text = "Recommendations for Acute Ischemic Stroke\nCOR: 1\nLOE: B-R\nClass of Recommendation: 1"
    is_cand, sys_type, signals = is_recommendation_candidate_page(text)
    assert is_cand is True
    assert sys_type == GradingSystemType.AHA_ACC
    assert "COR_1_2_3" in signals or "CLASS_OF_REC" in signals


def test_detector_eso_grade_signatures():
    text = (
        "In hospitalised adults with acute ischaemic stroke... "
        "Quality of evidence: Very Low\n"
        "Strength of recommendation: Weak for intervention\n"
        "Expert Consensus Statement\n"
        "Voting: 8/8\n"
        "PICO 5: In hospitalised adults with stroke..."
    )
    is_cand, sys_type, signals = is_recommendation_candidate_page(text)
    assert is_cand is True
    assert sys_type == GradingSystemType.GRADE_ESO
    assert "QUALITY_OF_EVIDENCE" in signals
    assert "STRENGTH_OF_REC" in signals
    assert "VOTING_RATIO" in signals


def test_extract_core_filtering_and_multi_system(multi_guideline_pdf):
    core = ExtractCore()
    input_data = ExtractInput(
        file_id="mixed_guidelines_test",
        storage_path=multi_guideline_pdf,
    )

    result = core.run(input_data)

    assert result.ok is True
    data = result.data
    assert data["total_pages"] == 6

    # Kiểm tra trích xuất Tầng 1: Top Takeaways
    assert "top_takeaways" in data
    assert len(data["top_takeaways"]) >= 2
    assert "Mobile stroke units" in data["top_takeaways"][0]

    # Kiểm tra nhận diện Tầng 2: High-Impact Pages
    assert "high_impact_pages" in data
    assert 3 in data["high_impact_pages"]

    # Kiểm tra Candidate Pages lọc sạch trang bìa (1) và references (6)
    candidate_pages = data["candidate_pages"]
    extracted_page_nums = [cp["page_num"] for cp in candidate_pages]
    assert 1 not in extracted_page_nums
    assert 6 not in extracted_page_nums
    assert 4 in extracted_page_nums
    assert 5 in extracted_page_nums
