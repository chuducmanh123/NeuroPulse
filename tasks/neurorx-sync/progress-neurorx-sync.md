# NeuroRx Sync v2 — Progress & Human Gate Tracker

> **Quy tắc:** Mỗi phase chỉ được đánh dấu `DONE` sau khi chạy hết vòng lặp kiểm định trong [20-evaluation-neurorx-sync.md](./20-evaluation-neurorx-sync.md) và qua cổng duyệt của người dùng (nếu phase có Human Gate).

## 1. Bảng trạng thái tổng quan

| Phase | Tên Phase | Mô hình khuyến nghị | Trạng thái | Evaluation Loop | Human Gate | Ghi chú |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| — | Tài liệu nền (`00-design`, `10-phases`, `20-evaluation`, `progress`, `readme`, `simulator`) | — | `APPROVED_FOR_EXEC` | — | Đã chốt cấu hình | Hợp nhất Opus 5.5 + Gemini; đổi tên `*-neurorx-sync.*` |
| **0** | Preflight, kiểm kê & snapshot dữ liệu hiệu lực | **Hydrogen** | `DONE` | `PASS (Iter 1)` | Đã xác nhận `2026-11-14` | 69 thuốc (`1` verified, `68` draft); Supabase `reachable: true` |
| **1** | Database Migration SQL & SQL Checks (T1–T12) | **Argon** | `DONE` | `PASS (Iter 1)` | Đã xác nhận `2026-11-14` | Người dùng đã chạy migration + `T1–T12` trên Supabase SQL Editor (`Success. No rows returned`) |
| **2a** | Server Repo types, `jsonPatch.ts`, `MemoryDrugRepo` & Contract Tests | **Argon** | `DONE` | `PASS (Iter 1)` | — | `types.ts`, `jsonPatch.ts`, `repo.ts`, `repoMemory.ts` + patch/repo tests (`PASS`) |
| **2b** | `SupabaseDrugRepo`, `applyChanges.ts` & Property Tests | **Argon** | `DONE` | `PASS (Iter 1)` | — | `repoSupabase.ts`, `applyChanges.ts` + 100-seed permutation property tests (`PASS`) |
| **3** | Script migration (`--dry-run` → `--apply` + hash post-check) | **Hydrogen** | `DONE` | `PASS (Iter 1)` | Đã xác nhận `2026-11-14` | Run 1 tạo `69` (`max_seq: 0 -> 109`, `PASS`); Run 2 idempotent skip `69/69` (`root_hash: 371c2e8...`) |
| **4a** | HTTP API pure handlers (`handlers.ts`, ETag 304) + Unit Tests | **Argon** | `DONE` | `PASS (Iter 1)` | — | `handlers.ts`, `routeHelpers.ts` + `neurorxSyncApi.test.mjs` (`PASS`) |
| **4b** | Thin Next.js 16 route handlers (`Cache-Control: no-store`, `ETag`) | **Hydrogen** | `DONE` | `PASS (Iter 1)` | — | 6 routes under `src/app/api/neurorx/sync/` + `next build` (`PASS`) |
| **5** | Client `LocalStore` (IDB) + `syncEngine` + `realtime` + `useNeuroRxDrugs` | **Argon** | `DONE` | `PASS (Iter 1)` | — | `localStore.ts`, `syncEngine.ts`, `realtime.ts`, `useNeuroRxDrugs.ts` + `neurorxSyncEngine.test.mjs` |
| **6a** | UI Lookup sau cờ `NEXT_PUBLIC_NEURORX_SYNC_V2` (0 ms click) | **Hydrogen** | `DONE` | `PASS (Iter 1)` | — | `page.tsx`, `NeuroRxShell.tsx`, `LookupTab.tsx`, `OfflineStatus.tsx`, `lookupHelpers.ts` + `neurorxLookupV2.test.mjs` |
| **6b** | UI Admin (Draft Auto-Save, 3-Mode ConflictDialog, HistoryPanel) | **Argon** | `DONE` | `PASS (Iter 1)` | E2E B1–B6: PASS (Live Supabase) | Theo dõi production ≥ 3 ngày |
| **7** | Cutover, gỡ code legacy, đặt lịch `pg_cron` + GHA fallback & mirror | **Argon** | `DONE` | `PASS (Iter 1)` | User đã xác nhận `"GO CUTOVER"` (2026-11-16) | Đã giữ bảng cũ; có `LATER_drop_legacy_neurorx.sql` chờ ≥ 30 ngày |
| **8** | Tách lõi `src/lib/sync/` & áp dụng Granular Blocks cho NeuroGuide | **Argon** / **Hydrogen** | `IN_PROGRESS` | `Phase 8.0–8.5 DONE` | `Gate 8.3 PASSED` · `Phase 8.4 API` & `Phase 8.5 Client Engine DONE`; sẵn sàng **Phase 8.6** UI Integration | Xem `00-design-neurorx-sync.md §10` |

---

## 2. Phase 0 — Inventory (Verified)

Kiểm kê toàn bộ điểm đọc/ghi dữ liệu thuốc NeuroRx (qua `Select-String` trên `src/`, `scripts/`, `tests/`, `package.json` ngày `2026-11-14`):

- **Lõi lưu trữ & đồng bộ (`src/lib/neurorx/data.ts`):**
  - Tầng file tĩnh & tombstone local: `DATA_DIR` (`L13`), `DELETED_DRUGS_FILE` (`L14`), `getAllSources` (`L134`), `getTallManEntries` (`L147`), `getAllInteractions` (`L609`).
  - Tầng `/tmp` tạm thời: `TMP_DATA_DIR` (`L17`), `TMP_DRUGS_DIR` (`L18`), `TMP_DELETED_FILE` (`L19`), `safeWriteToTmp` (`L34–44`), `safeDeleteFromTmp` (`L49–56`), `safeWriteDeletedFile` (`L61–78`).
  - Tầng RAM: `inMemoryDrugs` (`L22`), `inMemoryDeletedIds` (`L23`).
  - Quản lý tombstone theo slug: `getDeletedDrugIds` (`L84`), `recordDeletedDrugId` (`L109`), `unmarkDeletedDrugId` (`L121`).
  - Đồng bộ Supabase cũ: `syncFromSupabase` (`L163–228`) đọc `neuroguide_docs` (`id = "neurorx_system_deleted_drugs"` ở `L176`, fallback `like("id", "neurorx_drug_%")` ở `L211`) và `neurorx_drugs` (`L190`); ghi ở `L441`, `L456`, `L472`, `L520–521`, `L527`.
  - Hợp nhất & đọc/ghi: `mergeDrugRecords` (`L235–293`), `getAllDrugs` (`L302–384`), `getAllDrugsAsync` (`L389–392`), `saveDrugToStorage` (`L398+`), `deleteDrugFromStorage` (`L500+`), `verifyAllDraftsInStorage` (`L580–595`), `getDrugById` (`L600–604`), `getDataVersionHash` (`L622–648`).
- **Page & HTTP API routes (`src/app/`):**
  - `src/app/neurorx/page.tsx:3,5,9,12` — `force-dynamic`, gọi `getAllDrugsAsync()`, `getAllSources()`, `getAllInteractions()`, `getDataVersionHash()`.
  - `src/app/api/neurorx/drugs/route.ts:2,13` — gọi `getAllDrugsAsync()`, `getDataVersionHash()`.
  - `src/app/api/neurorx/manage-drug/route.ts:3–12,15–60+` — gọi `getAllDrugs`, `getAllDrugsAsync`, `getDrugById`, `saveDrugToStorage`, `deleteDrugFromStorage`, `verifyDrugInStorage`, `verifyAllDraftsInStorage`, `getDataVersionHash`.
  - `src/app/api/neurorx/admin-data/route.ts:5,45,101` — gọi `getAllDrugs`, `getAllDrugsAsync`, `getAllSources`, `getAllInteractions`, `getDataVersionHash`.
  - `src/app/api/neurorx/extract/route.ts:6` — chỉ dùng `getAllSources`.
- **UI Components (`src/components/neurorx/`):**
  - `NeuroRxShell.tsx:16,93–94` (import type `DrugWithEffectiveStatus`, lắng nghe event `neurorx_drug_updated`).
  - `admin/NeuroRxAdminSection.tsx:124,153,178,211` & `drug/DrugDetail.tsx:19,114` (phát event `neurorx_drug_updated`).
  - `OfflineStatus.tsx:43–44` (đăng ký `/neurorx-sw.js?v=${dataHash}`).
  - Import type `DrugWithEffectiveStatus` từ `@/lib/neurorx/data`: `tabs/InteractionCard.tsx:18`, `tabs/InteractionsTab.tsx:13`, `tabs/LookupTab.tsx:16` (đồng thời gọi `router.push` ở `L67,74`), `tabs/NovelCard.tsx:15`, `tabs/NovelTab.tsx:4`, `tabs/PregnancyTab.tsx:16`, `tabs/RegimenTagInput.tsx:5`, `tabs/ReproBoard.tsx:5`, `tabs/ReproDetail.tsx:5`.
- **CLI Scripts & Cấu hình:**
  - `package.json:13–16` — `rx:sync`, `rx:push`, `rx:verify`, `rx:snapshot`.
  - `scripts/neurorx/sync_remote_to_local.mjs:39,112,130,142,146,197` — đồng bộ `deleted_drugs.json` và `neuroguide_docs` (`neurorx_system_deleted_drugs`, `neurorx_drug_%`).
  - `scripts/neurorx/push_local_to_remote.mjs:58,61` — upsert lên `neuroguide_docs` (`neurorx_drug_%`).
  - `scripts/neurorx/verify.ts:25,48,66` — đọc/ghi trực tiếp file `data/neurorx/drugs/<id>.json`.
  - `scripts/neurorx/validate.ts:21,55` — kiểm tra schema/hash trên `data/neurorx/drugs/*.json`.
  - `scripts/neurorx/export-effective-snapshot.ts:26,146,152,160,179` — script snapshot chỉ đọc của Phase 0.
- **Supabase Client (`src/lib/supabase.ts`):**
  - `src/lib/supabase.ts:13–15` — `supabaseServiceRoleKey` hiện fallback sang `supabaseAnonKey`.
- **Biến môi trường (`.env.local` — chỉ kiểm tra trạng thái có/thiếu, không in giá trị):**
  - `.env.local`: **Tồn tại**
  - `NEXT_PUBLIC_SUPABASE_URL`: **PRESENT (non-empty)**
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: **PRESENT (non-empty)**
  - `SUPABASE_SERVICE_ROLE_KEY`: **PRESENT (non-empty)**
  - `ADMIN_TOKEN` / `NEURORX_ADMIN_TOKEN`: **MISSING** trong `.env.local` (lưu ý kiểm tra biến admin token tương ứng trên Vercel khi sang Phase 4/6).

---

## 3. Cổng Người Duyệt (Human Gate Sign-Offs)

### Gate 0 — Xác nhận Snapshot & Cấu hình Retention
- [x] Người dùng đã xác nhận (`2026-11-14`) cấu hình `neurorx_sync_config`: Tombstone **90 ngày**, Revision thường **90 ngày**, Giữ tối thiểu **5 bản/thuốc**, Bản verified **365 ngày (1 năm)**.
- [x] Người dùng đã đồng ý hướng CI mirror (`data/neurorx/drugs/*.json` xuất từ Supabase qua `rx:pull`).
- [x] Người dùng đã xác nhận lịch purge tuần: ưu tiên `pg_cron` trực tiếp trong Supabase; fallback GitHub Actions (`.github/workflows/neurorx_purge.yml`) gọi `POST /api/neurorx/sync/purge` mỗi Chủ Nhật nếu gói Supabase hiện tại không bật `pg_cron`.
- [x] Người dùng đã xác nhận quy tắc chọn mô hình AI: **Argon** cho pha rủi ro cao, **Hydrogen** cho pha rủi ro trung bình/thấp.
- [x] Người dùng xác nhận (`2026-11-14`) [`summary-20261114.json`](../../data/neurorx/_migration/summary-20261114.json) (**69** thuốc: **1** verified, **68** draft, **0** retired) khớp số lượng thuốc thực tế trên `/neurorx`.
- **Ghi chú / Phản hồi:** _(Đã xác nhận "Số lượng thuốc là chính xác" và duyệt thực hiện Phase 1 — `2026-11-14`)_

### Gate 1 — Kết quả chạy SQL trên Supabase SQL Editor
Hướng dẫn chạy (khi Phase 1 hoàn thành):
1. Mở **Supabase Dashboard → SQL Editor**.
2. Chạy toàn bộ file `supabase/migrations/20261113_neurorx_sync_v2.sql` (kiểm tra chạy thành công; có thể chạy lại lần 2 để kiểm tra idempotent).
3. Chạy toàn bộ file `supabase/tests/neurorx_sync_v2_checks.sql` (script tự chạy trong `BEGIN ... ROLLBACK` nên không để lại dữ liệu rác).
4. Dán kết quả chạy checks vào dưới đây:
- **Trạng thái Gate 1:** `PASSED (2026-11-14)`
- **Kết quả SQL checks:** `Kết quả cả 2 phiên chạy đều là Success. No rows returned` (cả migration & `T1–T12` checks)

### Gate 3 — Kết quả chạy Migration (`--apply`)
- **Trạng thái Gate 3:** `PASSED (2026-11-14)`
- **Dry-run đã kiểm chứng (`2026-11-14`):** `npm run rx:migrate-v2` → `Existing live: 0`, `Planned create: 69`, `Planned skip: 0`, `Before max_seq: 0`, `After max_seq: 0`.
- **Apply lần 1 (`migrate-report-20261114-123150.json`):** `createdCount: 69`, `toSkipCount: 0`, `maxSeq: 0 -> 109`, `rootHash: "371c2e8eb8a02d42b8e19463ee7815a55e7241c10662ab994072cb8a9a102751"`, `postCheck: PASS (live=69, verified=1, draft=68, retired=0, rootHashMatchesComputed=true)`.
- **Apply lần 2 (`migrate-report-20261114-123249.json`):** Idempotent `createdCount: 0`, `toSkipCount: 69`, `maxSeq: 109 -> 109`, `postCheck: PASS (live=69, verified=1, draft=68, retired=0, rootHashMatchesComputed=true)`.

### Gate 6/7 — Xác nhận E2E (B1–B6) & Lệnh Cutover
- [ ] Đã bật `NEXT_PUBLIC_NEURORX_SYNC_V2=1` trên production ≥ 3 ngày, 6 kịch bản B1–B6 trong [`20-evaluation-neurorx-sync.md §4`](./20-evaluation-neurorx-sync.md) đạt hết.
  - *(2026-11-14)* Kiểm thử E2E tự động B1–B6 (`tests/neurorxE2EB1B6.test.mjs`) đã **PASS** cả in-memory (69 thuốc) lẫn **Live Supabase RPCs** (`NEURORX_SYNC_IT=1`); còn bước bật `NEXT_PUBLIC_NEURORX_SYNC_V2=1` theo dõi production ≥ 3 ngày trước khi `"GO CUTOVER"`.
- [x] User đã xác nhận `"GO CUTOVER"` (`2026-11-16` — kích hoạt Phase 7 Cutover).

### Gate 8.1 — Kết quả chạy SQL Phase 8.1 trên Supabase SQL Editor
Hướng dẫn chạy (khi Phase 8.1 hoàn thành):
1. Mở **Supabase Dashboard → SQL Editor**.
2. Chạy toàn bộ file [`20261118_neuroguide_granular_sync_v2.sql`](../../supabase/migrations/20261118_neuroguide_granular_sync_v2.sql) (có thể chạy lại lần 2 để kiểm tra idempotent).
3. Chạy toàn bộ file [`neuroguide_granular_sync_v2_checks.sql`](../../supabase/tests/neuroguide_granular_sync_v2_checks.sql) (tự bọc trong `BEGIN ... ROLLBACK` nên không để lại dữ liệu rác).
4. Dán kết quả chạy checks vào dưới đây:
- **Trạng thái Gate 8.1:** `PASSED (2026-11-18)`
- **Kết quả SQL checks:** `Cả 2 phiên chạy đều success` (`20261118_neuroguide_granular_sync_v2.sql` & `neuroguide_granular_sync_v2_checks.sql` T1–T12)

### Gate 8.3 — Kết quả chạy Migration NeuroGuide (`--apply`)
- **Trạng thái Gate 8.3:** `PASSED (2026-11-18)`
- **Live `--dry-run` đã kiểm chứng (`2026-11-18`):** `npm run ng:migrate-v2` → `Existing live: 0 protocols, 0 blocks`, `Planned create: 22 protocols, 1112 blocks` (+ `4878` unique cross-links), `Before max_seq: 0`, `After max_seq: 0`, `After root_hash: (empty)`.
- **Live `--apply` lần 1 (`migrate-report-20261118-065743.json`):** `createdProtocolsCount: 22`, `createdBlocksCount: 1112`, `upsertedLinksCount: 4878`, `maxSeq: 0 -> 1158`, `rootHash: "bf52b4c6c3526015fdad729a8623b3d6e84b354526928d3adf178ec031e73cc7"`, `postCheck: PASS (protocols=22, blocks=1112, links=4878, protocolHashes=true, rootComputed=true, rootSummary=true)`.
- **Live `--apply` lần 2 (`migrate-report-20261118-065801.json`):** Idempotent `createdProtocolsCount: 0`, `createdBlocksCount: 0`, `upsertedLinksCount: 0`, `toSkipProtocolsCount: 22`, `toSkipBlocksCount: 1112`, `maxSeq: 1158 -> 1158`, `postCheck: PASS (protocols=22, blocks=1112, links=4878, protocolHashes=true, rootComputed=true, rootSummary=true)`.

---

## 4. Mẫu Nhật Ký Thực Thi Phase (Copy mẫu này khi hoàn thành mỗi Phase)

```markdown
### Phase <N> — Execution Log
- **Model used:** <name>
- **Date:** <YYYY-MM-DD HH:mm>
- **Files changed:**
  - `path/to/file` — summary
- **Next.js docs cited (if any):** `node_modules/next/dist/docs/...`
- **Commands run & results:**
  - `<command>` → PASS / FAIL (key output)
- **Open questions / blockers:** none / ...

### Evaluation Log (Phase <N>)
- **Iterations run:** <1..5>
- **Gates:** G-HYGIENE [PASS/FAIL] · G-TEST [PASS/FAIL] · G-BUILD [PASS/FAIL] · G-PHASE [PASS/FAIL]
- **Defects found & fixed:** none / ...
- **AC checklist:** AC<N>.1 [x] · AC<N>.2 [x] ...
- **Human Gate ready:** YES / NO / N/A
```

---

### Phase 0 — Execution Log
- **Model used:** Hydrogen (execution turn)
- **Date:** 2026-11-14 18:37 (+07:00)
- **Files changed:**
  - `scripts/neurorx/export-effective-snapshot.ts` — tạo script snapshot chỉ đọc dùng `getAllDrugsAsync()`, có hook giải quyết alias `@/*` & relative `.ts` với `--experimental-strip-types` và lớp bảo vệ `fs` không ghi vào `/tmp` hay `data/neurorx/drugs`.
  - `package.json` — thêm npm script `"rx:snapshot": "node --experimental-strip-types scripts/neurorx/export-effective-snapshot.ts"`.
  - `data/neurorx/_migration/snapshot-20261114.json` — snapshot 69 bản ghi thuốc hiệu lực (sắp xếp theo `id`, từ `acyclovir` đến `warfarin`).
  - `data/neurorx/_migration/summary-20261114.json` — thống kê (`total: 69`, `verified: 1`, `draft: 68`, `retired: 0`, `hashMatchCount: 1`, `supabaseConfigured: true`, `supabaseReachable: true`).
  - `NEURORX-GUARDRAILS.md` — cập nhật mục G2.5 cho phép Supabase thông qua thiết kế Sync v2 (`neurorx_drug_records`, `neurorx_drug_revisions`, `neurorx_sync_state`, `neurorx_sync_config`).
  - `tasks/neurorx-sync/progress-neurorx-sync.md` — ghi Phase 0 Inventory (§2), trạng thái Gate 0 (§3) và nhật ký thực thi (§4).
- **Commands run & results:**
  - Kiểm kê (`Get-ChildItem ... | Select-String`) → PASS (đã ghi đầy đủ vào §2).
  - Kiểm tra khóa env `.env.local` (chỉ kiểm tra có/thiếu, không in giá trị) → `NEXT_PUBLIC_SUPABASE_URL`: PRESENT, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: PRESENT, `SUPABASE_SERVICE_ROLE_KEY`: PRESENT; `ADMIN_TOKEN` & `NEURORX_ADMIN_TOKEN`: MISSING trong `.env.local` (cần kiểm tra tên biến admin trên Vercel ở Phase 4/6).
  - `npm run rx:snapshot` (trong sandbox & bypass khi không dùng system CA) → gặp `TypeError: fetch failed` (`UNABLE_TO_VERIFY_LEAF_SIGNATURE` khi Node kết nối TLS tới Supabase).
  - `node --use-system-ca --experimental-strip-types scripts/neurorx/export-effective-snapshot.ts` (với `BypassSandbox: true`, dùng Windows system CA store hợp lệ) → **PASS**: `Total effective drugs: 69`, `{"verified":1,"draft":68,"retired":0}`, `Hash matches: 1`, `Supabase configured: true, reachable: true`.
  - Xác minh JSON `snapshot-20261114.json` & `summary-20261114.json` → PASS (`69` bản ghi khớp nhau).
- **Open questions / blockers:**
  - Chờ bạn xác nhận số **69 thuốc (1 verified, 68 draft)** trong `summary-20261114.json` khớp với thực tế hiển thị trên `/neurorx` (Human Gate 0).
  - Lưu ý môi trường Windows hiện tại cần flag `--use-system-ca` (ví dụ `NODE_OPTIONS=--use-system-ca`) khi Node gọi HTTPS tới Supabase từ CLI để tránh lỗi chứng chỉ gốc `UNABLE_TO_VERIFY_LEAF_SIGNATURE` mà không phải tắt kiểm tra TLS.

### Evaluation Log (Phase 0)
- **Iterations run:** 1
- **Gates:**
  - `G-HYGIENE` (trên `src/lib/neurorx`, `src/app/neurorx`, `src/app/api/neurorx`, `src/components/neurorx`, `scripts/neurorx`, `tests`, cùng kiểm tra không lộ secret và `git diff` chỉ chạm đúng phạm vi Phase 0) → **PASS** *(Ghi chú: lệnh quét rộng toàn repo có 7 comment `eslint-disable-next-line` có sẵn từ trước trong `src/app/neurovision/page.tsx` & `src/components/neurovision/NeuroViewerCanvas.tsx`, không thuộc NeuroRx hay Phase 0).*
  - `G-TEST` (`npm test`) → **PASS**: `181` tests / `35` suites (`181 pass, 0 fail, 0 skipped`); `rx:validate` (`74` sources, `69` drugs, `32` interactions, `12` LEDD factors); `rx:check-quotes` (`1627` quotes verbatim verified); `rx:check-constants` (`0` hardcoded clinical constants).
  - `G-BUILD` (`npm run build` — Next.js 16.4.3 Turbopack) → **PASS** (`Compiled successfully`, TypeScript pass, static & dynamic routes generated cleanly).
  - `G-PHASE` (AC0.1–AC0.4) → **PASS**.
- **Defects found & fixed:** Lần chạy đầu kết nối Supabase từ CLI gặp `UNABLE_TO_VERIFY_LEAF_SIGNATURE` do Node mặc định không đọc Windows System CA store; đã xác minh và chạy lại với `--use-system-ca` để đồng bộ trực tiếp với Supabase thật.
- **AC checklist:** AC0.1 [x] · AC0.2 [x] · AC0.3 [x] · AC0.4 [x]
- **Human Gate ready:** YES (chờ user xác nhận `summary-20261114.json` trước khi chuyển sang Phase 1).

---

### Phase 1 — Execution Log
- **Model used:** Argon (theo bảng phân công)
- **Date:** 2026-11-14 18:50 (+07:00)
- **Files changed:**
  - `supabase/migrations/20261113_neurorx_sync_v2.sql` — sequence `neurorx_change_seq`, 4 bảng (`neurorx_drug_records`, `neurorx_drug_revisions`, `neurorx_sync_state`, `neurorx_sync_config` với mặc định `90 / 90 / 5 / 365`), RLS + quyền `anon`/`service_role`, publication `supabase_realtime`, `neurorx_recompute_root_hash()`, các RPC `neurorx_create_drug`, `neurorx_update_drug`, `neurorx_delete_drug`, `neurorx_restore_revision`, `neurorx_changes_since`, `neurorx_purge` (bọc trong `BEGIN; ... COMMIT;`, idempotent, không đụng bảng cũ).
  - `supabase/migrations/20261113_neurorx_sync_v2_rollback.sql` — rollback an toàn chỉ gỡ đối tượng Sync v2.
  - `supabase/tests/neurorx_sync_v2_checks.sql` — bộ kiểm thử tự chứa `T1`–`T12` bọc trong `BEGIN; ... ROLLBACK;` với 32 `RAISE EXCEPTION`.
  - `tasks/neurorx-sync/progress-neurorx-sync.md` — đánh dấu Phase 0 `DONE`, Gate 0 đã duyệt, Phase 1 `WAITING_HUMAN_GATE`.
- **Commands run & results:**
  - Kiểm tra tĩnh SQL (`pg_advisory_xact_lock|FOR UPDATE|content_hash|section_hashes|patch_diff|root_hash|neurorx_recompute_root_hash`) → **PASS** (`90` kết quả; xác nhận thứ tự lock trước `FOR UPDATE` trước `nextval`).
  - Kiểm tra không chạm bảng cũ (`neurorx_drugs|neuroguide_docs`) → **PASS** (`0` kết quả).
  - Kiểm tra đủ test `T1`–`T12` & `RAISE EXCEPTION` → **PASS** (`T1`–`T12` đầy đủ, `32` `RAISE EXCEPTION`).
  - Không thực thi SQL lên Supabase từ agent (tuân thủ Human Gate 1).
- **Open questions / blockers:**
  - Chờ người dùng chạy lần lượt `supabase/migrations/20261113_neurorx_sync_v2.sql` (có thể chạy lại lần 2 để kiểm tra idempotent) rồi `supabase/tests/neurorx_sync_v2_checks.sql` trong **Supabase Dashboard → SQL Editor** và dán kết quả (`ALL NEURORX SYNC V2 SQL CHECKS (T1-T12) PASSED`) vào Gate 1. (Phase 2a/2b TypeScript có thể thực hiện song song hoặc ngay sau khi bạn duyệt.)

### Evaluation Log (Phase 1)
- **Iterations run:** 1
- **Gates:**
  - `G-HYGIENE` → **PASS**
  - `G-TEST` (`npm test`) → **PASS** (chạy sau lần sửa cuối)
  - `G-BUILD` (`npm run build`) → **PASS** (chạy sau lần sửa cuối)
  - `G-PHASE` (AC1.1–AC1.5) → **PASS**
- **Defects found & fixed:** Bổ sung alias `as r` trong `INSERT ... RETURNING` ở `neurorx_create_drug` để tránh xung đột tên biến `uid` trong PL/pgSQL `RETURNS TABLE`, và bổ sung case `neurorx_create_drug` bị từ chối với role `anon` vào `T11`.
- **AC checklist:** AC1.1 [x] · AC1.2 [x] · AC1.3 [x] · AC1.4 [x] · AC1.5 [x]
- **Human Gate status:** `CONFIRMED (2026-11-14)` — Người dùng xác nhận chạy cả migration lẫn `neurorx_sync_v2_checks.sql` cho kết quả `"Success. No rows returned"`.

### Phase 2 (2a & 2b) — Execution Log (`2026-11-14`)
- **Model:** Argon
- **Files created:**
  - `src/lib/neurorx/sync/types.ts` — Sync types, `JsonPatchOp`, `SyncRow`, `RevisionRow`, `SyncState`, `SyncRetentionConfig`, `RepoErrorCode`, `MergeConflict`, `ThreeWayMergeResult`
  - `src/lib/neurorx/sync/jsonPatch.ts` — Pure client/server FIPS 180-4 SHA-256 (`sha256Hex`), `canonicalizeSyncValue`, `computeRecordContentHashSync` (khớp `integrity.ts` & bỏ `verification`), `computeSectionHashes` (8 section lâm sàng), `computeRootHashFromEntries`, `computeJsonPatch`, `applyJsonPatch`, `threeWayMergeDrug`
  - `src/lib/neurorx/sync/repo.ts` — `RepoError` & `DrugRepo` interface
  - `src/lib/neurorx/sync/repoMemory.ts` — `MemoryDrugRepo` (đối xứng SQL contract: global `changeSeq`, `rev` monotonic, partial unique slug sống, tombstones, `I13` short-circuit, batched `recomputeRootHash()`, `I14` `patchDiff`, `P9` restore→draft strip `verification`, purge `90/90/5/365`)
  - `src/lib/neurorx/sync/repoSupabase.ts` — `SupabaseDrugRepo` (gọi 7 RPC/bảng v2, throw `RepoError("SERVICE_UNAVAILABLE")` khi thiếu `SUPABASE_SERVICE_ROLE_KEY` — không fallback anon key, map mã lỗi `NRX_*`)
  - `src/lib/neurorx/sync/applyChanges.ts` — Pure `I7` `applyChanges()` với `tombstoneRevWatermarks` (`WeakMap`) & chuẩn hóa thứ tự `uid` trong `Map` kết quả
  - `tests/neurorxSyncPatch.test.mjs`, `tests/neurorxSyncRepo.test.mjs`, `tests/neurorxSyncApply.test.mjs`
- **Verification commands run (Iteration 1):**
  - `node --experimental-strip-types --test tests/neurorxSyncPatch.test.mjs tests/neurorxSyncRepo.test.mjs tests/neurorxSyncApply.test.mjs`: 15/15 tests pass across 4 suites
  - `NEURORX_SYNC_IT=1` (`node --use-system-ca --experimental-strip-types --test tests/neurorxSyncRepo.test.mjs`): **9/9 tests pass across 3 suites** (`MemoryDrugRepo`, `SupabaseDrugRepo — Configuration & Error Mapping`, `SupabaseDrugRepo (Live IT)` kiểm chứng trực tiếp `T1–T10`, `T12` trên Supabase và tự động dọn `zz-sync-test-%` về `0` bản ghi / `max_seq = 0`)
  - Isolation (`src/app`, `src/components` for `neurorx/sync`): 0 matches (clean)
  - Client safety (`types.ts`, `jsonPatch.ts`, `applyChanges.ts` for `node:`): 0 matches (clean)
  - `npm test`: exit 0
  - `npm run build`: exit 0 (compiled & strict TypeScript passed cleanly)

### Evaluation Log (Phase 2)
- **Reviewer:** Coordinator self-check (`20-evaluation-neurorx-sync.md`) · **Iteration:** 1 · **Verdict:** `PASS`
- **AC checklist:** AC2.1 [x] · AC2.2 [x] · AC2.3 [x] · AC2.4 [x]
- **Human Gate ready:** Phase 2 hoàn thành + đã kiểm chứng contract live trên Supabase (`NEURORX_SYNC_IT=1`).

---

### Phase 3 — Execution Log
- **Model used:** Hydrogen (execution theo bảng phân công)
- **Date:** 2026-11-14 19:26 (+07:00)
- **Files changed:**
  - `scripts/neurorx/migrate-to-v2.ts` — Script chuyển dữ liệu từ snapshot đóng băng `data/neurorx/_migration/snapshot-*.json` sang `SupabaseDrugRepo`, mặc định `--dry-run`, batch insert nguyên vẹn từng byte (`skipRootRehash: true`) + gọi `recomputeRootHash()` duy nhất 1 lần cuối batch, và thực thi post-check toàn diện + ghi `migrate-report-<ts>.json` khi `--apply`.
  - `package.json` — Thêm npm script `"rx:migrate-v2": "node --use-system-ca --experimental-strip-types scripts/neurorx/migrate-to-v2.ts"`.
  - `tests/neurorxSyncRepo.test.mjs` — Bổ sung cleanup/dọn trạng thái an toàn và test `T10` `neurorx_purge()` trực tiếp cho chế độ live `NEURORX_SYNC_IT=1`.
  - `tests/neurorxMigrateV2.test.mjs` — Kiểm thử `AC3.1` (`--dry-run` không đổi `maxSeq`/`rootHash`), `AC3.2` (`--apply` nguyên vẹn byte-for-byte + idempotent lần 2 skip toàn bộ 69), `AC3.3` (tính `rootHash` 1 lần + báo lỗi `passed=false` khi lệch hash/số lượng).
- **Commands run & results:**
  - `NEURORX_SYNC_IT=1` trên `tests/neurorxSyncRepo.test.mjs` → **PASS** (`9/9` pass, `0` fail, `0` skipped; bảng live đã dọn sạch `zz-sync-test-%`).
  - `node --experimental-strip-types --test tests/neurorxMigrateV2.test.mjs` → **PASS** (`3/3` pass, `0` fail).
  - `npm run rx:migrate-v2` (chế độ mặc định `--dry-run` kết nối Supabase live) → **PASS** (`Planned create: 69`, `Planned skip: 0`, `Before max_seq: 0`, `After max_seq: 0`, `After root_hash: (empty)`). Không chạy `--apply` để giữ Human Gate 3.

### Evaluation Log (Phase 3)
- **Iterations run:** 1
- **Gates:** `G-HYGIENE` **PASS** · `G-TEST` **PASS** · `G-BUILD` **PASS** · `G-PHASE` **PASS**
- **Defects found & fixed:** Bổ sung `baselineLiveEntries` / `baselineSeq` & `after()` cleanup vào `tests/neurorxSyncRepo.test.mjs` để `NEURORX_SYNC_IT=1` chạy lặp lại an toàn trên DB live không để lại bản ghi test.
- **AC checklist:** AC3.1 [x] · AC3.2 [x] · AC3.3 [x]
- **Human Gate status:** `CONFIRMED (2026-11-14)` — Người dùng chạy `npm run rx:migrate-v2 -- --apply` 2 lần (`migrate-report-20261114-123150.json` tạo 69 bản ghi, `migrate-report-20261114-123249.json` idempotent skip 69/69, `postCheck: PASS`, `live=69, verified=1, draft=68, retired=0`).

---

### Phase 4 (4a & 4b) — Execution Log
- **Model used:** Argon (4a: handlers + tests) · Hydrogen (4b: Next.js 16 thin route wrappers)
- **Date:** 2026-11-14 19:39 (+07:00)
- **Next.js 16 docs cited:**
  - `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` (`context: { params: Promise<{ uid: string }> }` + `await context.params`)
  - `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidateTag.md` (`revalidateTag(tag, { expire: 0 })` 2-arg signature)
  - `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` & `01-app/02-guides/caching-without-cache-components.md` (`export const dynamic = "force-dynamic"`, `Cache-Control: no-store`)
- **Files changed:**
  - `src/lib/neurorx/sync/handlers.ts` — 7 framework-free handlers (`handleGetChanges` hỗ trợ ETag `304` fast-path + `hasMore` + `reset`, `handleCreateDrug`, `handleUpdateDrug`, `handleDeleteDrug`, `handleGetHistory`, `handleRestoreRevision`, `handlePurge`) + validation (`validateDrug`), I13 no-op, I14 `patchDiff`, G1.5/P9 draft coercion, và `mapRepoErrorToResult` (`400`/`401`/`404`/`409` kèm `current`/`503`).
  - `src/lib/neurorx/sync/routeHelpers.ts` — Thin request helpers (`isAdminRequest`, `invalidateSyncTag`, `parseJsonObjectBody`).
  - `src/app/api/neurorx/sync/changes/route.ts` (`GET`)
  - `src/app/api/neurorx/sync/drugs/route.ts` (`POST`)
  - `src/app/api/neurorx/sync/drugs/[uid]/route.ts` (`PUT`, `DELETE`)
  - `src/app/api/neurorx/sync/drugs/[uid]/history/route.ts` (`GET`)
  - `src/app/api/neurorx/sync/drugs/[uid]/restore/route.ts` (`POST`)
  - `src/app/api/neurorx/sync/purge/route.ts` (`POST`)
  - `tests/neurorxSyncApi.test.mjs` — Test toàn bộ bảng §4, `401` unauthenticated, ETag `304`, `hasMore`, `reset`, `409 REV_CONFLICT` kèm `current` (PUT/DELETE/RESTORE), `I13` no-op không invalidation, `503`.
- **Commands run & results:**
  - `node --experimental-strip-types --test tests/neurorxSyncApi.test.mjs` → **PASS** (`4/4` tests pass, `0` failed)
  - Static route check (`src/app/api/neurorx/sync/**/route.ts`) → tất cả 6 file đều có `export const dynamic = "force-dynamic"` và `Cache-Control: no-store`.
  - Isolation (`src/components`, `src/app/neurorx` cho `neurorx/sync`) → **0 matches**; chưa chạm UI hay legacy `/api/neurorx/*`.
  - `npm test` & `npm run build` → **PASS** (`exit code 0`).

### Evaluation Log (Phase 4)
- **Iterations run:** 1
- **Gates:** `G-HYGIENE` **PASS** · `G-TEST` **PASS** · `G-BUILD` **PASS** · `G-PHASE` **PASS**
- **Defects found & fixed:** Bổ sung explicit `409 REV_CONFLICT` test cho cả `DELETE /drugs/[uid]` và `POST /restore` bên cạnh `PUT`.
- **AC checklist:** AC4.1 [x] · AC4.2 [x] · AC4.3 [x] · AC4.4 [x]
- **Human Gate ready:** Không cần gate; sẵn sàng sang **Phase 5** (`LocalStore` IDB + `syncEngine` + `realtime` + `useNeuroRxDrugs`).

---

## Phase 5 — Execution Log (2026-11-14)
- **Model:** Argon
- **Deliverables:**
  - `src/lib/neurorx/sync/localStore.ts`: `LocalStore` interface, `MemoryLocalStore`, `IdbLocalStore` (`neurorx-sync-v1`, object stores `drugs` & `meta`), single-transaction atomic `commit(...)`, cleanup các DB `neurorx-sync-v*` cũ qua `indexedDB.databases?.()`, và tự động fallback về `MemoryLocalStore` khi `indexedDB` không khả dụng hoặc `open()` lỗi (`P12`).
  - `src/lib/neurorx/sync/syncEngine.ts`: `createSyncEngine` với 0ms local-first emit trước khi pull, single-flight `pull()` (`inFlightPull` + `queuedFollowUp`, gom tối đa <= 2 lần fetch cho 5 lệnh `pull()` đồng thời — `AC5.1`/`P4`), `If-None-Match` / `304 Not Modified` không ghi store, `hasMore` loop, one-shot `reset` recovery (`P13`), monotonic `lastSeq` chỉ cập nhật sau khi `store.commit` thành công (`AC5.2`/`P2`), giữ nguyên `lastSeq` khi `applyLocalWrite` (`I8`) và chặn phục sinh tombstone ở rev cũ (`I7`).
  - `src/lib/neurorx/sync/realtime.ts`: `createRealtimeSyncBridge` gắn `visibilitychange`, `online`, poll `60s` khi tab visible (`P11`), và `postgres_changes` (`UPDATE` trên `public.neurorx_sync_state` qua `channel("neurorx-sync")`), debounce `300ms` (`AC5.4`) và chỉ `pull()` khi thiếu payload hoặc `max_seq > lastSeq` hoặc `root_hash !== localRootHash`.
  - `src/hooks/useNeuroRxDrugs.ts`: `"use client"` hook cung cấp `{ drugs, rowsBySlug, status, lastSyncAt, lastChangeCount, lastSeq, applyLocalWrite, refresh }`, hỗ trợ `initialDrugs`, sắp xếp `generic_name` theo alphabet, tính `effectiveStatus` & `hashMatches` thuần client qua `computeRecordContentHashSync` + Web Crypto `crypto.subtle.digest`.
  - `tests/neurorxSyncEngine.test.mjs`: `10/10` test đạt (offline start, delta + tombstone + `304`, 5 concurrent `pull()` <= 2 fetches, `hasMore`, one-shot `reset` + chống loop, out-of-order `I7` + `store.commit` rollback `AC5.2`, `applyLocalWrite` `I8`, Realtime debounce + ignore `max_seq` `AC5.4`, `IdbLocalStore` atomic + fallback `P12`, helpers `useNeuroRxDrugs`).
- **Critical Finding (`integrity.ts` / `AC5.3`):** `src/lib/neurorx/integrity.ts` import `crypto from "node:crypto"` ở top-level nên không an toàn cho client bundle; Phase 5 không import `integrity.ts` vào client code, dùng `computeRecordContentHashSync` từ `src/lib/neurorx/sync/jsonPatch.ts` và Web Crypto `globalThis.crypto.subtle.digest` trong `useNeuroRxDrugs.ts`.

### Evaluation Log (Phase 5)
- **Self-eval:** **PASS** (Iteration 1)
- **AC checklist:** AC5.1 [x] · AC5.2 [x] · AC5.3 [x] · AC5.4 [x]
- **Human Gate ready:** Không cần gate; UI & routes (`src/components`, `src/app/neurorx`) chưa nối Phase 5. Sẵn sàng sang **Phase 6a** (`NEXT_PUBLIC_NEURORX_SYNC_V2` lookup UI integration — Hydrogen).

---

## Phase 6a — Execution Log (2026-11-14)
- **Model:** Hydrogen
- **Next.js 16 Docs Cited:**
  - `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md` (lines 344–375): Native History API (`window.history.pushState`) đồng bộ `useSearchParams` / `usePathname` không gây reload hay gọi RSC lên server.
  - `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md` (lines 80–186, 228–265): bọc `useSearchParams()` trong `<Suspense>` khi prerender static, và dùng `await connection()` thay vì `export const dynamic = "force-dynamic"` tĩnh để nhánh tắt cờ vẫn dynamic còn nhánh bật cờ render static shell.
  - `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md` (lines 78–100): route segment config vs dynamic rendering.
- **Deliverables:**
  - `src/hooks/useNeuroRxDrugs.ts`: thêm option `enabled` (default `true`) để tắt hoàn toàn IDB/Realtime/network khi cờ TẮT; thêm trạng thái `"loading"` khi store rỗng đang đồng bộ lần đầu.
  - `src/lib/neurorx/sync/lookupHelpers.ts`: các hàm thuần `formatSyncStatusView` (§5.4 strings) và `buildDrugSelectionSearchParams` (dùng chung cho component & Node tests).
  - `src/app/neurorx/page.tsx`: bỏ `export const dynamic = "force-dynamic"` / `revalidate = 0`; khi `NEXT_PUBLIC_NEURORX_SYNC_V2 !== "1"` gọi `await connection()` + `getAllDrugsAsync()`, khi bật cờ bỏ qua `getAllDrugsAsync()` và truyền `initialDrugs={[]}` + `syncV2Enabled`.
  - `src/components/neurorx/OfflineStatus.tsx`: mở rộng chế độ `syncV2` (`role="status"`, icon + text tiếng Anh: `"Updating…"`, `"Offline — showing saved data"`, `"Sync issue — showing saved data"`, `"Up to date · HH:MM · seq #N"`, `"1 drug updated"` / `"N drugs updated"` + nút sync `>= 44px`); giữ nguyên hành vi PWA v1 khi cờ tắt.
  - `src/components/neurorx/NeuroRxShell.tsx`: nối `useNeuroRxDrugs({ initialDrugs, enabled: isSyncV2 })`, hiển thị `<OfflineStatus syncV2 />` trong header, hiện skeleton directory khi `status === "loading"` và chưa có dữ liệu local, và dùng `window.history.pushState` + listener `popstate` khi đổi tab ở chế độ v2.
  - `src/components/neurorx/tabs/LookupTab.tsx`: dùng `window.history.pushState`, cập nhật `selectedDrugId` cục bộ + `useNeuroRxStore.getState().initFromSearchParams(...)`, gắn `performance.mark("neurorx:drug-select-start")` / `performance.measure("neurorx:click-to-detail")`, hỗ trợ deep link & bàn phím (`min-h-[44px]`).
  - `tests/neurorxLookupV2.test.mjs`: kiểm chứng `formatSyncStatusView`, `buildDrugSelectionSearchParams`, và đo hiệu năng chọn thuốc → tra cứu chi tiết toàn bộ 69 thuốc với `0` network request (`< 150ms`).

### Evaluation Log (Phase 6a)
- **Self-eval:** **PASS** (Iteration 1)
- **AC checklist:** AC6.1 [x] · AC6.2 [x] · AC6.6 [x] *(AC6.3–AC6.5 thuộc Phase 6b Admin)*
- **Human Gate ready:** Không cần gate; sẵn sàng sang **Phase 6b** (Admin Draft Auto-Save, 3-Mode ConflictDialog, HistoryPanel, Verify adapter — Argon).

---

## Phase 6b — Execution Log (2026-11-14)
- **Model:** Argon
- **Deliverables:**
  - `src/lib/neurorx/sync/adminHelpers.ts`: pure TS helpers cho auto-save local draft 3 giây (`DRAFT_AUTOSAVE_INTERVAL_MS = 3000`, `neurorx-draft:${uid}:${baseRev}`), khôi phục/xóa bản nháp (`I15`), phân giải xung đột 3 chế độ `use_cloud` / `smart_merge` / `force_overwrite` (`I6`), và định dạng diff bản ghi (`formatPatchValuePreview`, `formatRevisionDiffEntries`).
  - `src/lib/neurorx/sync/handlers.ts` & `src/app/api/neurorx/manage-drug/route.ts`: bổ sung `listAllLiveRows`, `handleVerifyDrugV2`, `handleVerifyAllDrugsV2` tính `status = "verified"` và `content_hash` phía server (`G1.5`) kèm optimistic lock `expected_rev` -> `409 REV_CONFLICT`, và nhánh adapter `NEXT_PUBLIC_NEURORX_SYNC_V2 === "1"` cho `action: "verify"` / `"verify_all"`.
  - `src/components/neurorx/admin/ConflictDialog.tsx`: modal 3 chế độ (`Use Cloud`, `Smart Merge`, `Force Overwrite`, `Cancel`), nút chọn từng trường trùng (`Keep Mine` / `Use Cloud`), tương phản WCAG AA, nút `min-h-[44px]`, responsive `375px` (`G3`).
  - `src/components/neurorx/admin/HistoryPanel.tsx`: modal lịch sử revision (`/api/neurorx/sync/drugs/[uid]/history`), diff theo từng đường dẫn RFC 6902 và khôi phục `"Restore as draft"` (`/restore`, `AC6.4`).
  - `src/components/neurorx/admin/EditDrugModal.tsx`: tự động lưu draft cục bộ mỗi 3s khi mở modal ở chế độ v2, hiện banner `"Unsaved local draft found"` (`Restore Draft` / `Discard`), gọi `POST`/`PUT /api/neurorx/sync/drugs*` kèm `expectedRev` (giữ nguyên `uid` khi đổi `slug`, `P6`), chỉ xóa draft khi nhận HTTP `200`/`201`, và mở `ConflictDialog` khi gặp `409 REV_CONFLICT`.
  - `src/components/neurorx/admin/NeuroRxAdminSection.tsx`, `src/components/neurorx/drug/DrugDetail.tsx`, `src/components/neurorx/tabs/LookupTab.tsx`, `src/components/neurorx/NeuroRxShell.tsx`: nối dữ liệu live từ `useNeuroRxDrugs` khi bật cờ, định tuyến `DELETE` / `verify` / `verify_all` qua sync v2 + `applyLocalWrite`, thêm nút `History` mở `HistoryPanel`, giữ nguyên 100% luồng cũ khi tắt cờ.
  - `tests/neurorxAdminV2.test.mjs`: kiểm chứng auto-save & lifecycle xóa draft (`AC6.5`), conflict 3 chế độ (`AC6.3`), định dạng diff & restore draft (`AC6.4`), verify v2 & `409` conflict (`G1.5`), và đổi `slug` giữ nguyên `uid` (`P6`).

### Evaluation Log (Phase 6b)
- **Self-eval:** **PASS** (Iteration 1)
- **AC checklist:** AC6.1 [x] · AC6.2 [x] · AC6.3 [x] · AC6.4 [x] · AC6.5 [x] · AC6.6 [x]
- **Human Gate ready:** Không cần gate; đã hoàn tất kiểm thử E2E B1–B6 với `NEXT_PUBLIC_NEURORX_SYNC_V2=1`, chờ theo dõi production ≥ 3 ngày trước khi bật cờ mặc định và `"GO CUTOVER"`.

---

## E2E Verification Log (B1–B6 với NEXT_PUBLIC_NEURORX_SYNC_V2=1)
- **Date:** 2026-11-14
- **Test file:** `tests/neurorxE2EB1B6.test.mjs`
- **Coverage & Architecture:** Chạy ma trận hồi quy B1–B6 đầy đủ qua các lớp thực tế (`handlers.ts`, `SyncEngine`, `RealtimeSyncBridge`, `adminHelpers.ts`, `lookupHelpers.ts`, `deriveDrugsFromRows`, `parsePatient`, `resolveRenalFunction`) đối chứng trên cả:
  1. `MemoryDrugRepo` (nạp đủ 69 file thuốc `data/neurorx/drugs/*.json`)
  2. `SupabaseDrugRepo` kết nối trực tiếp Supabase Production RPCs + 69 thuốc live (`NEURORX_SYNC_IT=1`)
- **Commands run & exact results:**
  - Sandboxed E2E (`node --experimental-strip-types --test tests/neurorxE2EB1B6.test.mjs`) → `PASS` (`1` suite, `1` test, `pass 1`, `fail 0`, `skipped 0`, `317.28ms`).
  - Live Supabase E2E (`NEXT_PUBLIC_NEURORX_SYNC_V2=1 NEURORX_SYNC_IT=1 node --use-system-ca --experimental-strip-types --test tests/neurorxE2EB1B6.test.mjs`) → `PASS` (`2` suites, `2` tests, `pass 2`, `fail 0`, `skipped 0`: `MemoryDrugRepo` `313.89ms`, `SupabaseDrugRepo` `9823.86ms`, total `10892.02ms`).
- **Scenarios verified:**
  - **B1:** Sửa thuốc trên Máy A → Realtime bridge signal kéo delta trên Máy B trong `< 3s` (không F5) với badge `"1 drug updated"`.
  - **B2:** Cập nhật `rev 2 -> rev 3` bền vững qua 3 lần khởi tạo lại liên tiếp (mô phỏng F5 hard reload) + 1 lần cold full pull.
  - **B3:** Soft delete tạo tombstone (`deletedAt !== null`) đồng bộ qua `/changes` delta, biến mất trên Máy A, Máy B và phiên Incognito mới (`seq = 0`) mà không hồi sinh.
  - **B4:** Xóa slug cũ và tạo lại đúng slug đó thành công với UUID (`uid`) mới hoàn toàn (`uid2 !== uid1`, `rev = 1`).
  - **B5:** Warm boot từ cache `< 150ms`, poll lại khi không đổi trả HTTP `304`, và chọn 5 thuốc liên tiếp (`levetiracetam-oral`, `apixaban`, `lamotrigine`, `valproate`, `warfarin`) kèm tính liều theo CrCl hết `< 50ms`/lần với `0` network request.
  - **B6(a)/(b):** Xóa trắng trường tùy chọn (`hepatic`, `black_box`) về `null` được giữ nguyên `null` sau reload; tab 1 sửa lên `rev=3` khiến tab 2 (`expectedRev=2`) nhận `409 REV_CONFLICT`, giữ nguyên bản nháp local cho tới khi phân giải `smart_merge` lên `rev=4` (`HTTP 200`) mới xóa draft.
- **Post-cleanup Supabase state:** Tự động xóa toàn bộ dòng test `zz-sync-test-e2e-%`, gọi `recomputeRootHash()` và kiểm chứng DB live còn đúng `69` thuốc (`verified = 1`, `draft = 68`).
- **Phạm vi thực tế / lưu ý:** Kiểm thử E2E này xác minh end-to-end tầng RPC Supabase + SyncEngine + API handlers + state/calc helpers; tín hiệu Realtime B1 dùng fake hub kích hoạt handler `{ max_seq, root_hash }`, cache dùng `MemoryLocalStore` và draft dùng `createMemoryStorage()` (không phải thao tác click DOM/WebSocket trực tiếp trên trình duyệt Chrome).

---

## Phase 7 — Execution Log (2026-11-16)
- **Model:** Argon
- **Lệnh kích hoạt:** User xác nhận `"GO CUTOVER"`
- **Files changed / added / deleted:**
  - `src/lib/neurorx/sync/types.ts` & `src/lib/neurorx/sync/jsonPatch.ts`: chuyển `DrugWithEffectiveStatus` sang `sync/types.ts`; tách `evaluateEffectiveDrug` sang `sync/jsonPatch.ts` (thuần ISOMORPHIC, dùng chung giữa client hook và API route server) và re-export tại `src/hooks/useNeuroRxDrugs.ts`.
  - `src/lib/neurorx/data.ts`: xóa bỏ toàn bộ tầng lưu trữ thuốc cũ (`TMP_DRUGS_DIR`, `inMemoryDrugs`, `inMemoryDeletedIds`, `getDeletedDrugIds`, `recordDeletedDrugId`, `unmarkDeletedDrugId`, `syncFromSupabase`, `mergeDrugRecords`, `getAllDrugs*`, `saveDrugToStorage`, `deleteDrugFromStorage`, `verify*InStorage`, `getDrugById`); chỉ giữ loader metadata tĩnh (`getAllSources`, `getTallManEntries`, `getAllInteractions`, `getDataVersionHash`). Cập nhật import `DrugWithEffectiveStatus` tại `omnibar.ts`, `NeuroRxShell.tsx`, `DrugDetail.tsx`, và 8 component tab (`tabs/*.tsx`).
  - `src/app/api/neurorx/drugs/route.ts`: **đã xóa** route legacy `/api/neurorx/drugs`.
  - `src/app/api/neurorx/manage-drug/route.ts` & `src/app/api/neurorx/admin-data/route.ts`: gỡ nhánh legacy `save`/`delete`/`get`/`get_all` và `getAllDrugsAsync`; `manage-drug` chỉ giữ adapter `verify` / `verify_all` qua v2; `admin-data` đọc trực tiếp từ `SupabaseDrugRepo` (`listAllLiveRows`) + `Cache-Control: no-store`.
  - `src/app/neurorx/page.tsx`, `src/components/neurorx/NeuroRxShell.tsx`, `OfflineStatus.tsx`, `tabs/LookupTab.tsx`, `drug/DrugDetail.tsx`, `admin/EditDrugModal.tsx`, `admin/NeuroRxAdminSection.tsx`: bật mặc định Sync v2, gỡ toàn bộ nhánh cờ `NEXT_PUBLIC_NEURORX_SYNC_V2` và đường dẫn fallback cũ.
  - `data/neurorx/drugs/README.md`, `scripts/neurorx/pull.ts`, `scripts/neurorx/verify.ts`, `scripts/neurorx/export-effective-snapshot.ts`, `package.json`: thêm `rx:pull` (export mirror read-only + `--prune`), cập nhật `rx:verify` và `rx:push` qua `SupabaseDrugRepo` (`expectedRev`), cập nhật `rx:snapshot` dùng Sync v2, xóa `sync_remote_to_local.mjs` và `push_local_to_remote.mjs` (gỡ `rx:sync`).
  - `supabase/migrations/20261120_neurorx_purge_cron.sql`, `.github/workflows/neurorx_purge.yml`, `supabase/migrations/LATER_drop_legacy_neurorx.sql`: đặt lịch purge 03:00 UTC Chủ Nhật bằng `pg_cron` (guarded `DO $$` block) kèm fallback GitHub Actions; tạo script xóa bảng cũ sau ≥ 30 ngày (chưa xóa bảng cũ).
  - `public/neurorx-sw.js`: nâng cấp cache lên `v2-latest` / `neurorx-cache-v2-${DATA_VERSION}`, giữ nguyên precache shell và loại trừ `/api/*`.
  - `SPEC-neurorx.md` & `NEURORX-GUARDRAILS.md`: cập nhật đặc tả lưu trữ & guardrails theo Sync v2.
  - `tests/neurorxLookupV2.test.mjs`, `tests/neurorxE2EB1B6.test.mjs`, `tests/neurorxMigrateV2.test.mjs`: cập nhật kiểm tra động theo số thuốc hiện tại trên mirror (`>= 69`, hiện tại `103` thuốc) và bổ sung test `pullLiveDrugsToMirror` (`rx:pull --prune`).
- **Next.js docs cited:** [`node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`](../../node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md) (PWA Service Worker & route exclusion).

### Evaluation Log (Phase 7)
- **Self-eval:** **PASS** (Iteration 1)
- **Gates:** G-HYGIENE [PASS] · Grep Gate AC7.1 [PASS] · G-TEST [PASS] · G-BUILD [PASS] · TypeScript `tsc --noEmit` [PASS]
- **AC checklist:** AC7.1 [x] · AC7.2 [x] · AC7.3 [x] · AC7.4 [x]
- **Next step for user:** Chạy `supabase/migrations/20261120_neurorx_purge_cron.sql` trên Supabase SQL Editor (và/hoặc cấu hình secret `NEURORX_APP_URL`, `NEURORX_ADMIN_TOKEN` cho GitHub Actions fallback `.github/workflows/neurorx_purge.yml`); giữ `LATER_drop_legacy_neurorx.sql` đến sau ≥ 30 ngày ổn định. Sau ≥ 7 ngày ổn định, sẵn sàng chuyển sang **Phase 8** (NeuroGuide Granular Blocks & Merkle Tree).

---

## Phase 8.0 — Execution Log (2026-11-18)

### Thay đổi đã thực hiện (Zero Supabase Write)
- **Tách lõi đa collection (`src/lib/sync/`):**
  - Tạo mới `src/lib/sync/types.ts`, `src/lib/sync/repo.ts`, `src/lib/sync/applyChanges.ts`, `src/lib/sync/localStore.ts` (tham số hóa `collection`, `schemaVersion`, `recordsStoreName`), `src/lib/sync/jsonPatch.ts`, `src/lib/sync/syncEngine.ts` (tham số hóa `endpoint`), `src/lib/sync/realtime.ts` (tham số hóa `channelName`, `table`, `schema`).
  - Nối lại `src/lib/neurorx/sync/{types.ts,repo.ts,applyChanges.ts,localStore.ts,jsonPatch.ts,syncEngine.ts,realtime.ts}` ủy quyền về `src/lib/sync/` giữ nguyên hành vi và tương thích ngược NeuroRx.
- **Động cơ Granular Blocks & Merkle Tree cho NeuroGuide (`src/lib/neuroguide/sync/`):**
  - Cập nhật `src/types/neuroguide.ts` (bổ sung `sharedBlockKey?: string` trên `PracticeChangeDetail`).
  - Tạo mới `src/lib/neuroguide/sync/types.ts` và `src/lib/neuroguide/sync/blockGraph.ts`: phân rã lossless `GuidelineDoc`, `ClinicalScenario`, `PivotalTrialRecord`, `RecommendationAtom` thành các khối hạt mịn kèm UID tất định, hàm băm Tier-3 leaf / Tier-2 protocol Merkle / Tier-1 root Merkle, cập nhật $O(\log N)$ (`recomputeAffectedProtocolsForBlock` trả về tag `block:<uid>` và `protocol:<slug>`), chỉ mục liên kết chéo và truy vấn đa trục nhãn chồng chéo (`queryBlocksByOverlappingFacets`).
- **Trình xuất snapshot đọc-duy-nhất (`ng:snapshot`):**
  - Tạo mới `scripts/neuroguide/export-effective-snapshot.ts` (nạp `.env.local` trước dynamic import để đọc đúng dữ liệu Supabase hiện hành, chặn ghi ngoài `data/neuroguide/_migration/`) và thêm script `"ng:snapshot"` trong `package.json`.
  - Xuất `data/neuroguide/_migration/snapshot-20261118.json` và `data/neuroguide/_migration/summary-20261118.json` từ nguồn live `supabase` (`lastSyncedAt: 2026-11-15T16:35:33.93+00:00`):
    - Đầu vào: `18` guidelines, `0` conferences, `8` scenarios, `95` pivotal trials, `12` rec atoms, `0` custom labels (`32` deleted guidelines, `10` deleted trials).
    - Đồ thị khối: `22` protocols, `1112` content blocks (`clinical_scenario: 8`, `pivotal_trial: 95`, `recommendation: 997`, `recommendation_atom: 12`), `1112` protocol-block edges, `4878` cross-link edges (`in_scenario: 13`, `cites_trial: 57`, `same_section: 1568`, `differs: 2402`, `supersedes: 560`, `same_pico: 276`, `refers_to: 2`).
    - Root Merkle hash: `bf52b4c6c3526015fdad729a8623b3d6e84b354526928d3adf178ec031e73cc7`.
- **Kiểm thử bổ sung:**
  - Tạo mới `tests/sharedSyncCore.test.mjs` và `tests/neuroguideBlockGraph.test.mjs`.

### Evaluation Log (Phase 8.0)
- **Trạng thái hoàn tất Phase 8.0:** Hoàn thành tách lõi đồng bộ đa collection, động cơ Merkle + Granular Blocks cho NeuroGuide và xuất snapshot thực tế ở chế độ chỉ đọc; chuyển sang chạy toàn bộ cổng kiểm tra cuối kỳ (`G-HYGIENE`, `npm test`, `npm run build`, `npx tsc --noEmit`).
- **Next step:** Sau khi user xác nhận, chuyển sang **Phase 8.1** (SQL migration cho `neuroguide_protocols`, `neuroguide_content_blocks`, `neuroguide_protocol_blocks`, `neuroguide_block_links`, `neuroguide_block_revisions`, RLS, RPC dùng advisory lock và kiểm thử SQL `T1–T12`).

---

## Phase 8.1 — Execution Log (2026-11-18)

### Thay đổi đã thực hiện (Zero Live DB Mutation)
- **Database Migration (`supabase/migrations/20261118_neuroguide_granular_sync_v2.sql`):**
  - Sequence `public.neuroguide_change_seq` và 7 bảng chuẩn hóa: `neuroguide_protocols` (Tier-2 Merkle `protocol_hash`, `block_order uuid[]`, GIN `subspecialties jsonb_path_ops`), `neuroguide_content_blocks` (Tier-3 leaf `content_hash`, GIN `facets jsonb_path_ops`, ràng buộc `block_slug_matches_key`), `neuroguide_protocol_blocks` (join N-N cho shared clinical blocks), `neuroguide_block_links` (cạnh liên kết chéo có hướng), `neuroguide_block_revisions` (audit RFC 6902 `patch_diff` + snapshot), `neuroguide_sync_state` (1 dòng realtime cho `anon`), `neuroguide_sync_config` (`90 / 90 / 5 / 365`).
  - Bật RLS toàn bộ 7 bảng, thu hồi quyền mặc định từ `public, anon, authenticated`, chỉ cấp `SELECT` trên `neuroguide_sync_state` cho `anon`, cấp toàn quyền cho `service_role`, thêm `neuroguide_sync_state` vào `supabase_realtime`.
  - 14 RPC `SECURITY DEFINER` khóa `service_role` với `pg_advisory_xact_lock(hashtext('neuroguide_sync'))` trước `FOR UPDATE` và `nextval`: `neuroguide_recompute_protocol_hash`, `neuroguide_recompute_root_hash`, `neuroguide_recompute_affected_protocols`, `neuroguide_upsert_protocol`, `neuroguide_delete_protocol`, `neuroguide_create_block`, `neuroguide_update_block`, `neuroguide_delete_block`, `neuroguide_restore_block_revision`, `neuroguide_replace_block_links`, `neuroguide_query_blocks_by_facets`, `neuroguide_changes_since`, `neuroguide_protocol_changes_since`, `neuroguide_purge`.
- **Rollback Script (`supabase/migrations/20261118_neuroguide_granular_sync_v2_rollback.sql`):**
  - Gỡ sạch chỉ các đối tượng NeuroGuide Sync v2 (`publication`, 14 functions, 7 tables, `neuroguide_change_seq`), không chạm `neuroguide_docs` hay `neurorx_*`.
- **SQL Verification Suite (`supabase/tests/neuroguide_granular_sync_v2_checks.sql`):**
  - Bộ test tự chứa `T1–T12` bọc trong `BEGIN ... ROLLBACK` (bao gồm kiểm tra shared block $O(\log N)$ selective Merkle update, `NG_REV_CONFLICT`, `NG_SLUG_TAKEN`, rename giữ `uid`, recreate cấp `uid` mới, restore stripped `verification` + ép `draft`, retention `90/90/5/365`, ranh giới quyền `anon`, I13 short-circuit, `block_links` & `query_blocks_by_facets`).
- **Contract Test (`tests/neuroguideSqlSchema.test.mjs`):**
  - Tự động kiểm chứng cấu trúc SQL migration, rollback, thứ tự lock `pg_advisory_xact_lock`, không đụng bảng cũ và đủ checks `T1–T12`.

### Evaluation Log (Phase 8.1)
- **Human Gate ready:** YES (`WAITING_HUMAN_GATE` — chờ user chạy `20261118_neuroguide_granular_sync_v2.sql` và `neuroguide_granular_sync_v2_checks.sql` trên Supabase SQL Editor).
- **Next step:** Sau khi user xác nhận SQL checks PASS, chuyển sang **Phase 8.2** (Repo interface, `MemoryNeuroGuideRepo`, `SupabaseNeuroGuideRepo` & property tests).

---

## Phase 8.2 — Execution Log (2026-11-18)

### Thay đổi đã thực hiện
- **Mở rộng kiểu & hợp đồng Repo (`src/lib/neuroguide/sync/`):**
  - Cập nhật `src/lib/neuroguide/sync/types.ts`: tái xuất các kiểu lõi từ `../../sync/types.ts`, thêm `createdAt?: string` trên `NeuroGuideProtocolRow`, `linkedScenarioKeys?: string[]` trên `NeuroGuideOverlappingFacetFilter`, cùng các kiểu `NeuroGuideBlockRevisionRow`, `NeuroGuideProtocolEdgeInput`, `NeuroGuideProtocolUpsertInput`, `NeuroGuideBlockMutateResult`, `NeuroGuideProtocolMutateResult`.
  - Tạo mới `src/lib/neuroguide/sync/repo.ts`: định nghĩa `RepoError` và interface `NeuroGuideRepo` cho cả 2 tầng (`protocols`, `content_blocks`, `protocol_blocks`, `block_links`, `block_revisions`, `queryBlocksByFacets`, `purge`).
- **Tầng In-Memory & Supabase RPC (`repoMemory.ts`, `repoSupabase.ts`):**
  - Tạo mới `src/lib/neuroguide/sync/repoMemory.ts`: `MemoryNeuroGuideRepo` mô phỏng đầy đủ hành vi SQL Phase 8.1 (`O(log N)` selective Merkle re-hashing trả về `invalidatedTags`, I13 short-circuit cho block & protocol, Pitfall P9 gỡ `verification` cả cấp ngoài lẫn lồng trong `payload` và ép `draft`, `replaceBlockLinks`, `queryBlocksByFacets` đa trục chồng chéo, và retention `90 / 90 / 5 / 365`).
  - Tạo mới `src/lib/neuroguide/sync/repoSupabase.ts`: `SupabaseNeuroGuideRepo` khóa cứng Pitfall P8 (`SERVICE_UNAVAILABLE` khi thiếu `SUPABASE_SERVICE_ROLE_KEY`, không fallback anon key), ánh xạ `NG_REV_CONFLICT` / `NG_SLUG_TAKEN` / `NG_NOT_FOUND` và gọi 14 RPC Phase 8.1.
- **Chiến lược hội tụ delta 2 tầng (`applyChanges.ts`):**
  - Cập nhật `src/lib/sync/applyChanges.ts` với tùy chọn `allowSameRevHigherSeq?: boolean` (mặc định giữ nguyên hành vi cũ cho NeuroRx & Tier-3 content blocks) và tạo `src/lib/neuroguide/sync/applyChanges.ts` với `applyNeuroGuideGraphChanges()` áp dụng `(rev, changeSeq)` đơn điệu cho Tier-2 `protocols` (khi block con cập nhật `protocolHash` + `changeSeq` mà không tăng `protocol.rev`).
- **Kiểm thử Phase 8.2 (`tests/neuroguideSyncRepo.test.mjs`):**
  - Thêm bộ contract tests `T1–T10 + T12` trên `MemoryNeuroGuideRepo`, kiểm thử Pitfall P8 & mock RPC error mapping trên `SupabaseNeuroGuideRepo`, và property test 50 hoán vị/chia chunk ngẫu nhiên trên `applyNeuroGuideGraphChanges`.

### Evaluation Log (Phase 8.2)
- **Trạng thái hoàn tất:** Đã ghi nhận `Gate 8.1 PASSED` (`2026-11-18`), hoàn tất tầng Repo + Property Tests cho NeuroGuide Sync v2 và chạy toàn bộ cổng kiểm tra cuối kỳ (`G-HYGIENE`, `npm test`, `npm run build`, `npx tsc --noEmit`).
- **Next step:** Sau khi user xác nhận, chuyển sang **Phase 8.3** (Migration CLI `scripts/neuroguide/migrate-to-v2.ts` — `--dry-run` & `--apply` với kiểm tra hash post-check).

---

## Phase 8.3 — Execution Log (2026-11-18)

### Thay đổi đã thực hiện
- **Phân trang PostgREST (> 1000 dòng) trên `src/lib/neuroguide/sync/repoSupabase.ts`:**
  - Cập nhật `listProtocolEdges` (`.order("protocol_uid").order("position").order("block_uid").range(...)`) và `listBlockLinks` (`.order("id").range(...)`) phân trang từng batch `1000` dòng để không bị cắt `1112` protocol edges hoặc `4878` cross-link edges ở giới hạn mặc định PostgREST.
- **Script Migration CLI `scripts/neuroguide/migrate-to-v2.ts` (`npm run ng:migrate-v2` trong `package.json`):**
  - Đọc snapshot đóng băng từ Phase 8.0 (`snapshot-20261118.json` & `summary-20261118.json`), kiểm tra khóa cấm I10 và khớp `contentHash` từng block trước khi ghi.
  - Mặc định chạy `--dry-run` (chỉ đọc); chế độ `--apply` bơm idempotent `neuroguide_content_blocks` (`skipRootRehash: true`, concurrency `8`), `neuroguide_protocols` + `neuroguide_protocol_blocks`, `neuroguide_block_links` theo chunk `1000`, gọi `recomputeRootHash()` duy nhất 1 lần ở cuối batch, kiểm tra post-check toàn diện và xuất `data/neuroguide/_migration/migrate-report-*.json`.
- **Kiểm thử Phase 8.3 (`tests/neuroguideMigrateV2.test.mjs`):**
  - Xác minh `--dry-run` giữ nguyên `maxSeq = 0`, `--apply` tạo đủ `1112` blocks + `22` protocols + `1112` protocol edges + `4878` cross-links khớp tuyệt đối `rootHash: bf52b4c6c3526015fdad729a8623b3d6e84b354526928d3adf178ec031e73cc7`, lần `--apply` thứ 2 bỏ qua toàn bộ (idempotent), và phát hiện lỗi khi `perProtocolHash` / `blockCountsByType` bị sai lệch.
- **Live `--dry-run` trên Supabase thật:**
  - `npm run ng:migrate-v2` → `Existing live: 0 protocols, 0 blocks`, `Planned create: 22 protocols, 1112 blocks` (`4878` links), `Before max_seq: 0`, `After max_seq: 0`, `Dry-run complete. Zero writes performed.`

- **Live `--apply` lần 1 & lần 2 trên Supabase thật:**
  - Run 1 (`data/neuroguide/_migration/migrate-report-20261118-065743.json`) → `createdProtocolsCount: 22`, `createdBlocksCount: 1112`, `upsertedLinksCount: 4878`, `maxSeq: 0 -> 1158`, `rootHash: bf52b4c6c3526015fdad729a8623b3d6e84b354526928d3adf178ec031e73cc7`, `Post-check: PASS (protocols=22, blocks=1112, links=4878, protocolHashes=true, rootComputed=true, rootSummary=true)`.
  - Run 2 (`data/neuroguide/_migration/migrate-report-20261118-065801.json`) → Idempotent `createdProtocolsCount: 0`, `createdBlocksCount: 0`, `upsertedLinksCount: 0`, `toSkipProtocolsCount: 22`, `toSkipBlocksCount: 1112`, `maxSeq: 1158 -> 1158`, `Post-check: PASS`.

### Evaluation Log (Phase 8.3)
- **Trạng thái hoàn tất:** **Gate 8.3 `PASSED`** (`2026-11-18`) — dữ liệu thực tế NeuroGuide đã được chuẩn hóa an toàn lên Supabase Sync v2 và vượt qua đối chiếu Merkle 3 tầng (`protocolHashes=true, rootComputed=true, rootSummary=true`).
- **Next step:** Sau khi user xác nhận, chuyển sang **Phase 8.4** (HTTP Sync API `/api/neuroguide/sync/*`, ETag `304`, `revalidateTag('block:' + uid)` + `revalidateTag('protocol:' + slug)`).

---

## Phase 8.4 — Execution Log (2026-11-18)

### Thay đổi đã thực hiện
- **Pure HTTP Sync Handlers (`src/lib/neuroguide/sync/handlers.ts`):**
  - Triển khai các handler độc lập framework: `handleGetChanges` (hỗ trợ `tier=blocks | protocols | graph`, `includeLinks=1`, ETag `"ng-v2-*"` fast-path `304`, `hasMore`, `purgeHorizonSeq` reset), `handleCreateBlock`, `handleUpdateBlock`, `handleDeleteBlock`, `handleGetBlockHistory`, `handleRestoreBlockRevision`, `handleListProtocols`, `handleUpsertProtocol`, `handleDeleteProtocol`, `handleGetBlockLinks`, `handleReplaceBlockLinks`, `handleQueryBlocksByFacets`, `handlePurgeNeuroGuide`.
  - Ép `status = 'draft'` & xóa `verification` mặc định cho các API ghi/restore (Pitfall P9), không phát invalidation tag khi ghi no-op (I13), và tự động phát danh sách `block:<uid>` + các `protocol:<slug>` bị ảnh hưởng ($O(\log N)$ selective invalidation) qua `onInvalidateTag`.
- **9 Thin Next.js 16 Route Handlers (`src/app/api/neuroguide/sync/*`):**
  - `changes/route.ts` (`GET`), `blocks/route.ts` (`GET` lọc đa trục & `POST`), `blocks/[uid]/route.ts` (`PUT` & `DELETE`), `blocks/[uid]/history/route.ts` (`GET`), `blocks/[uid]/restore/route.ts` (`POST`), `protocols/route.ts` (`GET` & `POST`), `protocols/[uid]/route.ts` (`DELETE`), `links/route.ts` (`GET` & `POST`), `purge/route.ts` (`POST`).
  - Tất cả đặt `export const dynamic = "force-dynamic"`, `Cache-Control: no-store`, dùng `await context.params`, và gọi `revalidateTag(tag, { expire: 0 })` qua `invalidateSyncTag`.
- **Next.js docs cited:**
  - [`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`](../../node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md)
  - [`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidateTag.md`](../../node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidateTag.md)
- **Kiểm thử Phase 8.4 (`tests/neuroguideSyncApi.test.mjs`):**
  - Kiểm chứng `AC8.4.1–AC8.4.4`: chặn `401` khi `isAdmin=false`, ETag `304` + paging + `reset`, ép `draft` / no-op I13 / `409 REV_CONFLICT` / invalidation $O(\log N)$ chỉ chạm `protocol:aha-ais` & `protocol:eso-ais`, restore gỡ `verification`, truy vấn facet chồng chéo và map `503 SERVICE_UNAVAILABLE`.

### Evaluation Log (Phase 8.4)
- **Trạng thái hoàn tất:** Hoàn thành tầng HTTP API Sync v2 cho NeuroGuide kèm các route Next.js 16 và kiểm thử tự động.
- **Next step:** Sau khi user xác nhận, chuyển sang **Phase 8.5** (Client IndexedDB `LocalStore` + `SyncEngine` + Realtime Bridge + `useNeuroGuideSync` hook).

---

## Phase 8.5 — Execution Log (2026-11-18)

### Thay đổi đã thực hiện
- **Mở rộng `src/lib/sync/syncEngine.ts`:**
  - Hỗ trợ `endpoint` đã chứa query string (`?tier=blocks` / `?tier=protocols`) bằng separator `?` hoặc `&` và truyền `options.applyChangesOptions` vào `applyChanges()`.
- **Client 2-Tier LocalStore & SyncEngine (`src/lib/neuroguide/sync/`):**
  - Tạo `localStore.ts`: `IdbBlockLocalStore` (`neuroguide-blocks-sync-v1`, store `blocks`), `IdbProtocolLocalStore` (`neuroguide-protocols-sync-v1`, store `protocols`), cùng `MemoryBlockLocalStore` / `MemoryProtocolLocalStore` fallback khi IndexedDB bị chặn hoặc thiếu.
  - Tạo `syncEngine.ts`: `createBlockSyncEngine`, `createProtocolSyncEngine` (bật `allowSameRevHigherSeq: true`), và `createNeuroGuideGraphSyncEngine` điều phối 2 tầng + `applyLocalBlockWrite` tự động tính lại `protocolHash` cho các protocol tham chiếu block vừa sửa mà không tăng `lastSeq`.
  - Tạo `realtime.ts`: `createNeuroGuideRealtimeBridge` lắng nghe `postgres_changes` trên `neuroguide_sync_state` (`debounceMs = 300`, `pollIntervalMs = 60_000`), lọc tín hiệu cũ.
- **React Sync Hook (`src/hooks/useNeuroGuideSync.ts`):**
  - Xuất `deriveNeuroGuideStoreFromGraphSnapshot` (tái hợp `guidelines`, `conferences`, `scenarios`, `pivotalTrials`, `recommendationAtoms` ở 0-network) và `useNeuroGuideSync` kèm `queryFacets()`, `applyLocalBlockWrite()`, `applyLocalProtocolWrite()`, `refresh()`.
- **Kiểm thử Phase 8.5 (`tests/neuroguideSyncEngine.test.mjs`):**
  - Kiểm chứng `AC8.5.1–AC8.5.4`: khởi động offline phát cache trước khi `pull()` fail, hội tụ same-rev higher-seq trên protocol + `304`, coalescing 5 `pull()` đồng thời + `hasMore` + `reset`, `applyLocalBlockWrite`, Realtime debounce trên `neuroguide_sync_state` và `IdbLocalStore` + P12 fallback.

### Evaluation Log (Phase 8.5)
- **Trạng thái hoàn tất:** Hoàn thành tầng đồng bộ client offline-first 2 tầng và React hook `useNeuroGuideSync`.
- **Next step:** Sau khi user xác nhận, chuyển sang **Phase 8.6** (Nối UI NeuroGuide Lookup/Navigator & Admin v2 với Draft Auto-Save, 3-Mode ConflictDialog, HistoryPanel).

---

## Phase 8.6 — Execution Log (2026-11-18)

### Thay đổi đã thực hiện
- **Client Lookup & Reconstruction Helpers (`src/lib/neuroguide/sync/lookupHelpers.ts`):**
  - `formatNeuroGuideSyncStatusView` (các trạng thái `"Updating…"`, `"Offline — showing saved data"`, `"Sync issue — showing saved data"`, `"Up to date · HH:MM · seq #N"`, change toast `"1 block updated"` / `"N blocks updated"`).
  - `buildNeuroGuideSelectionSearchParams` (deep link shallow History API), `stripRuntimeBlockMeta`, `reconstructGuidelineDocFromGraph`, `resolveRecommendationBlockForPracticeChange`, và `reconstructCatalogFromSyncGraph` (0-network catalog derivation).
  - Bổ sung `blockChangeCount`, `graph`, `derived` (tương thích ngược) vào `src/lib/neuroguide/sync/syncEngine.ts` và `src/hooks/useNeuroGuideSync.ts`.
- **Admin Sync v2 Helpers (`src/lib/neuroguide/sync/adminHelpers.ts`):**
  - Tự động lưu nháp local mỗi `3000ms` (`NEUROGUIDE_DRAFT_AUTOSAVE_INTERVAL_MS = 3000`, `saveLocalBlockDraft`, `loadLocalBlockDraft`, `findLatestLocalBlockDraftForUid`, `clearLocalBlockDraft`, `clearLocalBlockDraftsForUid`).
  - Merge 3 chiều theo section Merkle (`threeWayMergeBlock`, `buildBlockConflictSummary`) tự động gộp các thay đổi đa trục không chồng lấn trên `facetIndex` (`domains`, `timeWindowIds`, `interventionTags`, v.v.), `resolveBlockConflictChoice` cho 3 chế độ (`use_cloud`, `smart_merge`, `force_overwrite`), và `formatBlockRevisionDiffEntries` phân loại diff theo section (`payload` / `facetIndex` / `meta` / `top`).
- **Server Sync v2 Adapter & Storage Flag (`src/lib/neuroguide/sync/serverAdapter.ts`, `src/lib/neuroguide/guidelineStorage.ts`):**
  - `loadNeuroGuideCatalogFromSyncV2` đọc toàn bộ live protocols, blocks, protocol edges và cross-link edges qua phân trang, tính `lastUpdatedAt` xác định.
  - `syncGuidelineDocToV2Repo` & `mirrorStorePayloadToV2Repo`: chỉ `updateBlock` khi `contentHash` thay đổi (giữ nguyên `rev`/`changeSeq` các block anh em không sửa), `syncDeleteGuidelineInV2Repo`, `syncPivotalTrialToV2Repo`, `syncDeletePivotalTrialInV2Repo`, `syncCustomRecLabelToV2Repo`.
  - Bật đọc & dual-write Sync v2 sau cờ `NEXT_PUBLIC_NEUROGUIDE_SYNC_V2 === "1"` trong `guidelineStorage.ts` kèm fallback an toàn về Supabase cũ / local disk.
- **UI Sync v2 & Tích hợp `/neuroguide` (`src/components/neuroguide/sync/*`, `EditGuidelineModal.tsx`, `src/app/neuroguide/page.tsx`):**
  - Tạo `NeuroGuideSyncStatusBadge.tsx`, `BlockConflictDialog.tsx`, `BlockHistoryPanel.tsx`.
  - Tích hợp vào `EditGuidelineModal.tsx` (banner `"Unsaved local draft found"` Restore/Discard, auto-save 3s, nút `History (rev N)` & `Save Block` cho từng block cả ESO PICO lẫn AHA/Standard, xử lý `409 REV_CONFLICT` qua `BlockConflictDialog`, xóa draft chỉ sau HTTP `200`).
  - Nối `useNeuroGuideSync({ enabled: isSyncV2 })`, `<NeuroGuideSyncStatusBadge />`, và cập nhật realtime từ `reconstructCatalogFromSyncGraph(syncState.derived)` vào `src/app/neuroguide/page.tsx`.
- **Kiểm thử Phase 8.6 (`tests/neuroguideAdminV2.test.mjs`, `tests/neuroguideE2EB1B6.test.mjs`):**
  - `tests/neuroguideAdminV2.test.mjs`: `5/5` tests pass (draft 3s, 3-way merge & 3 conflict modes, history & restore draft, lookup helpers, granular `syncGuidelineDocToV2Repo` giữ nguyên `rev=1` cho block anh em).
  - `tests/neuroguideE2EB1B6.test.mjs`: ma trận hồi quy B1–B6 qua `handlers.ts`, `createNeuroGuideGraphSyncEngine`, `createNeuroGuideRealtimeBridge`, `adminHelpers.ts`, `lookupHelpers.ts`, chạy trên cả `MemoryNeuroGuideRepo` lẫn `SupabaseNeuroGuideRepo` live (`NEUROGUIDE_SYNC_IT=1`).

### Evaluation Log (Phase 8.6)
- **Commands & Observed Results:**
  - `node --experimental-strip-types --test tests/neuroguideAdminV2.test.mjs tests/neuroguideE2EB1B6.test.mjs tests/neuroguideSyncEngine.test.mjs` → **PASS** (`10` tests / `3` suites: `10` pass, `0` fail, `0` skipped)
  - Live Supabase E2E (`NEXT_PUBLIC_NEUROGUIDE_SYNC_V2=1 NEUROGUIDE_SYNC_IT=1 node --use-system-ca --experimental-strip-types --test tests/neuroguideE2EB1B6.test.mjs`) → **PASS** (`2/2` suites: Memory + Live Supabase RPCs; post-cleanup xác nhận `22` protocols, `1112` protocol-block edges, `4878` cross-link edges, `rootHash = bf52b4c6c3526015fdad729a8623b3d6e84b354526928d3adf178ec031e73cc7`)
  - `G-HYGIENE` (trên `src/lib/sync, src/lib/neurorx, src/lib/neuroguide, src/hooks, src/components/neuroguide/sync, src/app/api/neuroguide/sync, scripts/neuroguide, scripts/neurorx, tests`) → **PASS** (`0 matches`)
  - `npm test` → **PASS** (`254` tests / `55` suites: `254` pass, `0` fail, `0` skipped; `validate.ts`, `check-quotes.ts` 4225 quotes, `check-no-clinical-constants.ts` pass)
  - `npm run build` → **PASS** (`exit 0`, Next.js 16.4.3 Turbopack)
  - `npx tsc --noEmit` → **PASS** (`exit 0`)
- **Trạng thái hoàn tất:** **Phase 8 (8.0–8.6) ĐÃ HOÀN TẤT** sau cờ `NEXT_PUBLIC_NEUROGUIDE_SYNC_V2=1`. Sẵn sàng theo dõi / kiểm thử UI trực tiếp với `NEXT_PUBLIC_NEUROGUIDE_SYNC_V2=1` trước cutover.

---

## Phase 8.7 — Default Cutover & Weekly Retention Purge Log (2026-11-21)

### Thay đổi đã thực hiện
- **Default Cutover (`Sync v2` bật mặc định):**
  - `src/lib/neuroguide/guidelineStorage.ts`: `isNeuroGuideSyncV2Enabled()` chuyển sang `process.env.NEXT_PUBLIC_NEUROGUIDE_SYNC_V2 !== "0"` (mặc định bật Sync v2 trên mọi môi trường; vẫn hỗ trợ tắt khẩn cấp bằng `NEXT_PUBLIC_NEUROGUIDE_SYNC_V2=0` cùng fallback an toàn).
  - `src/app/neuroguide/page.tsx`: `isSyncV2` chuyển sang `process.env.NEXT_PUBLIC_NEUROGUIDE_SYNC_V2 !== "0"`.
  - `src/components/neuroguide/EditGuidelineModal.tsx`: mặc định `syncV2Enabled = true`.
- **Tự động dọn tombstone & revision cũ (`neuroguide_purge`):**
  - Tạo `supabase/migrations/20261121_neuroguide_purge_cron.sql`: đặt lịch `pg_cron` `neuroguide_purge_weekly` vào `15 3 * * 0` UTC (Chủ Nhật 03:15 UTC) chạy `select public.neuroguide_purge()`, bọc `DO $$` an toàn.
  - Tạo `.github/workflows/neuroguide_purge.yml`: workflow fallback chạy cùng lịch `15 3 * * 0` UTC + `workflow_dispatch`, gọi `POST /api/neuroguide/sync/purge` kèm `x-admin-token` (tự nhận `NEUROGUIDE_APP_URL || NEURORX_APP_URL` và `NEUROGUIDE_ADMIN_TOKEN || NEURORX_ADMIN_TOKEN || ADMIN_TOKEN`).
  - Tạo `supabase/migrations/LATER_drop_legacy_neuroguide.sql`: script dọn bản ghi NeuroGuide cũ trên `public.neuroguide_docs` sau `>= 30` ngày ổn định.
- **Kiểm thử bổ sung (`tests/neuroguideAdminV2.test.mjs` — Test 6):**
  - Xác nhận `isNeuroGuideSyncV2Enabled()` mặc định `true` khi biến môi trường unset, `false` chỉ khi `"0"`.
  - Xác nhận `handlePurgeNeuroGuide` chặn `401` khi chưa xác thực, dọn tombstone block > 90 ngày, nâng `purge_horizon_seq`, dọn revision cũ > 90 ngày và giữ tối thiểu `5` revision gần nhất trên block còn sống.

### Evaluation Log (Phase 8.7)
- `node --experimental-strip-types --test tests/neuroguideAdminV2.test.mjs` → **PASS** (`6/6` tests pass, `0` failed, `0` skipped)
- `G-HYGIENE` → **PASS** (`0 matches`)
- `npm test` → **PASS** (`255/255` tests qua `55` suites, `0` failed, `0` skipped; cùng `validate.ts`, `check-quotes.ts` 4225 quotes, `check-no-clinical-constants.ts`)
- `npm run build` → **PASS** (`exit 0`, Next.js 16.4.3 Turbopack)
- `npx tsc --noEmit` → **PASS** (`exit 0`)
