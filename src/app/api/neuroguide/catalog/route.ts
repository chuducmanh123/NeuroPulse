import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const catalogPath = path.join(process.cwd(), "data", "guidelines_store", "catalog.json");
    if (!fs.existsSync(catalogPath)) {
      return NextResponse.json({ ok: true, catalog: {}, total: 0 });
    }

    const catalogRaw = fs.readFileSync(catalogPath, "utf-8");
    const catalog = JSON.parse(catalogRaw);

    const { searchParams } = new URL(request.url);
    const society = searchParams.get("society")?.toUpperCase();

    let items = Object.values(catalog) as Array<Record<string, unknown>>;
    if (society) {
      items = items.filter((item) => String(item.society).toUpperCase() === society);
    }

    return NextResponse.json({
      ok: true,
      total: items.length,
      items,
      catalog,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi khi đọc danh mục catalog";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
