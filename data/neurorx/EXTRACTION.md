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

---

## 5. Quy Chuẩn Tìm Kiếm Linh Hoạt & Phân Tích Ánh Xạ Khối Thai Kỳ – Cho Con Bú (`reproductive`)

### 5.1. Tìm kiếm linh hoạt theo ngữ nghĩa (Không cứng nhắc Section 8.1)
Cấu trúc nhãn thuốc FDA thay đổi theo thời kỳ (nhãn cũ trước 2015 vs nhãn chuẩn PLLR sau 2015) và theo loại chế phẩm. Khi trích xuất `reproductive`, **không** chỉ tìm `Section 8.1` hay `8.2`, mà phải quét toàn bộ các vị trí có thể chứa thông tin sinh sản:
- `BOXED WARNING` / `CONTRAINDICATIONS` / `WARNINGS AND PRECAUTIONS` (cảnh báo quái thai, độc phôi thai, REMS, tránh thai).
- `PRECAUTIONS` $\rightarrow$ `Pregnancy` (`Teratogenic Effects`, `Nonteratogenic Effects`, `Labor and Delivery`), `Nursing Mothers` (thường gặp ở nhãn cũ như Acyclovir, Phenobarbital...).
- `USE IN SPECIFIC POPULATIONS` $\rightarrow$ `Pregnancy`, `Lactation`, `Females and Males of Reproductive Potential` (nhãn PLLR mới).
- `CLINICAL PHARMACOLOGY` / `DOSAGE AND ADMINISTRATION` (thay đổi dược động học trong thai kỳ, điều chỉnh liều sau sinh, tương tác thuốc tránh thai nội tiết).
- Nguồn bổ sung (nếu có trong `sources`): LactMed (`lactation_rid`, `lactation_summary`), sổ bộ thai kỳ (EURAP, NAAPR, UK Registry), hoặc guideline chuyên khoa.

Mỗi `SourceRef` phải ghi **đúng tên mục (`locator`) thực tế** xuất hiện trong tài liệu nguồn và `quote` nguyên văn từ chính đoạn thai kỳ/cho con bú đó (không trỏ nhầm sang `INDICATIONS AND USAGE`).

### 5.2. Phân tích đa chiều của AI & Ánh xạ `reproductive.tier`
Bản thân FDA không dùng 3 nhãn `preferred` / `caution` / `avoid`. AI phải thực hiện **phân tích tổng hợp đa chiều** trên toàn bộ văn bản nguồn trước khi gán `tier` (và ghi ngắn gọn lập luận vào `tier.note`):

1. **Trục 1 — Cảnh báo tối cao & Chống chỉ định**: Có `BOXED WARNING` / `CONTRAINDICATIONS` về thai kỳ, chương trình REMS phòng ngừa mang thai, hoặc cụm từ *"can cause fetal harm"*, *"contraindicated in pregnant women"*, *"embryo-fetal toxicity"* không?
2. **Trục 2 — Bằng chứng trên người (Human Data)**: Có dữ liệu sổ bộ/nghiên cứu quan sát lớn trên người không? Cỡ mẫu (`n`) đủ lớn hay còn nhỏ/hạn chế? Tỷ lệ dị tật bẩm sinh lớn (MCM) có vượt mức nền (~2–3%) không, hay có biến chứng đặc hiệu (hội chứng cai sơ sinh, xuất huyết, đóng sớm ống động mạch, suy thận thai nhi...)?
3. **Trục 3 — Bằng chứng trên động vật (Animal Data) & Biên độ phơi nhiễm**: Có gây quái thai/độc phôi thai ở liều tương đương người (theo AUC hoặc BSA) hay chỉ ở liều gây độc cho mẹ, hay âm tính hoàn toàn?
4. **Trục 4 — Cân bằng lợi ích – nguy cơ bệnh lý nền (Maternal Disease Risk)**: Nguy cơ nếu **không** điều trị bệnh lý nền cho mẹ (vd: trạng thái động kinh, viêm não HSV, huyết khối/đột quỵ cấp, nhược cơ nặng) so với nguy cơ của thuốc; có lựa chọn thay thế an toàn hơn cùng nhóm không?
5. **Trục 5 — Nhãn cũ (Category A/B/C/D/X) vs PLLR**: Đối chiếu thêm Pregnancy Category nếu tài liệu có nêu.

**Tiêu chuẩn phân tầng đầu ra:**
- **`avoid`**: Có chống chỉ định thai kỳ / Boxed Warning độc thai / Category D hoặc X / Bằng chứng người cho thấy tăng rõ rệt dị tật bẩm sinh hoặc độc thai nhi nghiêm trọng / Nhãn ghi rõ *"avoid use in pregnancy"*, *"should not be used during pregnancy"*, *"discontinue when pregnancy is recognized"*.
- **`caution`**: Dữ liệu người còn hạn chế hoặc cỡ mẫu nhỏ chưa đủ kết luận chắc chắn (*"no adequate and well-controlled studies"*, *"insufficient to evaluate..."*); nhãn ghi *"should be used during pregnancy only if the potential benefit justifies the potential risk to the fetus"*; Category C (hoặc Category B nhưng còn thiếu dữ liệu người / có tín hiệu động vật ở liều cao); hoặc thuốc cần theo dõi nồng độ/điều chỉnh liều đặc biệt trong thai kỳ.
- **`preferred`**: Có dữ liệu sổ bộ hoặc nghiên cứu quan sát quy mô lớn trên người khẳng định không làm tăng nguy cơ MCM, sảy thai hay bất lợi thai nhi (Category A, hoặc Category B có bằng chứng người dồi dào an toàn) **và** không có cảnh báo độc thai nghiêm trọng, **hoặc** được guideline chuyên khoa có trong `sources` xác nhận là lựa chọn ưu tiên trong thai kỳ. *(Không tự ý gán `preferred` nếu nhãn FDA chỉ có dữ liệu cỡ mẫu nhỏ và vẫn khuyến cáo "only if potential benefit justifies potential risk").*
- **`null`**: Tài liệu nguồn không đề cập hoặc không đủ dữ liệu để phân tầng.
