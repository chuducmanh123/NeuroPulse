import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/utils/security";
import {
  getAllDrugs,
  getDrugById,
  saveDrugToStorage,
  deleteDrugFromStorage,
  verifyDrugInStorage,
  verifyAllDraftsInStorage,
  getDataVersionHash,
} from "@/lib/neurorx/data";
import type { DrugRecord } from "@/types/neurorx";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const adminToken =
      req.headers.get("x-admin-token") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    if (!verifyAdminToken(adminToken)) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized. Administrator credentials required." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ ok: false, error: "Missing required 'action'." }, { status: 400 });
    }

    switch (action) {
      case "verify": {
        const { drug_id, verified_by = "Admin" } = body;
        if (!drug_id) {
          return NextResponse.json({ ok: false, error: "Missing drug_id." }, { status: 400 });
        }
        const result = await verifyDrugInStorage(drug_id, verified_by);
        return NextResponse.json({
          ok: true,
          message: `Drug '${result.drug.generic_name}' has been verified and sealed cryptographically!`,
          drug: result.drug,
          content_hash: result.hash,
          version_hash: getDataVersionHash(),
        });
      }

      case "verify_all": {
        const { verified_by = "Admin" } = body;
        const result = await verifyAllDraftsInStorage(verified_by);
        return NextResponse.json({
          ok: true,
          message: `Successfully verified and unlocked ${result.verifiedCount} draft drugs!`,
          verified_count: result.verifiedCount,
          version_hash: getDataVersionHash(),
        });
      }

      case "save": {
        const { drug, old_id } = body;
        if (!drug || !drug.id || !drug.generic_name) {
          return NextResponse.json({ ok: false, error: "Invalid drug record payload." }, { status: 400 });
        }

        // If ID changed, safely delete the old file & tombstone old ID
        if (old_id && old_id.toLowerCase().trim() !== drug.id.toLowerCase().trim()) {
          await deleteDrugFromStorage(old_id);
        }

        const result = await saveDrugToStorage(drug as DrugRecord);
        return NextResponse.json({
          ok: true,
          message: `Saved and updated drug '${drug.generic_name}' successfully!`,
          drug,
          content_hash: result.hash,
          version_hash: getDataVersionHash(),
        });
      }

      case "delete": {
        const { drug_id } = body;
        if (!drug_id) {
          return NextResponse.json({ ok: false, error: "Missing drug_id." }, { status: 400 });
        }
        await deleteDrugFromStorage(drug_id);
        return NextResponse.json({
          ok: true,
          message: `Permanently deleted drug '${drug_id}' from storage.`,
          deleted_id: drug_id,
          version_hash: getDataVersionHash(),
        });
      }

      case "get": {
        const { drug_id } = body;
        if (!drug_id) {
          return NextResponse.json({ ok: false, error: "Missing drug_id." }, { status: 400 });
        }
        const item = getDrugById(drug_id);
        if (!item) {
          return NextResponse.json({ ok: false, error: `Drug not found: ${drug_id}` }, { status: 404 });
        }
        return NextResponse.json({ ok: true, drug: item.drug });
      }

      case "get_all": {
        const drugs = getAllDrugs();
        return NextResponse.json({
          ok: true,
          drugs: drugs.map((d) => d.drug),
          version_hash: getDataVersionHash(),
        });
      }

      default:
        return NextResponse.json({ ok: false, error: `Unknown action '${action}'.` }, { status: 400 });
    }
  } catch (err: any) {
    console.error("Error in /api/neurorx/manage-drug:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
