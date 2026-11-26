# Statement of Intent — NeuroCalc

- **App / Route:** `NeuroCalc` (`/neurocalc`)
- **Date Confirmed:** 2026-11-26
- **Source of Truth Storage:** Supabase PostgreSQL (Granular Blocks & Merkle tree Sync v2)

## Confirmed Intent

- **Outcome:** Xây dựng **NeuroCalc** (`/neurocalc`) — ứng dụng chấm thang điểm và tính toán thần kinh tại giường (**100% tiếng Anh y khoa nguyên bản**), đồng bộ hoàn toàn về cấu trúc, giao diện, font chữ và kích thước (`.medical-journal-app`, Night Shift, `AppSwitcher`, bảng màu cyan-teal `#0E7490`) với hệ sinh thái Neuro; toàn bộ kho định nghĩa thang điểm và khối hướng dẫn đánh giá lưu trữ trên **Supabase** theo kiến trúc **Granular Blocks & Merkle tree** đúng mô hình `NeuroRx` v2 (JSON nguồn + scripts `validate`/`migrate-v2`/`snapshot` + Supabase delta sync offline-first + tab `/admin` xem `rootHash`/revision/diff, sửa nhanh block text và duyệt `draft → verified`).
- **User:** Bác sĩ lâm sàng thần kinh/đột quỵ chấm điểm nhanh tại giường hoặc khi trực; và Admin là người kiểm duyệt, cập nhật nội dung thang điểm/hướng dẫn đánh giá.
- **Why now:** `NeuroCalc` đã có vị trí sẵn trong Ecosystem Hub (`src/app/page.tsx`) & `AppSwitcher` (`SOON`), đồng thời chuẩn UI `medical-journal-app` và hạ tầng Supabase Granular Blocks & Merkle tree (`src/lib/sync/*`, mẫu `NeuroRx` v2) đã hoàn thiện để tái sử dụng nhất quán.
- **Success:**
  - **Trực quan, dễ nhìn, chấm nhanh:** Hiển thị toàn bộ các mục dạng danh sách cuộn gọn với nút chọn điểm bấm 1 chạm (kèm tiến độ `answered/total` cho thang dài), hỗ trợ thang điểm chọn mục cộng điểm, công thức số học đơn giản (VD: ABC/2) và các nhu cầu thực chiến của NIHSS (quy tắc `UN`, hướng dẫn khám ngôn ngữ/câu mẫu bằng chữ); khung kết quả dính cố định hiển thị điểm cỡ lớn (`tabular-nums`), thanh phân tầng mức độ trực quan và diễn giải lâm sàng gọn rõ.
  - **Hướng dẫn đánh giá chọn lọc tại chỗ:** Màn hình chính luôn thoáng; chỉ ở đúng mục (`item`) hoặc mức điểm (`option`) dễ gây thắc mắc/bẫy lâm sàng mới hiện chip *"How to assess / ?"* — bấm vào sẽ xổ inline hoặc mở drawer ngay tại chỗ gồm tối đa 3 khối ngắn bằng chữ: (1) thao tác khám tại giường (kèm câu mẫu/lời dẫn nếu cần), (2) quy tắc ngoại lệ / điểm hay nhầm, và (3) trích dẫn nguồn.
  - **Hạ tầng Supabase + Granular Blocks & Merkle tree đúng chuẩn:** Lưu trữ trên Supabase, băm theo từng section (`sectionHashes`), `contentHash`, `rootHash`, delta sync offline-first (IndexedDB/local cache) và tab quản trị trên `/admin`.
- **Constraint:**
  - 100% tiếng Anh y khoa nguyên bản cho nội dung lâm sàng (như `NeuroRx`).
  - Lưu trữ nguồn chuẩn trên **Supabase**.
  - Nội dung & công thức bám sát nguồn trích dẫn, kiểm thử tự động và qua cổng duyệt `draft → verified`.
  - Phiên chấm điểm chạy tạm hoàn toàn phía client, **không lưu lịch sử chấm điểm** (không lưu PHI).
- **Out of scope (v1):**
  - Không lưu lịch sử chấm điểm / không đồng bộ dữ liệu bệnh nhân.
  - Không làm nút *Copy clinical summary*.
  - Không làm trình dựng thang điểm/công thức kéo-thả (visual form/formula builder) trên `/admin`.
  - Không làm song ngữ Việt–Anh trong nội dung thang điểm.
  - Không làm thẻ hình / đồ họa minh họa khám NIHSS ở v1 (chỉ dùng thông tin diễn tả bằng chữ).
  - Chưa làm các thang điểm quá đặc thù như sơ đồ tương tác 3D hoặc phân nhánh sâu (VD: EDSS).
