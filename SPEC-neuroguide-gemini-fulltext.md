# Spec: Tích hợp Gemini AI & Toàn văn (Full-Text) vào Radar Hướng dẫn Thực hành Lâm sàng (NeuroGuide)

## 1. Objective (Mục tiêu)
Nâng cấp toàn diện quy trình tìm kiếm, lọc và tóm tắt khuyến cáo thực hành lâm sàng trong ứng dụng **NeuroGuide** bằng việc kết hợp **Google Gemini AI**, **nội dung toàn văn (Full-Text)** và lưu trữ đám mây đồng bộ trên **Vercel Blob**:
- **Tự động khai thác Full-Text**: Thay vì chỉ dựa vào tiêu đề và abstract hạn chế, hệ thống tự động tìm và tải nội dung bài báo toàn văn từ các kho lưu trữ Open Access mở (Europe PMC FullText XML API, NCBI PubMed Central OA E-fetch API).
- **Lọc thông minh qua Gemini AI**: Xác minh chính xác các hướng dẫn thực hành lâm sàng/đồng thuận chính thống từ các hội chuyên khoa uy tín (AHA/ASA, ESO, AAN, EAN, NCS, AES, ILAE...), loại trừ các bài nghiên cứu đơn lẻ, hồi cứu hoặc ý kiến cá nhân.
- **Hạn mức định lượng mỗi phiên chạy (Session Quota)**:
  - Phân tích toàn văn **3 Guidelines mới**.
  - Phân tích & cập nhật **2 Conference Events** (thử nghiệm Late-Breaking Trials từ các hội nghị đỉnh cao như ISC, ESOC, WSC, AAN, AES).
  - Biên soạn & cập nhật **2 Clinical Scenarios** (tổng hợp khuyến cáo đa hội chuyên khoa AHA vs ESO vs VN, mức độ đồng thuận và On-Call Bottom-Line).
- **Trích xuất trọn vẹn Khuyến cáo (Recommendations) & Điểm mới (Practice Changes)**:
  - Bóc tách toàn bộ khuyến cáo cụ thể: Class/Level of Evidence (hoặc GRADE), hành động lâm sàng cụ thể, tiêu chuẩn chọn bệnh, bằng chứng thử nghiệm lâm sàng (driving trials).
  - Phân loại rõ ràng sự thay đổi thực hành: **NEW** (mới ban hành), **UPGRADED** (nâng bậc khuyến cáo), **DOWNGRADED** (hạ bậc), **REVISED** (sửa đổi nội dung).
- **Lưu trữ đồng bộ trên Vercel Blob**:
  - Dữ liệu guidelines, conferences và scenarios mới được lưu trữ và cập nhật liên tục trên **Vercel Blob** (`neuroguide_data.json`), tương tự mô hình thành công của `NeuroCase`, kèm cơ chế fallback đọc/ghi cục bộ trong môi trường dev.
- **Tóm tắt điều hành song ngữ**: Tạo tóm tắt lâm sàng súc tích (Executive Summary) và thông điệp thực hành then chốt (Key Takeaways) bằng cả tiếng Anh và tiếng Việt.

---

## 2. Tech Stack & Commands

### Tech Stack
- **Framework & Core**: Next.js 16 (App Router), React 19, TypeScript 7
- **AI Engine**: Google Gemini API via REST (`generativelanguage.googleapis.com/v1beta`) với chiến lược Waterfall Model (`gemini-flash-lite-latest`, `gemini-2.5-flash-lite`, `gemini-2.5-flash`)
- **Nguồn dữ liệu mở**:
  - Europe PMC REST Full-Text XML API (`https://www.ebi.ac.uk/europepmc/webservices/rest/...`)
  - NCBI PubMed Central E-utilities (`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/...`)
- **Validation & Test**: Node.js Test Runner (`node --test`), TypeScript Compiler (`tsc`)

### Commands
- **Dev**: `npm run dev`
- **Typecheck**: `npx tsc --noEmit`
- **Run Tests**: `npm test`
- **Build**: `npm run build`

---

## 3. Project Structure

```
d:\NeuroPulse\
├── src\
│   ├── app\
│   │   ├── api\
│   │   │   └── neuroguide\
│   │   │       ├── sync-guidelines\
│   │   │       │   └── route.ts         # GET/POST handler đồng bộ định kỳ & kích hoạt quét
│   │   │       └── import-batch\
│   │   │           └── route.ts         # Batch parser cho guideline dán thủ công
│   │   └── neuroguide\
│   │       └── page.tsx                 # UI NeuroGuide Radar & Guideline Matrix
│   ├── lib\
│   │   └── neuroguide\
│   │       ├── pubmedDiscovery.ts       # Tìm kiếm metadata từ Europe PMC / PubMed
│   │       ├── fullTextFetcher.ts       # [MỚI] Tải và bóc tách XML/HTML toàn văn từ PMC/Europe PMC
│   │       └── geminiGuidelineExtractor.ts # [MỚI] AI prompt và JSON parser trích xuất recommendations
│   ├── types\
│   │   └── neuroguide.ts                # Mở rộng GuidelineDoc, PracticeChangeDetail
│   └── data\
│       └── neuroguideMockData.ts        # Baseline catalog guidelines
└── tests\
    └── neuroguideDiscovery.test.mjs     # Unit test cho bóc tách Full-text & AI Parser
```

---

## 4. Code Style & Technical Contracts

### 4.1 Interface Updates (`src/types/neuroguide.ts`)
Mở rộng siêu dữ liệu cho `GuidelineDoc`:
```typescript
export type FullTextStatus = "FULL_TEXT_PARSED" | "ABSTRACT_ONLY" | "UNAVAILABLE";

export interface GuidelineDoc {
  id: string;
  society: string;
  year: number;
  title: string;
  officialUrl: string;
  journalTarget: string;
  documentType: "Clinical Practice Guideline" | "Focused Update" | "Scientific Statement" | "Expert Consensus";
  publishDate: string;
  subspecialty: SubspecialtyType;
  subspecialties?: SubspecialtyType[];
  previousVersionYear?: number;
  executiveSummary: string;
  executiveSummaryVi?: string; // Tóm tắt điều hành tiếng Việt
  allPracticeChanges: PracticeChangeDetail[];
  linkedScenarioIds: string[];
  // Các trường mới:
  fullTextStatus?: FullTextStatus;
  fullTextSource?: "PMC" | "EUROPE_PMC" | "OPEN_ACCESS_WEB";
  pmcid?: string;
  aiSynthesized?: boolean;
  synthesizedAt?: string;
}
```

### 4.2 Module Bóc tách Toàn văn (`src/lib/neuroguide/fullTextFetcher.ts`)
- Tiếp nhận metadata có `pmcid` hoặc `id`.
- Tải Full-Text XML từ Europe PMC hoặc PMC efetch.
- Làm sạch và lọc trúng đích các thẻ `<sec>` trọng tâm:
  - Loại bỏ các phần không cần thiết: `<ref-list>` (danh mục tài liệu tham khảo), biểu mẫu khai báo xung đột lợi ích, acknowledgments nhằm tiết kiệm 70% token.
  - Gom các phần trọng điểm: `Recommendations`, `What is New / What is Changed`, `Summary of Recommendations`, `Key Action Statements`.
- Fallback an toàn: Nếu bài báo không có Open Access XML (bị paywall bởi nhà xuất bản), tự động trích xuất cấu trúc từ Abstract và đánh dấu `fullTextStatus = "ABSTRACT_ONLY"`.

### 4.3 Module Trích xuất Gemini AI (`src/lib/neuroguide/geminiGuidelineExtractor.ts`)
- Sử dụng prompt chuyên sâu Thần kinh học lâm sàng:
  - Ép kiểu định dạng `responseMimeType: "application/json"`.
  - Hướng dẫn Gemini nhận diện bảng phân loại khuyến cáo (AHA/ASA Class I, IIa, IIb, III; ESO GRADE Strong/Weak FOR/AGAINST; AAN Level A, B, C, U).
  - Trích xuất mảng `practiceChanges`: Mỗi phần tử phải có `category`, `topic`, `changeType` (`NEW` | `UPGRADED` | `DOWNGRADED` | `REVISED`), `currentGrade`, `currentText`, `drivingTrials`.
- Cơ chế Waterfall Retry: Thử lần lượt các model `gemini-flash-lite-latest` -> `gemini-2.5-flash-lite` -> `gemini-2.5-flash` để đảm bảo độ tin cậy cao và không bị gián đoạn do quota.

---

## 5. Testing Strategy

1. **Unit Test - Full-Text Extraction (`tests/neuroguideDiscovery.test.mjs`)**:
   - Kiểm tra bóc tách XML thực tế: loại bỏ thành công `<ref-list>`, trích xuất đúng các đoạn văn bản trong các thẻ `<sec>`.
   - Kiểm tra fallback trơn tru khi bài báo không có PMCID hoặc lỗi mạng.
2. **Unit Test - Schema Validation**:
   - Kiểm tra JSON trả về từ Gemini AI tuân thủ 100% kiểu dữ liệu `PracticeChangeDetail` và `GuidelineDoc`.
3. **Integration Test**:
   - Kiểm tra API `/api/neuroguide/sync-guidelines` trả về status 200 kèm danh sách guideline có gắn cờ `fullTextStatus` và `aiSynthesized`.
4. **CI Quality Gate**:
   - Chạy `npx tsc --noEmit` và `npm run build` không có lỗi.

---

## 6. Boundaries (Quy tắc ranh giới)

- **Always (Luôn luôn thực hiện)**:
  - Cắt gọt bớt các phần danh mục tham khảo (`references`) trước khi gửi văn bản vào Gemini API để tránh vượt quá context window và tiết kiệm chi phí token.
  - Sử dụng cơ chế giới hạn số lượng bài phân tích toàn văn mỗi lần chạy (tối đa 3 - 5 bài/lần) để đảm bảo thời gian phản hồi của Serverless Function (tránh timeout 15s-60s của Vercel).
  - Phải có fallback hoạt động bình thường khi `GEMINI_API_KEY` chưa được thiết lập hoặc hết hạn ngạch.
- **Ask First (Cần xin ý kiến người dùng)**:
  - Thay đổi vị trí lưu trữ kết quả đồng bộ (ví dụ: lưu vào Vercel Blob / KV thay vì chỉ trả về runtime client).
- **Never (Tuyệt đối không làm)**:
  - Không hardcode API key vào mã nguồn.
  - Không để lỗi mạng hoặc lỗi tải full-text của 1 bài báo làm gián đoạn toàn bộ tiến trình quét radar của các bài báo còn lại.
  - Không xóa bỏ các mock data baseline hiện có gây lỗi cho giao diện người dùng.

---

## 7. Success Criteria (Tiêu chí nghiệm thu)

1. [ ] Bộ quét Europe PMC tự động xác định được `pmcid` và trạng thái Open Access của các guideline mới.
2. [ ] Module `fullTextFetcher` tải và tiền xử lý thành công toàn văn từ các bài báo có PMCID / Open Access.
3. [ ] Gemini AI phân tích toàn văn và trích xuất thành công danh sách khuyến cáo thực hành (`allPracticeChanges`) cụ thể, có phân loại cấp bậc (`currentGrade`), loại thay đổi (`changeType`), và các thử nghiệm lâm sàng dẫn đường (`drivingTrials`).
4. [ ] Trường hợp bài báo không có toàn văn mở, hệ thống tự động fallback về Abstract mà không gây lỗi (`fullTextStatus: "ABSTRACT_ONLY"`).
5. [ ] Giao diện NeuroGuide hiển thị huy hiệu thông báo bài báo đã được Gemini AI trích xuất từ Toàn văn ("Full-Text AI Verified").
6. [ ] Kiểm tra tĩnh `npx tsc --noEmit` và `npm test` vượt qua 100%.

---

## 8. Resolved Architecture Decisions (Quyết định kiến trúc đã thống nhất)

1. **Định ngạch phân tích mỗi phiên**:
   - **3 Guidelines**: Tải XML toàn văn, lọc thẻ `<sec>`, dùng Gemini AI trích xuất đầy đủ khuyến cáo `allPracticeChanges` và tóm tắt song ngữ.
   - **2 Conferences**: Bóc tách các thử nghiệm đột phá (Late-Breaking Trials) dạng PICO từ các hội nghị chuyên khoa.
   - **2 Clinical Scenarios**: Tổng hợp hoặc cập nhật các kịch bản lâm sàng thực tế gắn kết khuyến cáo đa hội (AHA vs ESO vs VN) và On-Call Bottom-Line.
2. **Lưu trữ đồng bộ trên Vercel Blob**:
   - Tệp lưu trữ: `neuroguide_data.json` trên Vercel Blob.
   - Khởi tạo helper storage `src/lib/neuroguide/blobStorage.ts` tái sử dụng mô hình của `src/app/api/neurocase/route.ts` với `@vercel/blob` (`put`, `list`), kiểm tra token an toàn và fallback cục bộ (`public/data/neuroguide_cloud.json`).
   - Tự động gộp dữ liệu động trên Blob với mock data cơ sở `MOCK_GUIDELINE_DOCS`, `MOCK_CLINICAL_SCENARIOS`, `MOCK_CONFERENCE_EVENTS` để đảm bảo hệ thống luôn đầy đủ dữ liệu mượt mà.
