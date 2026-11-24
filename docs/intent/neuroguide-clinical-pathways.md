# Statement of Intent — NeuroGuide Clinical Pathways

- **Feature / Tab Name:** `Clinical Pathways` (tab mới trong `NeuroGuide` — `/neuroguide`)
- **Date Confirmed:** 2026-11-22

## Confirmed Intent

- **Outcome:** Xây dựng chức năng **Lưu đồ chẩn đoán & điều trị tương tác từng bước** trong `NeuroGuide`, gồm 2 phần:
  1. Giao diện Admin upload ảnh lưu đồ + thông tin nguồn để AI bóc tách thành lưu đồ tương tác, xem trước/chỉnh sửa và duyệt (`draft → published`).
  2. Giao diện bác sĩ bấm chọn từng bước theo thực tế lâm sàng để đi tới chẩn đoán hoặc điều trị phù hợp.
- **User:** Bác sĩ lâm sàng dùng nhanh tại giường/khi đi buồng hoặc trực; và Admin là người tuyển chọn nguồn từ guideline/textbook để đưa vào hệ thống.
- **Why now:** `NeuroGuide` đã có sẵn hệ thống guideline, taxonomy chuyên khoa–bệnh lý (`clinicalNavigatorTaxonomyV3`) và hạ tầng sync, nhưng chưa có luồng dẫn đường tương tác theo từng bước lâm sàng thực tế.
- **Success:**
  - Giao diện chính giữa tập trung **hiển thị từng bước** nhanh, thoáng, có lịch sử quay lui (breadcrumb) và ra kết luận chẩn đoán/điều trị rõ ràng kèm nguồn trích dẫn.
  - Có nút/góc thu gọn để bật xem **ảnh lưu đồ gốc** (lightbox hoặc split view) khi bác sĩ muốn nhìn toàn cảnh hoặc đối chiếu mạch logic của tác giả gốc.
  - Hỗ trợ **song ngữ, ưu tiên tiếng Anh nguyên bản** để đảm bảo chuẩn xác thuật ngữ y khoa.
- **Constraint:** An toàn y khoa là tối thượng — mọi lưu đồ AI bóc tách từ ảnh bắt buộc phải qua bước xem trước, chỉnh sửa tay và duyệt thủ công (`draft → published`) trước khi hiển thị cho bác sĩ.
- **Out of scope (v1 / MVP):**
  - Không đưa vào `NeuroCalc`.
  - Chưa làm AI tự đọc bệnh án tự do để chẩn đoán.
  - Chưa tự vẽ lại sơ đồ vector từ đầu (dùng UI từng bước + ảnh lưu đồ gốc).
  - Chưa tích hợp tính điểm tự động sâu với `NeuroCalc` (chỉ gắn link tham chiếu `EcosystemLink` nếu cần).
