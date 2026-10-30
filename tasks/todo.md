# Task List: Full-Text Pipeline Enhancement & Cleanup

## Phase 1: Cleanup & Contracts Enhancement

### Task 1: Dọn dẹp triệt để các dữ liệu tạm thời chưa hoàn chỉnh và chuẩn hóa catalog
**Description:** Xóa bỏ toàn bộ các file guideline mock, file mẫu tạm thời chỉ có 1-3 khuyến cáo được sinh ra trong các bước test trước đó (`b089...`, `aha_v1`, `aha_v2`, `sample_*.pdf`). Cập nhật `catalog.json` đảm bảo chỉ giữ lại các tài liệu có dữ liệu lâm sàng hoàn chỉnh.

**Acceptance criteria:**
- [x] Các file `b089..._latest.json`, `b089..._v1.json`, `aha2026_test_v1.json`, `aha2026_test_v2.json` và các file pdf mẫu tạm thời được xóa sạch khỏi `data/guidelines_store/`, `data/guidelines_raw/`, `data/`.
- [x] `data/guidelines_store/catalog.json` chỉ chứa bản ghi hợp lệ đã được xác minh (`aha2026_test` với 63 khuyến cáo).
- [x] Giao diện Web Review Queue và Catalog không còn hiển thị các item rác này.

**Verification:**
- [x] Chạy lệnh kiểm tra file: `Get-ChildItem data/guidelines_store`
- [x] Catalog JSON hợp lệ: `python -m json.tool data/guidelines_store/catalog.json`

**Dependencies:** None
**Files likely touched:**
- `data/guidelines_store/catalog.json`
- `data/guidelines_store/*`
- `data/guidelines_raw/*`

**Estimated scope:** XS (1 file config / dọn file đĩa)

---

### Task 2: Cập nhật Data Contracts cho Bài toàn văn
**Description:** Mở rộng các Pydantic schema và TypeScript types để hỗ trợ vòng đời bài toàn văn: `FullTextStatus` ("FULL_TEXT_AVAILABLE", "OPEN_ACCESS_PMC", "PAYWALLED_MANUAL_REQUIRED"), các trường định danh bài báo (`pmcid`, `doi`, `direct_pdf_url`), trường cấu trúc 3 tầng (`top_takeaways`, `high_impact_changes`, `section_recommendations`), và schema `BatchAnalyzeInput`.

**Acceptance criteria:**
- [x] `core/common/contracts.py`: Thêm `FullTextAvailability`, `FullTextArticleMetadata`, mở rộng `ExtractOutput` hỗ trợ `top_takeaways` và `high_impact_pages`.
- [x] `src/types/neuroguide.ts`: Đồng bộ `topTakeaways`, `fullTextStatus`, `fullTextSource`, `pmcid`, `doi`.
- [x] Tất cả schema biên dịch không lỗi type.

**Verification:**
- [x] TypeScript check: `cmd /c npx tsc --noEmit`
- [x] Python contract check: `python -c "import core.common.contracts; print('OK')"`

**Dependencies:** Task 1
**Files likely touched:**
- `core/common/contracts.py`
- `src/types/neuroguide.ts`

**Estimated scope:** S (2 files)

---

## Checkpoint: Foundation Clean & Stable
- [x] Dữ liệu rác đã được xóa sạch, `catalog.json` chỉ chứa bản ghi hợp lệ.
- [x] Typecheck và build của dự án vượt qua thành công.

---

## Phase 2: Nâng cấp Discovery & Fetch Core

### Task 3: Nâng cấp DiscoveryCore tích hợp DOI Resolver, Europe PMC & Link Heuristic
**Description:** Nâng cấp `DiscoveryCore` và `PubmedSocietyAdapter` để không chỉ lấy Abstract mà còn tự động phân giải DOI qua Unpaywall / Europe PMC REST API để tìm trực tiếp link PDF toàn văn mở (Open Access PDF). Cải tiến `HtmlDirectoryAdapter` với bộ nhận diện link PDF toàn văn trên trang web của các hiệp hội (AHA, ESO, ILAE, NCS, AAN).

**Acceptance criteria:**
- [x] Thêm hàm phân giải `resolve_open_access_pdf(doi, pmid)` sử dụng Europe PMC / Unpaywall API công khai.
- [x] `HtmlDirectoryAdapter` nhận diện và ưu tiên trích xuất link trỏ thẳng tới file PDF toàn văn (`.pdf`, `/doi/pdf/`, `download`).
- [x] Mỗi guideline phát hiện có kèm thông tin `full_text_status` ("FULL_TEXT_AVAILABLE" hoặc "PAYWALLED").

**Verification:**
- [x] Chạy test discovery: `pytest tests/core/test_discovery.py` hoặc runner thực tế.
- [x] Kiểm tra kết quả trả về có chứa trường `direct_pdf_url` hoặc `pmcid`.

**Dependencies:** Task 2
**Files likely touched:**
- `core/discovery/adapters.py`
- `core/discovery/core.py`
- `core/discovery/sources.py`

**Estimated scope:** M (3 files)

---

### Task 4: Nâng cấp FetchCore hỗ trợ tải PDF từ Meta HTML, PMC endpoint và phát hiện Paywall
**Description:** Nâng cấp `FetchCore` để khi gặp một URL là trang đích HTML (thay vì PDF trực tiếp), nó sẽ tự động cào các thẻ `<meta name="citation_pdf_url">` để tải tiếp file PDF thật. Hỗ trợ tải trực tiếp từ kho mở PMC `https://www.ncbi.nlm.nih.gov/pmc/articles/{pmcid}/pdf/`. Bổ sung bộ nhận diện tường thu phí (Paywall Barrier Detector) để thông báo rõ ràng cho người dùng thay vì báo lỗi mơ hồ.

**Acceptance criteria:**
- [x] `FetchCore` tự động phát hiện content-type `text/html` và bóc tách link PDF từ meta tags.
- [x] Tải an toàn các bài toàn văn từ PMC qua `pmcid`.
- [x] Nếu gặp paywall, trả về `CoreException(code="PAYWALLED_MANUAL_REQUIRED")` kèm chỉ dẫn tải lên tệp PDF cục bộ.

**Verification:**
- [x] Chạy test fetch: `pytest tests/core/test_fetch.py`
- [x] Thử nghiệm tải URL trang đích HTML và kiểm tra tải được PDF tương ứng.

**Dependencies:** Task 3
**Files likely touched:**
- `core/fetch/core.py`

**Estimated scope:** S (1-2 files)

---

### Task 5: Kiểm thử tự động Discovery & Fetch với bài toàn văn
**Description:** Viết test suite chuyên sâu kiểm tra khả năng phát hiện link bài toàn văn, phân giải DOI thành Open Access PDF, và tải file toàn văn thực tế.

**Acceptance criteria:**
- [x] Test cases kiểm tra: Resolve DOI thành công ra URL PDF mở, Parse link PDF từ HTML meta tag, Xử lý khi gặp paywall.
- [x] Toàn bộ test suite chạy xanh.

**Verification:**
- [x] `pytest tests/core/test_fetch.py`
- [x] `pytest tests/core/test_discovery.py`

**Dependencies:** Task 3, Task 4
**Files likely touched:**
- `tests/core/test_fetch.py`
- `tests/core/test_discovery.py`

**Estimated scope:** S (2 files)

---

## Checkpoint: Discovery & Fetch Full-Text Ready
- [x] Kiểm thử thành công tìm kiếm bài toàn văn từ DOI / PubMed và tự động tải được file PDF thực tế.

---

## Phase 3: Nâng cấp Extract & Analyze Core

### Task 6: Nâng cấp ExtractCore với cơ chế bóc tách 3 tầng & Page Chunking
**Description:** Tối ưu `ExtractCore` để xử lý mượt mà tài liệu dài 50-120 trang: Bóc tách riêng tầng 1 (Top Takeaways), tầng 2 (Bảng What Is New / High Impact), và tầng 3 (Các bảng khuyến cáo chuyên đề trên toàn bộ văn bản). Thêm cơ chế phân tích block text tự nhiên của PyMuPDF kết hợp với pdfplumber để không bỏ sót các khuyến cáo dạng text-block màu.

**Acceptance criteria:**
- [x] `ExtractCore` trích xuất được `top_takeaways` từ trang 2-5 nếu có.
- [x] Bóc tách đầy đủ toàn bộ bảng What is new (như 28 khuyến cáo AHA 2026).
- [x] Bóc tách các bảng khuyến cáo chuyên đề trên toàn tài liệu mà không gây tràn bộ nhớ hay treo tiến trình.

**Verification:**
- [x] Chạy thử nghiệm bóc tách trên file AHA 2026: `python -m core.extract.runner --file-id ...`
- [x] Kiểm tra số lượng trang ứng viên và bảng trích xuất chính xác.

**Dependencies:** Task 2
**Files likely touched:**
- `core/extract/core.py`
- `core/extract/detector.py`

**Estimated scope:** M (2 files)

---

### Task 7: Nâng cấp AnalyzeCore với Batch Chunking & Prompt chuyên biệt
**Description:** Cải tiến `AnalyzeCore` chuyển từ việc gọi Gemini tuần tự từng trang sang mô hình gộp lô thông minh (Batch chunking 3-5 trang / prompt). Tách biệt 2 prompt: Prompt chuyên biệt cho What Is New (trích xuất `change_type`, `previous_grade`, `driving_trials`) và Prompt cho khuyến cáo thường quy. Bổ sung cơ chế thử lại (Exponential backoff retry) chống Rate-limit.

**Acceptance criteria:**
- [x] Gộp các trang ứng viên thành các batch 3-5 trang để giảm số lần gọi AI từ 40 lần xuống còn 8-10 lần.
- [x] Phân tích chính xác các nhãn `UPGRADED`, `NEW`, `DOWNGRADED`, `STANDARD` và tên thử nghiệm dẫn dắt.
- [x] Tự động thử lại khi gặp HTTP 429 hoặc gián đoạn mạng.

**Verification:**
- [x] Chạy test analyze: `pytest tests/core/test_analyze.py`
- [x] Kiểm tra tốc độ xử lý nhanh hơn ít nhất 3 lần so với phiên bản cũ.

**Dependencies:** Task 6
**Files likely touched:**
- `core/analyze/core.py`
- `core/analyze/prompts.py`
- `core/analyze/gemini_client.py`

**Estimated scope:** M (3 files)

---

### Task 8: Kiểm thử tự động Extract & Analyze trên tài liệu dài
**Description:** Kiểm thử tích hợp toàn bộ pha Extract và Analyze trên tài liệu thực tế (AHA 2026), kiểm chứng độ chính xác của các khuyến cáo trích xuất được.

**Acceptance criteria:**
- [x] Trích xuất đầy đủ 10 Top Takeaways, 28 High Impact Changes và danh mục khuyến cáo chuyên đề.
- [x] Grounding score và chuẩn hóa COR/LOE đạt chuẩn 100%.

**Verification:**
- [x] `pytest tests/core/test_analyze.py`
- [x] Chạy pipeline thử nghiệm và xem file JSON đầu ra.

**Dependencies:** Task 6, Task 7
**Files likely touched:**
- `tests/core/test_analyze.py`

**Estimated scope:** S (1 file)

---

## Checkpoint: Extraction & Analysis Resilient
- [x] Quá trình bóc tách và phân tích chạy ổn định trên tài liệu dài không bị tràn bộ nhớ hay lỗi Rate Limit.

---

## Phase 4: Nâng cấp Store Core & Web UI Integration

### Task 9: Nâng cấp StoreCore với Quality Gate chặn dữ liệu rác
**Description:** Nâng cấp `StoreCore` với cơ chế kiểm định chất lượng nghiêm ngặt (Quality Gate): Từ chối lưu các guideline stub không hoàn chỉnh (< 5 khuyến cáo mà không có cờ draft). Cấu trúc lưu trữ mở rộng hỗ trợ trường `top_takeaways`, `high_impact_changes`, `metadata` chi tiết.

**Acceptance criteria:**
- [x] `StoreCore` tự động chặn lưu các tài liệu rác hoặc chưa bóc tách xong.
- [x] Lưu đầy đủ metadata bài toàn văn vào `{guideline_id}_latest.json` và cập nhật `catalog.json`.
- [x] Tương thích hoàn toàn với cơ chế bảo vệ Vercel EROFS.

**Verification:**
- [x] `pytest tests/core/test_store.py`
- [x] Thử lưu 1 tài liệu stub để đảm bảo Quality Gate từ chối hợp lệ.

**Dependencies:** Task 2, Task 8
**Files likely touched:**
- `core/store/core.py`
- `core/store/manager.py`

**Estimated scope:** S (2 files)

---

### Task 10: Cập nhật Web Store Adapter và giao diện hiển thị bài toàn văn
**Description:** Cập nhật `storeAdapter.ts` để đọc đầy đủ các trường mới từ Store Core (`top_takeaways`, `high_impact_changes`, `full_text_status`), và hoàn thiện hiển thị trên giao diện NeuroGuide Radar, trang chi tiết guideline và tab Hàng đợi kiểm duyệt (Review Queue).

**Acceptance criteria:**
- [x] `storeAdapter.ts` ánh xạ trọn vẹn 3 tầng khuyến cáo lên giao diện Web.
- [x] Giao diện Web hiển thị card Top 10 Take-Home Messages, huy hiệu bài toàn văn ("Full Text Parsed"), và bộ lọc khuyến cáo theo danh mục.
- [x] Thao tác duyệt / từ chối trên Review Queue mượt mà không lỗi.

**Verification:**
- [x] TypeScript check: `cmd /c npx tsc --noEmit`
- [x] Next.js Build: `cmd /c npm run build`

**Dependencies:** Task 9
**Files likely touched:**
- `src/lib/neuroguide/storeAdapter.ts`
- `src/app/neuroguide/page.tsx`
- `src/components/neuroguide/ReviewQueueTab.tsx`

**Estimated scope:** M (3 files)

---

### Task 11: Kiểm thử End-to-End toàn diện từ Discovery đến Web UI
**Description:** Chạy kiểm thử toàn trình từ việc kích hoạt Discovery quét bài toàn văn, tải và trích xuất qua Pipeline, lưu vào Store và hiển thị lên giao diện Web của bác sĩ.

**Acceptance criteria:**
- [x] Toàn bộ chuỗi Pipeline chạy thông suốt không có ngoại lệ chưa xử lý.
- [x] Dữ liệu hiển thị trên Web đầy đủ, chuẩn xác và đồng bộ giữa Local và Production Vercel.

**Verification:**
- [x] `cmd /c npm run build`
- [x] Kiểm tra API `/api/neuroguide/catalog` và `/api/neuroguide/review-queue`.

**Dependencies:** Task 10
**Files likely touched:**
- `core/orchestrator/pipeline.py`
- `src/app/api/neuroguide/pipeline/route.ts`

**Estimated scope:** S (2 files)

---

## Checkpoint: System Complete & Production Ready
- [x] Toàn bộ 5 lõi Discovery, Fetch, Extract, Analyze, Store được cải thiện toàn diện cho bài toàn văn.
- [x] Dữ liệu rác/tạm thời đã được dọn sạch triệt để.
