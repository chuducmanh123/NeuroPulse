import type { DrugRecord } from "../../types/neurorx.ts";

export interface NeuroRxSearchIndexItem {
  id: string;
  genericName: string;
  classes: string[];
  brandNames: string[];
}

export function projectDrugToSearchIndexItem(drug: DrugRecord): NeuroRxSearchIndexItem | null {
  if (!drug || typeof drug.id !== "string" || typeof drug.generic_name !== "string") {
    return null;
  }
  const vnList = Array.isArray(drug.vn_products?.value)
    ? drug.vn_products.value
        .map((p) => p?.brand || (p as { brand_name?: string })?.brand_name)
        .filter((b): b is string => typeof b === "string" && b.length > 0)
    : [];
  return {
    id: drug.id,
    genericName: drug.generic_name,
    classes: Array.isArray(drug.classes) ? drug.classes : [],
    brandNames: vnList,
  };
}
