# Neuro Journal Tracker

Hệ thống tự động theo dõi, trích xuất và phân loại bài báo chuyên khoa **Thần kinh & Đột quỵ** từ 8 tạp chí y khoa hàng đầu thế giới (*NEJM*, *The Lancet*, *The Lancet Neurology*, *JAMA*, *JAMA Neurology*, *Stroke*, *Neurology*, *Annals of Neurology*) sử dụng Crossref, PubMed E-utilities API, EuropePMC, OpenAlex, Gemini AI, Next.js và GitHub Actions.

## Tính năng chính
- **Hiển thị phân cấp thông minh**: Sắp xếp bài báo theo từng **Ngày xuất bản** (mới nhất lên đầu), và trong từng ngày tự động gom nhóm theo từng **Tạp chí** với bộ nhận diện màu sắc riêng biệt.
- **Đa nguồn dữ liệu Abstract**: Kết hợp Crossref + PubMed E-utilities (`esearch`/`efetch`) + EuropePMC + OpenAlex để tối đa hóa tỷ lệ thu thập Structured Abstract.
- **Tách đoạn Structured Abstract tự động**: Nhận diện cả định dạng có dấu hai chấm (`BACKGROUND:`, `METHODS:`) lẫn định dạng chuẩn của *Neurology (AAN)* / *JAMA* (`Background and Objectives`, `Methods`, `Results`, `Discussion`).
- **Bộ lọc lâm sàng đa chiều**: Lọc theo Tạp chí (kèm bộ đếm số lượng bài), Chuyên khoa Thần kinh, Loại nghiên cứu (`Clinical Trial`, `Meta-Analysis`, `Guideline`, `Review`, `Original Article`), lọc bài có đầy đủ Abstract (`Has Abstract`) và lưu bài báo (`Saved`).

## Cấu trúc dự án
- `scripts/fetch_nejm.py`: Script tự động truy vấn đa tạp chí, chuẩn hóa ngày xuất bản, trích xuất kết luận lâm sàng và lưu vào `public/data/articles.json`.
- `.github/workflows/update_feed.yml`: Tự động kích hoạt cập nhật bài viết lúc 06:00 sáng (giờ VN) mỗi ngày qua GitHub Actions.
- `src/components/ArticleCard.tsx`: Thẻ hiển thị bài báo khoa học và phân đoạn Structured Abstract.
- `src/app/page.tsx`: Giao diện danh sách gom nhóm theo **Ngày -> Tạp chí** và bộ lọc chuyên đề Thần kinh.

## Cách chạy
1. Cài đặt các gói phụ thuộc:
   ```bash
   npm install
   ```
2. Thu thập dữ liệu bài báo mới nhất:
   ```bash
   python scripts/fetch_nejm.py
   ```
3. Chạy môi trường phát triển:
   ```bash
   npm run dev
   ```
