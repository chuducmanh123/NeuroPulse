import re
from typing import Tuple, List, Set
from core.common.contracts import AnalyzedRecommendation, GradingSystemType
from core.analyze.core import normalize_cor, normalize_loe

# Tập hợp stop words y khoa & tiếng Anh cơ bản
STOP_WORDS: Set[str] = {
    "a", "an", "the", "in", "on", "at", "by", "for", "with", "about", "against",
    "between", "into", "through", "during", "before", "after", "above", "below",
    "to", "from", "up", "down", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "and", "but", "if", "or", "because",
    "as", "until", "while", "of", "it", "its", "that", "this", "these", "those",
    "we", "you", "they", "our", "their", "should", "would", "could", "may", "might"
}

VALID_AHA_COR: Set[str] = {"1", "2a", "2b", "3"}
VALID_AHA_LOE: Set[str] = {"a", "b-r", "b-nr", "c-ld", "c-eo", "b", "c"}
VALID_ESO_QUALITY: Set[str] = {"high", "moderate", "low", "very low"}


def _tokenize(text: str) -> List[str]:
    """Tách từ, chuẩn hóa chữ thường và lọc bỏ dấu câu."""
    cleaned = re.sub(r"[^\w\s\-\.]", " ", text.lower())
    return [w.strip() for w in cleaned.split() if len(w.strip()) > 1 and w.strip() not in STOP_WORDS]


def verify_grounding(statement: str, verbatim_quote: str, page_text: str) -> Tuple[float, List[str]]:
    """
    Kiểm chứng đối chiếu câu khuyến cáo với văn bản gốc của trang.
    Luôn kiểm tra token overlap của chính statement để tránh LLM tự cung cấp verbatim_quote đánh lừa.
    Trả về: (score: 0.0 - 1.0, issues: List[str])
    """
    issues = []
    if not page_text or not page_text.strip():
        return 0.0, ["Trang PDF gốc không chứa văn bản nào để đối chiếu."]

    page_text_clean = page_text.lower()

    # 1. Tính token overlap bắt buộc cho chính statement
    statement_tokens = _tokenize(statement)
    if not statement_tokens:
        return 0.0, ["Câu khuyến cáo quá ngắn hoặc chỉ chứa từ dừng."]

    present_tokens = [t for t in statement_tokens if t in page_text_clean]
    statement_overlap = round(len(present_tokens) / len(statement_tokens), 2)

    # 2. Kiểm tra verbatim_quote nếu có (chỉ làm điều kiện bổ sung, không vượt qua statement_overlap)
    quote_score = statement_overlap
    if verbatim_quote and len(verbatim_quote.strip()) > 15:
        quote_clean = verbatim_quote.strip().lower()
        if quote_clean in page_text_clean:
            quote_score = 1.0
        else:
            quote_tokens = _tokenize(quote_clean)
            if quote_tokens:
                present_q = sum(1 for t in quote_tokens if t in page_text_clean)
                quote_score = round(present_q / len(quote_tokens), 2)
                if quote_score < 0.70:
                    issues.append("Trích dẫn nguyên văn (verbatim_quote) không khớp đầy đủ với trang gốc.")
    else:
        issues.append("Thiếu trích dẫn nguyên văn (verbatim_quote) đủ dài để đối chiếu.")

    final_score = min(statement_overlap, quote_score) if statement_overlap < 0.40 else statement_overlap
    if statement_overlap < 0.40:
        issues.append(f"Tỷ lệ trùng khớp từ vựng của khuyến cáo quá thấp ({statement_overlap*100:.0f}%), nghi ngờ AI ảo giác.")
    elif statement_overlap < 0.70:
        issues.append(f"Tỷ lệ trùng khớp ở mức trung bình ({statement_overlap*100:.0f}%), câu có thể đã được viết lại.")

    return final_score, issues


def verify_classification(rec: AnalyzedRecommendation) -> Tuple[bool, List[str]]:
    """
    Kiểm tra tính hợp lệ của thang đo và mức độ khuyến cáo.
    Hỗ trợ chuẩn hóa nhãn (Normalizer) và phân biệt giữa High-Impact Changes và Khuyến cáo thường quy.
    Trả về: (is_valid: bool, issues: List[str])
    """
    issues = []
    is_valid = True

    # Nếu là mục Điểm mới (What Is New / Practice Changes), vẫn kiểm tra hợp lệ COR/LOE nếu có
    if getattr(rec, "is_high_impact_change", False):
        if rec.cor:
            norm_cor, _ = normalize_cor(rec.cor)
            if not norm_cor or norm_cor.lower() not in VALID_AHA_COR:
                issues.append(f"Mức COR '{rec.cor}' của điểm mới không chuẩn ({norm_cor}).")
                is_valid = False
        if rec.loe:
            norm_loe, _ = normalize_loe(rec.loe)
            if not norm_loe or norm_loe.lower() not in VALID_AHA_LOE:
                issues.append(f"Mức LOE '{rec.loe}' của điểm mới không chuẩn ({norm_loe}).")
                is_valid = False
        return is_valid, issues

    if rec.grading_system == GradingSystemType.AHA_ACC:
        # Kiểm tra COR
        if not rec.cor:
            issues.append("Thiếu thông tin Class of Recommendation (COR) cho guideline AHA.")
            is_valid = False
        else:
            norm_cor, _ = normalize_cor(rec.cor)
            if not norm_cor or norm_cor.lower() not in VALID_AHA_COR:
                issues.append(f"Mức COR '{rec.cor}' không hợp lệ trong hệ thống AHA (chỉ chấp nhận 1, 2a, 2b, 3).")
                is_valid = False

        # Kiểm tra LOE
        if rec.loe:
            norm_loe, _ = normalize_loe(rec.loe)
            if not norm_loe or norm_loe.lower() not in VALID_AHA_LOE:
                issues.append(f"Mức LOE '{rec.loe}' không hợp lệ trong hệ thống AHA (A, B-R, B-NR, C-LD, C-EO).")
                is_valid = False

    elif rec.grading_system == GradingSystemType.GRADE_ESO:
        # Kiểm tra có ít nhất một trường phân loại GRADE
        if not rec.quality_of_evidence and not rec.strength_of_recommendation and not rec.voting:
            issues.append("Thiếu thông tin phân loại GRADE/ESO (quality_of_evidence, strength_of_recommendation hoặc voting).")
            is_valid = False

        # Kiểm tra Quality of evidence
        if rec.quality_of_evidence and rec.quality_of_evidence.strip().lower() not in VALID_ESO_QUALITY:
            issues.append(f"Chất lượng bằng chứng '{rec.quality_of_evidence}' không chuẩn GRADE (High, Moderate, Low, Very Low).")
            is_valid = False

        # Kiểm tra Voting ratio nếu có
        if rec.voting:
            voting_str = rec.voting.strip()
            if not re.match(r"^\d+\s*/\s*\d+$", voting_str) and voting_str.lower() != "unanimous":
                issues.append(f"Định dạng bỏ phiếu '{rec.voting}' không chuẩn (mong đợi dạng X/Y như 8/8 hoặc Unanimous).")

    return is_valid, issues


def verify_numerical_values(statement: str, page_text: str) -> Tuple[bool, List[str]]:
    """
    Rà soát tất cả các số định lượng then chốt trong khuyến cáo xem có trong văn bản gốc không.
    Loại trừ các số tham chiếu (superscript citations như 1-10, 9-12) và số điện thoại khẩn cấp.
    Trả về: (all_numbers_verified: bool, issues: List[str])
    """
    issues = []
    page_text_clean = page_text.lower()

    # Làm sạch câu khuyến cáo: bỏ các chỉ số trích dẫn tài liệu dạng 1-10, 1-4, 9-12 hoặc [1-10]
    cleaned_statement = re.sub(r"\[\d+[\-\,\d]*\]", " ", statement)
    cleaned_statement = re.sub(r"(?<=[a-zA-Z\.])\d+[\-\,]\d+", " ", cleaned_statement)

    # Tìm các con số: số nguyên, số thập phân (e.g., 4.5, 0.9, 24, 185/110)
    numbers_in_statement = re.findall(r"\b\d+(?:[\.\/]\d+)?\b", cleaned_statement)

    # Các số đặc biệt cần bỏ qua kiểm tra đơn độc
    IGNORED_NUMBERS = {"1", "2", "3", "9", "911", "115"}

    missing_numbers = []
    for num in set(numbers_in_statement):
        if num in IGNORED_NUMBERS:
            continue
        # Kiểm tra xuất hiện trực tiếp hoặc trong cụm số
        if num not in page_text_clean:
            missing_numbers.append(num)

    if missing_numbers:
        issues.append(f"Phát hiện các con số trong khuyến cáo KHÔNG xuất hiện trên trang gốc: {missing_numbers}")
        return False, issues

    return True, []
