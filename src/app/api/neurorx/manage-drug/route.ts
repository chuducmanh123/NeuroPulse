import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/utils/security";
import {
  handleVerifyAllDrugsV2,
  handleVerifyDrugV2,
} from "@/lib/neurorx/sync/handlers";
import { SupabaseDrugRepo } from "@/lib/neurorx/sync/repoSupabase";
import { invalidateSyncTag } from "@/lib/neurorx/sync/routeHelpers";
import type { SyncRow } from "@/lib/neurorx/sync/types";

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
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const body = await req.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json(
        { ok: false, error: "Missing required 'action'." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const actor =
      typeof body?.verified_by === "string" && body.verified_by.trim()
        ? body.verified_by.trim()
        : "Admin";

    switch (action) {
      case "verify": {
        const result = await handleVerifyDrugV2(
          {
            repo: new SupabaseDrugRepo(),
            isAdmin: true,
            actor,
            onInvalidateTag: invalidateSyncTag,
          },
          body
        );
        if (result.status !== 200) {
          return NextResponse.json(
            { ok: false, ...(result.body as Record<string, unknown>) },
            {
              status: result.status,
              headers: { ...result.headers, "Cache-Control": "no-store" },
            }
          );
        }
        const payload = result.body as { row: SyncRow; unchanged: boolean };
        return NextResponse.json(
          {
            ok: true,
            message: `Drug '${payload.row.data.generic_name}' has been verified and sealed cryptographically!`,
            drug: payload.row.data,
            row: payload.row,
            unchanged: payload.unchanged,
            content_hash: payload.row.contentHash,
            version_hash: payload.row.contentHash,
          },
          {
            status: 200,
            headers: { ...result.headers, "Cache-Control": "no-store" },
          }
        );
      }

      case "verify_all": {
        const result = await handleVerifyAllDrugsV2(
          {
            repo: new SupabaseDrugRepo(),
            isAdmin: true,
            actor,
            onInvalidateTag: invalidateSyncTag,
          },
          body
        );
        if (result.status !== 200) {
          return NextResponse.json(
            { ok: false, ...(result.body as Record<string, unknown>) },
            {
              status: result.status,
              headers: { ...result.headers, "Cache-Control": "no-store" },
            }
          );
        }
        const payload = result.body as {
          verified_count: number;
          rows: SyncRow[];
          conflicts: Array<{ uid: string; slug: string; currentRev: number }>;
          max_seq: number;
          root_hash: string;
        };
        return NextResponse.json(
          {
            ok: true,
            message: `Successfully verified and unlocked ${payload.verified_count} draft drugs!`,
            verified_count: payload.verified_count,
            rows: payload.rows,
            conflicts: payload.conflicts,
            max_seq: payload.max_seq,
            version_hash: payload.root_hash || "sync-v2",
          },
          {
            status: 200,
            headers: { ...result.headers, "Cache-Control": "no-store" },
          }
        );
      }

      default:
        return NextResponse.json(
          {
            ok: false,
            error: `Unsupported legacy action '${action}'. Use /api/neurorx/sync/drugs* endpoints.`,
          },
          { status: 400, headers: { "Cache-Control": "no-store" } }
        );
    }
  } catch (err: any) {
    console.error("Error in /api/neurorx/manage-drug:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal server error." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
