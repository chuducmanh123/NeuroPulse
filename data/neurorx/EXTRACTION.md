# NeuroRx Clinical Extraction Protocol & Guidelines (`EXTRACTION.md`)

Tài liệu này quy định quy trình chuẩn hóa bắt buộc dành cho Chuyên gia Y tế & Kỹ sư khi trích xuất thông tin thuốc từ tài liệu nguồn vào cơ sở dữ liệu `data/neurorx/`.

---

## 1. Nguyên Tắc Cốt Lõi: Zero-Hallucination & Provenance
Mọi thông số lâm sàng khi đưa vào NeuroRx phải tuân thủ nghiêm ngặt 4 quy tắc:
1. **Source-Bound Only:** Mọi thông tin không bắt nguồn từ trí nhớ của AI hay người nhập liệu. Thông tin BẮT BUỘC phải trích xuất trực tiếp từ file văn bản có sẵn trong `data/neurorx/sources/<source_id>.txt`.
2. **Verbatim Quote:** Trường `quote` của mỗi `SourceRef` phải là đoạn trích nguyên văn từng từ ngữ (copy-paste chính xác, không quá 400 ký tự) từ file `.txt`. Script `npm run rx:check-quotes` sẽ tự động kiểm tra đối chiếu chuỗi con. Nếu quote bị sửa dù chỉ 1 từ, bản ghi sẽ bị đánh trượt (FAIL).
3. **Null Policy:** Nếu tài liệu nguồn không đề cập hoặc không có khuyến cáo cụ thể về một trường nào đó (ví dụ: liều dùng cho bệnh nhân suy gan, nồng độ lọc qua sữa mẹ, hoặc dạng thuốc lưu hành tại Việt Nam), BẮT BUỘC để giá trị `value: null` và `refs: []`. Tuyệt đối không tự suy diễn, không ước lượng hay lấy số liệu trung bình.
4. **Draft Status:** Khi trích xuất ban đầu, mọi bản ghi thuốc đều có `status: "draft"` và `verification: { verified_by: null, verified_at: null, content_hash: null }`. Chỉ có Bác sĩ kiểm duyệt mới có quyền chạy lệnh `npm run rx:verify` để niêm phong và đưa thuốc vào trạng thái `verified`.

---

## 2. Quy Chuẩn Ánh Xạ Mức Độ Tương Tác Thuốc (Decision 4)
Để tránh mâu thuẫn trong phân loại mức độ tương tác:
- Cụm từ trong nhãn: **"avoid concomitant use"**, **"avoid co-administration"**, hoặc **"contraindicated"** $\rightarrow$ ánh xạ thành `severity: "contraindicated"`.
- Cụm từ: **"dose adjustment required"**, **"monitor closely"**, **"caution"** $\rightarrow$ ánh xạ thành `severity: "major"` hoặc `severity: "moderate"` tùy thuộc vào câu chữ trích dẫn chính xác của nhãn thuốc.
- Lý do xếp mức độ nghiêm trọng BẮT BUỘC phải nằm trong đoạn `quote` trích dẫn của cặp tương tác đó.

---

## 3. Quy Chuẩn Không Trộn Lẫn Số Liệu Sổ Bộ Thai Kỳ (MCM)
- Dữ liệu dị tật bẩm sinh lớn (`mcm: []`) phải được ghi nhận riêng biệt theo từng sổ bộ quốc tế (EURAP, North American AED Pregnancy Registry, UK Registry).
- Tuyệt đối KHÔNG gộp chung, KHÔNG lấy giá trị trung bình cộng giữa các nghiên cứu/sổ bộ khác nhau.
- Nếu sổ bộ có phân tầng theo liều (dose-dependent MCM rate), phải tách thành các dòng riêng biệt và chỉ rõ khoảng liều trong trường `dose_stratum`.

---

## 4. Quy Chuẩn Tên Thuốc Tall Man Lettering
- Chỉ sử dụng chuẩn Tall Man Lettering nếu thuốc đó nằm trong danh mục chính thức của FDA / ISMP (`data/neurorx/sources/fda-tallman-list.txt`).
- Nếu thuốc không nằm trong danh mục FDA/ISMP, trường `tall_man` phải để giá trị bằng chính tên `generic_name` viết thường, không được tự ý viết hoa chữ cái để tạo Tall Man giả định.
