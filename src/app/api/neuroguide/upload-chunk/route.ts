import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/utils/security";
import { isValidUploadId, resolveSafeChildPath } from "@/lib/neuroguide/safePath";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const MAX_CHUNKS = 30;
const MAX_SINGLE_CHUNK_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_ASSEMBLED_BYTES = 55 * 1024 * 1024; // 55 MB
const CHUNK_TTL_MS = 60 * 60 * 1000; // 60 minutes

export async function POST(request: NextRequest): Promise<NextResponse> {
  const adminToken =
    request.headers.get("x-admin-token") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!verifyAdminToken(adminToken)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized: Quyền tải tệp chỉ dành riêng cho Quản trị viên (Admin)." },
      { status: 401 }
    );
  }

  const uploadId = request.headers.get("x-upload-id");
  const chunkIndexRaw = request.headers.get("x-chunk-index") || "0";
  const totalChunksRaw = request.headers.get("x-total-chunks") || "1";
  const chunkIndex = Number.parseInt(chunkIndexRaw, 10);
  const totalChunks = Number.parseInt(totalChunksRaw, 10);

  if (!isValidUploadId(uploadId)) {
    return NextResponse.json({ ok: false, error: "Invalid upload ID." }, { status: 400 });
  }

  if (
    !Number.isInteger(totalChunks) ||
    totalChunks < 1 ||
    totalChunks > MAX_CHUNKS ||
    !Number.isInteger(chunkIndex) ||
    chunkIndex < 0 ||
    chunkIndex >= totalChunks
  ) {
    return NextResponse.json({ ok: false, error: "Invalid chunk index or total chunks." }, { status: 400 });
  }

  const tmpDir = path.join("/tmp", "neuroguide_uploads");
  const localDir = path.join(process.cwd(), "data", "temp_uploads");

  let targetDir = tmpDir;
  try {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
  } catch {
    targetDir = localDir;
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
  }

  // Opportunistic cleanup of stale orphan chunks (> 60 minutes old)
  try {
    const now = Date.now();
    for (const entry of fs.readdirSync(targetDir)) {
      if (entry.includes("_chunk_") || entry.endsWith(".bin.tmp")) {
        const fp = resolveSafeChildPath(targetDir, entry);
        const st = fs.statSync(fp);
        if (now - st.mtimeMs > CHUNK_TTL_MS) {
          fs.unlinkSync(fp);
        }
      }
    }
  } catch {}

  const chunkPath = resolveSafeChildPath(targetDir, `${uploadId}_chunk_${chunkIndex}`);
  const finalPath = resolveSafeChildPath(targetDir, `${uploadId}.bin`);
  const atomicTmpPath = resolveSafeChildPath(targetDir, `${uploadId}.${process.pid}.${Date.now()}.bin.tmp`);

  try {
    const arrayBuffer = await request.arrayBuffer();
    if (arrayBuffer.byteLength === 0 || arrayBuffer.byteLength > MAX_SINGLE_CHUNK_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Chunk size is empty or exceeds 5MB limit." },
        { status: 413 }
      );
    }

    fs.writeFileSync(chunkPath, Buffer.from(arrayBuffer));

    // Kiểm tra xem tất cả các chunk đã được tải lên chưa
    let allDone = true;
    let totalSize = 0;
    for (let i = 0; i < totalChunks; i++) {
      const partPath = resolveSafeChildPath(targetDir, `${uploadId}_chunk_${i}`);
      if (!fs.existsSync(partPath)) {
        allDone = false;
        break;
      }
      totalSize += fs.statSync(partPath).size;
    }

    if (allDone) {
      if (totalSize > MAX_ASSEMBLED_BYTES) {
        return NextResponse.json(
          { ok: false, error: "Assembled upload exceeds 55MB limit." },
          { status: 413 }
        );
      }
      // Stream-append chunks into a temp file then rename atomically
      const fd = fs.openSync(atomicTmpPath, "w");
      try {
        for (let i = 0; i < totalChunks; i++) {
          const partPath = resolveSafeChildPath(targetDir, `${uploadId}_chunk_${i}`);
          const buf = fs.readFileSync(partPath);
          fs.writeSync(fd, buf);
          try {
            fs.unlinkSync(partPath);
          } catch {}
        }
      } finally {
        fs.closeSync(fd);
      }
      fs.renameSync(atomicTmpPath, finalPath);

      return NextResponse.json({ ok: true, complete: true, uploadId });
    }

    return NextResponse.json({ ok: true, complete: false, chunkIndex });
  } catch (err) {
    try {
      if (fs.existsSync(atomicTmpPath)) fs.unlinkSync(atomicTmpPath);
    } catch {}
    const message = err instanceof Error ? err.message : "Error handling chunk upload";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
