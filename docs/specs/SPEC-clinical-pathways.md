# Spec: NeuroGuide — Clinical Pathways (Interactive Step-by-Step Diagnostic & Treatment Algorithms)

> **Source Intent:** [docs/intent/neuroguide-clinical-pathways.md](docs/intent/neuroguide-clinical-pathways.md)  
> **Target Module:** `NeuroGuide` (`/neuroguide`, tab mới **`Clinical Pathways`**)  
> **Sync Architecture Alignment:** NeuroGuide Sync v2 — 2-Tier Granular Blocks & Merkle Tree (`supabase/migrations/20261118_neuroguide_granular_sync_v2.sql`, `src/lib/neuroguide/sync/*`)

---

## 1. Objective & Architecture Fit

Bổ sung tab **`Clinical Pathways`** vào `NeuroGuide` (`src/app/neuroguide/page.tsx`, `NavTabId = "guidelines" | "conf" | "navigator" | "pathways" | "review"`) cho phép:
1. **Bác sĩ lâm sàng** đi qua lưu đồ chẩn đoán/điều trị **theo từng bước (step-by-step)** nhanh, thoáng ở chính giữa màn hình, hỗ trợ **song ngữ (ưu tiên tiếng Anh nguyên bản)**, và bật/tắt **ảnh lưu đồ gốc** (split view trên desktop / lightbox zoom trên mobile) để đối chiếu bất cứ lúc nào.
2. **Admin** upload **ảnh lưu đồ** (PNG/JPG/WebP) kèm thông tin nguồn (`Guideline` hoặc `Textbook`), gọi **Gemini Vision** (theo `GEMINI_WATERFALL_MODELS`) để bóc tách thành đồ thị tương tác ở trạng thái `draft`, kiểm tra bằng **Graph Validator**, đối chiếu song song với ảnh gốc để chỉnh sửa/chạy thử, rồi bấm **Publish** cho người dùng cuối.

### Nguyên tắc an toàn y khoa (Safety Guardrails)
- **Zero Runtime AI for Clinicians:** Bác sĩ chỉ chạy trên đồ thị JSON xác định (deterministic state machine) đã được Admin duyệt (`status === "published"`). Không có AI suy diễn khi bác sĩ đang dùng tại giường.
- **Mandatory Human-in-the-Loop Gate:** Mọi kết quả AI bóc tách từ ảnh đều mặc định `status: "draft"`. Người dùng thường chỉ thấy các pathway `status === "published"` và `deletedAt === null`; bản `draft` chỉ hiển thị khi có token Admin hợp lệ (`verifyAdminToken`).
- **Publish Blocking Validator:** Không cho phép chuyển sang `published` nếu đồ thị còn lỗi nghiêm trọng (thiếu `entryNodeId`, cạnh trỏ sai `nodeId`, nút cụt không phải nút kết thúc, thiếu thông tin nguồn).

---

## 2. Native Integration into NeuroGuide Granular Blocks & 2-Tier Merkle Tree

Thay vì tạo bảng rời rạc bên ngoài (dễ gây lệch đồng bộ và nhân đôi cơ chế cache), **`Clinical Pathways` được tích hợp trực tiếp làm công dân hạng nhất (first-class citizen) trong kiến trúc 2-Tier Granular Blocks & Merkle Tree của NeuroGuide Sync v2**:

```text
Tier 1 — Global Root Merkle Hash
  computeNeuroGuideRootHash(liveProtocols)  ──►  ETag: "ng-v2-<tier>-<maxSeq>-<rootHash>"
         │
         ├── Guidelines (protocol_type = 'guideline')
         ├── Conferences (protocol_type = 'conference')
         ├── Scenario Catalogs (protocol_type = 'scenario_catalog')
         └── Clinical Pathways (protocol_type = 'clinical_pathway')   ◄── MỚI
                │
                │  Tier 2: neuroguide_protocols
                │   • uid = deterministicUuidFromKey("pathway-protocol", slug)
                │   • slug = canonical unique slug (partial unique index WHERE deleted_at IS NULL)
                │   • metadata = { kind: "clinical_pathway", pathway: Omit<ClinicalPathwayDoc, "nodes"> }
                │   • block_order = uuid[] (thứ tự các PathwayNode block)
                │   • metadata_hash = SHA-256(canonical(metadata))
                │   • protocol_hash = SHA-256(metadata_hash | orderedLiveBlockHashes)
                │   • rev, change_seq, deleted_at
                │
                ├── Join: neuroguide_protocol_blocks (role = 'pathway_step', position = 0..N)
                │
                └── Tier 3: neuroguide_content_blocks (block_type = 'pathway_node')   ◄── MỚI
                     • uid = deterministicUuidFromKey("pathway-node", `${pathwaySlug}::${node.id}`)
                     • block_key = `pathway-node::${pathwaySlug}::${node.id}`
                     • payload = { kind: "pathway_node", pathwaySlug, node: PathwayNode }
                     • facetIndex = { subspecialties, conditionIds, domains, normalizedTier, ... }
                     • content_hash = SHA-256(canonical({ blockType, payload, facetIndex }))
                     • section_hashes = { payload, facetIndex, meta }
                     • rev, change_seq, deleted_at
                     │
                     └── Cross-Links: neuroguide_block_links (refers_to / supports_evidence)
                          └── Liên kết trực tiếp từ 1 PathwayNode sang Recommendation / Pivotal Trial block
```

### Lợi ích kiến trúc đạt được ngay lập tức
1. **O(log N) Selective Re-hashing:** Khi Admin sửa nội dung của 1 bước trong lưu đồ 30 bước, hệ thống **chỉ** tính lại `content_hash` + tăng `rev`/`change_seq` cho đúng 1 `neuroguide_content_blocks` row đó và tính lại `protocol_hash` cho 1 `neuroguide_protocols` cha. 29 bước còn lại giữ nguyên hash và không cần truyền lại qua mạng.
2. **Cache Tag Invalidation chính xác:** Tái sử dụng nguyên vẹn cơ chế `onInvalidateTag("block:<uid>")` và `onInvalidateTag("protocol:<slug>")` trong `src/lib/neuroguide/sync/handlers.ts`.
3. **Chia sẻ hạ tầng Facet Index & Cross-Links:** `PathwayNode` có `facetIndex` chuẩn (`subspecialties`, `conditionIds`, `domains`, `normalizedTier`) để lọc đồng bộ với `clinicalNavigatorTaxonomyV3` và liên kết chéo sang khuyến cáo gốc (`neuroguide_block_links`).
4. **Hợp nhất lịch sử phiên bản & khôi phục:** Tận dụng bảng revision của Sync v2 (`/api/neuroguide/sync/blocks/[uid]/history` và `/restore`) để theo dõi ai sửa bước nào, lúc nào và khôi phục lại được.

---

## 3. Storage, Cross-Device Sync, Edit & Delete Guarantees (Tránh mất & tránh lặp dữ liệu)

### 3.1. Chống lặp Pathways & Nodes (Anti-Duplication)
1. **Canonical Slug + Deterministic UUID:**
   - Mỗi pathway có `slug` chuẩn hóa: `normalizePathwaySlug(title.en, source.organizationOrAuthor, source.year)` (lowercase, kebab-case, không ký tự đặc biệt).
   - `protocol.uid` sinh tất định bằng `deterministicUuidFromKey("pathway-protocol", slug)`; mỗi node sinh `block.uid = deterministicUuidFromKey("pathway-node", `${slug}::${node.id}`)`.
2. **Database-level Uniqueness:**
   - Tận dụng sẵn partial unique index `neuroguide_protocols_slug_live (slug) WHERE deleted_at IS NULL` và `neuroguide_content_blocks_slug_live (slug) WHERE deleted_at IS NULL`. Database từ chối mọi thao tác tạo trùng slug đang sống.
3. **Image Fingerprint Deduplication (`sourceImageSha256`):**
   - Khi Admin upload ảnh lưu đồ, server tính `SHA-256` của binary ảnh và lưu trong `metadata.pathway.sourceImageSha256`.
   - Trước khi tạo pathway mới, API kiểm tra xem đã có pathway sống (`deleted_at IS NULL`) nào mang cùng `sourceImageSha256` hoặc cùng `slug` chưa. Nếu trùng, trả cảnh báo `DUPLICATE_PATHWAY_DETECTED` kèm link mở bản hiện có để Admin chọn **Cập nhật bản cũ** thay vì tạo bản sao trùng lặp.
4. **Idempotent Re-extraction:**
   - Khi Admin bấm "Extract lại" trên một pathway `draft` đã tồn tại, hệ thống giữ nguyên `protocol.uid` và `slug`, so khớp `node.id` để cập nhật tại chỗ và đánh dấu `deleted_at` cho các `node.id` không còn trong sơ đồ mới.

### 3.2. Chống mất dữ liệu khi Sửa (Optimistic Concurrency & Safe Editing)
1. **Optimistic Concurrency Control (`baseRev` → `409 Conflict`):**
   - Mọi yêu cầu `PATCH` sửa Pathway Protocol hoặc Node Block đều **bắt buộc** gửi `baseRev` (revision mà thiết bị đang giữ).
   - Repo kiểm tra nguyên tử (atomic check): nếu `current.rev !== baseRev`, server từ chối ghi và trả `HTTP 409 Conflict` kèm `serverRow` mới nhất + diff.
   - UI Admin hiển thị cảnh báo xung đột rõ ràng (*"Lưu đồ này vừa được sửa trên thiết bị khác (rev N)"*) với 2 lựa chọn tường minh: **Tải bản mới nhất** hoặc **Xem khác biệt & áp dụng lại**, tuyệt đối không âm thầm ghi đè (zero silent overwrite).
2. **Granular Node-Level Writes:**
   - Khi Admin sửa 1 bước trên Thiết bị A và sửa bước khác trên Thiết bị B, 2 `block.uid` khác nhau nên không đụng nhau ở tầng block; tầng protocol chỉ hợp nhất `block_order` và tính lại `protocol_hash`.
3. **Browser Crash / Network Drop Protection:**
   - Trong lúc Admin đang biên tập trong `PathwayAdminModal`, trạng thái chỉnh sửa chưa lưu được autosave vào `localStorage` theo key `neuroguide:pathway-editor-draft:<uid>` (kèm `baseRev` và timestamp).
   - Nếu rớt mạng hoặc đóng nhầm tab, mở lại sẽ hiện banner *"Khôi phục bản nháp chưa lưu cục bộ?"*. Bản nháp cục bộ chỉ bị xóa sau khi server xác nhận lưu thành công với `rev` mới.
4. **Revision History & Instant Rollback:**
   - Mọi thay đổi trên `pathway_node` block đều ghi bản ghi revision trước/sau (`neuroguide_block_revisions`), cho phép Admin xem lịch sử và bấm Restore nếu sửa nhầm.

### 3.3. Xóa an toàn & Chống "Hồi sinh" dữ liệu (Soft-Delete Tombstones & Deferred Purge)
1. **Soft-Delete với Tombstone có `change_seq`:**
   - Xóa một pathway (hoặc xóa 1 node) **không dùng `DELETE FROM` cứng**. Server đặt `deleted_at = now()`, tăng `rev = rev + 1`, và cấp một `change_seq = nextval('neuroguide_change_seq')` mới cho cả protocol và các `pathway_node` block thuộc nó.
   - Khi các thiết bị khác pull delta (`/api/neuroguide/sync/changes?since=<lastSeq>`), chúng nhận được bản ghi tombstone (`deletedAt !== null`, `rev` cao hơn) → `applyChanges` cập nhật IndexedDB cục bộ và gỡ khỏi danh sách hiển thị ngay lập tức.
   - **Chống Zombie Resurrection:** Một thiết bị offline cũ khi online trở lại không bao giờ đẩy đè lại pathway đã xóa, vì `rev` và `change_seq` của tombstone trên server luôn cao hơn, mọi write cũ sẽ bị chặn bằng `409 Conflict`.
2. **Deferred Image Purge (30-Day Retention):**
   - Khi xóa pathway, ảnh gốc trong bucket `pathway-images` **chưa bị xóa ngay** (chỉ ghi `deleted_at` trên DB).
   - Trong vòng **30 ngày**, Admin vẫn có thể khôi phục (Restore) nguyên vẹn cả đồ thị lẫn ảnh gốc.
   - Sau 30 ngày, cron purge (`20261121_neuroguide_purge_cron.sql` mở rộng) mới xóa cứng tombstone hết hạn và gọi dọn ảnh mồ côi trên Supabase Storage (`pathway-images`).

### 3.4. Đồng bộ giữa các thiết bị & Offline-First
1. **Tái sử dụng `useNeuroGuideSync` (`createNeuroGuideGraphSyncEngine` + `createNeuroGuideRealtimeBridge`):**
   - **Initial Boot:** Đọc ngay từ IndexedDB (`ProtocolLocalStore` + `BlockLocalStore`) để hiển thị tức thì (0ms network wait), sau đó chạy delta sync ngầm (`?since=<lastSeq>` + `If-None-Match` ETag).
   - **Realtime Push:** Khi Admin tạo/sửa/publish/xóa pathway trên Máy A, Supabase Realtime (`neuroguide_protocols` & `neuroguide_content_blocks`) phát tín hiệu → Máy B tự động debounce và kéo đúng các block/protocol có `change_seq > lastSeq` về cập nhật trạng thái trong vài giây.
   - **Offline Bedside Mode:** Khi mất Wi-Fi bệnh viện, bác sĩ vẫn chạy đầy đủ toàn bộ `published` Clinical Pathways từ IndexedDB. Nút `NeuroGuideSyncStatusBadge` hiển thị rõ trạng thái `Synced` / `Syncing` / `Offline`.
   - **Local Dev Fallback:** Khi `hasSupabaseConfig() === false`, vẫn đi qua cùng `NeuroGuideRepo` interface (sử dụng `MemoryNeuroGuideRepo` + persist file `public/data/neuroguide_pathways.json` và `public/uploads/pathways/`) để đảm bảo hành vi nhất quán 100% giữa dev và production.

---

## 4. Data Model & TypeScript Schema (`src/types/clinicalPathways.ts`)

```ts
import type { EcosystemLink, NormalizedTier, SubspecialtyType } from "./neuroguide";

export type PathwaySourceType = "guideline" | "textbook";
export type PathwayDomain = "diagnosis" | "treatment" | "combined";
export type PathwayStatus = "draft" | "published" | "archived";
export type PathwayLangMode = "en" | "bilingual" | "vi";

export interface BilingualText {
  /** Primary canonical clinical text (English verbatim from source) */
  en: string;
  /** Optional concise Vietnamese clinical translation */
  vi?: string;
}

export interface PathwaySourceMeta {
  sourceType: PathwaySourceType;
  title: string;
  organizationOrAuthor: string;
  year: number;
  figureRef?: string;
  url?: string;
  linkedGuidelineId?: string;
}

export type PathwayNodeKind =
  | "entry"
  | "decision"
  | "checklist"
  | "action"
  | "diagnosis"
  | "treatment";

export interface PathwayChecklistItem {
  id: string;
  label: BilingualText;
  role: "inclusion" | "exclusion";
}

export interface PathwayEdge {
  id: string;
  label: BilingualText;
  sublabel?: BilingualText;
  targetNodeId: string;
  tone?: "default" | "positive" | "warning" | "danger";
  checklistTrigger?: "pass" | "fail";
}

export interface PathwayNode {
  id: string;
  kind: PathwayNodeKind;
  title: BilingualText;
  body?: BilingualText;
  warning?: BilingualText;
  tier?: NormalizedTier;
  evidenceBadge?: string;
  checklistItems?: PathwayChecklistItem[];
  edges: PathwayEdge[];
  ecosystemLinks?: EcosystemLink[];
  clinicalPearl?: BilingualText;
  /** Sync v2 metadata populated when assembled from neuroguide_content_blocks */
  blockUid?: string;
  blockRev?: number;
}

export interface ClinicalPathwayDoc {
  /** Stable deterministic UUID (= neuroguide_protocols.uid) */
  uid: string;
  slug: string;
  title: BilingualText;
  summary?: BilingualText;
  subspecialty: SubspecialtyType;
  conditionId?: string;
  domain: PathwayDomain;
  source: PathwaySourceMeta;
  sourceImageUrl: string;
  /** SHA-256 of uploaded source image for duplicate upload detection */
  sourceImageSha256?: string;
  sourceImageMeta?: {
    mimeType: string;
    fileName?: string;
    width?: number;
    height?: number;
  };
  entryNodeId: string;
  nodes: PathwayNode[];
  status: PathwayStatus;
  /** Optimistic concurrency & Merkle metadata (= neuroguide_protocols) */
  rev: number;
  changeSeq?: number;
  protocolHash?: string;
  deletedAt?: string | null;
  extractionMeta?: {
    model?: string;
    extractedAt?: string;
    confidenceNotes?: string[];
  };
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Mở rộng Sync v2 Types (`src/lib/neuroguide/sync/types.ts`)
- `NeuroGuideProtocolType`: bổ sung `"clinical_pathway"`.
- `NeuroGuideBlockType`: bổ sung `"pathway_node"`.
- `NeuroGuideBlockPayload`: bổ sung `{ kind: "pathway_node"; pathwaySlug: string; node: PathwayNode }`.
- `NeuroGuideProtocolMetadata`: bổ sung `{ kind: "clinical_pathway"; pathway: Omit<ClinicalPathwayDoc, "nodes" | "rev" | "changeSeq" | "protocolHash" | "deletedAt"> }`.
- `NeuroGuideProtocolBlockEdge["role"]`: bổ sung `"pathway_step"`.

---

## 5. Deterministic Graph Validator (`src/lib/neuroguide/pathwayValidator.ts`)

Chạy ở cả **client (live feedback trong Admin Editor)** lẫn **server (chặn Publish nếu có lỗi)**:

### Blocking Errors (cấm Publish)
1. `MISSING_TITLE` — thiếu `title.en`.
2. `MISSING_SOURCE` — thiếu `source.title` hoặc `source.year`.
3. `MISSING_IMAGE` — thiếu `sourceImageUrl`.
4. `EMPTY_NODES` — `nodes.length === 0`.
5. `INVALID_ENTRY_NODE` — `entryNodeId` không tồn tại trong `nodes`.
6. `DUPLICATE_NODE_ID` — trùng `node.id`.
7. `BROKEN_EDGE_TARGET` — `edge.targetNodeId` trỏ tới `nodeId` không tồn tại.
8. `DEAD_END_DECISION` — node loại `entry`, `decision`, hoặc `checklist` nhưng không có outgoing `edges`.
9. `CHECKLIST_MISSING_ITEMS` — node loại `checklist` nhưng `checklistItems` rỗng.

### Non-Blocking Warnings (hiển thị cảnh báo cho Admin kiểm tra)
1. `ORPHAN_NODE` — node không thể đi tới từ `entryNodeId` (BFS reachability check).
2. `CYCLE_DETECTED` — đồ thị có vòng lặp (cảnh báo để Admin xác nhận không phải AI nối nhầm mũi tên).
3. `MISSING_VI_TRANSLATION` — node/edge chưa có bản dịch `vi`.
4. `NON_TERMINAL_LEAF` — node không có `edges` nhưng `kind` là `action` thay vì `diagnosis`/`treatment`.

---

## 6. AI Vision Extraction Pipeline (`src/lib/neuroguide/pathwayExtractor.ts`)

1. Admin chọn ảnh lưu đồ (PNG/JPG/WebP, ≤ 10MB) + nhập metadata nguồn (`sourceType`, `title`, `organizationOrAuthor`, `year`, `figureRef`, `subspecialty`, `domain`).
2. Frontend gửi `multipart/form-data` lên `POST /api/neuroguide/pathways/extract` (header `x-admin-token`).
3. Backend:
   - Xác thực `verifyAdminToken`.
   - Validate MIME (`image/png`, `image/jpeg`, `image/webp`) và dung lượng (≤ 10MB).
   - Tính `sourceImageSha256` từ buffer ảnh và kiểm tra trùng lặp với các pathway đang sống (trả cảnh báo `duplicateWarning` nếu đã có pathway dùng cùng ảnh).
   - Upload ảnh lên Supabase Storage bucket `pathway-images` (public read, auto-create bucket nếu chưa có; local fallback vào `public/uploads/pathways/`).
   - Gọi Gemini REST (`generateContent`) với `inlineData` (base64) theo `GEMINI_WATERFALL_MODELS` + `recordGeminiFallback`.
   - Prompt bắt buộc: đọc verbatim text tiếng Anh (`en`) từ ảnh, không tự thêm liều/tiêu chuẩn không có trong ảnh; cung cấp bản dịch ngắn tiếng Việt (`vi`) giữ nguyên thuật ngữ y khoa chuẩn; liệt kê các đoạn mờ/khó đọc vào `extractionMeta.confidenceNotes`.
   - Chạy `validateClinicalPathway(draft)` và trả `{ ok: true, draft, validation, duplicateWarning }`.

---

## 7. Database Migration & API Endpoints

### 7.1. SQL Migration (`supabase/migrations/20261122_neuroguide_clinical_pathways_v2.sql`)
Mở rộng **idempotent** các `CHECK` constraint trên bảng Sync v2 hiện hữu (không phá vỡ dữ liệu cũ, kèm file rollback `20261122_neuroguide_clinical_pathways_v2_rollback.sql`):
- `neuroguide_protocols.protocol_type`: thêm `'clinical_pathway'`.
- `neuroguide_content_blocks.block_type`: thêm `'pathway_node'`.
- `neuroguide_protocol_blocks.role`: thêm `'pathway_step'`.
- Cập nhật các RPC `neuroguide_upsert_protocol` / `neuroguide_upsert_block` (nếu có whitelist) để chấp nhận loại mới.

### 7.2. API Endpoints (`src/app/api/neuroguide/pathways/...`)
Tất cả đọc/ghi đều đi qua `NeuroGuideRepo` (Sync v2) để tự động cập nhật `rev`, `change_seq`, `content_hash`, `protocol_hash`, và phát sự kiện Realtime:

| Endpoint | Method | Auth | Chức năng & Cơ chế an toàn |
| --- | --- | --- | --- |
| `/api/neuroguide/sync/changes` | `GET` | Public / Admin | Đã có sẵn — tự động đồng bộ delta `clinical_pathway` protocols và `pathway_node` blocks qua `since` + ETag |
| `/api/neuroguide/pathways` | `GET` | Public (Published) / Admin (`?includeDrafts=1`) | Liệt kê pathways (lọc theo subspecialty, domain, status; ẩn draft với non-admin) |
| `/api/neuroguide/pathways` | `POST` | Admin | Tạo pathway mới dạng `draft` (từ AI extract hoặc tạo tay); kiểm tra trùng `slug` / `sourceImageSha256`; ghi nguyên tử protocol + các `pathway_node` blocks |
| `/api/neuroguide/pathways/[uid]` | `GET` | Public (Published) / Admin (Draft) | Lấy chi tiết pathway đã ghép từ protocol + ordered live blocks |
| `/api/neuroguide/pathways/[uid]` | `PATCH` | Admin | Cập nhật metadata / sửa từng node / Publish (`status: "published"`). Bắt buộc `baseRev` (trả `409 Conflict` nếu lệch); chặn Publish nếu validator còn lỗi; trả về `rev`, `protocolHash`, `changeSeq` mới |
| `/api/neuroguide/pathways/[uid]` | `DELETE` | Admin | Soft-delete (`deleted_at = now()`, bump `rev` & `change_seq`) trên protocol + toàn bộ `pathway_node` blocks con → phát tombstone đồng bộ xóa trên mọi thiết bị |
| `/api/neuroguide/pathways/[uid]/restore` | `POST` | Admin | Khôi phục pathway đã soft-delete trong vòng 30 ngày retention |
| `/api/neuroguide/pathways/extract` | `POST` | Admin | Upload ảnh + metadata → kiểm tra trùng hash ảnh → Gemini Vision bóc tách → trả `draft` + `validation` |

---

## 8. Đảm bảo đồng nhất UI/UX với `NeuroGuide` hiện tại

Toàn bộ giao diện `Clinical Pathways` (cả phía Bác sĩ lẫn Admin) phải tuân thủ tuyệt đối hệ thống thiết kế hiện tại của `NeuroGuide` (`src/app/globals.css`, `src/app/neuroguide/page.tsx`, `src/components/neuroguide/ClinicalNavigatorTab.tsx`):

### 8.1. Design Tokens & Theme Parity (Light / Dark / Night-Shift)
- **Màu nền & bề mặt:** Chỉ sử dụng CSS variables chuẩn của hệ sinh thái:
  - Canvas nền: `bg-[var(--bg-paper)]` (`#FAF8F5` light / `#151412` dark & night-shift)
  - Card & Modal surface: `bg-[var(--bg-surface)]` (`#FFFFFF` / `#1E1C19`)
  - Vùng phụ / chip / breadcrumb bar: `bg-[var(--bg-subtle)]` (`#F3EFEA` / `#26231F`)
  - Viền hairline: `border-[var(--border-hairline)]` (`#E2DDD3` / `#322E29`)
  - Chữ phân cấp: `text-[var(--text-ink)]`, `text-[var(--text-secondary)]`, `text-[var(--text-muted)]`
- **Màu nhấn thương hiệu `NeuroGuide`:** Terracotta `#C25934` (`border-l-4 border-l-[#C25934]`, active pill, nút hành động chính, focus ring) — đồng nhất với tab `Guidelines` & `Clinical Navigator`.
- **Phân tầng bằng chứng:** Dùng trực tiếp `TIER_CONFIG` từ `src/types/neuroguide.ts` (Emerald Tier 1, Blue Tier 2, Amber Tier 3, Purple Tier 4, Rose Tier 5) cho các node có Class/LOE.
- **Typography & Transition:** Font `Inter` mặc định (`.font-editorial` Playfair Display cho tiêu đề section khi cần), chuyển động `var(--apple-ease)`.

### 8.2. Tái sử dụng Component Hệ sinh thái
- **Tab Bar:** Thêm mục **`Clinical Pathways`** (icon `GitBranch` hoặc `Route` từ `lucide-react`) ngay cạnh `Clinical Navigator` trong thanh tab của `src/app/neuroguide/page.tsx`, cùng kiểu active underline/pill và bộ đếm số lượng pathway đang `published`.
- **Dropdown & Controls:** Dùng `CustomSelect` (`src/components/ecosystem/CustomSelect.tsx`) cho bộ lọc Chuyên khoa / Domain / Nguồn.
- **Sync Indicator & Auth:** Tái sử dụng `NeuroGuideSyncStatusBadge` ở header và `AdminAuthModal` + `getAdminHeaders()` cho các nút Admin (Upload, Edit, Delete, Restore).
- **Medical Disclaimer:** Hiển thị `MEDICAL_DISCLAIMER_TEXT` ở chân thẻ kết luận cuối nhánh (Summary Card).

### 8.3. Trải nghiệm Bác sĩ (`ClinicalPathwaysTab` + `PathwayStepRunner` + `OriginalImageDrawer`)
1. **Catalog View:** Thanh lọc 1 hàng gọn (Search EN/VI + Chuyên khoa + Domain + Nguồn Guideline/Textbook), lưới thẻ 2–3 cột dùng đúng kiểu thẻ `border-l-4` của `NeuroGuide`. Admin thấy thêm badge `DRAFT` (amber) / `ARCHIVED`, nút **+ Upload Flowchart**, và menu **Edit / Delete / Restore**.
2. **Active Step-by-Step Runner (Chính giữa — Fast Bedside UX):**
   - **Header Bar:** Nút quay lại Catalog, tiêu đề pathway + badge nguồn, **Language Toggle** (`EN` mặc định | `EN + VI` | `VI`), và nút **`Original Flowchart`** (bật/tắt ảnh gốc).
   - **Breadcrumb Trail:** Thanh lịch sử các lựa chọn đã bấm (`Step 1` → `Step 2` → …), bấm vào bất kỳ chip nào để quay lui đổi nhánh ngay; nút `Reset`.
   - **Center Focus Card:** 1 bước duy nhất ở chính giữa, thoáng, chữ rõ; hỗ trợ `decision`, `checklist`, `action`, `diagnosis`, `treatment`; hộp cảnh báo chống chỉ định màu rose; nút kết thúc hiển thị **Clinical Summary Card** (tóm tắt đường đi, nút Copy Summary, trích dẫn nguồn đầy đủ, `EcosystemLink` sang `NeuroRx` / `NeuroVision`).
3. **Original Flowchart Viewer:**
   - **Desktop:** Nút góc phải bật **Split View** (55% Step Runner trái — 45% ảnh gốc phải có zoom +/-, fit-to-width, kéo pan).
   - **Mobile:** Mở **Lightbox Modal** toàn màn hình có zoom.

### 8.4. Giao diện Admin Upload, Review & Editor (`PathwayAdminModal`)
- Dùng cùng ngôn ngữ thiết kế modal như `NotebookLMUploadModal` / `EditGuidelineModal` (`bg-[var(--bg-surface)]`, hairline borders, dark-mode chuẩn).
- **Bước 1 — Upload & Source:** Kéo thả ảnh + điền nguồn (`Guideline` / `Textbook`, tên nguồn, tác giả/hội, năm, hình/trang, chuyên khoa, domain). Cảnh báo ngay nếu trùng hash ảnh hoặc slug.
- **Bước 2 — Gemini Vision Extract:** Hiển thị tiến trình trích xuất, `confidenceNotes` các vùng ảnh mờ, và kết quả `validateClinicalPathway`.
- **Bước 3 — Split-Screen Review & Edit:** Trái là ảnh gốc (zoomable); Phải có 3 sub-tab: **Visual Form Editor** (kèm lỗi validator gắn tại từng node), **Live Preview** (chạy thử bằng chính `PathwayStepRunner`), và **Raw JSON**. Hiển thị rõ `rev` hiện tại + trạng thái autosave cục bộ.
- **Bước 4 — Save Draft / Publish / Conflict Resolution:** Chặn Publish khi còn blocking error; xử lý `409 Conflict` trực quan nếu có chỉnh sửa từ thiết bị khác.

---

## 9. Verification & Testing Plan

1. **Unit & Integration Tests (`tests/clinicalPathways.test.mjs`):**
   - `validateClinicalPathway`: đồ thị hợp lệ, thiếu `entryNodeId`, broken edge, dead-end decision, orphan node warning, cycle warning, checklist validation.
   - **Sync v2 & Merkle Tree:** decompose pathway → `neuroguide_protocols` + `neuroguide_content_blocks` (`pathway_node`) → assemble lossless; sửa 1 node chỉ thay đổi hash của đúng node đó + `protocol_hash` + `rootHash` (O(log N) selective re-hash).
   - **Concurrency & Anti-Duplication & Tombstone:** duplicate slug / duplicate image SHA-256 detection; `baseRev` mismatch trả `409 Conflict`; soft-delete tạo tombstone tăng `change_seq` và đồng bộ gỡ trên replica client; restore khôi phục nguyên vẹn; non-admin không bao giờ nhận được `draft`.
   - Extractor JSON sanitization & normalization (mocked, không gọi mạng thật).
2. **Existing Sync v2 Regression:** Chạy lại toàn bộ `tests/neuroguideBlockGraph.test.mjs`, `tests/neuroguideSync*.test.mjs`, `tests/neuroguideSqlSchema.test.mjs` để đảm bảo không phá vỡ bất kỳ bất biến nào của `NeuroGuide` hiện tại.
3. **TypeScript & Build Check:** `npx tsc --noEmit`, `npm test`, và `npm run build` pass sạch.
