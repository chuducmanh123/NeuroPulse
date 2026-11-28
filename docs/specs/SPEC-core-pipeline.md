# Spec: Hệ thống Lõi Điều phối Xử lý Học thuật NeuroGuide (Bước 0, 1 & 2)

## 1. Objective (Mục tiêu)
Xây dựng nền tảng Lõi Điều phối (Orchestration Engine) độc lập để bóc tách tài liệu hướng dẫn thực hành lâm sàng (Clinical Practice Guidelines) cho chuyên trang NeuroGuide:
- **Bước 0 (`core-common`)**: Thiết lập chuẩn dữ liệu chung (Data Contract), mô hình kết quả thực thi (`CoreResult`), hệ thống lỗi có phân loại (`CoreError`), và máy trạng thái vòng đời tài liệu (`DocumentLifecycleState`).
- **Bước 1 (`core-fetch`)**: Xây dựng Lõi tải và thu nạp tài liệu (Fetch & Ingestion). Hỗ trợ tải từ URL hoặc nhận stream upload; xác thực magic bytes của PDF; tính toán hash SHA-256 chống trùng lặp; trích xuất số trang ban đầu; lưu trữ tài liệu an toàn.
- **Bước 2 (`core-extract`)**: Xây dựng Lõi Bóc tách & Phân tích Cấu trúc (Layout & Table Extraction).
  - **Hỗ trợ Đa Hệ thống Phân loại (Multi-Grading System Recognition)**:
    - `AHA_ACC`: Class of Recommendation (COR), Level of Evidence (LOE).
    - `GRADE_ESO`: Quality of Evidence (High, Moderate, Low, Very Low), Strength of Recommendation (Strong/Weak for/against), Expert Consensus Statement, Voting (e.g., 8/8), PICO format.
    - `AAN`: Level A, B, C, U.
    - `GENERIC`: Phân loại La Mã / Grade A/B/C.
  - **Lọc trang mục tiêu (Candidate Page Filtering)**: Quét nhanh tài liệu 50–120 trang, lọc ra chính xác 15–30 trang chứa bảng/khối khuyến cáo.
  - **Trích xuất Bảng & Khối văn bản chuyên sâu**: Kết hợp `pdfplumber` (bóc bảng đa cột) và `pymupdf` (đọc text layout, bounding box) để giữ nguyên cấu trúc phân cột.
- **Bước 3 (`core-analyze`)**: Xây dựng Lõi Phân tích & Trích xuất Khuyến cáo chuyên sâu bằng **Google Gemini AI**.
  - **Waterfall Model Strategy**: `gemini-flash-lite-latest` $\rightarrow$ `gemini-2.5-flash-lite` $\rightarrow$ `gemini-2.5-flash`.
  - **Ép kiểu JSON Schema 100%**: Sử dụng `responseMimeType: "application/json"`.
  - **Prompt Chuyên biệt theo Hệ thống**: Tự động chuyển đổi template trích xuất tương ứng với `AHA_ACC` (COR/LOE) hay `GRADE_ESO` (Quality of evidence / Strength of recommendation / Voting / PICO) hay `AAN`.
  - **Định lượng Token & Chi phí**: Ghi nhận `prompt_tokens`, `candidates_tokens`, thời gian phản hồi vào metadata.
- **Bước 4 (`core-verify`)**: Xây dựng Lõi Kiểm chứng Độc lập (Independent Verification Engine).
  - **Thuật toán Code Logic thuần túy (Rule-based, KHÔNG DÙNG LLM)**: Đảm bảo tính khách quan tuyệt đối.
  - **Grounding & Provenance Check**: Đối chiếu `verbatim_quote` và các câu khuyến cáo với toàn văn của trang PDF gốc bằng thuật toán n-gram / token overlap.
  - **Classification Integrity Check**: Kiểm tra tính hợp lệ của thang đo COR (`1, 2a, 2b, 3`), LOE, Quality of evidence, Strength of recommendation và tỷ lệ bỏ phiếu (`Voting: X/Y`).
  - **Numerical Value Verification**: Sử dụng regex rà soát các giá trị định lượng lâm sàng (cửa sổ thời gian, liều thuốc, huyết áp) xem có hiện diện trong trang gốc hay không.
  - **Gắn cờ kiểm duyệt**: Phân loại `PASSED`, `WARNING`, `FAILED` để chuẩn bị cho hàng đợi duyệt của Bác sĩ.
- **Bước 5 (`core-store`)**: Xây dựng Lõi Lưu trữ & Quản lý Phiên bản (Storage & Review Manager).
  - **Quản lý Phiên bản (Version Control)**: Lưu trữ theo phiên bản (`v1`, `v2`...) dựa trên mã băm SHA-256, không bao giờ ghi đè làm mất lịch sử bóc tách cũ.
  - **Phân tách Trạng thái Phê duyệt (Approval State Separation)**: Toàn bộ khuyến cáo mới qua verify được đặt vào `PENDING_REVIEW` (Hàng đợi chờ duyệt) và chỉ hiển thị chính thức khi chuyển sang `CONFIRMED`.
  - **Hỗ trợ Tra cứu & Thao tác Duyệt (Review Operations)**: Cung cấp API/hàm lấy danh sách duyệt `get_review_queue()`, phê duyệt `approve_recommendation()`, hoặc từ chối `reject_recommendation()`.
  - **Kho dữ liệu Catalog Đồng bộ**: Tự động cập nhật `data/neuroguide_catalog.json` phục vụ render tức thì trên Web NeuroGuide.
- **Bước 6 (`core-discovery`)**: Xây dựng Lõi Tự động Phát hiện Guideline Mới (Discovery Engine).
  - **Danh mục Nguồn Đã Duyệt (Whitelisted Sources)**: Quét 12 hội chuyên khoa và tạp chí thần kinh hàng đầu (ESO, AHA, NCS, ILAE, AES, AAN, EAN, PNS, AHS, Wiley, NICE).
  - **Kiến trúc Kép (Dual Adapter Architecture)**:
    - `HtmlDirectoryAdapter`: Bóc tách trực tiếp cây thư mục HTML của các hội mở.
    - `PubmedSocietyAdapter`: Tận dụng NCBI E-utilities API cho các nguồn bị WAF (Wiley, NICE).
  - **Khử trùng lặp (Deduplication)**: Tự động đối chiếu với `catalog.json` để chỉ phát hiện các tài liệu mới chưa từng xử lý.

---

## 2. Tech Stack & Dependencies
- **Runtime**: Python 3.10+
- **Schema & Validation**: `pydantic` >= 2.0
- **Network Request**: `httpx` hoặc `requests` với cấu hình User-Agent định danh y khoa, timeout an toàn
- **PDF Deep Inspection & Layout Engine**: `pdfplumber` & `pymupdf` (fitz) – Thư viện chuyên sâu phân tích trang, bảng và metadata ngay từ đầu
- **Storage Adapter**: Local Disk Storage Adapter (`data/guidelines_raw/`) với giao diện trừu tượng sẵn sàng gắn Google Drive/S3
- **Hashing**: Thư viện chuẩn `hashlib` (SHA-256)
- **Testing**: `pytest`

---

## 3. Commands
- **Cài đặt thư viện bổ trợ**: `pip install pydantic requests pypdf pytest`
- **Chạy Test đơn vị**: `pytest tests/core/test_fetch.py -v`
- **Chạy CLI thử nghiệm Lõi Fetch**:
  ```bash
  python -m core.fetch.runner --url "https://example.com/guideline.pdf" --source "AHA"
  ```

---

## 4. Project Structure
```
d:\NeuroPulse\
├── core/
│   ├── __init__.py
│   ├── common/
│   │   ├── __init__.py
│   │   ├── base.py            # BaseCore protocol & abstract class
│   │   ├── contracts.py       # CoreResult, CoreError, DocumentState, GuidelineMetadata
│   │   └── exceptions.py      # Core-level exceptions
│   └── fetch/
│       ├── __init__.py
│       ├── core.py            # FetchCore implementation
│       ├── storage_adapter.py # Adapter lưu trữ (Local File Store, chuẩn bị cho Drive/S3)
│       └── runner.py          # CLI runner để test tay
├── data/
│   └── guidelines_raw/        # Kho lưu trữ PDF theo mã băm {sha256}.pdf
└── tests/
    └── core/
        ├── test_common.py     # Test contracts & error handling
        └── test_fetch.py      # Test tải PDF, kiểm tra hash, xử lý idempotent
```

---

## 5. Code Style & Technical Contracts

### 5.1. Common Data Contracts (`core/common/contracts.py`)
```python
from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class DocumentLifecycleState(str, Enum):
    DISCOVERED = "DISCOVERED"         # Mới phát hiện từ nguồn duyệt
    FETCHED = "FETCHED"               # Đã tải file & kiểm tra sha256
    EXTRACTED = "EXTRACTED"           # Đã bóc layout, trang, bảng khuyến cáo
    ANALYZED = "ANALYZED"             # Đã gọi AI trích xuất JSON
    VERIFIED = "VERIFIED"             # Đã qua kiểm tra logic độc lập
    PENDING_REVIEW = "PENDING_REVIEW" # Đang chờ bác sĩ duyệt trên web
    CONFIRMED = "CONFIRMED"           # Đã duyệt & xuất bản
    FAILED = "FAILED"                 # Lỗi tại một bước

class CoreError(BaseModel):
    code: str                         # e.g., "INVALID_PDF", "FETCH_TIMEOUT", "DOWNLOAD_FORBIDDEN"
    message: str
    retryable: bool = False
    details: Optional[Dict[str, Any]] = None

class CoreResult(BaseModel):
    ok: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[CoreError] = None
    meta: Dict[str, Any] = Field(default_factory=dict) # core_version, execution_ms
```

### 5.2. Fetch Contract & Core Protocol (`core/fetch/core.py`)
```python
class FetchInput(BaseModel):
    source_url: Optional[str] = None
    local_path: Optional[str] = None
    society: str = "AHA"
    title_hint: Optional[str] = None
    year_hint: Optional[int] = None

class FetchOutput(BaseModel):
    file_id: str                      # sha256 hash
    storage_path: str                 # Đường dẫn lưu trữ
    sha256: str
    size_bytes: int
    page_count: int
    content_type: str
    is_duplicate: bool                # True nếu file này đã tồn tại sẵn
    state: DocumentLifecycleState = DocumentLifecycleState.FETCHED
```

### 5.3. Extract Contract (`core/extract/core.py`)
```python
class GradingSystemType(str, Enum):
    AHA_ACC = "AHA_ACC"               # COR 1, 2a, 2b, 3; LOE A, B-R, B-NR, C-LD, C-EO
    GRADE_ESO = "GRADE_ESO"           # Quality of evidence, Strength of recommendation, Consensus, Voting
    AAN = "AAN"                       # Level A, B, C, U
    GENERIC = "GENERIC"               # Phân loại khác / Chưa rõ

class ExtractedTable(BaseModel):
    table_index: int
    page_num: int
    headers: List[str]
    rows: List[List[str]]
    raw_markdown: str

class CandidatePage(BaseModel):
    page_num: int
    grading_system: GradingSystemType
    matched_signals: List[str]        # Các từ khóa/ký hiệu phát hiện được
    extracted_tables: List[ExtractedTable]
    page_text: str

class ExtractInput(BaseModel):
    file_id: str                      # SHA-256 từ Lõi Fetch
    storage_path: Optional[str] = None
    society_hint: Optional[str] = None # AHA, ESO, AAN...

class ExtractOutput(BaseModel):
    file_id: str
    total_pages: int
    candidate_page_count: int
    detected_grading_systems: List[GradingSystemType]
    candidate_pages: List[CandidatePage]
    state: DocumentLifecycleState = DocumentLifecycleState.EXTRACTED
```

### 5.4. Analyze Contract (`core/analyze/core.py`)
```python
class AnalyzedRecommendation(BaseModel):
    rec_id: str                       # e.g., "AHA-AIS-2026-P4-R1" hoặc "ESO-SAP-PICO5-R1"
    guideline_id: str
    grading_system: GradingSystemType
    page_num: int
    section: Optional[str] = None
    topic: Optional[str] = None
    pico_id: Optional[str] = None     # e.g., "PICO 5" nếu thuộc ESO/GRADE
    statement: str                    # Nội dung câu khuyến cáo đầy đủ

    # Các trường dành cho AHA/ACC
    cor: Optional[str] = None         # 1, 2a, 2b, 3
    loe: Optional[str] = None         # A, B-R, B-NR, C-LD, C-EO

    # Các trường dành cho ESO / GRADE
    quality_of_evidence: Optional[str] = None        # High, Moderate, Low, Very Low
    strength_of_recommendation: Optional[str] = None # Strong/Weak for/against intervention
    consensus_statement: Optional[str] = None        # Nội dung đồng thuận nếu là Expert Consensus
    voting: Optional[str] = None                     # e.g., "8/8" hoặc "Unanimous"

    # Thông tin lâm sàng bổ trợ
    target_population: Optional[str] = None
    action_type: Optional[str] = None                # e.g., "THROMBOLYSIS", "DIAGNOSIS", "BLOOD_PRESSURE"
    driving_trials: List[str] = Field(default_factory=list)
    verbatim_quote: Optional[str] = None             # Trích đoạn nguyên văn để Verify đối chiếu
    state: DocumentLifecycleState = DocumentLifecycleState.ANALYZED

class AnalyzeInput(BaseModel):
    file_id: str
    candidate_pages: List[CandidatePage]
    society_hint: Optional[str] = None

class AnalyzeOutput(BaseModel):
    file_id: str
    total_recommendations: int
    recommendations: List[AnalyzedRecommendation]
    total_tokens_used: int
    state: DocumentLifecycleState = DocumentLifecycleState.ANALYZED
```

### 5.5. Verify Contract (`core/verify/core.py`)
```python
class VerificationStatus(str, Enum):
    PASSED = "PASSED"                 # Vượt qua 100% kiểm tra logic
    WARNING = "WARNING"               # Cần lưu ý khi Bác sĩ duyệt
    FAILED = "FAILED"                 # Lỗi logic nghiêm trọng hoặc hallucination

class RecommendationVerificationDetail(BaseModel):
    rec_id: str
    status: VerificationStatus
    grounding_score: float            # Tỷ lệ trùng khớp từ vựng (0.0 - 1.0)
    classification_valid: bool
    numbers_verified: bool
    issues: List[str] = Field(default_factory=list) # Danh sách vấn đề phát hiện

class VerifiedRecommendation(AnalyzedRecommendation):
    verification_detail: RecommendationVerificationDetail
    state: DocumentLifecycleState = DocumentLifecycleState.VERIFIED

class VerifyInput(BaseModel):
    file_id: str
    recommendations: List[AnalyzedRecommendation]
    candidate_pages: List[CandidatePage] # Cung cấp văn bản gốc theo từng trang để đối chiếu

class VerifyOutput(BaseModel):
    file_id: str
    total_verified: int
    passed_count: int
    warning_count: int
    failed_count: int
    verified_recommendations: List[VerifiedRecommendation]
    state: DocumentLifecycleState = DocumentLifecycleState.VERIFIED
```

### 5.6. Store Contract (`core/store/core.py`)
```python
class ApprovalStatus(str, Enum):
    PENDING_REVIEW = "PENDING_REVIEW" # Đang chờ Bác sĩ duyệt
    APPROVED = "APPROVED"             # Bác sĩ đã xác nhận chính thức
    REJECTED = "REJECTED"             # Bác sĩ từ chối (sai sót hoặc không phù hợp)
    MODIFIED = "MODIFIED"             # Bác sĩ đã chỉnh sửa trước khi xác nhận

class StoredRecommendation(VerifiedRecommendation):
    approval_status: ApprovalStatus = ApprovalStatus.PENDING_REVIEW
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    review_notes: Optional[str] = None

class GuidelineDocumentRecord(BaseModel):
    guideline_id: str
    version: int = 1
    metadata: GuidelineMetadata
    total_recommendations: int
    pending_count: int
    approved_count: int
    rejected_count: int
    recommendations: List[StoredRecommendation]
    created_at: str
    updated_at: str

class StoreInput(BaseModel):
    file_id: str
    metadata: GuidelineMetadata
    verified_recommendations: List[VerifiedRecommendation]

class StoreOutput(BaseModel):
    file_id: str
    version: int
    storage_path: str
    total_stored: int
    pending_count: int
    approved_count: int
    state: DocumentLifecycleState = DocumentLifecycleState.PENDING_REVIEW
```

### 5.7. Discovery Contract (`core/discovery/core.py`)
```python
class DiscoveredGuideline(BaseModel):
    guideline_id_candidate: str       # Khóa tạm (slug hoặc URL hash)
    title: str
    society: str
    year: Optional[int] = None
    source_url: str
    pdf_url: Optional[str] = None
    doi: Optional[str] = None
    category: Optional[str] = None    # Stroke, Epilepsy, Neuro-ICU...
    adapter_used: str                 # "HTML_DIRECTORY" hoặc "PUBMED_API"
    is_new: bool = True               # True nếu chưa có trong catalog

class DiscoveryInput(BaseModel):
    societies: Optional[List[str]] = None # Lọc theo hội cụ thể (ví dụ: ["ESO", "ILAE"]) hoặc None = tất cả
    limit_per_source: int = 10
    year_min: int = 2018

class DiscoveryOutput(BaseModel):
    total_discovered: int
    new_discovered_count: int
    items: List[DiscoveredGuideline]
    state: DocumentLifecycleState = DocumentLifecycleState.DISCOVERED
```

---

## 6. Testing Strategy
- **Unit Tests (`test_common.py`)**:
  - Đảm bảo `CoreResult` serialize đúng chuẩn JSON.
  - Phân loại chính xác lỗi `retryable=True` (như HTTP 503, 429) và `retryable=False` (như file không phải PDF, HTTP 404).
- **Fetch Tests (`test_fetch.py`)**:
  - Kiểm tra tải 1 file PDF mẫu hợp lệ $\rightarrow$ thành công, trả về đúng số trang và mã hash.
  - Kiểm tra chạy lại cùng URL/file $\rightarrow$ `is_duplicate=True`, không tải lại, không ghi đè.
  - Kiểm tra trường hợp file HTML/lỗi giả mạo PDF $\rightarrow$ trả về lỗi `INVALID_PDF_HEADER`, `retryable=False`.

---

## 7. Boundaries (Giới hạn dự án)
- **Always do**:
  - Kiểm tra Magic Bytes (`%PDF-`) ở 4 byte đầu tiên của file để phòng ngừa trường hợp trang web chặn bot trả về trang HTML 403/captcha.
  - Tính mã SHA-256 trước khi lưu hoặc chuyển bước tiếp theo.
  - Gắn header `User-Agent: NeuroGuide-Research-Bot/1.0 (+clinical-guideline-indexing)` minh bạch và lịch sự.
- **Ask first**:
  - Cấu hình lưu trữ đám mây chính thức (Google Drive Service Account / Vercel Blob / AWS S3).
- **Never do**:
  - Không tải bừa bãi toàn bộ trang web hoặc bỏ qua `robots.txt`.
  - Không ném exception tự do ra ngoài interface của Lõi — mọi lỗi phải được wrap vào `CoreResult(ok=False, error=CoreError(...))`.

---

## 8. Success Criteria (Tiêu chí hoàn thành Bước 0 & 1)
1. Thư mục `core/common` và `core/fetch` hoàn chỉnh, tuân thủ đúng Interface và Schema.
2. CLI `python -m core.fetch.runner` tải thử được ít nhất 1 guideline PDF thật (ví dụ guideline AHA Stroke), tính đúng mã băm và số trang.
3. Chạy test suite `pytest tests/core` đạt 100% pass với các case: PDF hợp lệ, file lỗi, trùng lặp hash.
