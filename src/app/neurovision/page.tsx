"use client";

import React, { useEffect, useState } from "react";
import { AppSwitcher } from "../../components/ecosystem/AppSwitcher";

interface ProvenanceFile {
  file: string;
  shape: number[];
  dtype: string;
  size_bytes: number;
  review_status: string;
  source: string;
  original_space: string;
  method: string;
  interpolation: string;
  license: string;
}

interface Provenance {
  target_space: string;
  files: ProvenanceFile[];
  skipped: { item: string; reason: string }[];
}

interface MeshEntry {
  file: string;
  group: string;
  side: string | null;
  faces_after: number;
  size_bytes: number;
  review_status: string;
  source: string;
}

interface MeshManifest {
  coordinate_system: string;
  format: string;
  not_generated: string[];
  meshes: MeshEntry[];
}

const BASE = "/neurovision";
const VALIDATION_IMAGES = [
  { file: "crosshair_ac.png", title: "T1 at MNI (0,0,0): anterior commissure check" },
  { file: "overlay_anatomy.png", title: "Anatomy (Harvard-Oxford) over T1" },
  { file: "overlay_hemispheres.png", title: "Hemispheres over T1" },
  { file: "overlay_whitematter.png", title: "White matter (JHU ICBM-DTI-81) over T1" },
  { file: "overlay_arterial.png", title: "Arterial territories, level 1 (JHU) over T1" },
  { file: "overlay_arterial_level2.png", title: "Arterial territories, level 2 (JHU) over T1" },
  { file: "overlay_CT.png", title: "CT template with T1 brain-mask outline" },
  { file: "overlay_T2.png", title: "T2 with T1 brain-mask outline" },
];

function kb(bytes: number) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function NeuroVisionPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [prov, setProv] = useState<Provenance | null>(null);
  const [manifest, setManifest] = useState<MeshManifest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedDark = localStorage.getItem("neuro_dark_mode");
    if (savedDark === "true") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [p, m] = await Promise.all([
          fetch(`${BASE}/provenance.json`).then((r) => {
            if (!r.ok) throw new Error(`provenance.json: HTTP ${r.status}`);
            return r.json() as Promise<Provenance>;
          }),
          fetch(`${BASE}/meshes/manifest.json`).then((r) => {
            if (!r.ok) throw new Error(`meshes/manifest.json: HTTP ${r.status}`);
            return r.json() as Promise<MeshManifest>;
          }),
        ]);
        if (!cancelled) {
          setProv(p);
          setManifest(m);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load data");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("neuro_dark_mode", String(next));
      if (next) document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
      return next;
    });
  };

  const card = darkMode ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200 shadow-xs";
  const muted = darkMode ? "text-slate-400" : "text-slate-500";
  const th = darkMode ? "text-slate-300 border-slate-700" : "text-slate-600 border-slate-200";
  const td = darkMode ? "border-slate-800" : "border-slate-100";

  return (
    <main
      className={`min-h-screen py-8 px-4 sm:px-8 transition-colors duration-200 ${
        darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-900"
      }`}
    >
      <div className="max-w-6xl mx-auto">
        <header className="mb-4 pt-1 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span
              className={`text-xs font-bold uppercase tracking-widest ${
                darkMode ? "text-indigo-400" : "text-indigo-600"
              }`}
            >
              Neuroanatomy &amp; imaging reference
            </span>
            <h1
              className={`text-2xl sm:text-3xl font-black uppercase tracking-tight ${
                darkMode ? "text-white" : "text-slate-900"
              }`}
            >
              NeuroVision
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={toggleDarkMode}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                darkMode
                  ? "bg-indigo-950 text-amber-300 border-indigo-800 hover:bg-indigo-900"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>{darkMode ? "☀️ Light" : "🌙 Night Shift"}</span>
            </button>
            <AppSwitcher currentApp="neurovision" darkMode={darkMode} />
          </div>
        </header>

        {/* Permanent educational-use notice (required on every NeuroVision view) */}
        <div
          role="note"
          className={`mb-6 px-4 py-3 rounded-xl border text-sm font-semibold ${
            darkMode
              ? "bg-amber-950/40 border-amber-800 text-amber-200"
              : "bg-amber-50 border-amber-300 text-amber-900"
          }`}
        >
          Educational tool only. Not for diagnosis or treatment decisions.
        </div>

        <section className={`mb-6 p-5 rounded-xl border ${card}`}>
          <h2 className="text-lg font-bold mb-1">Phase 1A data check</h2>
          <p className={`text-sm ${muted}`}>
            The interactive viewer is not available yet. This page lists the static data prepared in{" "}
            <code>public/neurovision/</code> and the validation images, so the data can be reviewed first.
            All content is marked <strong>unreviewed</strong> until a human reviews it.
          </p>
          {prov && (
            <p className={`text-sm mt-2 ${muted}`}>
              Target space: <strong>{prov.target_space}</strong>, 193 × 229 × 193 voxels, 1 mm.
            </p>
          )}
        </section>

        {error && (
          <div
            className={`mb-6 p-4 rounded-xl border text-sm ${
              darkMode ? "bg-red-950/40 border-red-800 text-red-200" : "bg-red-50 border-red-300 text-red-800"
            }`}
          >
            Could not load the data files: {error}
          </div>
        )}

        {prov && (
          <section className={`mb-6 p-5 rounded-xl border ${card}`}>
            <h2 className="text-lg font-bold mb-3">Volumes and atlases</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr>
                    {["File", "Size", "Source", "Original space", "Method", "Interpolation", "Licence", "Review"].map((h) => (
                      <th key={h} className={`py-2 pr-3 font-bold border-b ${th}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {prov.files.map((f) => (
                    <tr key={f.file} className="align-top">
                      <td className={`py-2 pr-3 border-b font-mono ${td}`}>
                        <a className="text-indigo-500 hover:underline" href={`${BASE}/${f.file}`}>
                          {f.file}
                        </a>
                        <div className={muted}>
                          {f.shape.join("×")} · {f.dtype}
                        </div>
                      </td>
                      <td className={`py-2 pr-3 border-b whitespace-nowrap ${td}`}>{kb(f.size_bytes)}</td>
                      <td className={`py-2 pr-3 border-b ${td}`}>{f.source}</td>
                      <td className={`py-2 pr-3 border-b ${td}`}>{f.original_space}</td>
                      <td className={`py-2 pr-3 border-b ${td}`}>{f.method}</td>
                      <td className={`py-2 pr-3 border-b ${td}`}>{f.interpolation}</td>
                      <td className={`py-2 pr-3 border-b ${td}`}>{f.license}</td>
                      <td className={`py-2 pr-3 border-b ${td}`}>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950">
                          {f.review_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {manifest && (
          <section className={`mb-6 p-5 rounded-xl border ${card}`}>
            <h2 className="text-lg font-bold mb-1">3D meshes ({manifest.meshes.length})</h2>
            <p className={`text-xs mb-3 ${muted}`}>
              {manifest.format}; {manifest.coordinate_system}. Hemisphere meshes are envelopes of Harvard-Oxford labels, not pial surfaces.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr>
                    {["Mesh", "Group", "Side", "Faces", "Size", "Review"].map((h) => (
                      <th key={h} className={`py-2 pr-3 font-bold border-b ${th}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {manifest.meshes.map((m) => (
                    <tr key={m.file}>
                      <td className={`py-1.5 pr-3 border-b font-mono ${td}`}>{m.file}</td>
                      <td className={`py-1.5 pr-3 border-b ${td}`}>{m.group}</td>
                      <td className={`py-1.5 pr-3 border-b ${td}`}>{m.side ?? "midline"}</td>
                      <td className={`py-1.5 pr-3 border-b ${td}`}>{m.faces_after.toLocaleString("en-US")}</td>
                      <td className={`py-1.5 pr-3 border-b whitespace-nowrap ${td}`}>{kb(m.size_bytes)}</td>
                      <td className={`py-1.5 pr-3 border-b ${td}`}>{m.review_status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {(prov || manifest) && (
          <section className={`mb-6 p-5 rounded-xl border ${card}`}>
            <h2 className="text-lg font-bold mb-2">Not available (no verified source)</h2>
            <ul className={`text-sm list-disc pl-5 space-y-1 ${muted}`}>
              {prov?.skipped.map((s) => (
                <li key={s.item}>
                  <strong>{s.item}</strong>: {s.reason}
                </li>
              ))}
              {manifest?.not_generated.map((n) => (
                <li key={n}>
                  <strong>{n}</strong> (mesh export)
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className={`mb-6 p-5 rounded-xl border ${card}`}>
          <h2 className="text-lg font-bold mb-1">Validation images</h2>
          <p className={`text-xs mb-4 ${muted}`}>
            Atlas colours over the T1 template; cyan line = T1 brain-mask outline. Check the boundaries and the L/R labels by eye.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {VALIDATION_IMAGES.map((img) => (
              <figure key={img.file} className="space-y-1">
                <a href={`${BASE}/validation/${img.file}`} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${BASE}/validation/${img.file}`}
                    alt={img.title}
                    loading="lazy"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700"
                  />
                </a>
                <figcaption className={`text-xs ${muted}`}>{img.title}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <footer className={`text-xs pb-8 ${muted}`}>
          Licences and required citations: <code>scripts/LICENSES.md</code>. Harvard-Oxford and JHU ICBM-DTI-81 are distributed under the
          FSL non-commercial licence; the JHU Arterial Atlas under CC BY-SA 4.0 (derived files must be shared alike).
        </footer>
      </div>
    </main>
  );
}
