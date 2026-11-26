# So sánh Clinical Pathways hiện tại với chuẩn AHA App & Thiết kế cải tiến

Tài liệu này tổng hợp kết quả đồng nhất **10 Clinical Pathways thực tế** từ Supabase về local (`public/data/neuroguide_pathways.json` và `data/neuroguide/pathways/*.json`), đối chiếu trực tiếp với **8 lưu đồ & video tương tác của app AHA**, và chuẩn hóa kiến trúc giao diện + quy tắc AI bóc tách mới cho `NeuroGuide`.

---

## 1. Dữ liệu Clinical Pathways đã đồng nhất về Local

Lệnh đồng bộ lặp lại:
```bash
npm run ng:pull-pathways -- --prune
```
- **Tổng số pathways live đã đồng bộ**: `10` (tất cả đang ở trạng thái `published`).
- **Runtime local snapshot**: `public/data/neuroguide_pathways.json` (tương thích 100% với `LocalPathwaySnapshot` trong `src/lib/neuroguide/pathwayService.ts` và fallback offline trong `ClinicalPathwaysTab.tsx`).
- **Git mirror từng pathway**: `data/neuroguide/pathways/<slug>.json`.

### Thống kê 10 Pathways hiện tại
| # | Slug | Nodes | Nút 1 nhánh (click thừa cũ) | Vấn đề điển hình trước cải tiến |
|---|---|---:|---:|---|
| 1 | `active-bleeding-associated-with-oral-anticoagulant-aha-acc-accp-hrs-2023` | 11 | 0 | Chỉ thấy 1 thẻ mỗi lần; mất bối cảnh các bước đã chọn trên mobile |
| 2 | `algorithm-for-management-of-ais-eligibility-for-evt-aha-asa-2026` | 51 | **13** | Nhiều nhánh ma trận chỉ có 1 đường (vd `≤28 d -> LVO* -> 0–24 h -> IDD`) vẫn bắt bấm 3 lần; không có footnotes `*`, `†` |
| 3 | `anticoagulation-for-typical-cti-dependent-afl-aha-acc-accp-hrs-2023` | 12 | **4** | Có node lặp lại y hệt nhãn nhánh (`echo nodes`: `Rate control... -> Proceed to anticoagulation`) |
| 4 | `approach-to-the-management-of-patients-with-cerebral-vasospasm-and-dci-after-asah-aha-asa-2023` | 14 | **8** | Chuỗi tuyến tính đầu (`Patient with aSAH -> Oral Nimodipine -> Regular Neuro Exams`) bắt bấm 2 lần vô nghĩa; có vòng lặp quay lại `n8` |
| 5 | `dapt-for-minor-noncardioembolic-ais-and-tia-aha-asa-2026` | 16 | 1 | **Gán nhầm COR 1 lên câu hỏi `decision`** (`Eligible for revascularization?`, `LKN <24 hr`, `NIHSS ≤3...`); gộp COR 1 & COR 2b thành text thường trong `body` |
| 6 | `diagnostic-pathway-for-possible-primary-myocardial-infarction-esc-acc-aha-whf-eacts-sts-scai-2026` | 9 | **3** | Bắt bấm `"Proceed to ECG / Clinical Assessment"` và `"Proceed to invasive / non-invasive evaluation"` |
| 7 | `management-of-anticoagulant-related-hemorrhage-aha-asa-2022` | 14 | 1 | Bắt bấm `"Management"` ở `n1`; thuốc đảo ngược phụ (`Vitamin K`, `Activated charcoal`) bị đẩy thành text thường |
| 8 | `management-of-periprocedural-anticoagulation-in-patients-with-af-aha-acc-accp-hrs-2023` | 11 | **3** | Echo nodes (`Procedure cannot be performed safely... -> Proceed to interruption strategy`) |
| 9 | `surgical-management-of-ivh-aha-asa-2022` | 7 | **3** | Toàn bộ 3 nhánh con chỉ có 1 nút đi tiếp (`EVD`, `EVD + Thrombolytic`...) — lặp lại y hệt nhãn nút vừa bấm |
| 10 | `workflow-for-patients-with-symptoms-concerning-for-asah-aha-asa-2023` | 12 | **5** | Bắt bấm `"Evaluate CT results"` (2 lần), `"Evaluate CSF results"`, `"Aneurysm confirmed"` |
| **Tổng** | **10 pathways** | **157** | **41 (26.1%)** | **26.1% tổng số node trong hệ thống là node 1 nhánh gây click thừa** |

---

## 2. Đối chiếu chi tiết: NeuroPulse cũ vs. AHA App (8 đợt mẫu)

| Khía cạnh | NeuroPulse trước đây | AHA App (qua 8 đợt mẫu) | Giải pháp áp dụng |
|---|---|---|---|
| **Bố cục tổng thể** | Single-card slide: mỗi lần chỉ thấy **1 thẻ**, bấm chọn xong thẻ cũ biến mất vào breadcrumb | **Progressive Vertical Stack**: các thẻ xếp dọc nối bằng mũi tên chevron đổi màu; giữ nguyên toàn bộ mạch đã đi qua | `buildVisibleStack()` + render stack dọc trong `PathwayStepRunner.tsx` |
| **Nhịp tương tác** | Bắt bấm qua cả `entry`, `action` 1 nhánh (`"Next step"`, `"Proceed"`, `"Evaluate CT results"`) — **41/157 node** | **Auto-unfold tuyến tính**: tự động xổ toàn bộ chuỗi 1 nhánh và **chỉ dừng ở điểm rẽ nhánh thực sự** (`>=2` lựa chọn) | Tự động mở thông qua node 1 nhánh; tự gộp/ẩn **echo node** không mang thêm dữ liệu lâm sàng |
| **Sửa lựa chọn** | Phải bấm `Back 1 step` hoặc bấm breadcrumb để quay lại | **Inline Branch Switching**: chạm trực tiếp vào ô lựa chọn khác ở bất kỳ thẻ quyết định nào phía trên để đổi nhánh tức thì | `selectDecisionAt()` cắt gọn phần nhánh dưới điểm đổi và bung nhánh mới ngay tại chỗ |
| **Thẻ chọn phương án** | Danh sách 1 cột đánh số `1, 2, 3...` chiếm nhiều chiều cao | **Segmented Choice Grid**: 2 lựa chọn ngắn (`Yes/No`, `+/-`, `ED/OPT`) chia đôi 50/50; 3 lựa chọn xếp 3 cột ngang; 4 lựa chọn xếp lưới 2×2; chọn xong tô đỏ đậm chữ trắng | `resolveChoiceGridLayout()` (`binary` / `row3` / `grid2` / `stack`) + viền/nền đỏ nhấn khi chọn |
| **Phân cấp màu COR** | Chỉ hiện pill nhỏ ở góc thẻ trắng | **Full-card Semantic Color**: COR 1 xanh lá, COR 2a vàng, COR 2b cam, COR 3 Harm đỏ đậm, Entry/Section/Endpoint xanh dương nhạt, Decision viền đỏ | Áp dụng đầy đủ bảng màu COR semantic (hỗ trợ cả Light & Dark mode) |
| **Khối `AND` / `OR`** | Dồn vào text trong `body` | **Compound Card**: 2 nửa xếp liền trong 1 khối, mỗi nửa giữ màu COR riêng, ngăn cách bởi nhãn `AND` hoặc `OR` | Thêm `compoundOperator` + `compoundItems` vào `PathwayNode` |
| **Tiêu chuẩn `Any of:`** | Dễ bị AI tách thành nhiều câu hỏi hoặc checklist bắt buộc | **Criteria Card** (`kind: "criteria"`): hiển thị 1 thẻ danh sách gạch đầu dòng để đối chiếu nhanh bằng mắt | Thêm `kind: "criteria"` và `parseClinicalBodyBlocks()` |
| **Vòng lặp (Loop)** | Nhảy lại step cũ trong history | **Controlled Loop Unrolling**: mặc định dừng lịch sự với nút `↻ <label>` (tránh lặp vô hạn); hỗ trợ `autoUnrollLoop: true` để trải phẳng 1 lượt khi cần | Xử lý an toàn trong `buildVisibleStack()` với `visitedNodeIds` + `MAX_STACK_STEPS = 40` |
| **Chú thích & Tiện ích** | Chú thích lẫn vào `body`, nút xem ảnh tách riêng ở sidebar | **Sticky Bottom Utility Bar** gồm 4 nút: `Abbr & Footnotes` (kèm bảng màu Legend), `Original Flowchart`, `Reset`, `More Info` | Thanh công cụ ghim đáy 2×2 trên mobile / 4 cột trên desktop |

---

## 3. Hướng dẫn AI lọc và chọn lựa thông tin khi tạo Pathway

Các quy tắc này đã được tích hợp trực tiếp vào `buildPathwayExtractionPrompt()` và bộ chuẩn hóa `normalizeExtractedPathwayPayload()` trong `src/lib/neuroguide/pathwayExtractor.ts`:

1. **Không tạo bước bấm thừa**: Cấm sinh các nhãn giả như `"Proceed"`, `"Next step"`, `"Management"`, `"Evaluate results"`. Nếu ô đầu vào tách thẳng thành nhiều nhánh (như 4 mức huyết áp hoặc 4 nhóm nguy cơ), đặt luôn node đầu (`entryNodeId`) là `decision`.
2. **Không tạo Echo Node**: Mũi tên từ một lựa chọn phải trỏ thẳng tới hành động/khuyến cáo/quyết định tiếp theo, không tạo node trung gian lặp lại tên lựa chọn.
3. **Gộp nhãn phân tầng vào tiêu đề câu hỏi**: Ví dụ *"Severe hypertension"* -> gộp làm tiêu đề của thẻ chọn `Identified in ED | Identified in OPT setting`; *"Baseline lipid profile"* -> gộp làm tiêu đề thẻ chọn 3 nhóm statin.
4. **Tách tên lựa chọn ngắn khỏi nội dung chi tiết**: `edges[].label` giữ ngắn gọn (≤ 8–10 từ); toàn bộ điều kiện, mục tiêu thời gian, liều thuốc đưa vào `body` dạng gạch đầu dòng của node đích.
5. **Phân biệt `criteria` (`Any of:`) và `checklist`**: Danh sách dấu hiệu đối chiếu nhanh (`Any of:`) dùng `kind: "criteria"` (không tách thành nhiều câu hỏi Yes/No). Chỉ dùng `checklist` khi ảnh gốc là bảng kiểm Inclusion/Exclusion có điều kiện Pass/Fail rõ ràng.
6. **Gom khối `AND` / `OR`**: Các khuyến cáo ghép đôi bằng `AND` hoặc song song bằng `OR` đưa vào 1 node với `compoundOperator` và `compoundItems` để giữ nguyên COR riêng của từng vế.
7. **Gán COR nghiêm ngặt**: Chỉ gán `tier` và `evidenceBadge` cho `action`, `treatment`, `diagnosis` hoặc `compoundItems`. Tuyệt đối không gán `tier` cho `decision`, `entry`, `section`, `criteria` (bộ chuẩn hóa `normalizeExtractedPathwayPayload` cũng tự động tước `tier` nếu AI gán nhầm lên `decision`).
8. **Giữ ký hiệu `*`, `†` và tách Footnotes/Abbreviations**: Giữ tiêu đề ngắn gọn với `*`, `†` và trích toàn bộ chú thích + viết tắt từ chú giải hình vào `abbreviations[]` và `footnotes[]`.
