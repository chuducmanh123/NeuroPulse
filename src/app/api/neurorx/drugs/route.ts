import { NextResponse } from "next/server";
import { getAllDrugs, getDataVersionHash } from "@/lib/neurorx/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const drugs = getAllDrugs();
    return NextResponse.json({
      ok: true,
      drugs,
      version_hash: getDataVersionHash(),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to load drugs" },
      { status: 500 }
    );
  }
}
