# Implementation Plan: Tích hợp Gemini AI & Toàn văn (Full-Text) cho NeuroGuide

## Overview
Dự án bổ sung khả năng khai thác toàn văn (Full-Text XML) từ Europe PMC / PMC, phân tích chuyên sâu bằng Google Gemini AI và lưu trữ đồng bộ trên **Vercel Blob** cho hệ thống **NeuroGuide**.
Mỗi phiên chạy (Cron định kỳ hoặc Radar On-Demand) tuân thủ định ngạch chính xác:
- **3 Guidelines**: Tải toàn văn XML, lọc cấu trúc `<sec>`, trích xuất toàn bộ `allPracticeChanges` (`NEW`, `UPGRADED`, `DOWNGRADED`, `REVISED`) và tóm tắt song ngữ.
- **2 Conference Events**: Cập nhật thử nghiệm đột phá (Late-Breaking Trials) dạng PICO từ các hội nghị chuyên khoa hàng đầu.
- **2 Clinical Scenarios**: Tổng hợp hoặc cập nhật kịch bản lâm sàng thực tế so sánh đa hội chuyên khoa (AHA/ASA vs ESO vs VN) và On-Call Bottom-Line.
- **Lưu trữ đồng bộ trên Vercel Blob**: Dữ liệu lưu tại `neuroguide_data.json` trên Vercel Blob (kèm fallback tệp cục bộ khi dev).

---

## Architecture & Data Flow

```
[Europe PMC / PMC Open Access API]
            │ (Full-Text XML / Metadata)
            ▼
┌────────────────────────────────────────────────────────┐
│ 1. fullTextFetcher.ts                                  │
│    - Tải XML toàn văn qua PMCID                        │
│    - Lọc bỏ <ref-list>, bảng phụ kiện                  │
│    - Tách đoạn trọng tâm: Recommendations & What's New │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 2. geminiGuidelineExtractor.ts                         │
│    - Gọi Gemini AI (gemini-flash-lite-latest, v.v.)     │
│    - Ép kiểu JSON Response MIME Type                   │
│    - 3 Guidelines (Practice changes, Class/Grade)      │
│    - 2 Conferences (PICO Trials)                       │
│    - 2 Clinical Scenarios (AHA vs ESO vs VN Matrix)    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 3. blobStorage.ts                                      │
│    - Lưu trữ neuroguide_data.json trên Vercel Blob     │
│    - Gộp mượt mà với Mock Baseline                     │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 4. GET / POST /api/neuroguide/sync-guidelines          │
│    - Vercel Cron (06:00 UTC)                           │
│    - Radar Trigger On-Demand trên UI                   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
[NeuroGuide Frontend UI]: Hiển thị "Full-Text AI Verified"
```

---

## Implementation Order & Phases

### Phase 1: Data Contracts & Vercel Blob Storage Helper
- Update `src/types/neuroguide.ts`: Bổ sung `FullTextStatus`, `executiveSummaryVi`, `fullTextStatus`, `aiSynthesized`, `pmcid`.
- Create `src/lib/neuroguide/blobStorage.ts`: Xây dựng module đọc/ghi Vercel Blob (`@vercel/blob`), làm sạch token, fallback tệp cục bộ `public/data/neuroguide_cloud.json`, gộp với dữ liệu tĩnh `neuroguideMockData.ts`.

### Phase 2: Full-Text Fetching Engine
- Create `src/lib/neuroguide/fullTextFetcher.ts`:
  - Tìm nạp XML từ Europe PMC REST (`/fullTextXML`) và NCBI PMC E-fetch.
  - Xử lý làm sạch XML: tách lọc các thẻ `<sec>` có tiêu đề chứa "Recommendation", "What is New", "Summary", "Practice Change", "Class", loại bỏ triệt để `<ref-list>` (danh mục tài liệu tham khảo).
  - Cơ chế fallback: Nếu không có Open Access XML, trích xuất Abstract có cấu trúc và đánh dấu `fullTextStatus: "ABSTRACT_ONLY"`.

### Phase 3: Gemini AI Medical Extractor & Synthesizer
- Create `src/lib/neuroguide/geminiGuidelineExtractor.ts`:
  - Khởi tạo kết nối REST Gemini API với chiến lược Waterfall Model (`gemini-flash-lite-latest` -> `gemini-2.5-flash-lite` -> `gemini-2.5-flash`).
  - Hàm 1: `extractGuidelineWithGemini()` bóc tách `allPracticeChanges` (`NEW`, `UPGRADED`, `DOWNGRADED`, `REVISED`) kèm Class of Recommendation, Level of Evidence và tóm tắt tiếng Việt.
  - Hàm 2: `extractConferenceTrialsWithGemini()` bóc tách 2 thử nghiệm PICO mới nhất từ hội nghị.
  - Hàm 3: `synthesizeClinicalScenariosWithGemini()` biên soạn 2 kịch bản lâm sàng so sánh AHA vs ESO vs VN kèm AI Appraisal.

### Phase 4: API Route Orchestration & Quota Enforcement
- Update `src/app/api/neuroguide/sync-guidelines/route.ts`:
  - Tích hợp pipeline Full-Text + Gemini AI + Vercel Blob.
  - Thực thi đúng hạn mức: 3 Guidelines + 2 Conferences + 2 Scenarios mỗi phiên.
  - GET endpoint đọc dữ liệu gộp từ Blob; POST endpoint thực hiện quét radar và lưu Blob.

### Phase 5: UI Feedback & Verification
- Update `src/app/neuroguide/page.tsx`:
  - Hiển thị huy hiệu "Full-Text AI Verified" và cờ nguồn "PMC Full-Text" trên tài liệu.
  - Hiển thị tóm tắt tiếng Việt `executiveSummaryVi` và các khuyến cáo thay đổi thực hành chi tiết.
- Unit Tests: Tạo `tests/neuroguideDiscovery.test.mjs` kiểm tra bóc tách XML, JSON schema và Blob storage.
- Chạy toàn bộ kiểm thử tĩnh `npx tsc --noEmit` và test suite `npm test`.
