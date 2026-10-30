import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const STORE_DIR = path.join(process.cwd(), "data", "guidelines_store");
    const TMP_DIR = path.join("/tmp", "guidelines_store");

    let catalog: Record<string, any> = {};

    const storeCatalogPath = path.join(STORE_DIR, "catalog.json");
    if (fs.existsSync(storeCatalogPath)) {
      try {
        catalog = JSON.parse(fs.readFileSync(storeCatalogPath, "utf-8"));
      } catch {}
    }

    const tmpCatalogPath = path.join(TMP_DIR, "catalog.json");
    if (fs.existsSync(tmpCatalogPath)) {
      try {
        const tmpCatalog = JSON.parse(fs.readFileSync(tmpCatalogPath, "utf-8"));
        catalog = { ...catalog, ...tmpCatalog };
      } catch {}
    }

    if (Object.keys(catalog).length === 0) {
      return NextResponse.json({ ok: true, catalog: {}, total: 0 });
    }

    const { searchParams } = new URL(request.url);
    const society = searchParams.get("society")?.toUpperCase();

    let items = Object.values(catalog) as Array<Record<string, any>>;
    if (society) {
      items = items.filter((item) => String(item.society).toUpperCase() === society);
    }

    // Sắp xếp giảm dần theo thời gian công bố / cập nhật mới nhất
    items.sort((a, b) => {
      const yearDiff = (b.year || 0) - (a.year || 0);
      if (yearDiff !== 0) return yearDiff;
      return (b.updated_at || "").localeCompare(a.updated_at || "");
    });

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
