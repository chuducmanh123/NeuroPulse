import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MIGRATION_PATH = path.join(ROOT, "supabase", "migrations", "20261118_neuroguide_granular_sync_v2.sql");
const ROLLBACK_PATH = path.join(ROOT, "supabase", "migrations", "20261118_neuroguide_granular_sync_v2_rollback.sql");
const CHECKS_PATH = path.join(ROOT, "supabase", "tests", "neuroguide_granular_sync_v2_checks.sql");

function stripSqlComments(sql) {
  return sql
    .split(/\r?\n/)
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

function extractFunctionBody(sql, fnName) {
  const fnStartRe = new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${fnName}\\b[\\s\\S]*?as\\s+\\$\\$([\\s\\S]*?)\\$\\$;`, "i");
  const match = sql.match(fnStartRe);
  assert.ok(match, `Expected PL/pgSQL function definition for public.${fnName}`);
  return match[1];
}

test("Phase 8.1 SQL migration, rollback, and verification files follow contract", () => {
  assert.equal(fs.existsSync(MIGRATION_PATH), true, "Forward migration SQL must exist");
  assert.equal(fs.existsSync(ROLLBACK_PATH), true, "Rollback SQL must exist");
  assert.equal(fs.existsSync(CHECKS_PATH), true, "Verification checks SQL must exist");

  const migration = fs.readFileSync(MIGRATION_PATH, "utf8");
  const rollback = fs.readFileSync(ROLLBACK_PATH, "utf8");
  const checks = fs.readFileSync(CHECKS_PATH, "utf8");

  const cleanMigration = stripSqlComments(migration);
  const cleanRollback = stripSqlComments(rollback);
  const cleanChecks = stripSqlComments(checks);

  // Transaction wrappers
  assert.match(cleanMigration, /\bBEGIN;/);
  assert.match(cleanMigration, /\bCOMMIT;/);
  assert.match(cleanRollback, /\bBEGIN;/);
  assert.match(cleanRollback, /\bCOMMIT;/);
  assert.match(cleanChecks, /\bBEGIN;/);
  assert.match(cleanChecks, /\bROLLBACK;/);

  // Zero executable references to legacy tables
  assert.equal(/\b(neuroguide_docs|neurorx_drugs|neurorx_drug_records)\b/i.test(cleanMigration), false);
  assert.equal(/\b(neuroguide_docs|neurorx_drugs|neurorx_drug_records)\b/i.test(cleanRollback), false);
  assert.equal(/\b(neuroguide_docs|neurorx_drugs|neurorx_drug_records)\b/i.test(cleanChecks), false);

  // Sequence + 7 tables
  assert.match(cleanMigration, /create\s+sequence\s+if\s+not\s+exists\s+public\.neuroguide_change_seq/i);
  const tables = [
    "neuroguide_protocols",
    "neuroguide_content_blocks",
    "neuroguide_protocol_blocks",
    "neuroguide_block_links",
    "neuroguide_block_revisions",
    "neuroguide_sync_state",
    "neuroguide_sync_config",
  ];
  for (const tbl of tables) {
    assert.match(
      cleanMigration,
      new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${tbl}\\b`, "i"),
      `Missing table ${tbl}`
    );
    assert.match(
      cleanMigration,
      new RegExp(`alter\\s+table\\s+public\\.${tbl}\\s+enable\\s+row\\s+level\\s+security`, "i"),
      `Missing RLS enable for ${tbl}`
    );
    assert.match(
      cleanMigration,
      new RegExp(`grant\\s+all\\s+on\\s+table\\s+public\\.${tbl}\\s+to\\s+service_role`, "i"),
      `Missing service_role grant for ${tbl}`
    );
    assert.match(
      cleanRollback,
      new RegExp(`drop\\s+table\\s+if\\s+exists\\s+public\\.${tbl}\\b`, "i"),
      `Missing rollback drop table for ${tbl}`
    );
  }

  // GIN indexes for multi-axis overlapping facets & subspecialties
  assert.match(
    cleanMigration,
    /create\s+index\s+if\s+not\s+exists\s+neuroguide_content_blocks_facets_gin\s+on\s+public\.neuroguide_content_blocks\s+using\s+gin\s*\(\s*facets\s+jsonb_path_ops\s*\)/i
  );
  assert.match(
    cleanMigration,
    /create\s+index\s+if\s+not\s+exists\s+neuroguide_protocols_subspecialties_gin\s+on\s+public\.neuroguide_protocols\s+using\s+gin\s*\(\s*subspecialties\s+jsonb_path_ops\s*\)/i
  );

  // Anon boundary: ONLY neuroguide_sync_state selectable by anon
  assert.match(cleanMigration, /grant\s+select\s+on\s+table\s+public\.neuroguide_sync_state\s+to\s+anon/i);
  assert.match(cleanMigration, /create\s+policy\s+neuroguide_sync_state_anon_select\s+on\s+public\.neuroguide_sync_state/i);
  assert.match(cleanMigration, /alter\s+publication\s+supabase_realtime\s+add\s+table\s+public\.neuroguide_sync_state/i);

  // Required RPCs locked to service_role and covered by rollback
  const rpcs = [
    "neuroguide_recompute_protocol_hash",
    "neuroguide_recompute_root_hash",
    "neuroguide_recompute_affected_protocols",
    "neuroguide_upsert_protocol",
    "neuroguide_delete_protocol",
    "neuroguide_create_block",
    "neuroguide_update_block",
    "neuroguide_delete_block",
    "neuroguide_restore_block_revision",
    "neuroguide_replace_block_links",
    "neuroguide_query_blocks_by_facets",
    "neuroguide_changes_since",
    "neuroguide_protocol_changes_since",
    "neuroguide_purge",
  ];
  for (const rpc of rpcs) {
    assert.match(
      cleanMigration,
      new RegExp(`revoke\\s+execute\\s+on\\s+function\\s+public\\.${rpc}\\([^)]*\\)\\s+from\\s+public,\\s*anon,\\s*authenticated`, "i"),
      `Missing execute revoke for ${rpc}`
    );
    assert.match(
      cleanMigration,
      new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.${rpc}\\([^)]*\\)\\s+to\\s+service_role`, "i"),
      `Missing execute grant to service_role for ${rpc}`
    );
    assert.match(
      cleanRollback,
      new RegExp(`drop\\s+function\\s+if\\s+exists\\s+public\\.${rpc}\\(`, "i"),
      `Missing rollback drop function for ${rpc}`
    );
  }

  // Advisory lock must precede FOR UPDATE and nextval(neuroguide_change_seq) in every mutating RPC
  const mutatingRpcs = [
    "neuroguide_recompute_protocol_hash",
    "neuroguide_recompute_root_hash",
    "neuroguide_recompute_affected_protocols",
    "neuroguide_upsert_protocol",
    "neuroguide_delete_protocol",
    "neuroguide_create_block",
    "neuroguide_update_block",
    "neuroguide_delete_block",
    "neuroguide_restore_block_revision",
    "neuroguide_replace_block_links",
    "neuroguide_purge",
  ];
  for (const rpc of mutatingRpcs) {
    const body = extractFunctionBody(cleanMigration, rpc);
    const lockIdx = body.search(/perform\s+pg_advisory_xact_lock\s*\(\s*hashtext\s*\(\s*'neuroguide_sync'\s*\)\s*\)/i);
    assert.ok(lockIdx >= 0, `Mutating RPC ${rpc} must acquire neuroguide_sync advisory xact lock`);

    const forUpdateIdx = body.search(/\bfor\s+update\b/i);
    if (forUpdateIdx >= 0) {
      assert.ok(lockIdx < forUpdateIdx, `Advisory lock must precede FOR UPDATE in ${rpc}`);
    }

    const nextvalIdx = body.search(/nextval\s*\(\s*'public\.neuroguide_change_seq'\s*\)/i);
    if (nextvalIdx >= 0) {
      assert.ok(lockIdx < nextvalIdx, `Advisory lock must precede nextval in ${rpc}`);
    }
  }

  // SQL checks file covers T1..T12 and >= 25 RAISE EXCEPTION guards
  for (let i = 1; i <= 12; i++) {
    assert.match(checks, new RegExp(`--\\s*T${i}\\b`), `Checks script must document T${i}`);
  }
  const raiseMatches = cleanChecks.match(/\braise\s+exception\b/gi) || [];
  assert.ok(raiseMatches.length >= 25, `Expected >= 25 RAISE EXCEPTION guards, found ${raiseMatches.length}`);
});
