# Hướng dẫn AI Bóc tách & Tạo Clinical Pathways Chuẩn AHA

Tài liệu này mô tả kiến trúc pipeline AI dùng chung và bộ quy tắc chuẩn hóa để tạo **Clinical Pathways** chính xác, gọn gàng, không bước chọn thừa — dựa trên kết quả đối chứng thực nghiệm với ứng dụng AHA.

---

## 1. Pipeline AI dùng chung (`config/gemini-models.json` -> `src/lib/gemini/models.ts`)

- **Single Source of Truth**: Thứ tự mô hình AI được cấu hình tập trung tại `config/gemini-models.json` (ưu tiên thế hệ 4 `gemini-4-hydrogen` đầu tiên, sau đó fallback qua `gemini-3.6-flash` -> `gemini-3.5-flash` -> `gemini-3.5-flash-lite` -> `gemini-3.1-flash-lite` -> `gemini-flash-lite-latest`).
- **Hàm dùng chung `callGeminiWaterfallJson()`** (`src/lib/gemini/models.ts`):
  - Tự động gọi tuần tự theo `GEMINI_WATERFALL_MODELS`, có `AbortSignal.timeout(45_000)` cho từng model để tránh treo khi model quá tải.
  - Lọc bỏ `thought` parts, bóc fence markdown ````json` và ghi log fallback chuẩn hóa qua `recordGeminiFallback()`.
  - `extractPathwayFromImage()` trong `src/lib/neuroguide/pathwayExtractor.ts` gọi trực tiếp `callGeminiWaterfallJson()`.

---

## 2. Bộ 10 Quy tắc Bóc tách Chuẩn AHA (Prompt + Post-Processor)

1. **Nguyên văn tiếng Anh & Không suy diễn**: Chép nguyên văn tiêu đề hộp, câu hỏi, ngưỡng chỉ số, liều thuốc và nhãn nhánh vào `en` (không tự ý đổi tên hộp như đổi tiêu đề dài thành `"Category"`).
2. **Song ngữ đầy đủ**: Mọi trường `en` (bao gồm nhãn các nhánh `edges[]`) đều có bản dịch tiếng Việt lâm sàng ngắn gọn trong `vi`, giữ nguyên thuật ngữ y khoa và tên thang điểm (`NIHSS`, `mRS`, `ASPECTS`, `PREVENT`, `IVT`, `EVT`).
3. **Không tạo bước bấm thừa**:
   - Cấm sinh nhãn giả `"Proceed"`, `"Next step"`, `"Management"`, `"Evaluate results"`.
   - Nếu ô đầu vào chia nhánh ngay (như 4 mức huyết áp hoặc 4 nhóm nguy cơ), đặt luôn `entryNodeId` là `kind: "decision"`.
   - Không tạo node trung gian lặp lại nhãn nhánh vừa chọn (*echo node*).
4. **Gộp nhãn phân tầng & Giữ nhãn nút ngắn**:
   - Nhãn phân loại/chuẩn bị (như *"Severe hypertension"*, *"Baseline lipid profile"*) được gộp làm `title` của thẻ `decision` ngay bên dưới.
   - Nhãn nút chọn `edges[].label` giữ ngắn (≤ 8–10 từ); chi tiết liều/mục tiêu đưa vào `body` dạng gạch đầu dòng của node đích.
5. **Phân biệt `criteria` (`Any of:`) và `checklist`**:
   - Danh sách tiêu chuẩn đối chiếu nhanh (`Any of:...`) dùng `kind: "criteria"` (không tách thành nhiều câu hỏi Yes/No).
   - Chỉ dùng `kind: "checklist"` cho bảng kiểm Inclusion/Exclusion có điều kiện Pass/Fail.
6. **Khối gộp `AND` / `OR`**:
   - Các khuyến cáo đi kèm (`BP-lowering medication AND Reassess in 1 mo`) hoặc song song (`Aortic dissection OR Pheochromocytoma crisis`) gom vào 1 node với `compoundOperator: "AND" | "OR"` và `compoundItems[]` giữ COR riêng cho từng vế.
7. **Gán COR nghiêm ngặt**:
   - Chỉ gán `tier` (`1`=COR 1, `2`=COR 2a, `3`=COR 2b, `4`=Consensus, `5`=COR 3 Harm) và `evidenceBadge` cho `action`, `treatment`, `diagnosis` hoặc `compoundItems`.
   - Bộ chuẩn hóa `normalizeExtractedPathwayPayload()` tự động tước `tier`/`evidenceBadge` nếu AI gán nhầm lên `decision`, `entry`, `section`, `criteria`.
8. **Dải phân đoạn Swimlane (`kind: "section"`) đúng Topology đồ thị**:
   - Các dải ngang/dọc (như *"Promote Lifestyle Therapy at All Thresholds"*, *"BP Level-Only"*) phải tách thành node `kind: "section"` nằm ngay trước bước trong dải đó (không nhét vào `body`).
   - Vì mỗi node `section` chỉ có 1 cạnh đi ra, nếu một dải ngang phủ nhiều cột đi tiếp xuống các nhánh khác nhau, phải tạo **1 node `section` cho mỗi nhánh** nối tiếp vào luồng nhánh đó — tuyệt đối không để node `section` cô lập (`ORPHAN_NODE`).
9. **Chú thích, Viết tắt & Vòng lặp**:
   - Giữ ký hiệu `*`, `†`, `‡` trong tiêu đề và trích toàn bộ viết tắt + định nghĩa ký hiệu/chú giải phương pháp (như *PREVENT calculator*) vào `abbreviations[]` và `footnotes[]`.
   - Điểm theo dõi định kỳ ổn định (như `Reassess in 3-6 mo (Ongoing)`) kết thúc gọn bằng `kind: "treatment"`, `edges: []`.
   - Vòng lặp tăng cường điều trị hoặc kiểm tra lại liên tiếp gắn `"autoUnrollLoop": true` để UI tự trải phẳng 1 lượt.
10. **Toàn vẹn đồ thị & Node lá**:
    - Mọi node phải đi tới được từ `entryNodeId` (`0` orphan).
    - Mọi node lá (`edges: []`) dùng `kind: "treatment"` hoặc `"diagnosis"` (bộ chuẩn hóa tự nâng cấp nếu AI lỡ đặt `"action"` ở node lá).

---

## 3. Kết quả Đối chứng Thực nghiệm (Sau khi hoàn thiện)

- **AHA 2025 High Blood Pressure — Figure 7** (`gemini-4-hydrogen`):
  - **13 / 13 tiêu chí chuẩn AHA đạt PASS**: `0` lỗi, `0` cảnh báo cấu trúc (`ORPHAN_NODE`, `NON_TERMINAL_LEAF`, `MISSING_VI_TRANSLATION`).
  - Các nhánh `Normal BP`, `Elevated BP`, `Stage 1 (NO / YES)`, `Stage 2 (Goal YES Ongoing / Goal NO Auto-Unroll)`, `abbreviations` (`BP`, `CVD`, `DM`, `CKD`, `COR`) và `footnotes` (`PREVENT`) đều khớp chính xác với 3 video tham chiếu của AHA.
- **AHA 2025 Severe Hypertension & Hypertensive Emergency — Figure 9** (`gemini-3.6-flash` qua fallback tự động khi `gemini-4-hydrogen` gặp HTTP 429):
  - **0 lỗi, 0 cảnh báo** (`10` nodes), tạo chuẩn `entry` banner, `Severe hypertension` gộp tiêu đề nhánh `ED | OPT`, thẻ đỏ `Class 3: Harm` (`tier: 5`), và khối gộp `OR` (`Aortic dissection OR Pheochromocytoma crisis`).
