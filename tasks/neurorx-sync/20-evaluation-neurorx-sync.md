# NeuroRx Sync v2 — Evaluation & Autonomous Self-Healing Guide

> **Mục đích:** Cung cấp quy trình đánh giá khách quan mức độ hoàn thành từng phase và **vòng lặp tự động sửa lỗi (Critic–Fixer Loop)** để mô hình tự kiểm tra và tự vá đến khi đạt 100% tiêu chuẩn trong [00-design-neurorx-sync.md](./00-design-neurorx-sync.md) và [10-phases-neurorx-sync.md](./10-phases-neurorx-sync.md).
> **Nguyên tắc tối cao:** Không bao giờ bỏ qua test (`test.skip`), không thêm `@ts-ignore` / `eslint-disable`, không làm yếu assertion, và không tự ý thay đổi design để lấy trạng thái "xanh".

---

## 1. Giao thức Vòng Lặp Tự Đánh Giá & Tự Sửa (Autonomous Critic–Fixer Loop)

Mỗi mô hình sau khi hoàn thành code của một phase **bắt buộc** chạy vòng lặp dưới đây trước khi báo cáo "Hoàn thành":

```text
MAX_ITERATIONS = 5
iteration = 0

LOOP:
  iteration += 1
  1. RUN ALL GATES for current phase (§2 + §3):
     - G-HYGIENE (cấm suppress/skip/new deps/secrets/unscoped edits)
     - G-TEST    (npm test: unit + contract + rx:validate + rx:check-quotes + rx:check-constants)
     - G-BUILD   (npm run build — bắt buộc từ Phase 2 trở đi)
     - G-PHASE   (kiểm tra AC riêng của phase + Invariants I1–I15 + Pitfalls P1–P14)

  2. EVALUATE RESULT:
     - IF all gates PASS AND every AC in 10-phases-neurorx-sync.md is checked with concrete evidence:
         → EXIT LOOP as PASS. Update progress-neurorx-sync.md and report results to user.

  3. CHECK STOP CONDITIONS (không đoán mò):
     - IF failure requires manual human action (e.g. running SQL in Supabase Editor, running --apply, setting Vercel env vars):
         → STOP and report exact instructions to user.
     - IF failure reveals a contradiction or ambiguity in 00-design-neurorx-sync.md or NEURORX-GUARDRAILS.md:
         → STOP and ask the user. Do NOT alter design silently.
     - IF iteration >= MAX_ITERATIONS and gates still fail:
         → STOP, record remaining failures + diagnostic logs in progress-neurorx-sync.md, and ask user.

  4. DIAGNOSE & FIX (Critic → Fixer):
     - Identify the ROOT CAUSE from the first failing gate/test (map to I1–I15 / P1–P14).
     - Apply the minimal targeted fix (consult Auto-Remediation Recipes in §3).
     - NEVER suppress errors, weaken assertions, or delete failing tests.
     - GOTO LOOP.
```

---

## 2. Bộ Cổng Kiểm Tra Tự Động (`eval-sync-phase.ts` & Cổng Chuẩn)

Trong Phase 2 (hoặc chạy bằng lệnh lẻ ở Phase 0–1), thiết lập script kiểm tra tự động `scripts/neurorx/eval-sync-phase.ts` (`"rx:eval": "node --experimental-strip-types scripts/neurorx/eval-sync-phase.ts"`):

### 2.1. Bốn nhóm cổng bắt buộc

| Mã cổng | Nội dung kiểm tra | Lệnh PowerShell tương ứng |
| :--- | :--- | :--- |
| **G-TEST** | Toàn bộ test Node + validate dữ liệu thuốc + quotes + không chứa hằng số lâm sàng trong engine | `npm test` |
| **G-BUILD** | Biên dịch production Next.js 16 (kiểm tra type, Server/Client boundary, route handlers) | `npm run build` |
| **G-HYGIENE** | Không có `@ts-ignore`, `@ts-expect-error`, `eslint-disable`, `test.skip`, `it.skip`, `.only(`, không thêm package mới trong `package.json`, không lộ secret trong `git diff` | Xem snippet kiểm tra bên dưới |
| **G-PHASE** | Kiểm tra isolation (chưa import sớm), `Cache-Control: no-store`, không có `node:*` trong client code, grep gate không còn hàm legacy | Theo bảng §3 từng phase |

### 2.2. Lệnh PowerShell kiểm tra G-HYGIENE (chạy được ngay ở mọi phase)

```powershell
# 1. Kiểm tra không có lệnh tắt kiểm tra lỗi hoặc bỏ qua test
$bad = Select-String -Path "src/**/*","scripts/neurorx/**/*","tests/**/*" -Pattern "@ts-ignore|@ts-expect-error|eslint-disable|\.skip\(|\.only\(" -ErrorAction SilentlyContinue
if ($bad) { $bad; throw "G-HYGIENE FAIL: Found forbidden suppression or skipped test" }

# 2. Kiểm tra Next.js build + toàn bộ test suite
npm test
npm run build
```

### 2.3. Ma trận ánh xạ Invariants (I1–I15) & Pitfalls (P1–P14)

| Mã | Điều kiện phải đúng | Cách kiểm chứng tự động |
| :--- | :--- | :--- |
| **I1** | Không đọc `data/neurorx/drugs`, `/tmp`, `inMemoryDrugs` ở runtime v2 | Phase 6 flag-on check + Phase 7 grep gate |
| **I2–I3** | `uid` bất biến; xóa = `deleted_at`; tạo lại trùng slug → `uid` mới | SQL `T4`, `T5` + `neurorxSyncRepo.test.mjs` |
| **I4 / P1** | `pg_advisory_xact_lock` + `SELECT ... FOR UPDATE` trước `nextval` | Kiểm tra tĩnh trong file `.sql` migration |
| **I5–I6** | `rev` tăng đúng 1; sai `expected_rev` → 409 kèm bản ghi server hiện tại | SQL `T3` + `neurorxSyncRepo` + `neurorxSyncApi` |
| **I7 / P3** | `applyChanges` chỉ nhận khi `incoming.rev > local.rev`, idempotent, không phụ thuộc thứ tự | `neurorxSyncApply.test.mjs` (100 hoán vị ngẫu nhiên) |
| **I8 / P2** | Rows + `lastSeq` ghi trong 1 transaction; save xong gọi `applyLocalWrite` | `neurorxSyncEngine.test.mjs` (commit failure test) |
| **I9 / P5** | Mọi route `/api/neurorx/sync/*` trả `Cache-Control: no-store`; SW bỏ qua `/api/*` | `neurorxSyncApi.test.mjs` + kiểm tra `neurorx-sw.js` |
| **I10 / P10** | `data` jsonb giữ nguyên, `computeContentHashSync` không đổi sau migrate | `migrate-to-v2.ts --apply` post-check |
| **I13** | Cập nhật giống `content_hash` + `slug` → no-op, không tăng `rev`/`change_seq` | SQL `T12` + `neurorxSyncRepo` + `neurorxSyncApi` |
| **I14** | Lưu `patch_diff` (RFC 6902) + snapshot trong `neurorx_drug_revisions` | `neurorxSyncPatch.test.mjs` + `neurorxSyncRepo` |
| **I15** | `revalidateTag` khi ghi thành công + `localStorage` draft auto-save mỗi 3s | `neurorxSyncApi.test.mjs` + Phase 6 manual/UI check |

---

## 3. Tiêu chí Đánh Giá & Công Thức Tự Sửa Từng Phase (Phases 0–7)

### Phase 0 — Preflight & Snapshot
- **Kiểm tra đạt:**
  - `tasks/neurorx-sync/progress-neurorx-sync.md` có mục `Phase 0 / Inventory` kèm `file:line`.
  - Có `data/neurorx/_migration/snapshot-YYYYMMDD.json` và `summary-YYYYMMDD.json`.
  - `git diff --name-only` chỉ gồm các file được phép của Phase 0; `npm test` và `npm run build` xanh.
- **Nếu lỗi → Tự sửa:**
  - *Thiếu đường dẫn trong Inventory:* Chạy lại `Select-String` trên `src/`, `scripts/`, `tests/` cho các từ khóa `lib/neurorx/data`, `neurorx_drugs`, `deleted_drugs`, `TMP_DRUGS_DIR`, `inMemoryDrugs`.
  - *In nhầm env value:* Xóa ngay giá trị trong report/file, chỉ ghi `PRESENT` hoặc `MISSING`.

### Phase 1 — Database Migration (SQL)
- **Kiểm tra đạt:**
  - Đủ 3 file: `20261113_neurorx_sync_v2.sql`, `20261113_neurorx_sync_v2_rollback.sql`, `neurorx_sync_v2_checks.sql`.
  - Chạy kiểm tra tĩnh PowerShell:
    ```powershell
    Select-String -Path supabase/migrations/20261113_neurorx_sync_v2.sql -Pattern "pg_advisory_xact_lock|FOR UPDATE|content_hash|section_hashes|patch_diff|root_hash|neurorx_recompute_root_hash"
    Select-String -Path supabase/migrations/20261113_neurorx_sync_v2.sql -Pattern "DROP TABLE.*(neurorx_drugs|neuroguide_docs)" # Phải rỗng!
    ```
  - Đủ test `T1` đến `T12` trong `neurorx_sync_v2_checks.sql`, bọc trong `BEGIN; ... ROLLBACK;`, kiểm tra retention `90d / 90d / min-5 / 365d verified`.
- **Nếu lỗi → Tự sửa:**
  - *Thiếu lock hoặc thứ tự sai:* Đặt `perform pg_advisory_xact_lock(hashtext('neurorx_sync'));` ở dòng đầu tiên của phần thân `plpgsql` trước mọi `SELECT ... FOR UPDATE` và `nextval(...)`.
  - *Lỗi không idempotent khi chạy lại:* Dùng `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `DROP POLICY IF EXISTS ...; CREATE POLICY ...`, và bọc `ALTER PUBLICATION` trong `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;`.

### Phase 2 — Server Repository, JSON Patch & Pure Apply
- **Kiểm tra đạt:**
  - `node --experimental-strip-types --test tests/neurorxSyncRepo.test.mjs tests/neurorxSyncApply.test.mjs tests/neurorxSyncPatch.test.mjs` qua 100%.
  - `Select-String -Path "src/app/**/*" -Pattern "neurorx/sync"` phải trả về rỗng (chưa nối vào app).
  - `npm test` và `npm run build` xanh.
- **Nếu lỗi → Tự sửa:**
  - *Import path lỗi với `--experimental-strip-types`:* Kiểm tra cách import ở `tests/neurorxIntegrity.test.mjs` (thường cần đuôi `.ts` hoặc relative path chuẩn `../src/lib/neurorx/sync/...`).
  - *Lệch hành vi giữa `MemoryDrugRepo` và SQL:* Đối chiếu từng case `T1`–`T10`, `T12` giữa `repoMemory.ts` và `20261113_neurorx_sync_v2.sql` (đặc biệt: slug normalize `lower(trim)`, restore ép `status = "draft"`, bỏ key `verification`, và short-circuit khi trùng `contentHash` + `slug`).
  - *Thiếu kiểm tra `SERVICE_UNAVAILABLE`:* Kiểm tra `Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)` trong `repoSupabase.ts`; tuyệt đối không fallback sang `anon` key.

### Phase 3 — Data Migration Script
- **Kiểm tra đạt:**
  - `npm run rx:migrate-v2` (mặc định `--dry-run`) chạy thành công, không làm thay đổi `max_seq`.
  - Có test hoặc chứng minh logic post-check trả về exit code `1` khi hash hoặc số lượng không khớp.
- **Nếu lỗi → Tự sửa:**
  - *Post-check lệch hash (P10):* Kiểm tra tuyệt đối không chèn `uid`, `rev`, `changeSeq`, `deletedAt` vào bên trong object `data` (I10). `data` phải giữ nguyên cấu trúc `DrugRecord`.

### Phase 4 — API Routes Sync v2
- **Kiểm tra đạt:**
  - `node --experimental-strip-types --test tests/neurorxSyncApi.test.mjs` qua 100% (bao gồm `ETag` / `If-None-Match` → `304 Not Modified`).
  - Mọi file `src/app/api/neurorx/sync/**/route.ts` đều có `Cache-Control: no-store` và `export const dynamic = "force-dynamic"`.
  - `npm run build` thành công (chứng minh signature Next 16 `context: { params: Promise<{ uid: string }> }` đúng chuẩn).
- **Nếu lỗi → Tự sửa:**
  - *Lỗi type `params` khi `next build`:* Đọc `node_modules/next/dist/docs/` và dùng `const { uid } = await context.params;`.
  - *Thiếu `revalidateTag`:* Truyền callback `onInvalidateTag` vào `handlers.ts` để test được không cần Next runtime, còn `route.ts` truyền `revalidateTag` của `next/cache` (đọc doc Next 16 để khớp chữ ký hàm `revalidateTag(tag, ...)` nếu Next 16 thay đổi tham số).

### Phase 5 — Client Store, Sync Engine & Realtime
- **Kiểm tra đạt:**
  - `node --experimental-strip-types --test tests/neurorxSyncEngine.test.mjs` qua 100% (bao gồm single-flight 5 lần gọi đồng thời ≤ 2 fetches, rollback transaction khi `commit` lỗi, `applyLocalWrite` không bị response cũ ghi đè).
  - Kiểm tra không có `node:` import trong client sync files:
    ```powershell
    Select-String -Path "src/lib/neurorx/sync/localStore.ts","src/lib/neurorx/sync/syncEngine.ts","src/lib/neurorx/sync/realtime.ts","src/lib/neurorx/sync/applyChanges.ts","src/lib/neurorx/sync/jsonPatch.ts" -Pattern "from ['""]node:"
    ```
    Phải trả về rỗng.
- **Nếu lỗi → Tự sửa:**
  - *Lỗi `node:crypto` khi chạy client hook `useNeuroRxDrugs`:* Dùng hàm bất đồng bộ `computeContentHash` (Web Crypto API `crypto.subtle.digest`) trong `integrity.ts` thay cho `computeContentHashSync` phía client.
  - *Single-flight rò rỉ race condition:* Lưu biến `inFlightPromise` và cờ `queuedFollowUp = false`; nếu `pull()` đang chạy mà có lời gọi mới, chỉ đặt `queuedFollowUp = true` và trả về `inFlightPromise`; khi xong, nếu `queuedFollowUp === true` thì reset cờ và chạy thêm đúng 1 vòng.

### Phase 6 — UI Integration (sau cờ `NEXT_PUBLIC_NEURORX_SYNC_V2`)
- **Kiểm tra đạt:**
  - **Cờ TẮT (`NEXT_PUBLIC_NEURORX_SYNC_V2` unset hoặc `"0"`):** `npm test` và `npm run build` xanh; hành vi giống hệt trước khi sửa.
  - **Cờ BẬT (`NEXT_PUBLIC_NEURORX_SYNC_V2="1"`):**
    - `npm run build` xanh (chứng minh `page.tsx` không lỗi `useSearchParams` thiếu `Suspense` hoặc static/dynamic mismatch).
    - Click vào tên thuốc mở `<DrugDetail>` trong `< 150 ms` và **0 network request** tới server/Supabase.
    - `EditDrugModal` lưu nháp `localStorage` mỗi 3s; `ConflictDialog` hiển thị đủ 3 nút (`Use Cloud`, `Smart Merge`, `Force Overwrite`); `HistoryPanel` hiển thị `patchDiff` và nút `Restore as draft`.
    - Kiểm tra responsive ở chiều rộng `375px`, vùng chạm ≥ 44px, text tiếng Anh (G3).
- **Nếu lỗi → Tự sửa:**
  - *Click thuốc vẫn gọi RSC lên server:* Kiểm tra `LookupTab.tsx` xem đã bỏ `router.push(...)` khi cờ bật và thay bằng `window.history.pushState` + state cục bộ chưa. Kiểm tra thêm Next 16 docs về `useSearchParams` + `history.pushState`.
  - *ConflictDialog mất sửa đổi đang gõ:* Đảm bảo draft trong `localStorage` chỉ bị xóa **sau khi** API trả HTTP `200`/`201`, không xóa trước khi gửi request.

### Phase 7 — Cutover & Cleanup
- **Kiểm tra đạt:**
  - Grep gate trả về rỗng (không còn tham chiếu legacy ở `src/` và `scripts/`, trừ `_migration`):
    ```powershell
    Select-String -Path "src/**/*","scripts/neurorx/**/*" -Pattern "TMP_DRUGS_DIR|inMemoryDrugs|deleted_drugs|mergeDrugRecords|syncFromSupabase|neurorx_system_deleted_drugs|getAllDrugsAsync" | Where-Object { $_.Path -notmatch "_migration" }
    ```
  - `npm test`, `npm run rx:validate`, `npm run build` đều xanh.
  - Có đủ cả file lịch `pg_cron` (`20261120_neurorx_purge_cron.sql`) lẫn workflow fallback (`.github/workflows/neurorx_purge.yml` chạy Chủ Nhật hàng tuần) và file `LATER_drop_legacy_neurorx.sql`.

---

## 4. Ma trận Kiểm Định Hồi Quy 6 Lỗi Cốt Lõi (B1–B6 End-to-End Matrix)

Trước khi cho phép **Phase 7 Cutover**, toàn bộ 6 kịch bản dưới đây phải qua trên bản `next build && next start` (hoặc Vercel Preview) nối với Supabase thật:

| Mã lỗi | Kịch bản kiểm thử thực tế | Kết quả bắt buộc |
| :--- | :--- | :--- |
| **B1** (Máy A sửa, Máy B thấy cũ) | Mở tab 1 (Máy A) và tab 2 (Máy B) ở `/neurorx`. Ở Máy A vào Admin sửa ghi chú 1 thuốc và lưu. Không bấm F5 ở Máy B. | Trong vòng ≤ 3 giây qua Supabase Realtime (hoặc ngay khi chuyển tab qua lại), Máy B tự đồng bộ delta `since_seq` và hiển thị nội dung mới + thông báo `1 drug updated`. |
| **B2** (Sửa xong bấm F5 biến mất) | Máy A sửa 1 thuốc, thấy báo lưu thành công (`rev` tăng +1). Bấm `F5` (Hard Reload) liên tiếp 3 lần. | Nội dung mới giữ nguyên 100% ở cả 3 lần reload; không bao giờ quay về bản cũ từ file tĩnh hay `/tmp`. |
| **B3** (Xóa rồi tự hiện lại) | Máy A xóa mềm 1 thuốc test. Đợi 10s, mở mới một trình duyệt ẩn danh (Incognito) vào `/neurorx` và tải lại trang. | Thuốc đã xóa không xuất hiện trên cả Máy A, Máy B lẫn trình duyệt ẩn danh; `changesSince` trả tombstone `deletedAt != null`. |
| **B4** (Tạo lại trùng mã bị ẩn) | Sau khi xóa thuốc slug `zz-test-drug`, tạo lại thuốc mới cùng slug `zz-test-drug`. | Tạo thành công với **UUID mới** (`uid_2 != uid_1`), hiển thị bình thường trên tất cả các máy. |
| **B5** (Delay 5–10s khi mở/click) | Đo trong DevTools (Network & Performance) trên `next start` với cache IndexedDB đã có: (1) mở `/neurorx`, (2) bấm vào 5 thuốc liên tiếp. | Màn hình hiển thị từ IndexedDB trong `< 150 ms`; bấm vào từng thuốc mở trong `< 50 ms` và **0 request mạng** (poll không đổi trả `304 Not Modified`). |
| **B6** (Xóa trường bị tự điền lại & ghi đè) | (a) Xóa trắng 1 trường không bắt buộc rồi lưu → F5. (b) Mở 2 tab Admin cùng sửa 1 thuốc ở `rev=5`, Tab 1 lưu trước → Tab 2 bấm lưu. | (a) Trường đó vẫn trống sau F5 (không bị `mergeDrugRecords` hồi sinh). (b) Tab 2 nhận `409 Conflict` và hiện `ConflictDialog` (Use Cloud / Smart Merge / Force Overwrite), không ghi đè im lặng. |

---

## 5. Prompt Chuẩn để Chạy Đánh Giá & Tự Sửa (Copy-Paste cho Mọi Mô Hình)

Khi một phase vừa làm xong (hoặc khi bạn muốn thuê một mô hình khác làm "Trọng tài" rà soát lại phase vừa code), hãy dán nguyên văn prompt sau (thay `<PHASE_NUMBER>` bằng số `0`..`7`):

```text
You are acting as the Principal Evaluator & Auto-Remediator for "NeuroRx Sync v2" at Phase <PHASE_NUMBER>.

Read IN FULL before running any tool:
  1. tasks/neurorx-sync/00-design-neurorx-sync.md
  2. tasks/neurorx-sync/10-phases-neurorx-sync.md (Phase <PHASE_NUMBER> section & AC)
  3. tasks/neurorx-sync/20-evaluation-neurorx-sync.md (Sections 1, 2, 3, and 4)
  4. tasks/neurorx-sync/progress-neurorx-sync.md
  5. NEURORX-GUARDRAILS.md

Execute the Autonomous Critic–Fixer Loop (20-evaluation-neurorx-sync.md §1) for Phase <PHASE_NUMBER> up to MAX_ITERATIONS = 5:
  Step A: Inspect git diff / changed files against the allowed file scope and invariants I1–I15 / pitfalls P1–P14.
  Step B: Run all Phase <PHASE_NUMBER> verification commands in 20-evaluation-neurorx-sync.md §2 and §3 (including G-HYGIENE, npm test, and npm run build when applicable).
  Step C: Check every Acceptance Criterion (AC<PHASE_NUMBER>.x) in 10-phases-neurorx-sync.md.
  Step D: If ANY gate, AC, invariant, or pitfall check fails:
     - Check Stop Conditions first (never execute SQL against production DB, never run --apply without explicit user permission, never silently alter 00-design-neurorx-sync.md).
     - Otherwise, fix the root cause cleanly without adding @ts-ignore, eslint-disable, test.skip, or weakening assertions.
     - Re-run ALL checks from Step A.
  Step E: Repeat until ALL checks pass or a Stop Condition is hit.

When done:
  - Append an "Evaluation Log (Phase <PHASE_NUMBER>)" block to tasks/neurorx-sync/progress-neurorx-sync.md recording: iteration count, each command run with exact pass/fail output, every defect found and fixed, AC checklist status, and whether the Human Gate is ready.
  - Report concisely to the user in Vietnamese with file links and exact command outputs.
```
