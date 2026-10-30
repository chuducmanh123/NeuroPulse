import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/utils/security";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

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
  const chunkIndex = parseInt(request.headers.get("x-chunk-index") || "0", 10);
  const totalChunks = parseInt(request.headers.get("x-total-chunks") || "1", 10);

  if (!uploadId || !/^[a-zA-Z0-9_\-]+$/.test(uploadId)) {
    return NextResponse.json({ ok: false, error: "Invalid upload ID." }, { status: 400 });
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

  const chunkPath = path.join(targetDir, `${uploadId}_chunk_${chunkIndex}`);
  const finalPath = path.join(targetDir, `${uploadId}.bin`);

  try {
    const arrayBuffer = await request.arrayBuffer();
    fs.writeFileSync(chunkPath, Buffer.from(arrayBuffer));

    // Kiểm tra xem tất cả các chunk đã được tải lên chưa
    let allDone = true;
    for (let i = 0; i < totalChunks; i++) {
      if (!fs.existsSync(path.join(targetDir, `${uploadId}_chunk_${i}`))) {
        allDone = false;
        break;
      }
    }

    if (allDone) {
      // Ghép toàn bộ các chunk lại thành một file hoàn chỉnh
      const chunkBuffers: Buffer[] = [];
      for (let i = 0; i < totalChunks; i++) {
        const partPath = path.join(targetDir, `${uploadId}_chunk_${i}`);
        chunkBuffers.push(fs.readFileSync(partPath));
        try {
          fs.unlinkSync(partPath);
        } catch {}
      }
      fs.writeFileSync(finalPath, Buffer.concat(chunkBuffers));

      return NextResponse.json({ ok: true, complete: true, uploadId });
    }

    return NextResponse.json({ ok: true, complete: false, chunkIndex });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error handling chunk upload";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
