import re
from typing import Dict, List, Tuple
from core.common.contracts import GradingSystemType

# Các bộ từ khóa & Regex đặc trưng cho từng hệ thống phân loại y khoa
SIGNATURES: Dict[GradingSystemType, List[Tuple[str, re.Pattern]]] = {
    GradingSystemType.AHA_ACC: [
        ("COR_LOE_HEADER", re.compile(r"\bCOR\b[\s\S]{1,50}\bLOE\b", re.IGNORECASE)),
        ("CLASS_OF_REC", re.compile(r"Class\s+of\s+Recommendation", re.IGNORECASE)),
        ("LEVEL_OF_EV", re.compile(r"Level\s+of\s+Evidence", re.IGNORECASE)),
        ("CLASS_ROMAN", re.compile(r"\bClass\s+(I|IIa|IIb|III|1|2a|2b|3)\b", re.IGNORECASE)),
        ("COR_1_2_3", re.compile(r"\bCOR\s*[:\-\s]\s*(1|2a|2b|3)\b", re.IGNORECASE)),
        ("LOE_A_B_C", re.compile(r"\bLOE\s*[:\-\s]\s*(A|B-R|B-NR|C-LD|C-EO)\b", re.IGNORECASE)),
        ("REC_BOX_HEADER", re.compile(r"Recommendations?\s+for\s+[A-Z]", re.IGNORECASE)),
        ("AHA_WHAT_IS_NEW", re.compile(r"\b(what\s+is\s+new(\s+and\s+of\s+high\s+impact)?|top\s+10\s+take[\-\s]home\s+messages|practice[\-\s]changing\s+updates?)\b", re.IGNORECASE)),
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
        ("GENERIC_WHAT_IS_NEW", re.compile(r"\b(what\s+is\s+new|practice\s+changes?|take[\-\s]home\s+messages)\b", re.IGNORECASE)),
    ],
}

RE_TABLE_CONTINUED = re.compile(r"\b(table\s+\d+\.?\s+continued|recommendations?\s+continued)\b", re.IGNORECASE)


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


def is_recommendation_candidate_page(
    text: str,
    prev_page_is_candidate: bool = False,
    prev_system: GradingSystemType = GradingSystemType.UNKNOWN,
) -> Tuple[bool, GradingSystemType, List[str]]:
    """
    Xác định nhanh xem một trang PDF có phải là trang chứa khuyến cáo hay không.
    Hỗ trợ kế thừa ngữ cảnh khi bảng khuyến cáo kéo dài nhiều trang (Table Continued).
    Trả về: (is_candidate, primary_system, matched_signals)
    """
    detected = detect_grading_signatures(text)
    has_continued = bool(RE_TABLE_CONTINUED.search(text))

    # 1. Kiểm tra trường hợp trang tiếp nối của bảng khuyến cáo (Table Continued)
    if prev_page_is_candidate and prev_system != GradingSystemType.UNKNOWN:
        has_cor_row = bool(re.search(r"\b(1|2a|2b|3)\b\s+(A|B-R|B-NR|C-LD|C-EO)\b", text, re.IGNORECASE))
        has_grade_level = bool(re.search(r"\b(High|Moderate|Low|Very Low)\b", text, re.IGNORECASE))

        if has_continued or has_cor_row or has_grade_level:
            signals = detected.get(prev_system, []) + (["TABLE_CONTINUATION_INHERITED"] if not has_continued else ["TABLE_CONTINUED"])
            return True, prev_system, signals

    # 2. Đánh giá hệ thống chiếm ưu thế dựa trên số lượng tín hiệu mạnh
    candidate_systems = [s for s in [GradingSystemType.AHA_ACC, GradingSystemType.GRADE_ESO, GradingSystemType.AAN] if s in detected]
    if candidate_systems:
        # Chọn hệ thống có nhiều tín hiệu khớp nhất
        best_sys = max(candidate_systems, key=lambda s: len(detected[s]))
        signals = detected[best_sys]
        if has_continued:
            signals.append("TABLE_CONTINUED")
        return True, best_sys, signals

    # 3. Hệ thống GENERIC hoặc mục Điểm mới
    if GradingSystemType.GENERIC in detected:
        signals = detected[GradingSystemType.GENERIC]
        if has_continued:
            signals.append("TABLE_CONTINUED")
        if len(signals) >= 1:
            return True, GradingSystemType.GENERIC, signals

    if has_continued and prev_page_is_candidate:
        return True, prev_system, ["TABLE_CONTINUED"]

    return False, GradingSystemType.UNKNOWN, []
