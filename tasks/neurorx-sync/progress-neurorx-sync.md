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
| **7** | Cutover, gỡ code legacy, đặt lịch `pg_cron` + GHA fallback & mirror | **Argon** | `PENDING` | Chưa chạy | Lệnh `"GO CUTOVER"` | Không xóa bảng cũ ngay |
| **8** | Tách lõi `src/lib/sync/` & áp dụng Granular Blocks cho NeuroGuide | **Argon** / **Hydrogen** | `BACKLOG` | — | Chờ Phase 7 ổn định ≥ 7 ngày | Xem `00-design-neurorx-sync.md §10` |

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
- [ ] User đã xác nhận `"GO CUTOVER"`.

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
