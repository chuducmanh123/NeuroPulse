import re
from typing import Dict, List, Tuple
from core.common.contracts import GradingSystemType

# Các bộ từ khóa & Regex đặc trưng cho từng hệ thống phân loại y khoa
SIGNATURES: Dict[GradingSystemType, List[Tuple[str, re.Pattern]]] = {
    GradingSystemType.AHA_ACC: [
        ("COR_LOE_HEADER", re.compile(r"\bCOR\b[\s\S]{1,50}\bLOE\b", re.IGNORECASE)),
        ("CLASS_OF_REC", re.compile(r"Class\s+of\s+Recommendation", re.IGNORECASE)),
        ("LEVEL_OF_EV", re.compile(r"Level\s+of\s+Evidence", re.IGNORECASE)),
        ("COR_1_2_3", re.compile(r"\bCOR\s*[:\-\s]\s*(1|2a|2b|3)\b", re.IGNORECASE)),
        ("LOE_A_B_C", re.compile(r"\bLOE\s*[:\-\s]\s*(A|B-R|B-NR|C-LD|C-EO)\b", re.IGNORECASE)),
        ("REC_BOX_HEADER", re.compile(r"Recommendations?\s+for\s+[A-Z]", re.IGNORECASE)),
    ],
    GradingSystemType.GRADE_ESO: [
        ("QUALITY_OF_EVIDENCE", re.compile(r"Quality\s+of\s+evidence\s*:", re.IGNORECASE)),
        ("STRENGTH_OF_REC", re.compile(r"Strength\s+of\s+recommendation\s*:", re.IGNORECASE)),
        ("EXPERT_CONSENSUS", re.compile(r"Expert\s+Consensus\s+Statement", re.IGNORECASE)),
        ("VOTING_RATIO", re.compile(r"\bVoting\s*:\s*\d+\s*/\s*\d+\b", re.IGNORECASE)),
        ("PICO_QUESTION", re.compile(r"\bPICO\s*\d+\s*:", re.IGNORECASE)),
        ("GRADE_LEVELS", re.compile(r"\b(High|Moderate|Low|Very\s+Low)\s+quality\b", re.IGNORECASE)),
        ("REC_INTERVENTION", re.compile(r"\b(Strong|Weak)\s+(for|against)\s+intervention\b", re.IGNORECASE)),
    ],
    GradingSystemType.AAN: [
        ("AAN_LEVEL_A_U", re.compile(r"\bLevel\s+[A|B|C|U]\s+(recommendation|is\s+established)\b", re.IGNORECASE)),
        ("AAN_CLASS_EVIDENCE", re.compile(r"\bClass\s+[I|II|III|IV]\s+evidence\b", re.IGNORECASE)),
    ],
    GradingSystemType.GENERIC: [
        ("GRADE_A_D", re.compile(r"\bGrade\s+[A|B|C|D]\b", re.IGNORECASE)),
        ("RECOMMENDATION_NUM", re.compile(r"\bRecommendation\s+\d+\b", re.IGNORECASE)),
        ("CLINICAL_RECOMMENDATION", re.compile(r"\bClinical\s+Practice\s+Recommendations?\b", re.IGNORECASE)),
    ],
}


def detect_grading_signatures(text: str) -> Dict[GradingSystemType, List[str]]:
    """
    Quét văn bản và xác định các hệ thống phân loại xuất hiện cùng danh sách tín hiệu khớp.
    """
    results: Dict[GradingSystemType, List[str]] = {}

    for sys_type, patterns in SIGNATURES.items():
        matched: List[str] = []
        for sig_name, pattern in patterns:
            if pattern.search(text):
                matched.append(sig_name)
        if matched:
            results[sys_type] = matched

    return results


def is_recommendation_candidate_page(text: str) -> Tuple[bool, GradingSystemType, List[str]]:
    """
    Xác định nhanh xem một trang PDF có phải là trang chứa khuyến cáo hay không.
    Trả về: (is_candidate, primary_system, matched_signals)
    """
    detected = detect_grading_signatures(text)

    # Ưu tiên các hệ thống chính xác cao trước
    for priority_sys in [GradingSystemType.AHA_ACC, GradingSystemType.GRADE_ESO, GradingSystemType.AAN]:
        if priority_sys in detected:
            signals = detected[priority_sys]
            # Tiêu chí:
            # - AHA_ACC: Ít nhất 1 tín hiệu mạnh (COR_LOE_HEADER, CLASS_OF_REC, hoặc COR_1_2_3)
            # - GRADE_ESO: Có QUALITY_OF_EVIDENCE, STRENGTH_OF_REC, EXPERT_CONSENSUS, hoặc VOTING_RATIO
            # - AAN: Có Level A-U hoặc Class evidence
            return True, priority_sys, signals

    if GradingSystemType.GENERIC in detected:
        signals = detected[GradingSystemType.GENERIC]
        if len(signals) >= 2 or "CLINICAL_RECOMMENDATION" in signals:
            return True, GradingSystemType.GENERIC, signals

    return False, GradingSystemType.UNKNOWN, []
