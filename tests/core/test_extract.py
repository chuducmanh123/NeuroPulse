import pytest
import pymupdf
from pathlib import Path
from core.extract.core import ExtractCore, ExtractInput
from core.extract.detector import detect_grading_signatures, is_recommendation_candidate_page
from core.common.contracts import GradingSystemType


@pytest.fixture
def multi_guideline_pdf(tmp_path):
    """
    Tạo tài liệu PDF 5 trang mô phỏng thực tế:
    - Trang 1: Bìa & Dẫn nhập (Không có khuyến cáo)
    - Trang 2: Bảng AHA/ASA (COR 1, LOE B-R)
    - Trang 3: Phương pháp nghiên cứu & Thống kê (Không có khuyến cáo)
    - Trang 4: Hộp ESO (GRADE, Quality of evidence, Strength of recommendation, Voting 8/8, PICO)
    - Trang 5: Tài liệu tham khảo (References)
    """
    pdf_path = tmp_path / "mixed_guidelines.pdf"
    doc = pymupdf.open()

    # Trang 1: Introduction
    p1 = doc.new_page()
    p1.insert_text((50, 50), "European & American Stroke Guidelines Overview")
    p1.insert_text((50, 100), "1. Introduction\nStroke is a leading cause of death and disability worldwide.")

    # Trang 2: Bảng AHA/ASA
    p2 = doc.new_page()
    p2.insert_text((50, 50), "2.1 Stroke Awareness (Population Level)")
    p2.insert_text((50, 80), "Recommendations for Stroke Awareness (Population Level)")
    p2.insert_text((50, 110), "COR: 1 | LOE: B-R | Class of Recommendation: Strong")
    p2.insert_text((50, 140), "1. For the general public, educational programs on stroke recognition are recommended.")

    # Trang 3: Methods
    p3 = doc.new_page()
    p3.insert_text((50, 50), "3. Methodology and Search Strategy")
    p3.insert_text((50, 100), "We searched MEDLINE, Embase, and the Cochrane Central Register.")

    # Trang 4: Bảng/Hộp ESO (Y hệt ảnh người dùng gửi)
    p4 = doc.new_page()
    p4.insert_text((50, 50), "Table 8 Continued - Stroke Associated Pneumonia")
    p4.insert_text((50, 80), "PICO 5: In hospitalised adults with stroke associated pneumonia within 7 days...")
    p4.insert_text((50, 120), "Quality of evidence: Very Low")
    p4.insert_text((50, 150), "Strength of recommendation: Weak for intervention")
    p4.insert_text((50, 180), "Please refer to the Expert Consensus Statement below.")
    p4.insert_text((50, 210), "Voting: 8/8")

    # Trang 5: References
    p5 = doc.new_page()
    p5.insert_text((50, 50), "References")
    p5.insert_text((50, 100), "1. Sacco RL, et al. Stroke. 2013;44:2064-2089.\n2. Powers WJ, et al. Stroke. 2019;50:e344-e418.")

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
    # Kiểm tra đoạn text trích từ ảnh người dùng cung cấp
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
    assert data["total_pages"] == 5

    # Lọc trang: Chỉ giữ lại 2 trang khuyến cáo (trang 2 và 4), loại bỏ các trang 1, 3, 5
    assert data["candidate_page_count"] == 2
    candidate_pages = data["candidate_pages"]
    extracted_page_nums = [cp["page_num"] for cp in candidate_pages]
    assert extracted_page_nums == [2, 4]

    # Kiểm tra hệ thống nhận diện
    detected_systems = set(data["detected_grading_systems"])
    assert GradingSystemType.AHA_ACC in detected_systems
    assert GradingSystemType.GRADE_ESO in detected_systems

    # Chi tiết từng trang
    p2_data = candidate_pages[0]
    assert p2_data["page_num"] == 2
    assert p2_data["grading_system"] == GradingSystemType.AHA_ACC

    p4_data = candidate_pages[1]
    assert p4_data["page_num"] == 4
    assert p4_data["grading_system"] == GradingSystemType.GRADE_ESO
    assert "QUALITY_OF_EVIDENCE" in p4_data["matched_signals"]
    assert "VOTING_RATIO" in p4_data["matched_signals"]
