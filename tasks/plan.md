# Implementation Plan: Nâng cấp Toàn diện 5 Lõi Pipeline Xử lý Bài Toàn văn (Full-Text Guidelines)

## Overview
Hệ thống NeuroGuide hiện đã có khung kiến trúc 5 lõi cơ bản (`Discovery` -> `Fetch` -> `Extract` -> `Analyze` -> `Store`). Tuy nhiên, để xử lý các tài liệu hướng dẫn lâm sàng đồ sộ (50 – 120 trang như AHA/ASA 2026, ESO, AAN), các lõi cần được nâng cấp toàn diện để tự động tìm kiếm nguồn bài toàn văn (Open Access, PMC, Europe PMC), tải PDF/HTML an toàn, bóc tách cấu trúc 3 tầng (Top Takeaways -> High-Impact Changes -> Section Recommendations), xử lý phân tích AI theo lô (Batch chunking), và lưu trữ với cơ chế Quality Gate chặn triệt để dữ liệu rác.

---

## Architecture Decisions

### 1. Discovery Core: Full-Text Link Resolution & PMC/Unpaywall Integration
- **Vấn đề:** Hiện tại `PubmedSocietyAdapter` chỉ trả về Abstract (Metadata cơ bản). `HtmlDirectoryAdapter` chỉ cào link danh mục cấp 1, không phân biệt được đâu là link PDF bài toàn văn và đâu là trang đích (Landing Page).
- **Giải pháp:**
  - Bổ sung cơ chế **DOI to Open Access Resolver**: Truy vấn Europe PMC API / Unpaywall API bằng DOI để lấy trực tiếp `pdf_url` hoặc `pmcid`.
  - Bổ sung **PMC Full-Text Detector**: Kiểm tra xem bài báo có bản toàn văn miễn phí trên PubMed Central (PMC) hay không.
  - Tối ưu `HtmlDirectoryAdapter`: Bổ sung heuristic nhận diện link bài toàn văn (`/doi/pdf/`, `.pdf`, `download-pdf`, `fulltext`).
  - Gắn nhãn trạng thái tài liệu: `FULL_TEXT_AVAILABLE`, `OPEN_ACCESS_PMC`, hoặc `SUBSCRIPTION_REQUIRED`.

### 2. Fetch Core: Robust Full-Text Downloader & Paywall Barrier Detection
- **Vấn đề:** Khi gặp URL trang đích HTML hoặc tường thu phí, `FetchCore` tải file HTML về và báo lỗi `INVALID_PDF_HEADER` thay vì cố gắng tìm PDF thực sự.
- **Giải pháp:**
  - Tích hợp **HTML Meta Extractor**: Nếu URL tải về trả về HTML thay vì PDF, tự động quét các thẻ `<meta name="citation_pdf_url">`, `<meta name="dc.identifier">`, hoặc link `.pdf` để tải tiếp.
  - Hỗ trợ tải từ **Europe PMC / NCBI PMC Endpoint**: `https://www.ncbi.nlm.nih.gov/pmc/articles/{pmcid}/pdf/`.
  - **Paywall Detection & Clean Degradation**: Nếu tài liệu bị khóa bản quyền, trả về trạng thái `PAYWALLED_REQUIRES_MANUAL_UPLOAD` kèm thông tin định danh (DOI, PMID) để bác sĩ có thể tải file PDF lên trực tiếp thay vì dừng đột ngột.

### 3. Extract Core: 3-Tier Multi-Column Structured Extraction
- **Vấn đề:** Các guideline 100+ trang có cấu trúc rất phức tạp, bảng kéo dài hàng chục trang (Continued Tables), nhiều khuyến cáo dạng text block có màu nền không có viền kẻ bảng.
- **Giải pháp:**
  - Phân tầng trích xuất 3 lớp rõ ràng:
    - **Tầng 1 (Top Takeaways):** Bóc tách phần `Top 10 Take-Home Messages` hoặc `Key Findings / Executive Summary` ở đầu tài liệu.
    - **Tầng 2 (What Is New & High Impact):** Bóc tách bảng `WHAT IS NEW AND OF HIGH IMPACT` (Pages 4–5) với đầy đủ Section, COR, LOE, statement.
    - **Tầng 3 (Section Recommendations):** Bóc tách các bảng khuyến cáo theo chuyên đề trên toàn bộ văn bản (100+ trang) kết hợp giữa PyMuPDF layout-aware text block parser và pdfplumber fallback.
  - Cơ chế **Page Windowing / Chunking**: Xử lý theo dải trang (Page ranges) để tránh quá tải bộ nhớ trên các file PDF dung lượng lớn.

### 4. Analyze Core: Batch Chunking & Resilient Gemini AI Execution
- **Vấn đề:** Hiện tại `AnalyzeCore` gọi Gemini AI tuần tự trên từng trang ứng viên. Với 40–70 trang ứng viên, việc này gây chậm trễ (2–3 phút), dễ vượt ngưỡng Rate Limit (RPM/TPM) và dễ đứt gãy giữa chừng.
- **Giải pháp:**
  - **Batch Chunking (3–5 trang / prompt):** Nhóm các trang ứng viên liền kề vào một yêu cầu gọi AI có cấu trúc JSON schema chặt chẽ.
  - Phân tách 2 chế độ phân tích:
    - *High-Impact Mode:* Dành riêng cho bảng What Is New để phân loại chính xác `change_type` ("UPGRADED", "NEW", "STANDARD", "DOWNGRADED"), trích xuất `previous_grade` và tên các thử nghiệm lâm sàng dẫn dắt (`driving_trials`).
    - *Comprehensive Mode:* Dành cho toàn bộ khuyến cáo chuyên đề còn lại.
  - Cơ chế **Exponential Backoff & Retry**: Tự động thử lại khi gặp lỗi mạng hoặc HTTP 429 Rate Limit.

### 5. Store Core: Quality Gate & Full-Text Metadata Schema
- **Vấn đề:** Trước đây các tệp mock/test 1-3 khuyến cáo được lưu lẫn lộn với các guideline chuẩn.
- **Giải pháp:**
  - **Quality Gate:** Chỉ lưu các guideline đạt chuẩn toàn văn (tối thiểu 10 khuyến cáo hoặc có đầy đủ Top Takeaways / What Is New). Các guideline chưa hoàn tất sẽ được gắn cờ `DRAFT_INCOMPLETE` và không đưa vào radar lâm sàng công khai.
  - Mở rộng schema: Lưu trữ đầy đủ `top_takeaways: List[str]`, `high_impact_changes: List[Dict]`, `section_recommendations: List[Dict]`, `full_text_status: "FULL_TEXT_PARSED"`.
  - Cập nhật Web Store Adapter đọc đồng bộ cả dữ liệu đầy đủ và hiển thị thẻ Top Take-Home Messages.

---

## Task List

### Phase 1: Cleanup & Contracts Enhancement
- [ ] Task 1: Dọn dẹp triệt để các dữ liệu tạm thời chưa hoàn chỉnh và chuẩn hóa `catalog.json`
- [ ] Task 2: Cập nhật Data Contracts cho Bài toàn văn (`FullTextStatus`, `FullTextSource`, `DiscoveryMetadata`, `BatchAnalyzeInput`)

### Checkpoint: Foundation Clean & Stable
- [ ] Dữ liệu rác đã được xóa sạch, `catalog.json` chỉ chứa bản ghi hợp lệ.
- [ ] Typecheck và build của dự án vượt qua thành công.

### Phase 2: Nâng cấp Discovery & Fetch Core
- [ ] Task 3: Nâng cấp `DiscoveryCore` tích hợp DOI Resolver, Europe PMC & Heuristic link PDF toàn văn
- [ ] Task 4: Nâng cấp `FetchCore` hỗ trợ tải PDF từ Meta HTML, PMC endpoint và phát hiện tường thu phí (Paywall)
- [ ] Task 5: Kiểm thử tự động Discovery & Fetch với bài toàn văn từ PMC và các hiệp hội

### Checkpoint: Discovery & Fetch Full-Text Ready
- [ ] Kiểm thử thành công tìm kiếm bài toàn văn từ DOI / PubMed và tự động tải được file PDF thực tế.

### Phase 3: Nâng cấp Extract & Analyze Core
- [ ] Task 6: Nâng cấp `ExtractCore` với cơ chế bóc tách 3 tầng (Takeaways -> High Impact -> Section Recommendations) & Page Chunking
- [ ] Task 7: Nâng cấp `AnalyzeCore` với Batch Chunking (3-5 trang/lô), bảo vệ Rate-limit và Prompt chuyên biệt cho High-Impact
- [ ] Task 8: Kiểm thử tự động Extract & Analyze trên tài liệu 100+ trang (AHA 2026)

### Checkpoint: Extraction & Analysis Resilient
- [ ] Quá trình bóc tách và phân tích chạy ổn định trên tài liệu dài không bị tràn bộ nhớ hay lỗi Rate Limit.

### Phase 4: Nâng cấp Store Core & Web UI Integration
- [ ] Task 9: Nâng cấp `StoreCore` với cơ chế Quality Gate chặn dữ liệu rác và lưu trữ cấu trúc 3 tầng
- [ ] Task 10: Cập nhật Web Store Adapter và giao diện hiển thị trọn vẹn bài toàn văn trên NeuroGuide Radar
- [ ] Task 11: Kiểm thử End-to-End toàn diện từ Discovery -> Fetch -> Extract -> Analyze -> Store trên Web

### Checkpoint: System Complete & Production Ready
- [ ] Quy trình xử lý bài toàn văn hoạt động thông suốt từ đầu đến cuối.
