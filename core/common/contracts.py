from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class DocumentLifecycleState(str, Enum):
    """Máy trạng thái vòng đời xử lý của một tài liệu hướng dẫn lâm sàng."""
    DISCOVERED = "DISCOVERED"         # Mới phát hiện từ danh mục nguồn đã duyệt
    FETCHED = "FETCHED"               # Đã tải file PDF gốc & kiểm tra sha256 thành công
    EXTRACTED = "EXTRACTED"           # Đã bóc layout, số trang & các bảng khuyến cáo
    ANALYZED = "ANALYZED"             # Đã gọi AI trích xuất sang JSON chuẩn
    VERIFIED = "VERIFIED"             # Đã vượt qua bộ kiểm chứng logic độc lập
    PENDING_REVIEW = "PENDING_REVIEW" # Đang nằm trong hàng đợi chờ bác sĩ phê duyệt
    CONFIRMED = "CONFIRMED"           # Đã duyệt & chính thức công bố trên NeuroGuide
    FAILED = "FAILED"                 # Xảy ra lỗi ở một bước trong chuỗi


class CoreError(BaseModel):
    """Định dạng lỗi chuẩn có cấu trúc của tất cả các lõi."""
    code: str                         # Mã lỗi định danh (e.g. INVALID_PDF_HEADER, TIMEOUT)
    message: str                      # Mô tả lỗi chi tiết
    retryable: bool = False           # Bộ điều phối có được phép thử lại (retry) không?
    step: Optional[str] = None        # Tên lõi gây ra lỗi
    details: Optional[Dict[str, Any]] = None  # Dữ liệu debug bổ trợ


class CoreException(Exception):
    """Exception nghiệp vụ của hệ thống lõi để có thể raise và catch theo đúng chuẩn Python."""

    def __init__(
        self,
        code: str,
        message: str,
        retryable: bool = False,
        step: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.error = CoreError(
            code=code,
            message=message,
            retryable=retryable,
            step=step,
            details=details,
        )


class CoreResult(BaseModel):
    """Hợp đồng kết quả thực thi duy nhất của mọi lõi."""
    ok: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[CoreError] = None
    meta: Dict[str, Any] = Field(default_factory=dict)  # Thời gian thực thi ms, token, phiên bản lõi


class GradingSystemType(str, Enum):
    """Các hệ thống phân loại mức độ khuyến cáo và bằng chứng trong y khoa."""
    AHA_ACC = "AHA_ACC"               # COR 1, 2a, 2b, 3; LOE A, B-R, B-NR, C-LD, C-EO
    GRADE_ESO = "GRADE_ESO"           # Quality of evidence, Strength of rec, Expert Consensus, Voting, PICO
    AAN = "AAN"                       # Level A, Level B, Level C, Level U
    GENERIC = "GENERIC"               # Phân loại khác (I, II, III / Grade A, B, C)
    UNKNOWN = "UNKNOWN"               # Chưa xác định


class ExtractedTable(BaseModel):
    """Bảng cấu trúc được bóc tách từ trang PDF."""
    table_index: int
    page_num: int                     # Số trang vật lý (1-indexed)
    headers: List[str] = Field(default_factory=list)
    rows: List[List[str]] = Field(default_factory=list)
    raw_markdown: str = ""


class CandidatePage(BaseModel):
    """Trang PDF được xác định là chứa khuyến cáo lâm sàng."""
    page_num: int                     # Số trang vật lý (1-indexed)
    grading_system: GradingSystemType
    matched_signals: List[str] = Field(default_factory=list)  # Các từ khóa nhận diện được
    extracted_tables: List[ExtractedTable] = Field(default_factory=list)
    page_text: str = ""               # Toàn văn của trang đã xử lý thứ tự đọc


class ExtractInput(BaseModel):
    file_id: str                      # Mã SHA-256 từ Lõi Fetch
    storage_path: Optional[str] = None
    society_hint: Optional[str] = None # AHA, ESO, AAN, EAN, NCS...


class ExtractOutput(BaseModel):
    file_id: str
    total_pages: int
    candidate_page_count: int
    detected_grading_systems: List[GradingSystemType] = Field(default_factory=list)
    candidate_pages: List[CandidatePage] = Field(default_factory=list)
    state: DocumentLifecycleState = DocumentLifecycleState.EXTRACTED


class AnalyzedRecommendation(BaseModel):
    """Một khuyến cáo lâm sàng cụ thể đã được AI bóc tách sang dữ liệu có cấu trúc."""
    rec_id: str                       # e.g., "AHA-P2-R1" hoặc "ESO-P4-PICO5"
    guideline_id: str
    grading_system: GradingSystemType
    page_num: int
    section: Optional[str] = None     # Tên phần, ví dụ: "2.1 Stroke Awareness"
    topic: Optional[str] = None       # Chủ đề lâm sàng, ví dụ: "Prehospital Management"
    pico_id: Optional[str] = None     # e.g., "PICO 5" nếu thuộc ESO/GRADE
    statement: str                    # Nội dung khuyến cáo đầy đủ

    # Các trường dành cho AHA/ACC
    cor: Optional[str] = None         # "1", "2a", "2b", "3"
    cor_label: Optional[str] = None   # e.g. "Strong", "Moderate", "Weak", "Harm"
    loe: Optional[str] = None         # "A", "B-R", "B-NR", "C-LD", "C-EO"
    loe_label: Optional[str] = None   # e.g. "High Quality (RCT)", "Moderate (Non-RCT)"

    # Các trường dành cho ESO / GRADE (đặc thù trong ảnh bạn cung cấp)
    quality_of_evidence: Optional[str] = None        # "High", "Moderate", "Low", "Very Low"
    strength_of_recommendation: Optional[str] = None # "Strong for intervention", "Weak for intervention", etc.
    consensus_statement: Optional[str] = None        # Nội dung đồng thuận nếu là Expert Consensus
    voting: Optional[str] = None                     # e.g., "8/8" hoặc "Unanimous"

    # Thông tin lâm sàng bổ trợ
    is_high_impact_change: bool = False              # True nếu thuộc mục "What Is New / Practice Changes"
    change_type: Optional[str] = None                # "NEW", "UPGRADED", "DOWNGRADED", "REVISED", "STANDARD"
    previous_grade: Optional[str] = None             # Mức khuyến cáo cũ nếu có (đối chiếu phiên bản trước)
    target_population: Optional[str] = None          # e.g., "Adults with acute ischemic stroke"
    action_type: Optional[str] = None                # e.g., "THROMBOLYSIS", "DIAGNOSIS", "PREVENTION"
    driving_trials: List[str] = Field(default_factory=list) # Danh sách thử nghiệm lâm sàng then chốt
    verbatim_quote: Optional[str] = None             # Đoạn văn bản gốc để Lõi Verify đối chiếu
    state: DocumentLifecycleState = DocumentLifecycleState.ANALYZED


class AnalyzeInput(BaseModel):
    file_id: str
    candidate_pages: List[CandidatePage]
    society_hint: Optional[str] = None


class AnalyzeOutput(BaseModel):
    file_id: str
    total_recommendations: int
    recommendations: List[AnalyzedRecommendation] = Field(default_factory=list)
    total_tokens_used: int = 0
    model_used: str = "gemini"
    state: DocumentLifecycleState = DocumentLifecycleState.ANALYZED


class VerificationStatus(str, Enum):
    PASSED = "PASSED"                 # Vượt qua 100% kiểm tra logic
    WARNING = "WARNING"               # Cần lưu ý khi Bác sĩ duyệt
    FAILED = "FAILED"                 # Lỗi logic nghiêm trọng hoặc hallucination


class RecommendationVerificationDetail(BaseModel):
    rec_id: str
    status: VerificationStatus
    grounding_score: float = 1.0      # Tỷ lệ trùng khớp từ vựng (0.0 - 1.0)
    classification_valid: bool = True
    numbers_verified: bool = True
    issues: List[str] = Field(default_factory=list) # Danh sách vấn đề phát hiện


class VerifiedRecommendation(AnalyzedRecommendation):
    verification_detail: RecommendationVerificationDetail
    state: DocumentLifecycleState = DocumentLifecycleState.VERIFIED


class VerifyInput(BaseModel):
    file_id: str
    recommendations: List[AnalyzedRecommendation]
    candidate_pages: List[CandidatePage] # Văn bản gốc các trang tương ứng để đối chiếu


class VerifyOutput(BaseModel):
    file_id: str
    total_verified: int
    passed_count: int
    warning_count: int
    failed_count: int
    verified_recommendations: List[VerifiedRecommendation] = Field(default_factory=list)
    state: DocumentLifecycleState = DocumentLifecycleState.VERIFIED


class ApprovalStatus(str, Enum):
    """Trạng thái phê duyệt y khoa của Bác sĩ (Human-in-the-loop)."""
    PENDING_REVIEW = "PENDING_REVIEW" # Đang nằm trong hàng đợi chờ duyệt
    APPROVED = "APPROVED"             # Bác sĩ đã xác nhận chính thức
    REJECTED = "REJECTED"             # Bác sĩ từ chối (sai sót hoặc không phù hợp)
    MODIFIED = "MODIFIED"             # Bác sĩ đã chỉnh sửa trước khi xác nhận


class StoredRecommendation(VerifiedRecommendation):
    """Khuyến cáo đã được gắn trạng thái phê duyệt và audit trail."""
    approval_status: ApprovalStatus = ApprovalStatus.PENDING_REVIEW
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    review_notes: Optional[str] = None


class GuidelineDocumentRecord(BaseModel):
    """Bản ghi hoàn chỉnh của một Guideline trong cơ sở dữ liệu lưu trữ."""
    guideline_id: str
    version: int = 1
    metadata: "GuidelineMetadata"
    total_recommendations: int
    pending_count: int
    approved_count: int
    rejected_count: int
    recommendations: List[StoredRecommendation] = Field(default_factory=list)
    created_at: str
    updated_at: str


class StoreInput(BaseModel):
    file_id: str
    metadata: "GuidelineMetadata"
    verified_recommendations: List[VerifiedRecommendation]


class StoreOutput(BaseModel):
    file_id: str
    version: int
    storage_path: str
    total_stored: int
    pending_count: int
    approved_count: int
    state: DocumentLifecycleState = DocumentLifecycleState.PENDING_REVIEW


class DiscoveredGuideline(BaseModel):
    """Một bài hướng dẫn lâm sàng mới phát hiện từ danh mục nguồn đã duyệt."""
    guideline_id_candidate: str       # Khóa định danh tạm thời (URL hash hoặc DOI slug)
    title: str
    society: str
    year: Optional[int] = None
    source_url: str
    pdf_url: Optional[str] = None
    doi: Optional[str] = None
    category: Optional[str] = None    # Stroke, Epilepsy, Neuro-ICU, Headache...
    adapter_used: str = "HTML_DIRECTORY" # "HTML_DIRECTORY" hoặc "PUBMED_API"
    is_new: bool = True               # True nếu chưa có trong catalog


class DiscoveryInput(BaseModel):
    societies: Optional[List[str]] = None  # None = tất cả nguồn
    limit_per_source: int = 10
    year_min: int = 2018


class DiscoveryOutput(BaseModel):
    total_discovered: int
    new_discovered_count: int
    items: List[DiscoveredGuideline] = Field(default_factory=list)
    state: DocumentLifecycleState = DocumentLifecycleState.DISCOVERED


class GuidelineMetadata(BaseModel):
    """Metadata cơ bản của tài liệu guideline."""
    guideline_id: str                 # ID duy nhất (thường là SHA-256 hoặc mã chuẩn hóa)
    title: str
    society: str                      # AHA/ASA, ESO, AAN, etc.
    year: Optional[int] = None
    source_url: Optional[str] = None
    doi: Optional[str] = None
    state: DocumentLifecycleState = DocumentLifecycleState.DISCOVERED
