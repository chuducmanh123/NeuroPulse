import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { verifyAdminToken } from "@/utils/security";

export function isAdminRequest(req: NextRequest): boolean {
  const adminToken =
    req.headers.get("x-admin-token") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    null;
  return verifyAdminToken(adminToken);
}

export function invalidateSyncTag(tag: string): void {
  try {
    revalidateTag(tag, { expire: 0 });
  } catch {
    // No-op if called outside Next request store
  }
}

export async function parseJsonObjectBody(
  req: NextRequest
): Promise<Record<string, unknown> | null> {
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}
