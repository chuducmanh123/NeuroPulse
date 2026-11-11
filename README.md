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

---

## NeuroRx — Point-of-Care Neuropharmacology & CDSS Suite

**NeuroRx** (`/neurorx`) is an offline-capable, point-of-care Clinical Decision Support System (CDSS) specifically designed for bedside neurology and acute stroke clinicians.

### Core Architecture & Safety Guardrails
- **Zero Runtime AI / Deterministic Clinical Engine:** Clinical decisions and dosages are computed strictly via deterministic mathematical formulas (Cockcroft-Gault 1976, Mosteller BSA). No AI hallucinated numbers exist at runtime.
- **Source-Anchored Anti-Hallucination Core:** Every clinical number, dosing rule, renal band, and interaction recommendation is backed by a registered source reference with a verbatim quote ($\le 400$ characters) matching official FDA/EMA Prescribing Information and clinical guidelines.
- **Draft Safety Lockout & SHA-256 Verification Seals:** Records without human verification or with altered content hashes are locked in `draft` status, suppressing computed dose amounts and order generation. Human clinicians seal records using `npm run rx:verify`.
- **Zero Hardcoded Clinical Constants in Engine:** Verified by automated CI checks (`npm run rx:check-constants`), ensuring engine files contain zero hardcoded dosages; all parameters are parsed from data registries.

### Key Capabilities & Tabs
1. **💊 Drug Lookup & Dosing:**
   - **Clinical Omnibar:** Query natural inputs like `keppra 60kg crcl 35` to pre-fill patient parameters and highlight active renal bands.
   - **Renal Function Adjustment:** Dynamic Cockcroft-Gault calculation with unit conversions ($\mu\text{mol/L}$ to $\text{mg/dL}$) and automatic renal band selection.
   - **Safety Capping:** Strict enforcement of maximum single and daily doses without rounding beyond caps.
   - **Order Text Generation:** Standardized clinical order strings including route, frequency, and institutional safety disclaimers.
2. **⚡ Interactions & Safety Analysis:**
   - **Curated DDIs:** High-priority clinical interaction alerts (Contraindicated, Major, Moderate, Minor) with detailed management notes and non-interacting alternatives ("Simulate Swap").
   - **Mechanism Flags:** Multi-drug safety evaluations including CYP3A4/P-gp induction/inhibition, Serotonergic toxicity, QT prolongation, and Anticholinergic Cognitive Burden (ACB $\ge 3$).
   - **Myasthenia Gravis Warnings:** Explicit safety stratification for neuromuscular junction risks.
3. **🤰 Pregnancy & Lactation:**
   - **Teratogenic Risk Stratification:** Distinct Preferred / Caution / Avoid classifications.
   - **Registry-Specific Malformation Rates:** Major Congenital Malformation (MCM) data preserved per registry (EURAP, NAAED, UK/Ireland) without cross-registry aggregation.
   - **Lactation & Postpartum:** Relative Infant Dose (RID) and LactMed-anchored safety summaries.
4. **✨ Novel Therapies & Biologics:**
   - Detailed monitoring timelines for amyloid-targeting monoclonal antibodies (Lecanemab, Donanemab).
   - ApoE $\varepsilon4$ genotype risk stratification, baseline MRI requirements, and ARIA-E / ARIA-H safety surveillance protocols.

### Bedside Contextual Tools
- **DOAC & Antithrombotic Compass:** Emergency reversal protocols (Idarucizumab, 4F-PCC, Andexanet alfa, Protamine, Vitamin K) and procedure hold/restart timing stratified by renal function and bleeding risk.
- **LEDD & NPO Converter:** Levodopa Equivalent Daily Dose calculator using Tomlinson et al. (2010) conversion factors and transdermal rotigotine patch conversion for perioperative / NPO Parkinson's patients.
- **Titration & Missed Dose:** Structured titration schedules with print-ready views and missed dose patient instructions.

### CLI Commands & Verification Workflow
```bash
# Validate schemas, relationships, and cryptographic verification hashes
npm run rx:validate

# Verify that all 980+ clinical quotes match source documents verbatim
npm run rx:check-quotes

# Ensure no clinical constants or hardcoded drug dosages exist in engine source code
npm run rx:check-constants

# Verify and cryptographically seal a drug record (requires clinician review)
npm run rx:verify -- <drug-id> --by "<Clinician Name>"

# Execute full test suite including all 7 acceptance user stories
npm test
```

### Offline PWA Operation
NeuroRx is configured with a dedicated Service Worker (`public/neurorx-sw.js`) and Web Manifest (`public/neurorx-manifest.json`) scoped to `/neurorx`. Once loaded, clinicians can access drug monographs, renal calculators, and interaction checks completely offline without hospital Wi-Fi.
