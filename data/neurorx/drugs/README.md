# Read-Only Mirror (`data/neurorx/drugs`)

> **Generated mirror, do not edit by hand.**

Files in this directory (`*.json`) are exported from the live Supabase `neurorx_drug_records` table (Sync v2) via:

```bash
npm run rx:pull
```

- **CI usage:** `rx:validate`, `rx:check-quotes`, and `rx:check-constants` validate these mirrored JSON records in Git / CI.
- **Runtime invariant (I1):** The Next.js application never reads `data/neurorx/drugs/*.json` at runtime; all reads and edits go through Sync v2 (`neurorx_drug_records` + browser IndexedDB).
- **Modifying records from CLI:** Edit or verify in Admin UI, or use `npm run rx:verify -- <slug> --by "<Name>"` / `npm run rx:push -- --apply`, then run `npm run rx:pull -- --prune` to refresh this mirror.
