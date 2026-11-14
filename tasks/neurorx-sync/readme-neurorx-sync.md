# NeuroRx Sync v2 — Kiến Trúc, Hướng Dẫn Thực Thi & Đánh Giá Tự Động

Thư mục này chứa toàn bộ **tài liệu thiết kế ràng buộc, prompt từng giai đoạn, bộ tiêu chí tự động sửa lỗi và mô phỏng trực quan** cho quá trình nâng cấp kiến trúc đồng bộ **Local-First ↔ Supabase Cloud** (làm **NeuroRx** trước ở Phase 0–7, sau đó mở rộng sang **NeuroGuide** ở Phase 8).

> **Trạng thái hiện tại:** `APPROVED v2.0 (2026-11-14)` — Toàn bộ tài liệu nền và thông số cấu hình đã được chốt. **Chưa có file mã nguồn vận hành nào của app (`src/`, `data/`) bị chỉnh sửa.**

---

## 1. Danh mục các file trong thư mục

| File | Vai trò | Ai đọc / Khi nào dùng |
| :--- | :--- | :--- |
| [readme-neurorx-sync.md](./readme-neurorx-sync.md) | Tổng quan, bảng hợp nhất Opus + Gemini, phân công Argon/Hydrogen, định hướng Swarm & các quyết định đã chốt | Bạn đọc đầu tiên |
| [00-design-neurorx-sync.md](./00-design-neurorx-sync.md) | **Hợp đồng thiết kế ràng buộc:** 15 bất biến (I1–I15), lược đồ SQL, 3-Tier Merkle Hashing & ETag 304, RPC, HTTP API, Sync Engine, 14 bẫy (P1–P14), NeuroGuide | Mọi mô hình **bắt buộc** đọc trước khi code |
| [10-phases-neurorx-sync.md](./10-phases-neurorx-sync.md) | Prompt copy-paste chi tiết + phạm vi file + mô hình khuyến nghị + tiêu chí nghiệm thu (AC) cho **Phase 0 → Phase 8** | Bạn copy từng phase giao cho mô hình thực hiện |
| [20-evaluation-neurorx-sync.md](./20-evaluation-neurorx-sync.md) | **Hướng dẫn Tự Đánh Giá & Tự Sửa (Critic–Fixer Loop):** cổng kiểm tra, ma trận 6 lỗi B1–B6, prompt trọng tài | Giao cho mô hình tự sửa hoặc mô hình khác kiểm chéo |
| [progress-neurorx-sync.md](./progress-neurorx-sync.md) | Theo dõi tiến độ từng phase, phân công mô hình và nơi ghi kết quả Human Gate | Cập nhật sau mỗi phase |
| [simulator-neurorx-sync.html](./simulator-neurorx-sync.html) | Trang web mô phỏng tương tác (Merkle Tree, Optimistic Locking, JSON Patch, Delta Sync `since_seq`) | Mở trực tiếp trên trình duyệt để xem minh họa |

---

## 2. Hợp nhất thiết kế: Claude Opus 5.5 + Gemini

Bộ tài liệu này kết hợp ưu điểm chặt chẽ của cả hai luồng trao đổi:

| Thành phần | Đóng góp từ Claude Opus 5.5 | Bổ sung nâng cấp từ Gemini | Kết quả hợp nhất trong `00-design-neurorx-sync.md` |
| :--- | :--- | :--- | :--- |
| **Danh tính & Xóa** | Tách `uid` (UUID) khỏi `slug`, xóa mềm `deleted_at` trên dòng, `change_seq` toàn cục + Advisory Lock | `SELECT ... FOR UPDATE` + `seq` index | Chống nhảy thứ tự commit, không hồi sinh dữ liệu xóa, tạo lại trùng slug dùng `uid` mới (I2–I4) |
| **Tối ưu ghi & Hashing** | Lưu full snapshot vào `neurorx_drug_revisions` + chính sách dọn rác có thời hạn | `content_hash` chống ghi thừa + **RFC 6902 JSON Patch (`patch_diff`)** + **3-Tier Merkle Hashing** (`section_hashes` → `content_hash` → `root_hash`) + batched `neurorx_recompute_root_hash()` (`p_skip_root_rehash`) | Bấm Lưu khi nội dung không đổi sẽ **no-op** (không tốn seq/Realtime); nhận diện chính xác block/mục đổi; import hàng loạt chỉ tính lại `root_hash` 1 lần (I13–I14) |
| **Chống xung đột (409)** | `expected_rev` + cảnh báo 409 | Giao diện 3 chế độ (Use Cloud / Smart Merge / Force Overwrite) + **Draft Auto-Save (`localStorage`)** | Không bao giờ mất công soạn thảo nếu rớt mạng hoặc có người sửa trước (I6, I15) |
| **Cache, ETag & Tốc độ** | IndexedDB `LocalStore` + `history.pushState` (0 ms) + `Cache-Control: no-store` | `ETag: "nrx-v2-<maxSeq>-<rootHash>"` / `If-None-Match` → `304 Not Modified`, `revalidateTag` theo ID | Mở app < 150 ms, click thuốc 0 ms (0 request mạng), không có thay đổi trả `304` nhẹ băng thông (I9, I15) |
| **Realtime & Offline** | `neurorx_sync_state` (chỉ là tín hiệu) + 60s safety poll + `MemoryLocalStore` fallback | Realtime push + **client debounce 300 ms** gộp nhiều thay đổi liên tiếp | Máy B tự động kéo delta khi Máy A vừa lưu mà không bị bão request; mất mạng vẫn chạy 100% |
| **Mở rộng NeuroGuide** | Tách `src/lib/sync/` dùng chung | Mô hình **2 tầng Granular Blocks + bảng nối nhiều-nhiều + Merkle Tree** | Một khối liều/tiêu chuẩn dùng chung cho nhiều phác đồ; sửa 1 nơi chỉ invalidate các trang liên quan (§10) |

---

## 3. Phân công Mô hình AI & Có nên dùng Swarm?

### 3.1. Bảng phân công Argon / Hydrogen theo mức độ rủi ro

Quy tắc bạn đã chốt: chọn **Argon** cho pha rủi ro cao, **Hydrogen** cho pha rủi ro trung bình hoặc thấp.

| Giai đoạn | Độ rủi ro | Mô hình khuyến nghị | Lý do |
| :--- | :--- | :--- | :--- |
| **Phase 0** (Kiểm kê & Snapshot) | Thấp | **Hydrogen** | Chỉ đọc, chạy script export JSON và ghi `progress-neurorx-sync.md` |
| **Phase 1** (SQL Migration, RLS, RPC & `pg_cron`) | **Rất cao** | **Argon** | Logic `plpgsql`, `pg_advisory_xact_lock`, `FOR UPDATE`, `neurorx_recompute_root_hash()`, RLS, purge |
| **Phase 2a** (Sync Core, 3-Tier Hashing & Patch) | **Cao** | **Argon** | Hợp đồng `types.ts`, `section_hashes`, RFC 6902 patch, `DrugRepo` interface |
| **Phase 2b** (`MemoryRepo`, `PostgresRepo` & Contract Tests) | **Cao** | **Argon** | Đảm bảo `MemoryDrugRepo` khớp tuyệt đối hành vi SQL & `p_skip_root_rehash` |
| **Phase 3** (Script Migrate `--dry-run` / `--apply`) | Trung bình | **Hydrogen** | Theo đúng khuôn Phase 2b, import batch + đối chiếu hash sau chạy |
| **Phase 4a** (API Core: `changes`, CRUD, rollback) | **Cao** | **Argon** | Route động Next.js 16, `ETag`/`304`, khóa lạc quan `409`, `revalidateTag` |
| **Phase 4b** (API Phụ trợ & Workflow: `health`, `purge`, `history`, GHA) | Trung bình | **Hydrogen** | Dựng endpoint phụ trợ và `.github/workflows/neurorx_purge.yml` theo chuẩn có sẵn |
| **Phase 5** (IndexedDB + Sync Engine + Realtime 300ms) | **Rất cao** | **Argon** | Single-flight race condition, transaction atomicity trong IndexedDB, debounce 300 ms |
| **Phase 6a** (UI Lookup Local-First & 0 ms Routing) | Trung bình | **Hydrogen** | Thay `force-dynamic`, `history.pushState`, vẫn bám chặt guardrail G3 |
| **Phase 6b** (UI Admin Conflict 3 chế độ, Draft & History) | **Cao** | **Argon** | State phức tạp (409 Smart Merge, khôi phục revision, Draft Auto-Save) |
| **Phase 7** (Cutover, Dọn Legacy, `rx:pull` CI Mirror & Purge) | **Cao** | **Argon** | Xóa code cũ an toàn theo grep gate, kích hoạt mirror & cron purge |
| **Phase 8** (Mở rộng NeuroGuide) | Cao / TB | **Argon** (lõi chung & SQL) / **Hydrogen** (migration & UI từng tab) | Tách module `src/lib/sync/` và nối bảng NeuroGuide |
| **Đánh giá chéo (Evaluator Loop)** | — | **Argon** (hoặc mô hình khác với mô hình vừa code) | Tránh thiên kiến khi tự kiểm tra bài của chính mình |

### 3.2. Có nên dùng Swarm để code phần sửa chữa này không?

**Khuyến nghị: KHÔNG chạy Swarm cho toàn bộ Phase 0 → 7**, mà đi tuần tự từng pha (kết hợp tách tối đa **2 luồng song song** ở đúng 2 điểm độc lập):
- **Vì sao không dùng Swarm dàn trải:** Chuỗi phụ thuộc rất chặt (`Phase 1 Gate` mở đường cho `Phase 3`; `Phase 2` chốt type/repo cho `Phase 3, 4, 5`; `Phase 5` mở đường cho `Phase 6`; `Phase 6` chạy production ≥ 3 ngày rồi mới `Phase 7`). Nhiều worker cùng sửa các file dùng chung (`types.ts`, `DrugRepo`, `route.ts`) rất dễ xung đột code và tốn hạn mức (quota) không cần thiết.
- **2 điểm DUY NHẤT có thể chạy song song nhẹ (tối đa 2 worker nếu muốn nhanh):**
  1. **Phase 1 (SQL ở `supabase/`) ‖ Phase 2a/2b (TypeScript ở `src/lib/neurorx/sync/`)**: hai vùng file tách biệt hoàn toàn.
  2. **Phase 4a/4b (API ở `src/app/api/neurorx/sync/`) ‖ Phase 5 (Client Engine ở `src/lib/neurorx/sync/client*`)**: sau khi `Phase 2` đã đóng băng interface, Server API và Client IndexedDB không đè file nhau.
- Cuối mỗi pha, nên chạy kiểm tra chéo theo [`20-evaluation-neurorx-sync.md`](./20-evaluation-neurorx-sync.md) để đảm bảo đúng hợp đồng.

---

## 4. Cách vận hành quy trình (3 bước cho mỗi Phase)

1. **Bước 1 — Giao việc:** Mở [`10-phases-neurorx-sync.md`](./10-phases-neurorx-sync.md), copy **Common Preamble** + khối **Prompt của Phase N** giao cho mô hình theo bảng **Argon / Hydrogen** ở §3.
2. **Bước 2 — Tự đánh giá & Tự sửa:** Sau khi mô hình làm xong (hoặc mở phiên mới với mô hình trọng tài), copy **Prompt Đánh Giá** trong [`20-evaluation-neurorx-sync.md §5`](./20-evaluation-neurorx-sync.md) (thay `<PHASE_NUMBER>`), mô hình sẽ tự chạy tối đa 5 vòng lặp sửa lỗi cho tới khi mọi gate (`npm test`, `npm run build`, hygiene, AC) đều xanh.
3. **Bước 3 — Human Gate (nếu có):** Ở Phase 0, 1, 3, 6/7, bạn kiểm tra kết quả (ví dụ chạy SQL trên Supabase Editor ở Phase 1, hoặc chạy `--apply` ở Phase 3) và xác nhận vào [`progress-neurorx-sync.md`](./progress-neurorx-sync.md) trước khi sang phase tiếp theo.

---

## 5. Các quyết định đã chốt (2026-11-14)

1. **Chính sách lưu trữ lịch sử (`neurorx_sync_config` trong `00-design-neurorx-sync.md §3.5`):**
   - Thuốc đã xóa (tombstone): giữ **90 ngày** trước khi xóa hẳn.
   - Lịch sử chỉnh sửa thường (`neurorx_drug_revisions`): giữ **90 ngày**.
   - Số bản tối thiểu luôn giữ lại cho mỗi thuốc (dù quá hạn): **5 bản gần nhất**.
   - Các mốc đã từng đạt trạng thái `verified`: giữ **365 ngày (1 năm)**.
2. **Chế độ dữ liệu mirror cho CI (`00-design-neurorx-sync.md §8`):**
   - **Đã đồng ý:** Sau Phase 7, các script `rx:validate` / `rx:check-quotes` trên CI chạy trên `data/neurorx/drugs/*.json` xuất từ Supabase qua `npm run rx:pull` (mirror chỉ đọc).
3. **Lịch chạy dọn rác hằng tuần (`neurorx_purge`):**
   - **Đã chốt:** Dùng **`pg_cron` trực tiếp trong Supabase**, đồng thời cài sẵn fallback **GitHub Actions** (`.github/workflows/neurorx_purge.yml`) gọi `POST /api/neurorx/sync/purge` mỗi **Chủ Nhật** nếu gói Supabase hiện tại không bật `pg_cron`.
4. **Quy tắc chọn mô hình & Đặt tên file:**
   - **Argon** cho pha rủi ro cao, **Hydrogen** cho pha rủi ro trung bình/thấp; toàn bộ tài liệu trong `tasks/neurorx-sync/` mang hậu tố `-neurorx-sync` để tránh trùng tên.
