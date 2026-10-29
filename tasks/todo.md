# Task List: Tích hợp Gemini AI & Toàn văn (Full-Text) cho NeuroGuide

## Task 1: Mở rộng Data Contracts và Xây dựng Vercel Blob Storage Helper
**Description:** Cập nhật `src/types/neuroguide.ts` để bổ sung các trường siêu dữ liệu phục vụ Toàn văn và AI. Xây dựng module `src/lib/neuroguide/blobStorage.ts` để quản lý lưu trữ đồng bộ `neuroguide_data.json` trên Vercel Blob (hỗ trợ đọc, ghi, fallback tệp cục bộ và merge với mock baseline).

**Acceptance criteria:**
- [x] `src/types/neuroguide.ts` có kiểu `FullTextStatus` (`FULL_TEXT_PARSED` | `ABSTRACT_ONLY` | `UNAVAILABLE`), các trường `executiveSummaryVi`, `fullTextStatus`, `fullTextSource`, `pmcid`, `aiSynthesized` trong `GuidelineDoc`.
- [x] `src/lib/neuroguide/blobStorage.ts` đọc/ghi thành công lên Vercel Blob thông qua `@vercel/blob` (`put`, `list`), xử lý sanitize token an toàn tương tự `NeuroCase`.
- [x] Hàm `mergeNeuroGuideData()` gộp liền mạch dữ liệu động từ Blob với `neuroguideMockData.ts`.

**Verification:**
- [x] Typecheck: `npx tsc --noEmit`
- [x] Test đơn vị đọc ghi lưu trữ cục bộ khi không có token Blob.

**Files:**
- `src/types/neuroguide.ts`
- `src/lib/neuroguide/blobStorage.ts`

---

## Task 2: Xây dựng Module Tải & Tiền Xử Lý Toàn Văn (Full-Text Fetcher)
**Description:** Tạo `src/lib/neuroguide/fullTextFetcher.ts` để lấy XML toàn văn từ Europe PMC REST API (`/fullTextXML`) và PubMed Central E-utilities. Tiến hành bóc tách, loại bỏ thẻ `<ref-list>` (danh mục tài liệu tham khảo), trích xuất các section trọng tâm về Khuyến cáo (`Recommendations`, `What is New`, `Summary`).

**Acceptance criteria:**
- [x] Hỗ trợ tải XML qua PMCID hoặc DOI Open Access.
- [x] Loại bỏ hoàn toàn `<ref-list>`, các bảng xung đột lợi ích nhằm tiết kiệm token.
- [x] Ưu tiên bóc tách các `<sec>` chứa từ khóa: "recommendation", "what is new", "practice change", "guideline statement".
- [x] Fallback an toàn sang trích xuất Abstract khi bài báo bị khóa bản quyền (paywalled).

**Verification:**
- [x] Unit test phân tích chuỗi XML mẫu trong `tests/neuroguideDiscovery.test.mjs`.

**Files:**
- `src/lib/neuroguide/fullTextFetcher.ts`

---

## Task 3: Xây dựng Bộ Trích Xuất & Tổng Hợp Y Khoa Gemini AI
**Description:** Tạo `src/lib/neuroguide/geminiGuidelineExtractor.ts` kết nối với Google Gemini API qua REST với cấu hình JSON MIME Type và cơ chế Waterfall Model (`gemini-flash-lite-latest`, `gemini-2.5-flash-lite`, `gemini-2.5-flash`). Hỗ trợ bóc tách 3 Guidelines, 2 Conferences, và 2 Clinical Scenarios.

**Acceptance criteria:**
- [x] `extractGuidelineWithGemini()`: Trích xuất `allPracticeChanges` có đủ `category`, `topic`, `changeType` (`NEW`, `UPGRADED`, `DOWNGRADED`, `REVISED`), `currentGrade`, `currentText`, `drivingTrials` và `executiveSummaryVi`.
- [x] `extractConferenceTrialsWithGemini()`: Bóc tách thử nghiệm PICO từ hội nghị cho `ConferenceEvent`.
- [x] `synthesizeClinicalScenariosWithGemini()`: Biên soạn so sánh AHA vs ESO vs VN kèm AI Appraisal cho `ClinicalScenario`.
- [x] Xử lý an toàn khi thiếu `GEMINI_API_KEY` hoặc hết hạn ngạch bằng bộ tạo lâm sàng tất định (deterministic fallback).

**Verification:**
- [x] Typecheck: `npx tsc --noEmit`
- [x] Unit test parser JSON output từ Gemini.

**Files:**
- `src/lib/neuroguide/geminiGuidelineExtractor.ts`

---

## Task 4: Tích Hợp Điều Phối API và Thực Thi Định Ngạch (3-2-2)
**Description:** Nâng cấp API handler `src/app/api/neuroguide/sync-guidelines/route.ts` để kết nối FullTextFetcher, GeminiExtractor và BlobStorage. Đảm bảo đúng định ngạch mỗi phiên: 3 Guidelines, 2 Conferences, 2 Clinical Scenarios, và lưu trữ đồng bộ lên Vercel Blob.

**Acceptance criteria:**
- [x] GET: Trả về toàn bộ dữ liệu đã được merge giữa Vercel Blob và Mock baseline.
- [x] POST: Thực hiện quy trình quét radar mới:
  - Lấy danh sách ứng viên mới từ Europe PMC / PubMed.
  - Xử lý toàn văn cho đúng 3 Guidelines mới.
  - Cập nhật 2 Conference events mới.
  - Biên soạn/cập nhật 2 Clinical Scenarios.
  - Lưu kết quả gộp vào Vercel Blob qua `blobStorage.ts`.
- [x] Trả về thông tin thống kê chi tiết (`guidelinesAnalyzed`, `conferencesUpdated`, `scenariosUpdated`, `storageBackend`).

**Verification:**
- [x] Typecheck: `npx tsc --noEmit`
- [x] Kiểm thử gọi GET & POST endpoint.

**Files:**
- `src/app/api/neuroguide/sync-guidelines/route.ts`

---

## Task 5: Cập Nhật Giao Diện NeuroGuide và Hiển Thị Trực Quan
**Description:** Cập nhật `src/app/neuroguide/page.tsx` để hiển thị các chỉ báo mới: huy hiệu "Full-Text AI Verified", nguồn toàn văn PMC, tóm tắt điều hành tiếng Việt và trạng thái đồng bộ Vercel Blob trên Radar Scanner.

**Acceptance criteria:**
- [x] Thẻ Guideline hiển thị huy hiệu "Full-Text AI Verified" và liên kết tới bài báo toàn văn PMC/DOI.
- [x] Hiển thị tóm tắt tiếng Việt `executiveSummaryVi` bên cạnh bản tiếng Anh.
- [x] Bảng trạng thái Radar Scanner thông báo số lượng Guideline, Conference và Scenario đã đồng bộ thành công với Vercel Blob.

**Verification:**
- [x] `npm run build` biên dịch thành công không cảnh báo.

**Files:**
- `src/app/neuroguide/page.tsx`

---

## Task 6: Kiểm Thử Toàn Diện và Đảm Bảo Chất Lượng (Quality Gate)
**Description:** Viết bộ kiểm thử tự động `tests/neuroguideDiscovery.test.mjs` bao phủ các trường hợp tải XML, lọc thẻ `<ref-list>`, parser JSON Gemini và bộ merge Blob. Chạy toàn bộ typecheck và build sản xuất.

**Acceptance criteria:**
- [x] `tests/neuroguideDiscovery.test.mjs` kiểm tra đầy đủ các kịch bản và vượt qua 100%.
- [x] `npm test` vượt qua toàn bộ các bài test của hệ thống.
- [x] `npx tsc --noEmit` đạt 0 lỗi với `strict: true`.
- [x] `npm run build` hoàn thành nhanh chóng và tạo bundle tối ưu.

**Verification:**
- [x] Chạy `npm test`
- [x] Chạy `npm run build`

**Files:**
- `tests/neuroguideDiscovery.test.mjs`
- `package.json` (nếu cần bổ sung test file pattern)
