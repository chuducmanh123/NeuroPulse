# Implementation Plan — NeuroGuide `Clinical Pathways`

> **Intent:** [docs/intent/neuroguide-clinical-pathways.md](../docs/intent/neuroguide-clinical-pathways.md)  
> **Spec:** [SPEC-clinical-pathways.md](../SPEC-clinical-pathways.md)  
> **Status:** Completed — Phases 1–4 implemented & verified.

---

## Phase 1: Schema, Graph Validator & Sync v2 Merkle Integration
Mục tiêu: Tích hợp `Clinical Pathways` trực tiếp vào kiến trúc **NeuroGuide 2-Tier Granular Blocks & Merkle Tree** (chống lặp, chống mất dữ liệu, optimistic concurrency, soft-delete tombstones).

- [x] **T1.1 — Types & Schema:** Tạo `src/types/clinicalPathways.ts` (`ClinicalPathwayDoc`, `PathwayNode`, `PathwayEdge`, `BilingualText`, `PathwaySourceMeta`, `PathwayValidationResult`).
- [x] **T1.2 — Graph Validator:** Tạo `src/lib/neuroguide/pathwayValidator.ts` kiểm tra blocking errors (entry node, broken edges, dead-ends, duplicate node IDs, source metadata) và warnings (orphan nodes, cycles, missing VI).
- [x] **T1.3 — Mở rộng Sync v2 Types & Merkle Graph Engine:**
  - Cập nhật `src/lib/neuroguide/sync/types.ts`: thêm `protocol_type: "clinical_pathway"`, `block_type: "pathway_node"`, `role: "pathway_step"`.
  - Cập nhật `src/lib/neuroguide/sync/blockGraph.ts` & `handlers.ts`: hỗ trợ decompose/assemble `ClinicalPathwayDoc` ↔ `NeuroGuideProtocolRow` + `NeuroGuideContentBlockRow[]` với deterministic UUID, O(log N) selective re-hash, và `ALLOWED_PROTOCOL_TYPES` / `ALLOWED_BLOCK_TYPES`.
  - Cập nhật `src/hooks/useNeuroGuideSync.ts` & `src/lib/neuroguide/sync/lookupHelpers.ts`: dẫn xuất thêm danh sách `clinicalPathways` (tự động lọc `deletedAt === null`, tách rõ `published` vs `draft`) từ cùng IndexedDB + Realtime sync engine.
- [x] **T1.4 — SQL Migration (Idempotent + Rollback):** Tạo `supabase/migrations/20261122_neuroguide_clinical_pathways_v2.sql` và `20261122_neuroguide_clinical_pathways_v2_rollback.sql` mở rộng constraint của `neuroguide_protocols`, `neuroguide_content_blocks`, `neuroguide_protocol_blocks`.
- [x] **T1.5 — Pathway Service & Image Storage:** Tạo `src/lib/neuroguide/pathwayService.ts` xử lý:
  - Canonical slug + `sourceImageSha256` chống lặp khi upload/tạo mới.
  - Upload ảnh lên Supabase Storage bucket `pathway-images` (local fallback `public/uploads/pathways/`).
  - Ghi nguyên tử qua `NeuroGuideRepo` với `baseRev` (trả `409 Conflict` khi lệch), soft-delete tombstone (`deleted_at` + `change_seq`), và restore trong chu kỳ 30 ngày.

## Phase 2: Gemini Vision Extraction & API Routes
Mục tiêu: Hoàn thiện pipeline bóc tách ảnh lưu đồ → đồ thị `draft` và toàn bộ API bảo vệ bằng `verifyAdminToken`.

- [x] **T2.1 — Gemini Vision Extractor:** Tạo `src/lib/neuroguide/pathwayExtractor.ts` gọi Gemini REST (`inlineData` base64 + `GEMINI_WATERFALL_MODELS` + `recordGeminiFallback`), trích xuất song ngữ (EN nguyên bản + VI phụ), trả `confidenceNotes` và kết quả `validateClinicalPathway`.
- [x] **T2.2 — CRUD, Publish, Soft-Delete & Restore APIs:**
  - `src/app/api/neuroguide/pathways/route.ts` (`GET`, `POST` — chống trùng slug/hash ảnh, ẩn `draft` với non-admin).
  - `src/app/api/neuroguide/pathways/[uid]/route.ts` (`GET`, `PATCH` có `baseRev` → `409 Conflict` & validator gate khi publish, `DELETE` soft-delete tombstone).
  - `src/app/api/neuroguide/pathways/[uid]/restore/route.ts` (`POST` khôi phục bản đã soft-delete).
- [x] **T2.3 — Extract API:** Tạo `src/app/api/neuroguide/pathways/extract/route.ts` (`POST` multipart image + source metadata, admin-only).

## Phase 3: Clinician-Facing UI (`Clinical Pathways` Tab — Đồng nhất Design System NeuroGuide)
Mục tiêu: Giao diện nhanh tại giường, sử dụng 100% CSS tokens (`--bg-paper`, `--bg-surface`, `--bg-subtle`, `--border-hairline`, `#C25934`, `TIER_CONFIG`, Light/Dark/Night-Shift) và tái sử dụng component hệ sinh thái (`CustomSelect`, `NeuroGuideSyncStatusBadge`, `MEDICAL_DISCLAIMER_TEXT`).

- [x] **T3.1 — Original Image Viewer:** Tạo `src/components/neuroguide/pathways/OriginalImageDrawer.tsx` (Split View trên desktop + Lightbox zoom/pan trên mobile).
- [x] **T3.2 — Step-by-Step Runner:** Tạo `src/components/neuroguide/pathways/PathwayStepRunner.tsx`:
  - Breadcrumb lịch sử lựa chọn + bấm quay lui bất kỳ bước nào + Reset.
  - Language toggle (`EN` mặc định | `EN + VI` | `VI`).
  - Render đầy đủ các loại node (`entry`, `decision`, `checklist`, `action`, `diagnosis`, `treatment`), badge `TIER_CONFIG`, cảnh báo chống chỉ định, và Clinical Summary Card + `EcosystemLink`.
- [x] **T3.3 — Catalog & Tab Container:** Tạo `src/components/neuroguide/ClinicalPathwaysTab.tsx` kết nối trực tiếp dữ liệu đồng bộ từ `useNeuroGuideSync` (offline-ready + realtime cross-device updates), lọc theo chuyên khoa/domain/nguồn/từ khóa, hiển thị Draft & Deleted/Restore cho Admin.
- [x] **T3.4 — Integrate into NeuroGuide:** Cập nhật `src/app/neuroguide/page.tsx` thêm tab **`Clinical Pathways`** (`NavTabId = "pathways"`), lazy-load `ClinicalPathwaysTab`, giữ nguyên phong cách tab bar và sync badge hiện có.

## Phase 4: Admin Upload, Review & Conflict-Safe Editor UI
Mục tiêu: Admin tự thêm ảnh lưu đồ, đối chiếu ảnh gốc, chỉnh sửa từng bước (có autosave cục bộ & xử lý `409 Conflict`) và duyệt xuất bản ngay trên web.

- [x] **T4.1 — Admin Upload & Editor Modal:** Tạo `src/components/neuroguide/pathways/PathwayAdminModal.tsx` (đồng nhất phong cách `NotebookLMUploadModal` / `EditGuidelineModal`):
  1. Upload ảnh + nguồn (`Guideline` / `Textbook`) + cảnh báo nếu trùng ảnh/slug.
  2. Chạy Gemini Vision Extraction & hiển thị `confidenceNotes` + lỗi/cảnh báo validator.
  3. Split-screen Review: ảnh gốc bên trái + Visual Form Editor / Live Preview (`PathwayStepRunner`) / Raw JSON bên phải + autosave cục bộ (`localStorage`) + xử lý xung đột `409 Conflict` + nút **Save Draft** & **Publish**.

## Phase 5: Verification & Regression Testing
- [x] **T5.1 — Automated Tests:** Viết `tests/clinicalPathwaysPhase1.test.mjs` – `tests/clinicalPathwaysPhase4.test.mjs` kiểm thử validator, Sync v2 Merkle, extractor, handlers, runner utils và editor autosave utils.
- [x] **T5.2 — Full Regression & Build:** Chạy `npm test` (bao gồm toàn bộ `neuroguideBlockGraph` / `neuroguideSync*` tests) và `npm run build` pass 100%.
