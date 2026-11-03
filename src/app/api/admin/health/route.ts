import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { verifyAdminToken } from "@/utils/security";
import { supabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";
import { loadMergedNeuroGuideData } from "@/lib/neuroguide/guidelineStorage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ArticleItem {
  id?: string;
  title?: string;
  journal?: any;
  date?: string;
  pub_date?: string;
  study_type?: string;
  studyType?: string;
  article_type?: string;
  article_types?: string[];
  subspecialty?: string;
  subspecialties?: string[];
  neurology_classification?: {
    subspecialty?: string;
    subspecialties?: string[];
    topics?: string[];
  };
  is_rct?: boolean;
}

export async function GET(req: NextRequest) {
  try {
    const adminToken = req.headers.get("x-admin-token") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const isAuthenticated = verifyAdminToken(adminToken);

    if (!isAuthenticated) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized. Valid administrator session required." },
        { status: 401 }
      );
    }

    // 1. Analyze Articles in public/data/articles.json
    const articlesPath = path.join(process.cwd(), "public", "data", "articles.json");
    let articles: ArticleItem[] = [];
    try {
      const raw = await fs.readFile(articlesPath, "utf-8");
      articles = JSON.parse(raw);
    } catch (e) {
      console.warn("Could not read articles.json:", e);
    }

    const studyTypeCounts: Record<string, number> = {
      rct: 0,
      meta_analysis: 0,
      guideline: 0,
      observational: 0,
      review: 0,
      other: 0,
    };

    const subspecialtyCounts: Record<string, number> = {};
    const journalCounts: Record<string, number> = {};

    articles.forEach((a) => {
      // Study type detection
      const typeStr = (
        a.article_type ||
        a.study_type ||
        a.studyType ||
        (Array.isArray(a.article_types) ? a.article_types.join(" ") : "") ||
        ""
      ).toLowerCase();
      const titleLower = (a.title || "").toLowerCase();

      if (
        a.is_rct ||
        typeStr.includes("rct") ||
        typeStr.includes("trial") ||
        typeStr.includes("randomized") ||
        titleLower.includes("randomized controlled trial")
      ) {
        studyTypeCounts.rct++;
      } else if (
        typeStr.includes("meta") ||
        typeStr.includes("systematic") ||
        titleLower.includes("meta-analysis")
      ) {
        studyTypeCounts.meta_analysis++;
      } else if (
        typeStr.includes("guideline") ||
        typeStr.includes("consensus") ||
        typeStr.includes("recommendation") ||
        titleLower.includes("guideline")
      ) {
        studyTypeCounts.guideline++;
      } else if (
        typeStr.includes("cohort") ||
        typeStr.includes("observational") ||
        typeStr.includes("case-control") ||
        typeStr.includes("original")
      ) {
        studyTypeCounts.observational++;
      } else if (typeStr.includes("review")) {
        studyTypeCounts.review++;
      } else {
        studyTypeCounts.other++;
      }

      // Subspecialties
      const sub =
        a.neurology_classification?.subspecialty ||
        a.subspecialty ||
        (Array.isArray(a.neurology_classification?.subspecialties) && a.neurology_classification.subspecialties[0]) ||
        (Array.isArray(a.subspecialties) && a.subspecialties[0]) ||
        "General Neurology";
      subspecialtyCounts[sub] = (subspecialtyCounts[sub] || 0) + 1;

      // Journals
      const j =
        (typeof a.journal === "string"
          ? a.journal
          : a.journal?.short_name || a.journal?.name) || "Other";
      journalCounts[j] = (journalCounts[j] || 0) + 1;
    });

    // 2. Storage Diagnostics (Supabase & Vercel Blob)
    const hasSupabase = hasSupabaseConfig();
    let supabaseConnected = false;
    let supabaseCasesCount = 0;
    let supabaseDocsCount = 0;
    let supabaseError: string | null = null;

    if (hasSupabase) {
      try {
        const [cRes, dRes] = await Promise.all([
          supabaseAdmin.from("clinical_cases").select("id", { count: "exact", head: true }),
          supabaseAdmin.from("neuroguide_docs").select("id", { count: "exact", head: true }),
        ]);
        supabaseConnected = !cRes.error && !dRes.error;
        supabaseCasesCount = cRes.count || 0;
        supabaseDocsCount = dRes.count || 0;
        if (cRes.error) supabaseError = cRes.error.message;
      } catch (err: any) {
        supabaseError = err?.message || String(err);
      }
    }

    let supabaseStorageConfigured = false;
    let supabaseStorageFilesCount = 0;
    if (hasSupabase) {
      try {
        const { data: storageFiles, error: storageErr } = await supabaseAdmin.storage
          .from("guidelines-pdf")
          .list();
        if (!storageErr) {
          supabaseStorageConfigured = true;
          supabaseStorageFilesCount = storageFiles?.length || 0;
        }
      } catch {}
    }

    // 3. Gemini API Key check
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
    const isGeminiConfigured = Boolean(geminiKey && geminiKey.trim().length > 10);
    const maskedGeminiKey = isGeminiConfigured
      ? `${geminiKey.slice(0, 7)}...${geminiKey.slice(-4)}`
      : "Not configured";

    // 4. Clinical Cases Stats from /api/neurocase or local cases.json
    const casesPath = path.join(process.cwd(), "public", "data", "cases.json");
    let totalCases = 0;
    let pendingCasesCount = 0;
    let approvedCasesCount = 0;
    let dailyChallengeCasesCount = 0;
    try {
      const casesRaw = await fs.readFile(casesPath, "utf-8");
      const casesList = JSON.parse(casesRaw);
      if (Array.isArray(casesList)) {
        totalCases = casesList.length;
        pendingCasesCount = casesList.filter((c: any) => c.status === "pending" || c.status === "needs_revision").length;
        approvedCasesCount = casesList.filter((c: any) => !c.status || c.status === "approved").length;
        dailyChallengeCasesCount = casesList.filter((c: any) => c.is_daily_challenge).length;
      }
    } catch {}

    // 5. Active Guidelines Stats
    let guidelinesTotal = 0;
    let guidelinesStorageSource = "Local Cache";
    try {
      const guideData = await loadMergedNeuroGuideData();
      guidelinesTotal = guideData.guidelines.length;
      guidelinesStorageSource = guideData.storageSource;
    } catch {}

    // 6. Security & Session Check
    const isVercelEnv = Boolean(process.env.VERCEL);
    const nodeEnv = process.env.NODE_ENV || "development";

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      environment: {
        isVercel: isVercelEnv,
        nodeEnv,
        readOnlyFilesystem: isVercelEnv,
      },
      diagnostics: {
        storage: {
          primaryBackend: supabaseConnected ? "supabase" : "local-disk",
          supabase: {
            configured: hasSupabase,
            connected: supabaseConnected,
            casesCount: supabaseCasesCount,
            guidelinesCount: supabaseDocsCount,
            storageBucket: "guidelines-pdf",
            storageConfigured: supabaseStorageConfigured,
            storageFilesCount: supabaseStorageFilesCount,
            error: supabaseError,
          },
          storageFallback: "Supabase (Single Source of Truth) -> Local Cache",
        },
        ai: {
          isGeminiConfigured,
          maskedKey: maskedGeminiKey,
          model: "gemini-2.5-flash & gemini-2.5-pro",
          streamingSSE: "Active",
        },
        security: {
          adminAuthMode: "HMAC-SHA256 Token (24h TTL Session)",
          urlSanitizer: "Active (Blocks javascript: and data: URIs)",
          timingSafeVerification: "Active",
        },
      },
      metrics: {
        articles: {
          total: articles.length,
          studyTypes: studyTypeCounts,
          subspecialties: subspecialtyCounts,
          journalsCount: Object.keys(journalCounts).length,
          journals: journalCounts,
        },
        cases: {
          total: totalCases,
          approved: approvedCasesCount,
          pending: pendingCasesCount,
          dailyChallenge: dailyChallengeCasesCount,
        },
        guidelines: {
          published: guidelinesTotal,
          storageBackend: guidelinesStorageSource,
        },
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/admin/health:", error);
    return NextResponse.json(
      { ok: false, error: "Health check error: " + (error?.message || String(error)) },
      { status: 500 }
    );
  }
}
