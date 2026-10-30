import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execFileAsync = promisify(execFile);
export const dynamic = "force-dynamic";

const STORE_DIR = path.join(process.cwd(), "data", "guidelines_store");
const PYTHON_PATH =
  process.env.PYTHON_PATH ||
  "C:\\Users\\Manh\\AppData\\Local\\Programs\\Python\\Python315\\python.exe";

export async function GET() {
  try {
    const jobsFile = path.join(STORE_DIR, "jobs.json");
    if (!fs.existsSync(jobsFile)) {
      return NextResponse.json({ ok: true, jobs: [] });
    }
    const jobs = JSON.parse(fs.readFileSync(jobsFile, "utf-8"));
    return NextResponse.json({ ok: true, jobs: Object.values(jobs) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi đọc danh sách jobs";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (process.env.VERCEL) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bộ điều phối AI Pipeline Runner yêu cầu môi trường Python và PyMuPDF cục bộ hoặc backend chuyên dụng, hiện không chạy trên Vercel Serverless.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { url, local_path, society = "AHA", title, year, discover } = body;

    const args = ["-m", "core.orchestrator.runner"];

    if (discover) {
      args.push("--discover");
      if (society && society !== "ALL") {
        args.push("--societies-filter", society);
      }
    } else {
      if (url) args.push("--url", url);
      if (local_path) args.push("--file", local_path);
      if (society) args.push("--society", society);
      if (title) args.push("--title", title);
      if (year) args.push("--year", String(year));
    }

    // Chạy CLI runner của Orchestrator
    try {
      const { stdout, stderr } = await execFileAsync(PYTHON_PATH, args, {
        cwd: process.cwd(),
        timeout: 180000, // 3 phút tối đa
        env: {
          ...process.env,
          PYTHONIOENCODING: "utf-8",
        },
      });

      try {
        const parsed = JSON.parse(stdout.trim());
        return NextResponse.json(parsed);
      } catch {
        return NextResponse.json({
          ok: true,
          raw_output: stdout,
          stderr: stderr || null,
        });
      }
    } catch (execError: unknown) {
      // Khi runner.py gặp lỗi và thoát với exit code > 0, stdout vẫn chứa JSON CoreResult
      const errorObj = execError as { stdout?: string; stderr?: string; message?: string };
      if (errorObj?.stdout && typeof errorObj.stdout === "string" && errorObj.stdout.trim().length > 0) {
        try {
          const parsed = JSON.parse(errorObj.stdout.trim());
          return NextResponse.json(parsed, { status: 200 });
        } catch {
          // Không phải JSON, xử lý fallback tiếp theo
        }
      }
      const message = execError instanceof Error ? execError.message : "Lỗi khi kích hoạt Orchestrator";
      return NextResponse.json({ ok: false, error: { message } }, { status: 500 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi khi xử lý yêu cầu Pipeline";
    return NextResponse.json({ ok: false, error: { message } }, { status: 500 });
  }
}
