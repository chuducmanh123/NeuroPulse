import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { registerCandidateGuideline } from "@/lib/neuroguide/storeAdapter";
import { searchPubMedGuidelines } from "@/lib/neuroguide/pubmedDiscovery";
import {
  extractGuidelineFromPdfBuffer,
  extractGuidelineFromUrlOrDoi,
} from "@/lib/neuroguide/geminiGuidelineExtractor";
import { verifyAdminToken } from "@/utils/security";
import { parseSafeYear, resolveSafeChildPath, validateSafeExternalUrl } from "@/lib/neuroguide/safePath";

const execFileAsync = promisify(execFile);
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_PIPELINE_UPLOAD_BYTES = 50 * 1024 * 1024;
const RAW_UPLOAD_DIR = path.join(process.cwd(), "data", "guidelines_raw");
const STORE_DIR = path.join(process.cwd(), "data", "guidelines_store");
const PYTHON_PATH =
  process.env.PYTHON_PATH ||
  "C:\\Users\\Manh\\AppData\\Local\\Programs\\Python\\Python315\\python.exe";

function extractAdminToken(request: NextRequest): string | undefined {
  return (
    request.headers.get("x-admin-token") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    undefined
  );
}

export async function GET(request: NextRequest) {
  if (!verifyAdminToken(extractAdminToken(request))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const jobsFile = path.join(STORE_DIR, "jobs.json");
    if (!fs.existsSync(jobsFile)) {
      return NextResponse.json({ ok: true, jobs: [] });
    }
    const jobs = JSON.parse(fs.readFileSync(jobsFile, "utf-8"));
    return NextResponse.json(
      { ok: true, jobs: Object.values(jobs) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error reading jobs list";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!verifyAdminToken(extractAdminToken(request))) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized. Administrator credentials required." },
      { status: 401 }
    );
  }

  let createdTempUploadPath: string | null = null;
  try {
    let url: string | undefined;
    let local_path: string | undefined;
    let society: string = "AHA";
    let title: string | undefined;
    let year: number | undefined;
    let discover: boolean = false;
    let uploadedBuffer: Buffer | null = null;
    let uploadedFileName: string = "guideline.pdf";

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      society = (formData.get("society") as string) || "AHA";
      discover = formData.get("discover") === "true";
      url = (formData.get("url") as string) || undefined;
      title = (formData.get("title") as string) || undefined;
      year = parseSafeYear(formData.get("year"));

      const file = formData.get("file") as File | null;
      if (file && file.size > 0) {
        if (file.size > MAX_PIPELINE_UPLOAD_BYTES) {
          return NextResponse.json(
            { ok: false, error: { code: "FILE_TOO_LARGE", message: "Uploaded PDF exceeds 50MB limit." } },
            { status: 413 }
          );
        }
        uploadedFileName = file.name;
        uploadedBuffer = Buffer.from(await file.arrayBuffer());

        // Save locally if filesystem writable (cleaned up in finally)
        try {
          if (!fs.existsSync(RAW_UPLOAD_DIR)) {
            fs.mkdirSync(RAW_UPLOAD_DIR, { recursive: true });
          }
          const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
          const targetPath = resolveSafeChildPath(RAW_UPLOAD_DIR, safeName);
          fs.writeFileSync(targetPath, uploadedBuffer);
          createdTempUploadPath = targetPath;
          local_path = targetPath;
        } catch {
          // Read-only filesystem in serverless environments
        }
      } else {
        const localPathField = formData.get("local_path") as string;
        if (localPathField) local_path = localPathField;
      }
    } else {
      const body = await request.json();
      url = body.url;
      local_path = body.local_path;
      society = body.society || "AHA";
      title = body.title;
      year = parseSafeYear(body.year);
      discover = Boolean(body.discover);
    }

    if (url) {
      try {
        url = validateSafeExternalUrl(url, { httpsOnly: false }).toString();
      } catch (urlErr: unknown) {
        const msg = urlErr instanceof Error ? urlErr.message : "Invalid external URL";
        return NextResponse.json({ ok: false, error: { code: "INVALID_URL", message: msg } }, { status: 400 });
      }
    }

    if (local_path && !createdTempUploadPath) {
      try {
        const baseName = path.basename(local_path);
        const resolved = resolveSafeChildPath(RAW_UPLOAD_DIR, baseName);
        if (path.resolve(local_path) !== resolved) {
          throw new Error("local_path must reside inside data/guidelines_raw");
        }
        local_path = resolved;
      } catch (pathErr: unknown) {
        const msg = pathErr instanceof Error ? pathErr.message : "Invalid local_path";
        return NextResponse.json({ ok: false, error: { code: "INVALID_LOCAL_PATH", message: msg } }, { status: 400 });
      }
    }

    const isVercelServerless = Boolean(
      process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || !fs.existsSync(/* turbopackIgnore: true */ PYTHON_PATH)
    );

    // =========================================================================
    // BRANCH A: VERCEL SERVERLESS & CLOUD RUNTIME (NATIVE TS PIPELINE)
    // =========================================================================
    if (isVercelServerless) {
      if (discover) {
        const syncResult = await searchPubMedGuidelines({
          society: society && society !== "ALL" ? society : undefined,
          retmax: 15,
        });

        for (const doc of syncResult.guidelines) {
          await registerCandidateGuideline(doc);
        }

        return NextResponse.json({
          ok: true,
          data: {
            total_discovered: syncResult.totalFound,
            new_discovered_count: syncResult.guidelines.length,
            societies: [society],
          },
        });
      }

      // Manual extraction (PDF buffer or URL/DOI)
      if (uploadedBuffer) {
        const doc = await extractGuidelineFromPdfBuffer({
          buffer: uploadedBuffer,
          fileName: uploadedFileName,
          society,
          title,
          year,
        });
        await registerCandidateGuideline(doc);
        return NextResponse.json({
          ok: true,
          data: {
            file_id: doc.id,
            total_recommendations: doc.allPracticeChanges?.length || 0,
            pending_review_count: doc.allPracticeChanges?.length || 0,
            title: doc.title,
            state: "PENDING_REVIEW",
          },
        });
      }

      if (url) {
        const doc = await extractGuidelineFromUrlOrDoi({
          url,
          society,
          title,
          year,
        });
        await registerCandidateGuideline(doc);
        return NextResponse.json({
          ok: true,
          data: {
            file_id: doc.id,
            total_recommendations: doc.allPracticeChanges?.length || 0,
            pending_review_count: doc.allPracticeChanges?.length || 0,
            title: doc.title,
            state: "PENDING_REVIEW",
          },
        });
      }

      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "MISSING_INPUT",
            message: "Please provide either a PDF document or a direct URL.",
          },
        },
        { status: 400 }
      );
    }

    // =========================================================================
    // BRANCH B: LOCAL ENVIRONMENT (PYTHON 5-CORE ORCHESTRATOR)
    // =========================================================================
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

    try {
      const { stdout, stderr } = await execFileAsync(PYTHON_PATH, args, {
        cwd: process.cwd(),
        timeout: 180000,
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
      const errorObj = execError as { stdout?: string; stderr?: string; message?: string };
      if (errorObj?.stdout && typeof errorObj.stdout === "string" && errorObj.stdout.trim().length > 0) {
        try {
          const parsed = JSON.parse(errorObj.stdout.trim());
          return NextResponse.json(parsed, { status: 200 });
        } catch {
          // not json
        }
      }

      // If local Python run failed and we have URL or buffer, seamlessly fallback to TS pipeline
      if (uploadedBuffer) {
        const doc = await extractGuidelineFromPdfBuffer({
          buffer: uploadedBuffer,
          fileName: uploadedFileName,
          society,
          title,
          year,
        });
        await registerCandidateGuideline(doc);
        return NextResponse.json({
          ok: true,
          data: {
            file_id: doc.id,
            total_recommendations: doc.allPracticeChanges?.length || 0,
            pending_review_count: doc.allPracticeChanges?.length || 0,
            title: doc.title,
            state: "PENDING_REVIEW",
          },
        });
      }

      if (url) {
        const doc = await extractGuidelineFromUrlOrDoi({
          url,
          society,
          title,
          year,
        });
        await registerCandidateGuideline(doc);
        return NextResponse.json({
          ok: true,
          data: {
            file_id: doc.id,
            total_recommendations: doc.allPracticeChanges?.length || 0,
            pending_review_count: doc.allPracticeChanges?.length || 0,
            title: doc.title,
            state: "PENDING_REVIEW",
          },
        });
      }

      const message = execError instanceof Error ? execError.message : "Error executing Orchestrator";
      return NextResponse.json({ ok: false, error: { message } }, { status: 500 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error processing pipeline request";
    return NextResponse.json({ ok: false, error: { message } }, { status: 500 });
  } finally {
    if (createdTempUploadPath && fs.existsSync(/* turbopackIgnore: true */ createdTempUploadPath)) {
      try {
        fs.unlinkSync(/* turbopackIgnore: true */ createdTempUploadPath);
      } catch {}
    }
  }
}
