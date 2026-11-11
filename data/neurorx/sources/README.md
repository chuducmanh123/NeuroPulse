# NeuroRx Official Sources Directory (`data/neurorx/sources/`)

Thư mục này lưu trữ toàn bộ tài liệu nguồn y khoa chính thống (PDF và trích xuất .txt nguyên văn).

## 1. Quy chuẩn định dạng tên tệp
Mỗi tài liệu nguồn cần có:
1. File gốc: `<source_id>.pdf` hoặc `<source_id>.html` / `<source_id>.json`
2. File văn bản: `<source_id>.txt` (chứa toàn bộ nội dung văn bản trích xuất từ file gốc để script `npm run rx:check-quotes` đối chiếu chuỗi ký tự nguyên văn).

**Ví dụ:**
- `fda-levetiracetam-keppra.txt` (Nhãn Keppra IR của US FDA)
- `fda-tallman-list.txt` (Danh mục FDA Name Differentiation Project)

## 2. Quy trình chuyển đổi PDF sang Text (`.txt`)
Để đảm bảo nguyên tắc Zero-Hallucination và tránh cài đặt phụ thuộc nặng:
1. Khi có file PDF mới (nhãn thuốc hoặc Guideline), mở PDF và xuất ra văn bản bằng một trong các cách sau:
   - Sử dụng trình duyệt Chrome/Edge: Mở file PDF -> Nhấn `Ctrl + A` -> `Ctrl + C` -> Dán vào file `<source_id>.txt`.
   - Hoặc sử dụng Adobe Acrobat / Poppler `pdftotext <source_id>.pdf <source_id>.txt`.
2. Đăng ký thông tin tài liệu vào `data/neurorx/sources.json`.
3. Chạy lệnh kiểm tra:
   ```bash
   npm run rx:check-quotes
   ```
