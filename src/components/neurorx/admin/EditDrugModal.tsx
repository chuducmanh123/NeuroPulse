"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  X,
  Save,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Plus,
  Trash2,
  Check,
  RefreshCw,
  Activity,
  Syringe,
  Pill,
  Sparkles,
  Layers,
  Wand2,
  Baby,
  ArrowRightLeft,
  History,
  RotateCcw,
} from "lucide-react";
import type {
  DrugRecord,
  Subspecialty,
  QtRiskTier,
  Regimen,
  RenalBand,
  DoseSpec,
  DrugInteractionItem,
  McmEntry,
} from "@/types/neurorx";
import {
  REPRO_NA_NOTE,
  isReproNotApplicable,
} from "@/lib/neurorx/reproductive";
import {
  DRAFT_AUTOSAVE_INTERVAL_MS,
  clearLocalDrugDraftsForUid,
  loadLocalDrugDraft,
  resolveConflictChoice,
  saveLocalDrugDraft,
  type ConflictResolutionMode,
  type StoredDrugDraft,
} from "@/lib/neurorx/sync/adminHelpers";
import type { SyncRow } from "@/lib/neurorx/sync/types";
import { getStoredAdminToken } from "@/utils/clientAuth";
import { ConflictDialog } from "./ConflictDialog";

interface EditDrugModalProps {
  drug: DrugRecord;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedDrug: DrugRecord, oldId?: string) => Promise<boolean>;
  darkMode?: boolean;
  syncRow?: SyncRow | null;
  isNewDrug?: boolean;
  onApplyLocalWrite?: (row: SyncRow) => Promise<void> | void;
  onOpenHistory?: (row: SyncRow) => void;
}

const ALL_SUBSPECIALTIES: { id: Subspecialty; label: string }[] = [
  { id: "stroke", label: "Stroke" },
  { id: "epilepsy", label: "Epilepsy" },
  { id: "neurocritical_care", label: "Neurocritical Care (ICU)" },
  { id: "headache", label: "Headache" },
  { id: "movement_disorders", label: "Movement Disorders" },
  { id: "neuromuscular", label: "Neuromuscular" },
  { id: "dementia", label: "Dementia / Cognitive" },
  { id: "neuroimmunology", label: "Neuroimmunology" },
  { id: "neuro_infectious", label: "Neuro-infectious" },
];

export function EditDrugModal({
  drug,
  isOpen,
  onClose,
  onSave,
  darkMode = false,
  syncRow = null,
  isNewDrug = false,
  onApplyLocalWrite,
  onOpenHistory,
}: EditDrugModalProps) {
  const [activeTab, setActiveTab] = useState<
    "general" | "dosing" | "renal_hepatic" | "safety" | "pregnancy" | "interactions"
  >("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states - General
  const [id, setId] = useState(drug.id);
  const [genericName, setGenericName] = useState(drug.generic_name || "");
  const [tallMan, setTallMan] = useState(drug.tall_man?.value || "");
  const [classesText, setClassesText] = useState((drug.classes || []).join(", "));
  const [subspecialties, setSubspecialties] = useState<Subspecialty[]>(
    drug.subspecialties || []
  );
  const [status, setStatus] = useState<"draft" | "verified" | "retired">(
    drug.status || "draft"
  );
  const [verifiedBy, setVerifiedBy] = useState(
    drug.verification?.verified_by || "Admin"
  );

  // Form states - Regimens
  const [regimens, setRegimens] = useState<Regimen[]>(() => {
    if (drug.regimens && drug.regimens.length > 0) {
      return JSON.parse(JSON.stringify(drug.regimens));
    }
    return [
      {
        id: `${drug.id || "drug"}-regimen-1`,
        indication: "Clinical Treatment Regimen",
        setting: "maintenance_outpatient",
        route: "PO",
        refs: [],
        dose: {
          kind: "fixed",
          amount: 500,
          unit: "mg",
          frequency: "twice daily",
        },
        dose_text: "",
      },
    ];
  });

  // Smart Sentence Builder structured state per regimen
  const [builders, setBuilders] = useState<
    Record<
      number,
      {
        startingDose: string;
        titration: string;
        targetDose: string;
        adminNotes: string;
      }
    >
  >({});

  // Form states - Renal & Hepatic
  const [renalDesc, setRenalDesc] = useState(
    drug.renal_impairment?.description || ""
  );
  const [renalBasis, setRenalBasis] = useState<
    "cg_abw" | "cg_normalized_1_73" | "egfr"
  >(drug.renal_basis?.value || "cg_abw");
  const [renalBands, setRenalBands] = useState<RenalBand[]>(() => {
    if (drug.renal_impairment?.bands && drug.renal_impairment.bands.length > 0) {
      return JSON.parse(JSON.stringify(drug.renal_impairment.bands));
    }
    return [];
  });
  const [hemodialysisText, setHemodialysisText] = useState(
    drug.renal_impairment?.hemodialysis?.value || ""
  );
  const [hepaticText, setHepaticText] = useState(drug.hepatic?.value || "");

  // Form states - IV Infusion protocol
  const [ivDiluent, setIvDiluent] = useState(
    drug.tools?.iv_infusion?.value?.diluent || ""
  );
  const [ivRate, setIvRate] = useState(
    drug.tools?.iv_infusion?.value?.rate || ""
  );
  const [ivInstructions, setIvInstructions] = useState(
    drug.tools?.iv_infusion?.value?.instructions || ""
  );

  // Form states - Safety & Enzymes
  const [blackBoxText, setBlackBoxText] = useState(
    (drug.black_box?.value || []).join("\n")
  );
  const [mgSafety, setMgSafety] = useState<
    "safe" | "caution" | "may_worsen" | "avoid"
  >(drug.mg_safety?.value || "safe");
  const [cyp3a4, setCyp3a4] = useState(
    drug.enzyme_profile?.value?.cyp3a4 || "none"
  );
  const [cyp2c19, setCyp2c19] = useState(
    drug.enzyme_profile?.value?.cyp2c19 || "none"
  );
  const [pgp, setPgp] = useState(drug.enzyme_profile?.value?.pgp || "none");
  const [qtRisk, setQtRisk] = useState<QtRiskTier>(
    drug.enzyme_profile?.value?.qt_risk || "none"
  );
  const [acbScore, setAcbScore] = useState<number>(
    drug.enzyme_profile?.value?.acb_score || 0
  );

  // Form states - Pregnancy & Lactation (chronological)
  const [folicAcid, setFolicAcid] = useState(
    drug.reproductive?.folic_acid?.value || ""
  );
  const [folicAcidNa, setFolicAcidNa] = useState(() =>
    isReproNotApplicable(drug.reproductive?.folic_acid)
  );
  const [contraception, setContraception] = useState(
    drug.reproductive?.contraception?.value || ""
  );
  const [contraceptionNa, setContraceptionNa] = useState(() =>
    isReproNotApplicable(drug.reproductive?.contraception)
  );
  const [pregnancyTier, setPregnancyTier] = useState<
    "preferred" | "caution" | "avoid" | "none"
  >(drug.reproductive?.tier?.value || "none");
  const [pregnancyPk, setPregnancyPk] = useState(
    drug.reproductive?.pregnancy_pk?.value || ""
  );
  const [pregnancyPkNa, setPregnancyPkNa] = useState(() =>
    isReproNotApplicable(drug.reproductive?.pregnancy_pk)
  );
  const [mcmList, setMcmList] = useState<McmEntry[]>(() =>
    drug.reproductive?.mcm && drug.reproductive.mcm.length > 0
      ? JSON.parse(JSON.stringify(drug.reproductive.mcm))
      : []
  );
  const [postpartum, setPostpartum] = useState(
    drug.reproductive?.postpartum?.value || ""
  );
  const [postpartumNa, setPostpartumNa] = useState(() =>
    isReproNotApplicable(drug.reproductive?.postpartum)
  );
  const [lactationRid, setLactationRid] = useState(
    drug.reproductive?.lactation_rid?.value || ""
  );
  const [lactationSummary, setLactationSummary] = useState(
    drug.reproductive?.lactation_summary?.value || ""
  );

  // Form states - FDA Drug Interactions
  const [interactionsList, setInteractionsList] = useState<DrugInteractionItem[]>(
    () => {
      if (drug.fda_interactions?.value && drug.fda_interactions.value.length > 0) {
        return JSON.parse(JSON.stringify(drug.fda_interactions.value));
      }
      return [];
    }
  );

  const handleAddInteraction = () => {
    setInteractionsList((prev) => [
      ...prev,
      {
        drug_or_class: "",
        severity: "major",
        effect: "",
        management: "",
      },
    ]);
  };

  const handleRemoveInteraction = (idx: number) => {
    setInteractionsList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateInteraction = (
    idx: number,
    field: keyof DrugInteractionItem,
    val: any
  ) => {
    setInteractionsList((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
  };

  const [activeSyncRow, setActiveSyncRow] = useState<SyncRow | null>(syncRow ?? null);
  const [baseDrugSnapshot, setBaseDrugSnapshot] = useState<DrugRecord>(() =>
    structuredClone(syncRow?.data ?? drug)
  );
  const [savedLocalDraft, setSavedLocalDraft] = useState<StoredDrugDraft | null>(null);
  const [lastAutoSaveAt, setLastAutoSaveAt] = useState<string | null>(null);
  const [conflictState, setConflictState] = useState<{
    mine: DrugRecord;
    cloudRow: SyncRow;
    baseRev: number;
    error: string | null;
    submitting: boolean;
  } | null>(null);

  const effectiveDraftUid =
    activeSyncRow?.uid || (isNewDrug ? "__new__" : `slug:${drug.id || "draft"}`);
  const effectiveBaseRev = activeSyncRow?.rev ?? 0;

  const applyDrugRecordToForm = useCallback((source: DrugRecord) => {
    setId(source.id || "");
    setGenericName(source.generic_name || "");
    setTallMan(source.tall_man?.value || "");
    setClassesText((source.classes || []).join(", "));
    setSubspecialties(source.subspecialties || []);
    setStatus(source.status || "draft");
    setVerifiedBy(source.verification?.verified_by || "Admin");
    setRegimens(
      source.regimens && source.regimens.length > 0
        ? JSON.parse(JSON.stringify(source.regimens))
        : [
            {
              id: `${source.id || "drug"}-regimen-1`,
              indication: "Clinical Treatment Regimen",
              setting: "maintenance_outpatient",
              route: "PO",
              refs: [],
              dose: {
                kind: "fixed",
                amount: 500,
                unit: "mg",
                frequency: "twice daily",
              },
              dose_text: "",
            },
          ]
    );
    setRenalDesc(source.renal_impairment?.description || "");
    setRenalBasis(source.renal_basis?.value || "cg_abw");
    setRenalBands(
      source.renal_impairment?.bands && source.renal_impairment.bands.length > 0
        ? JSON.parse(JSON.stringify(source.renal_impairment.bands))
        : []
    );
    setHemodialysisText(source.renal_impairment?.hemodialysis?.value || "");
    setHepaticText(source.hepatic?.value || "");
    setIvDiluent(source.tools?.iv_infusion?.value?.diluent || "");
    setIvRate(source.tools?.iv_infusion?.value?.rate || "");
    setIvInstructions(source.tools?.iv_infusion?.value?.instructions || "");
    setBlackBoxText((source.black_box?.value || []).join("\n"));
    setMgSafety(source.mg_safety?.value || "safe");
    setCyp3a4(source.enzyme_profile?.value?.cyp3a4 || "none");
    setCyp2c19(source.enzyme_profile?.value?.cyp2c19 || "none");
    setPgp(source.enzyme_profile?.value?.pgp || "none");
    setQtRisk(source.enzyme_profile?.value?.qt_risk || "none");
    setAcbScore(source.enzyme_profile?.value?.acb_score || 0);
    setPregnancyTier(source.reproductive?.tier?.value || "none");
    setFolicAcid(source.reproductive?.folic_acid?.value || "");
    setFolicAcidNa(isReproNotApplicable(source.reproductive?.folic_acid));
    setContraception(source.reproductive?.contraception?.value || "");
    setContraceptionNa(isReproNotApplicable(source.reproductive?.contraception));
    setPregnancyPk(source.reproductive?.pregnancy_pk?.value || "");
    setPregnancyPkNa(isReproNotApplicable(source.reproductive?.pregnancy_pk));
    setMcmList(
      source.reproductive?.mcm && source.reproductive.mcm.length > 0
        ? JSON.parse(JSON.stringify(source.reproductive.mcm))
        : []
    );
    setPostpartum(source.reproductive?.postpartum?.value || "");
    setPostpartumNa(isReproNotApplicable(source.reproductive?.postpartum));
    setLactationRid(source.reproductive?.lactation_rid?.value || "");
    setLactationSummary(source.reproductive?.lactation_summary?.value || "");
    setInteractionsList(
      source.fda_interactions?.value && source.fda_interactions.value.length > 0
        ? JSON.parse(JSON.stringify(source.fda_interactions.value))
        : []
    );
  }, []);

  const buildDrugRecordFromState = useCallback(
    (overrideCleanId?: string, overrideCleanGeneric?: string): DrugRecord => {
      const cleanId =
        overrideCleanId ?? id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
      const cleanGeneric = overrideCleanGeneric ?? genericName.trim();
      const baseRecord = activeSyncRow?.data ?? drug;
      const fallbackSourceId =
        baseRecord.regimens?.[0]?.refs?.[0]?.source_id ||
        baseRecord.tall_man?.refs?.[0]?.source_id ||
        "fda-keppra-label";

      const cleanRegimens: Regimen[] = regimens.map((r, idx) => ({
        ...r,
        id: r.id?.trim() || `${cleanId}-regimen-${idx + 1}`,
        indication: r.indication?.trim() || `Indication #${idx + 1}`,
        setting: r.setting || "maintenance_outpatient",
        route: r.route || "PO",
        dose: r.dose
          ? {
              kind: r.dose.kind || "fixed",
              amount: Number(r.dose.amount) || 0,
              unit: r.dose.unit || "mg",
              frequency: r.dose.frequency?.trim() || "once",
              max_single: r.dose.max_single ? Number(r.dose.max_single) : undefined,
              max_daily: r.dose.max_daily ? Number(r.dose.max_daily) : undefined,
            }
          : null,
        dose_text: r.dose_text?.trim() || undefined,
        refs:
          r.refs && r.refs.length > 0
            ? r.refs
            : [
                {
                  source_id: fallbackSourceId,
                  locator: "admin",
                  quote: r.indication?.trim() || cleanGeneric || "Clinical dosing",
                },
              ],
      }));

      const cleanBands: RenalBand[] = renalBands.map((b) => ({
        min:
          b.min === null || b.min === ("" as any) || isNaN(Number(b.min))
            ? null
            : Number(b.min),
        max:
          b.max === null || b.max === ("" as any) || isNaN(Number(b.max))
            ? null
            : Number(b.max),
        dose_text: b.dose_text?.trim() || "Refer to clinical protocol",
        refs:
          b.refs && b.refs.length > 0
            ? b.refs
            : [
                {
                  source_id: fallbackSourceId,
                  locator: "admin",
                  quote: "CrCl band",
                },
              ],
        dose: b.dose,
      }));

      const blackBoxItems = blackBoxText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      return {
        ...baseRecord,
        id: cleanId,
        generic_name: cleanGeneric,
        tall_man: {
          value: tallMan.trim() || cleanGeneric,
          refs:
            baseRecord.tall_man?.refs && baseRecord.tall_man.refs.length > 0
              ? baseRecord.tall_man.refs
              : [{ source_id: fallbackSourceId, locator: "admin", quote: cleanGeneric || cleanId }],
        },
        classes: classesText
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
        subspecialties: subspecialties.length > 0 ? subspecialties : ["epilepsy"],
        status,
        verification: {
          verified_by: status === "verified" ? verifiedBy.trim() || "Admin" : null,
          verified_at:
            status === "verified"
              ? baseRecord.verification?.verified_at || new Date().toISOString().split("T")[0]
              : null,
          content_hash: baseRecord.verification?.content_hash || null,
        },
        regimens: cleanRegimens,
        hepatic: {
          value:
            hepaticText.trim() ||
            "No dosage adjustment necessary for hepatic impairment.",
          refs:
            baseRecord.hepatic?.refs && baseRecord.hepatic.refs.length > 0
              ? baseRecord.hepatic.refs
              : [
                  {
                    source_id: fallbackSourceId,
                    locator: "admin",
                    quote: "Hepatic adjustment",
                  },
                ],
        },
        renal_basis: {
          value: renalBasis,
          refs:
            baseRecord.renal_basis?.refs && baseRecord.renal_basis.refs.length > 0
              ? baseRecord.renal_basis.refs
              : [{ source_id: fallbackSourceId, locator: "admin", quote: "CrCl" }],
        },
        renal_impairment: {
          description:
            renalDesc.trim() ||
            (cleanBands.length > 0
              ? `Dosing adjustments stratified by renal function (${renalBasis}).`
              : "No dosage adjustment necessary for renal impairment."),
          renal_basis: {
            value: renalBasis,
            refs:
              baseRecord.renal_basis?.refs && baseRecord.renal_basis.refs.length > 0
                ? baseRecord.renal_basis.refs
                : [{ source_id: fallbackSourceId, locator: "admin", quote: "CrCl" }],
          },
          bands: cleanBands,
          hemodialysis: hemodialysisText.trim()
            ? {
                value: hemodialysisText.trim(),
                refs:
                  baseRecord.renal_impairment?.hemodialysis?.refs &&
                  baseRecord.renal_impairment.hemodialysis.refs.length > 0
                    ? baseRecord.renal_impairment.hemodialysis.refs
                    : [
                        {
                          source_id: fallbackSourceId,
                          locator: "admin",
                          quote: "Hemodialysis",
                        },
                      ],
              }
            : undefined,
          refs:
            baseRecord.renal_impairment?.refs && baseRecord.renal_impairment.refs.length > 0
              ? baseRecord.renal_impairment.refs
              : [{ source_id: fallbackSourceId, locator: "admin", quote: "Renal" }],
        },
        black_box:
          blackBoxItems.length > 0
            ? {
                value: blackBoxItems,
                refs:
                  baseRecord.black_box?.refs && baseRecord.black_box.refs.length > 0
                    ? baseRecord.black_box.refs
                    : [{ source_id: fallbackSourceId, locator: "admin", quote: "Boxed Warning" }],
              }
            : { value: null, refs: [] },
        mg_safety: {
          value: mgSafety,
          refs:
            baseRecord.mg_safety?.refs && baseRecord.mg_safety.refs.length > 0
              ? baseRecord.mg_safety.refs
              : [{ source_id: fallbackSourceId, locator: "admin", quote: "MG safety" }],
        },
        enzyme_profile: {
          value: {
            ...baseRecord.enzyme_profile?.value,
            cyp3a4: cyp3a4 === "none" ? undefined : (cyp3a4 as any),
            cyp2c19: cyp2c19 === "none" ? undefined : (cyp2c19 as any),
            pgp: pgp === "none" ? undefined : (pgp as any),
            qt_risk: qtRisk,
            acb_score: Number(acbScore) || 0,
          },
          refs:
            baseRecord.enzyme_profile?.refs && baseRecord.enzyme_profile.refs.length > 0
              ? baseRecord.enzyme_profile.refs
              : [
                  {
                    source_id: fallbackSourceId,
                    locator: "admin",
                    quote: "Enzyme profile",
                  },
                ],
        },
        tools: {
          ...baseRecord.tools,
          ...(ivDiluent.trim() || ivRate.trim() || ivInstructions.trim()
            ? {
                iv_infusion: {
                  value: {
                    diluent: ivDiluent.trim(),
                    rate: ivRate.trim(),
                    instructions: ivInstructions.trim(),
                  },
                  refs:
                    baseRecord.tools?.iv_infusion?.refs &&
                    baseRecord.tools.iv_infusion.refs.length > 0
                      ? baseRecord.tools.iv_infusion.refs
                      : [
                          {
                            source_id: fallbackSourceId,
                            locator: "admin",
                            quote: "IV Infusion",
                          },
                        ],
                },
              }
            : {}),
        },
        reproductive: (() => {
          const hasAnyRepro =
            pregnancyTier !== "none" ||
            folicAcid.trim() ||
            folicAcidNa ||
            contraception.trim() ||
            contraceptionNa ||
            pregnancyPk.trim() ||
            pregnancyPkNa ||
            mcmList.length > 0 ||
            postpartum.trim() ||
            postpartumNa ||
            lactationRid.trim() ||
            lactationSummary.trim();

          if (!hasAnyRepro) return baseRecord.reproductive;

          const buildSourcedText = (
            val: string,
            isNa: boolean,
            existing: { value: string | null; refs: any[]; note?: string } | undefined,
            adminQuote: string
          ) => {
            if (isNa) {
              return { value: null, refs: [], note: REPRO_NA_NOTE };
            }
            const trimmed = val.trim();
            if (!trimmed) {
              return { value: null, refs: [] };
            }
            return {
              value: trimmed,
              refs:
                existing?.refs && existing.refs.length > 0
                  ? existing.refs
                  : [{ source_id: fallbackSourceId, locator: "admin", quote: adminQuote }],
            };
          };

          return {
            tier: {
              value: pregnancyTier === "none" ? null : (pregnancyTier as any),
              refs:
                pregnancyTier === "none"
                  ? []
                  : baseRecord.reproductive?.tier?.refs &&
                    baseRecord.reproductive.tier.refs.length > 0
                  ? baseRecord.reproductive.tier.refs
                  : [
                      {
                        source_id: fallbackSourceId,
                        locator: "admin",
                        quote: "Pregnancy safety tier",
                      },
                    ],
            },
            mcm: mcmList
              .filter((m) => m.registry.trim() && !Number.isNaN(Number(m.percent)))
              .map((m) => ({
                registry: m.registry.trim(),
                percent: Number(m.percent),
                ...(m.ci95?.trim() ? { ci95: m.ci95.trim() } : {}),
                ...(m.n_exposed ? { n_exposed: Number(m.n_exposed) } : {}),
                ...(m.dose_stratum?.trim() ? { dose_stratum: m.dose_stratum.trim() } : {}),
                refs:
                  m.refs && m.refs.length > 0
                    ? m.refs
                    : [
                        {
                          source_id: fallbackSourceId,
                          locator: "admin",
                          quote: `${m.registry.trim()} MCM: ${m.percent}%`,
                        },
                      ],
              })),
            folic_acid: buildSourcedText(
              folicAcid,
              folicAcidNa,
              baseRecord.reproductive?.folic_acid,
              "Folic acid"
            ),
            contraception: buildSourcedText(
              contraception,
              contraceptionNa,
              baseRecord.reproductive?.contraception,
              "Contraception"
            ),
            pregnancy_pk: buildSourcedText(
              pregnancyPk,
              pregnancyPkNa,
              baseRecord.reproductive?.pregnancy_pk,
              "Pregnancy PK"
            ),
            postpartum: buildSourcedText(
              postpartum,
              postpartumNa,
              baseRecord.reproductive?.postpartum,
              "Postpartum management"
            ),
            lactation_rid: buildSourcedText(
              lactationRid,
              false,
              baseRecord.reproductive?.lactation_rid,
              "Lactation RID"
            ),
            lactation_summary: buildSourcedText(
              lactationSummary,
              false,
              baseRecord.reproductive?.lactation_summary,
              "Lactation summary"
            ),
          };
        })(),
        fda_interactions:
          interactionsList.length > 0
            ? {
                value: interactionsList.filter(
                  (item) =>
                    item.drug_or_class.trim() && item.effect.trim() && item.management.trim()
                ),
                refs:
                  baseRecord.fda_interactions?.refs &&
                  baseRecord.fda_interactions.refs.length > 0
                    ? baseRecord.fda_interactions.refs
                    : [
                        {
                          source_id: fallbackSourceId,
                          locator: "Section 7 DRUG INTERACTIONS",
                          quote: "FDA Drug Interactions",
                        },
                      ],
              }
            : baseRecord.fda_interactions,
      };
    },
    [
      id,
      genericName,
      activeSyncRow,
      drug,
      regimens,
      renalBands,
      tallMan,
      classesText,
      subspecialties,
      status,
      verifiedBy,
      hepaticText,
      renalBasis,
      renalDesc,
      hemodialysisText,
      blackBoxText,
      mgSafety,
      cyp3a4,
      cyp2c19,
      pgp,
      qtRisk,
      acbScore,
      ivDiluent,
      ivRate,
      ivInstructions,
      pregnancyTier,
      folicAcid,
      pregnancyPk,
      contraception,
      lactationSummary,
      lactationRid,
      interactionsList,
    ]
  );

  const buildDraftRef = useRef<() => DrugRecord>(buildDrugRecordFromState);
  buildDraftRef.current = buildDrugRecordFromState;

  const baseSnapshotRef = useRef<DrugRecord>(baseDrugSnapshot);
  baseSnapshotRef.current = baseDrugSnapshot;

  // Reset modal states when opening/switching drugs & detect pending localStorage draft
  useEffect(() => {
    if (!isOpen) return;
    const initialRow = syncRow ?? null;
    const initialRecord = initialRow?.data ?? drug;
    setActiveSyncRow(initialRow);
    setBaseDrugSnapshot(structuredClone(initialRecord));
    applyDrugRecordToForm(initialRecord);
    setError(null);
    setConflictState(null);
    setLastAutoSaveAt(null);

    if (typeof window !== "undefined") {
      const uidForDraft =
        initialRow?.uid || (isNewDrug ? "__new__" : `slug:${drug.id || "draft"}`);
      const revForDraft = initialRow?.rev ?? 0;
      const found = loadLocalDrugDraft(window.localStorage, uidForDraft, revForDraft);
      if (found && JSON.stringify(found.data) !== JSON.stringify(initialRecord)) {
        setSavedLocalDraft(found);
      } else {
        setSavedLocalDraft(null);
      }
    } else {
      setSavedLocalDraft(null);
    }
  }, [isOpen, drug, syncRow, isNewDrug, applyDrugRecordToForm]);

  // Phase 6b (I15 / AC6.5): 3s local draft auto-save while modal is open
  useEffect(() => {
    if (!isOpen || conflictState !== null || typeof window === "undefined") {
      return;
    }
    const timer = window.setInterval(() => {
      const snapshot = buildDraftRef.current();
      if (JSON.stringify(snapshot) === JSON.stringify(baseSnapshotRef.current)) {
        return;
      }
      const saved = saveLocalDrugDraft(
        window.localStorage,
        effectiveDraftUid,
        effectiveBaseRev,
        snapshot
      );
      if (saved) {
        setLastAutoSaveAt(saved.savedAt);
      }
    }, DRAFT_AUTOSAVE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [isOpen, conflictState, effectiveDraftUid, effectiveBaseRev]);

  if (!isOpen) return null;

  const toggleSubspecialty = (sub: Subspecialty) => {
    if (subspecialties.includes(sub)) {
      setSubspecialties(subspecialties.filter((s) => s !== sub));
    } else {
      setSubspecialties([...subspecialties, sub]);
    }
  };

  // Regimen management
  const handleAddRegimen = () => {
    const nextIdx = regimens.length + 1;
    const newRegimen: Regimen = {
      id: `${id.trim() || "drug"}-regimen-${nextIdx}`,
      indication: `Clinical Indication #${nextIdx}`,
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [],
      dose: {
        kind: "fixed",
        amount: 500,
        unit: "mg",
        frequency: "twice daily",
      },
      dose_text: "",
    };
    setRegimens([...regimens, newRegimen]);
  };

  const handleRemoveRegimen = (index: number) => {
    if (regimens.length <= 1) return;
    setRegimens(regimens.filter((_, idx) => idx !== index));
  };

  const handleUpdateRegimen = (index: number, patch: Partial<Regimen>) => {
    setRegimens(
      regimens.map((r, idx) => (idx === index ? { ...r, ...patch } : r))
    );
  };

  const handleUpdateRegimenDose = (
    index: number,
    dosePatch: Partial<DoseSpec> | null
  ) => {
    setRegimens(
      regimens.map((r, idx) => {
        if (idx !== index) return r;
        if (dosePatch === null) {
          return { ...r, dose: null };
        }
        return {
          ...r,
          dose: {
            kind: r.dose?.kind || "fixed",
            amount: r.dose?.amount ?? 100,
            unit: r.dose?.unit || "mg",
            frequency: r.dose?.frequency || "twice daily",
            ...dosePatch,
          },
        };
      })
    );
  };

  // Sentence composer logic
  const composeSentence = (
    starting: string,
    titration: string,
    target: string,
    notes: string
  ): string => {
    const parts: string[] = [];
    const s = starting.trim();
    const t = titration.trim();
    const tg = target.trim();
    const n = notes.trim();

    if (s) {
      const hasVerb = /^initiate|^start|^administer|^give|^take/i.test(s);
      const startStr = hasVerb ? s : `Initiate ${s}`;
      parts.push(startStr.endsWith(".") ? startStr : `${startStr}.`);
    }

    if (t && tg) {
      const tgStr = tg.startsWith("to ") ? tg : `to ${tg}`;
      const titrateStr = `${t} ${tgStr}`;
      parts.push(titrateStr.endsWith(".") ? titrateStr : `${titrateStr}.`);
    } else if (t) {
      parts.push(t.endsWith(".") ? t : `${t}.`);
    } else if (tg) {
      const tgStr = tg.startsWith("to ") ? `Titrate ${tg}` : `Target: ${tg}`;
      parts.push(tgStr.endsWith(".") ? tgStr : `${tgStr}.`);
    }

    if (n) {
      parts.push(n.endsWith(".") ? n : `${n}.`);
    }

    return parts.join(" ");
  };

  const updateBuilderField = (
    idx: number,
    field: "startingDose" | "titration" | "targetDose" | "adminNotes",
    val: string
  ) => {
    const current = builders[idx] || {
      startingDose: "",
      titration: "",
      targetDose: "",
      adminNotes: "",
    };
    const updated = { ...current, [field]: val };
    setBuilders((prev) => ({ ...prev, [idx]: updated }));

    const autoComposed = composeSentence(
      updated.startingDose,
      updated.titration,
      updated.targetDose,
      updated.adminNotes
    );
    if (autoComposed) {
      handleUpdateRegimen(idx, { dose_text: autoComposed });
    }
  };

  const handleApplyPreset = (
    idx: number,
    preset: "oral_titration" | "iv_bolus" | "fixed_daily"
  ) => {
    const reg = regimens[idx];
    const amount = reg.dose?.amount || 500;
    const unit = reg.dose?.unit || "mg";
    const freq = reg.dose?.frequency || "twice daily";
    const maxDaily = reg.dose?.max_daily;

    let s = "";
    let t = "";
    let tg = "";
    let n = "";

    if (preset === "oral_titration") {
      const dailyTotal = freq.toLowerCase().includes("twice")
        ? amount * 2
        : amount;
      s = `${amount} ${unit} ${freq} (${dailyTotal} ${unit}/day)`;
      t = `Increase by ${amount} ${unit} ${freq} every 2 weeks`;
      tg = maxDaily
        ? `maximum ${maxDaily / 2} ${unit} ${freq} (${maxDaily} ${unit}/day)`
        : `recommended maintenance dose`;
      n = `Swallow whole; do not chew or crush. Take with or without food.`;
    } else if (preset === "iv_bolus") {
      s = `${amount} ${unit} (maximum total ${reg.dose?.max_single || 90} mg)`;
      t = `10% of total calculated dose administered as an initial IV bolus over 1 minute`;
      tg = `remainder infused continuously over 60 minutes`;
      n = `Monitor blood pressure and neurologic status frequently during and after infusion.`;
    } else if (preset === "fixed_daily") {
      s = `${amount} ${unit} ${freq}`;
      t = ``;
      tg = ``;
      n = `Administer at the same time every day.`;
    }

    const updated = {
      startingDose: s,
      titration: t,
      targetDose: tg,
      adminNotes: n,
    };
    setBuilders((prev) => ({ ...prev, [idx]: updated }));
    const composed = composeSentence(s, t, tg, n);
    handleUpdateRegimen(idx, { dose_text: composed });
  };

  // Renal band management
  const handleAddRenalBand = () => {
    const newBand: RenalBand = {
      min: 30,
      max: 50,
      dose_text: "50% standard maintenance dose",
      refs: [],
    };
    setRenalBands([...renalBands, newBand]);
  };

  const handleRemoveRenalBand = (index: number) => {
    setRenalBands(renalBands.filter((_, idx) => idx !== index));
  };

  const handleUpdateRenalBand = (index: number, patch: Partial<RenalBand>) => {
    setRenalBands(
      renalBands.map((b, idx) => (idx === index ? { ...b, ...patch } : b))
    );
  };

  const handleLoadStandardCrclBands = () => {
    setRenalBands([
      {
        min: 80,
        max: null,
        dose_text: "Standard maintenance dose (No dosage adjustment necessary)",
        refs: [],
      },
      {
        min: 50,
        max: 80,
        dose_text: "75% of standard dose or normal dosing interval",
        refs: [],
      },
      {
        min: 30,
        max: 50,
        dose_text: "50% of standard dose every 12 to 24 hours",
        refs: [],
      },
      {
        min: null,
        max: 30,
        dose_text: "25% to 50% standard dose, or avoid use in severe impairment",
        refs: [],
      },
    ]);
  };

  const commitV2DrugSave = async (
    payloadData: DrugRecord,
    opts: { isCreate: boolean; uid?: string; expectedRev?: number }
  ): Promise<{ ok: boolean; conflict?: { cloudRow: SyncRow }; errorMsg?: string }> => {
    const token = getStoredAdminToken();
    const url = opts.isCreate
      ? "/api/neurorx/sync/drugs"
      : `/api/neurorx/sync/drugs/${encodeURIComponent(opts.uid || "")}`;
    const method = opts.isCreate ? "POST" : "PUT";
    const body = opts.isCreate
      ? { data: payloadData }
      : { data: payloadData, expectedRev: opts.expectedRev };

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": token || "",
      },
      body: JSON.stringify(body),
    });

    const json = await res.json();

    if (res.status === 409 && json?.code === "REV_CONFLICT" && json?.current) {
      return {
        ok: false,
        conflict: { cloudRow: json.current as SyncRow },
      };
    }

    if (!res.ok || !json?.row) {
      const detailSummary = Array.isArray(json?.details)
        ? json.details
            .slice(0, 3)
            .map((d: { path?: string; message?: string }) =>
              d.path ? `${d.path}: ${d.message}` : d.message
            )
            .filter(Boolean)
            .join("; ")
        : "";
      const errMsg = detailSummary
        ? `${json?.error || "Save failed."} (${detailSummary})`
        : json?.error || `Save failed (${res.status}).`;
      return { ok: false, errorMsg: errMsg };
    }

    const savedRow = json.row as SyncRow;
    if (typeof window !== "undefined") {
      clearLocalDrugDraftsForUid(window.localStorage, effectiveDraftUid);
      if (savedRow.uid !== effectiveDraftUid) {
        clearLocalDrugDraftsForUid(window.localStorage, savedRow.uid);
      }
    }
    setSavedLocalDraft(null);
    setLastAutoSaveAt(null);
    setConflictState(null);
    setActiveSyncRow(savedRow);
    setBaseDrugSnapshot(structuredClone(savedRow.data));
    await onApplyLocalWrite?.(savedRow);

    const oldSlug =
      !opts.isCreate && activeSyncRow && activeSyncRow.slug !== savedRow.slug
        ? activeSyncRow.slug
        : drug.id !== savedRow.slug
        ? drug.id
        : undefined;
    const ok = await onSave(savedRow.data, oldSlug);
    if (ok) {
      onClose();
    }
    return { ok: true };
  };

  const handleResolveConflict = async (
    mode: ConflictResolutionMode,
    conflictSelections: Record<string, "mine" | "cloud">
  ) => {
    if (!conflictState) return;
    const resolved = resolveConflictChoice({
      mode,
      base: baseDrugSnapshot,
      mine: conflictState.mine,
      cloudRow: conflictState.cloudRow,
      conflictSelections,
    });

    if (!resolved.ok) {
      setConflictState((prev) =>
        prev
          ? {
              ...prev,
              error: "Please choose Keep Mine or Use Cloud for every overlapping conflict.",
            }
          : null
      );
      return;
    }

    if (resolved.kind === "apply_cloud") {
      if (typeof window !== "undefined") {
        clearLocalDrugDraftsForUid(window.localStorage, effectiveDraftUid);
      }
      const cloudRow = resolved.row;
      setSavedLocalDraft(null);
      setLastAutoSaveAt(null);
      setActiveSyncRow(cloudRow);
      setBaseDrugSnapshot(structuredClone(cloudRow.data));
      applyDrugRecordToForm(cloudRow.data);
      setConflictState(null);
      await onApplyLocalWrite?.(cloudRow);
      return;
    }

    setConflictState((prev) =>
      prev ? { ...prev, submitting: true, error: null } : null
    );
    try {
      const outcome = await commitV2DrugSave(resolved.data, {
        isCreate: false,
        uid: conflictState.cloudRow.uid,
        expectedRev: resolved.expectedRev,
      });
      if (outcome.conflict) {
        setConflictState({
          mine: resolved.data,
          cloudRow: outcome.conflict.cloudRow,
          baseRev: resolved.expectedRev,
          error: "Another cloud update arrived while resolving. Review the newer cloud revision.",
          submitting: false,
        });
        return;
      }
      if (!outcome.ok) {
        setConflictState((prev) =>
          prev
            ? {
                ...prev,
                submitting: false,
                error: outcome.errorMsg || "Failed to save resolved changes.",
              }
            : null
        );
      }
    } catch (err: any) {
      setConflictState((prev) =>
        prev
          ? {
              ...prev,
              submitting: false,
              error: err?.message || "Network error saving resolved changes.",
            }
          : null
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanId = id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    const cleanGeneric = genericName.trim();

    if (!cleanId || !cleanGeneric) {
      setError("Please provide both a Drug ID and a Generic Name.");
      return;
    }

    setLoading(true);

    try {
      const updatedDrug = buildDrugRecordFromState(cleanId, cleanGeneric);
      const isCreate = isNewDrug || !activeSyncRow;
      const outcome = await commitV2DrugSave(updatedDrug, {
        isCreate,
        uid: activeSyncRow?.uid,
        expectedRev: isCreate ? undefined : effectiveBaseRev,
      });

      if (outcome.conflict) {
        setConflictState({
          mine: updatedDrug,
          cloudRow: outcome.conflict.cloudRow,
          baseRev: effectiveBaseRev,
          error: null,
          submitting: false,
        });
        return;
      }
      if (!outcome.ok && outcome.errorMsg) {
        setError(outcome.errorMsg);
      }
    } catch (err: any) {
      setError(err?.message || "Error saving drug.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`w-full max-w-6xl h-[92vh] sm:h-[88vh] max-h-[840px] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
          darkMode
            ? "bg-slate-900 border-slate-800 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Modal Header */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  Edit Drug: {drug.generic_name}
                </h3>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    status === "verified"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                  }`}
                >
                  {status}
                </span>
                {activeSyncRow && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                    rev {activeSyncRow.rev}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono">
                <span>ID: {drug.id}</span>
                {lastAutoSaveAt && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-sans font-semibold">
                    · Auto-saved at {new Date(lastAutoSaveAt).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeSyncRow && onOpenHistory && (
              <button
                type="button"
                onClick={() => onOpenHistory(activeSyncRow)}
                className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <History className="w-4 h-4 shrink-0" />
                <span>History</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center"
              aria-label="Close edit modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="shrink-0 px-4 pt-3 sm:px-6 sm:pt-3.5 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none bg-slate-50/40 dark:bg-slate-950/20 text-xs sm:text-sm font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`pb-3 px-3.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "general"
                ? "border-sky-600 text-sky-600 dark:text-sky-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            General &amp; Classes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("dosing")}
            className={`pb-3 px-3.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "dosing"
                ? "border-sky-600 text-sky-600 dark:text-sky-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Dosing Regimens ({regimens.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("renal_hepatic")}
            className={`pb-3 px-3.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "renal_hepatic"
                ? "border-sky-600 text-sky-600 dark:text-sky-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Renal &amp; Hepatic ({renalBands.length} CrCl bands)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("safety")}
            className={`pb-3 px-3.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "safety"
                ? "border-sky-600 text-sky-600 dark:text-sky-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Safety &amp; CYP Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pregnancy")}
            className={`pb-3 px-3.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "pregnancy"
                ? "border-rose-500 text-rose-600 dark:text-rose-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Baby className="w-4 h-4" />
            <span>Pregnancy &amp; Lactation</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("interactions")}
            className={`pb-3 px-3.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "interactions"
                ? "border-purple-500 text-purple-600 dark:text-purple-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Drug Interactions ({interactionsList.length})</span>
          </button>
        </div>

        {/* Modal Form Content */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 min-h-0 flex flex-col"
        >
          <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-gutter:stable] p-4 sm:p-6 space-y-5">
          {savedLocalDraft && (
            <div
              role="status"
              className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="font-bold flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 shrink-0" />
                  <span>Unsaved local draft found</span>
                </div>
                <div className="text-xs opacity-90">
                  Saved{" "}
                  {savedLocalDraft.savedAt
                    ? new Date(savedLocalDraft.savedAt).toLocaleString()
                    : "recently"}{" "}
                  (base rev {savedLocalDraft.baseRev}).
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    applyDrugRecordToForm(savedLocalDraft.data);
                    setSavedLocalDraft(null);
                  }}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Restore Draft
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      clearLocalDrugDraftsForUid(window.localStorage, effectiveDraftUid);
                    }
                    setSavedLocalDraft(null);
                  }}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl border border-amber-500/40 hover:bg-amber-500/15 text-xs font-bold transition-colors cursor-pointer"
                >
                  Discard
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: GENERAL & CLASSES */}
          {activeTab === "general" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Drug ID (unique key)
                  </label>
                  <input
                    type="text"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder="e.g. levetiracetam-oral"
                    required
                  />
                  <span className="text-xs text-slate-400 mt-1 block">
                    Lowercase letters, numbers, hyphens only.
                  </span>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Generic Name
                  </label>
                  <input
                    type="text"
                    value={genericName}
                    onChange={(e) => setGenericName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder="e.g. levetiracetam (oral: tablets & oral solution)"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Tall Man / Display Name
                  </label>
                  <input
                    type="text"
                    value={tallMan}
                    onChange={(e) => setTallMan(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder="e.g. levetiracetam"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Verification Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="draft">Draft (Pending Verification)</option>
                    <option value="verified">
                      Verified (Clinically Verified)
                    </option>
                    <option value="retired">Retired (Archived)</option>
                  </select>
                </div>
              </div>

              {status === "verified" && (
                <div>
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Verified By (Clinical Reviewer)
                  </label>
                  <input
                    type="text"
                    value={verifiedBy}
                    onChange={(e) => setVerifiedBy(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder="e.g. Dr. Nguyen Van A, MD / Admin"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Pharmacologic Classes (comma separated)
                </label>
                <input
                  type="text"
                  value={classesText}
                  onChange={(e) => setClassesText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  placeholder="e.g. Antiepileptic Drug (AED), SV2A Ligand"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Neurological Subspecialties
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_SUBSPECIALTIES.map((sub) => {
                    const active = subspecialties.includes(sub.id);
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => toggleSubspecialty(sub.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer ${
                          active
                            ? "bg-sky-500 text-white border-sky-600 shadow-xs"
                            : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400"
                        }`}
                      >
                        {active && "✓ "}
                        {sub.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DOSING REGIMENS */}
          {activeTab === "dosing" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
                <div>
                  <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                    Clinical Indications &amp; Dosing Regimens ({regimens.length})
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Each clinical indication has its own dosage formula and clinical instructions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddRegimen}
                  className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Indication</span>
                </button>
              </div>

              <div className="space-y-4">
                {regimens.map((reg, idx) => (
                  <div
                    key={idx}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-3.5"
                  >
                    {/* Regimen Card Header */}
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-200">
                          {reg.indication || `Indication #${idx + 1}`}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {reg.route}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {reg.setting === "acute_inpatient"
                            ? "Acute / Inpatient"
                            : "Maintenance / Outpatient"}
                        </span>
                      </div>

                      {regimens.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRegimen(idx)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete this regimen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Indication Title */}
                    <div>
                      <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Indication / Clinical Condition:
                      </label>
                      <input
                        type="text"
                        value={reg.indication}
                        onChange={(e) =>
                          handleUpdateRegimen(idx, {
                            indication: e.target.value,
                          })
                        }
                        placeholder="e.g. Partial-Onset Seizures in Adults 16 Years of Age and Older"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>

                    {/* Setting & Route */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                          Clinical Setting:
                        </label>
                        <select
                          value={reg.setting}
                          onChange={(e) =>
                            handleUpdateRegimen(idx, {
                              setting: e.target.value as any,
                            })
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-sky-500"
                        >
                          <option value="maintenance_outpatient">
                            Maintenance / Outpatient
                          </option>
                          <option value="acute_inpatient">
                            Acute / Inpatient
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                          Route of Administration:
                        </label>
                        <select
                          value={reg.route}
                          onChange={(e) =>
                            handleUpdateRegimen(idx, {
                              route: e.target.value as any,
                            })
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-sky-500"
                        >
                          <option value="PO">PO (Oral)</option>
                          <option value="IV">IV (Intravenous)</option>
                          <option value="IM">IM (Intramuscular)</option>
                          <option value="SC">SC (Subcutaneous)</option>
                          <option value="NG">NG (Enteral / Tube)</option>
                          <option value="TD">TD (Transdermal)</option>
                        </select>
                      </div>
                    </div>

                    {/* Computable Dose Section */}
                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                          <input
                            type="checkbox"
                            checked={Boolean(reg.dose)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleUpdateRegimenDose(idx, {
                                  kind: "fixed",
                                  amount: 500,
                                  unit: "mg",
                                  frequency: "twice daily",
                                });
                              } else {
                                handleUpdateRegimenDose(idx, null);
                              }
                            }}
                            className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                          />
                          <span>Enable Bedside Computable Formula</span>
                        </label>
                        {reg.dose && (
                          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            Formula: {reg.dose.amount} {reg.dose.unit}{" "}
                            {reg.dose.frequency}
                          </span>
                        )}
                      </div>

                      {reg.dose && (
                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 pt-1 text-xs">
                          <div>
                            <span className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                              Type:
                            </span>
                            <select
                              value={reg.dose.kind}
                              onChange={(e) =>
                                handleUpdateRegimenDose(idx, {
                                  kind: e.target.value as any,
                                })
                              }
                              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm"
                            >
                              <option value="fixed">Fixed</option>
                              <option value="per_kg">Weight (/kg)</option>
                            </select>
                          </div>
                          <div>
                            <span className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                              Amount:
                            </span>
                            <input
                              type="number"
                              step="any"
                              value={reg.dose.amount}
                              onChange={(e) =>
                                handleUpdateRegimenDose(idx, {
                                  amount: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs sm:text-sm"
                            />
                          </div>
                          <div>
                            <span className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                              Unit:
                            </span>
                            <input
                              type="text"
                              value={reg.dose.unit}
                              onChange={(e) =>
                                handleUpdateRegimenDose(idx, {
                                  unit: e.target.value as any,
                                })
                              }
                              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs sm:text-sm"
                              placeholder="mg"
                            />
                          </div>
                          <div>
                            <span className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                              Frequency:
                            </span>
                            <input
                              type="text"
                              value={reg.dose.frequency}
                              onChange={(e) =>
                                handleUpdateRegimenDose(idx, {
                                  frequency: e.target.value,
                                })
                              }
                              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm"
                              placeholder="twice daily"
                            />
                          </div>
                          <div>
                            <span className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                              Max Single:
                            </span>
                            <input
                              type="number"
                              value={reg.dose.max_single ?? ""}
                              onChange={(e) =>
                                handleUpdateRegimenDose(idx, {
                                  max_single: e.target.value
                                    ? parseFloat(e.target.value)
                                    : undefined,
                                })
                              }
                              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs sm:text-sm"
                              placeholder="Optional"
                            />
                          </div>
                          <div>
                            <span className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                              Max Daily:
                            </span>
                            <input
                              type="number"
                              value={reg.dose.max_daily ?? ""}
                              onChange={(e) =>
                                handleUpdateRegimenDose(idx, {
                                  max_daily: e.target.value
                                    ? parseFloat(e.target.value)
                                    : undefined,
                                })
                              }
                              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs sm:text-sm"
                              placeholder="Optional"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SMART CLINICAL SENTENCE GENERATOR */}
                    <div className="p-3.5 sm:p-4 rounded-xl bg-sky-500/10 border border-sky-500/20 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-sky-800 dark:text-sky-300">
                          <Wand2 className="w-4 h-4 text-sky-500" />
                          <span>Smart Dosing Sentence Builder</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-slate-500 mr-1">
                            Templates:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleApplyPreset(idx, "oral_titration")}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-sky-500 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs cursor-pointer"
                          >
                            Oral Titration
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyPreset(idx, "iv_bolus")}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-sky-500 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs cursor-pointer"
                          >
                            IV Bolus + Infusion
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyPreset(idx, "fixed_daily")}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-sky-500 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs cursor-pointer"
                          >
                            Fixed Daily
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                            1. Starting Dose:
                          </label>
                          <input
                            type="text"
                            value={builders[idx]?.startingDose || ""}
                            onChange={(e) =>
                              updateBuilderField(idx, "startingDose", e.target.value)
                            }
                            placeholder="e.g. 500 mg twice daily (1000 mg/day)"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                            2. Titration Increment:
                          </label>
                          <input
                            type="text"
                            value={builders[idx]?.titration || ""}
                            onChange={(e) =>
                              updateBuilderField(idx, "titration", e.target.value)
                            }
                            placeholder="e.g. Increase by 500 mg twice daily every 2 weeks"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                            3. Target / Max Dose:
                          </label>
                          <input
                            type="text"
                            value={builders[idx]?.targetDose || ""}
                            onChange={(e) =>
                              updateBuilderField(idx, "targetDose", e.target.value)
                            }
                            placeholder="e.g. to maximum 1500 mg twice daily (3000 mg/day)"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                          4. Administration &amp; Patient Instructions (optional):
                        </label>
                        <input
                          type="text"
                          value={builders[idx]?.adminNotes || ""}
                          onChange={(e) =>
                            updateBuilderField(idx, "adminNotes", e.target.value)
                          }
                          placeholder="e.g. Swallow whole with water; do not chew or crush. Take with or without food."
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm"
                        />
                      </div>
                    </div>

                    {/* Resulting Clinical Guidance Text */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                        <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Complete Clinical Guidance Sentence (`dose_text`):
                        </label>
                        <span className="text-xs text-slate-400">
                          Auto-composed above; fine-tuning permitted below.
                        </span>
                      </div>
                      <textarea
                        value={reg.dose_text || ""}
                        onChange={(e) =>
                          handleUpdateRegimen(idx, {
                            dose_text: e.target.value,
                          })
                        }
                        placeholder="e.g. Initiate 500 mg twice daily (1000 mg/day). Increase by 500 mg twice daily every 2 weeks to maximum 1500 mg twice daily (3000 mg/day)..."
                        rows={3}
                        className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm leading-relaxed focus:ring-2 focus:ring-sky-500 focus:outline-none resize-y"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* IV Infusion Protocol Section */}
              <div className="p-4 sm:p-5 rounded-2xl border border-sky-500/20 bg-sky-500/5 space-y-3.5">
                <div className="flex items-center gap-2 font-bold text-xs sm:text-sm uppercase tracking-wider text-sky-700 dark:text-sky-300">
                  <Syringe className="w-4 h-4 text-sky-500" />
                  <span>IV Preparation &amp; Infusion Protocol (Optional for IV drugs)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Diluent &amp; Reconstitution:
                    </label>
                    <input
                      type="text"
                      value={ivDiluent}
                      onChange={(e) => setIvDiluent(e.target.value)}
                      placeholder="e.g. Reconstitute with Sterile Water for Injection (SWFI) to 1 mg/mL"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Infusion Rate:
                    </label>
                    <input
                      type="text"
                      value={ivRate}
                      onChange={(e) => setIvRate(e.target.value)}
                      placeholder="e.g. 10% bolus over 1 min; remainder 90% infused over 60 mins"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Preparation &amp; Administration Instructions:
                  </label>
                  <textarea
                    value={ivInstructions}
                    onChange={(e) => setIvInstructions(e.target.value)}
                    placeholder="Instructions for infusion solution preparation, extravasation management, and storage..."
                    rows={2}
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm leading-relaxed resize-y focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RENAL & HEPATIC */}
          {activeTab === "renal_hepatic" && (
            <div className="space-y-5">
              {/* General Renal Impairment Guidance */}
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Renal Impairment Guidance (General Note)
                  </label>
                  <textarea
                    value={renalDesc}
                    onChange={(e) => setRenalDesc(e.target.value)}
                    placeholder="No dosage adjustment necessary for renal impairment. Or adjust dosage based on patient's estimated Creatinine Clearance (CrCl)..."
                    rows={3}
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 leading-relaxed focus:ring-2 focus:ring-sky-500 focus:outline-none resize-none text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Renal Clearance Basis
                    </label>
                    <select
                      value={renalBasis}
                      onChange={(e) => setRenalBasis(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm font-semibold"
                    >
                      <option value="cg_abw">
                        Cockcroft-Gault (Actual Body Weight - ABW)
                      </option>
                      <option value="cg_normalized_1_73">
                        Cockcroft-Gault normalized to BSA (1.73 m²)
                      </option>
                      <option value="egfr">eGFR (CKD-EPI)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Hemodialysis / ESRD Instructions
                    </label>
                    <input
                      type="text"
                      value={hemodialysisText}
                      onChange={(e) => setHemodialysisText(e.target.value)}
                      placeholder="e.g. Administer 500 - 1000 mg every 24h. Supplemental 250 - 500 mg post-dialysis"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* CrCl RENAL ADJUSTMENT BANDS SECTION */}
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-sky-500" />
                      <h4 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-200">
                        CrCl Renal Adjustment Bands ({renalBands.length})
                      </h4>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      Stratified CrCl ranges (mL/min) and corresponding dosage adjustments based on renal function.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleLoadStandardCrclBands}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-sky-500 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      title="Load standard CKD staging: >80, 50-80, 30-50, <30 mL/min"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Standard Preset</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddRenalBand}
                      className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add CrCl Band</span>
                    </button>
                  </div>
                </div>

                {renalBands.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs sm:text-sm text-slate-400 space-y-1">
                    <p className="font-medium">No renal adjustment bands defined yet.</p>
                    <p className="text-xs">
                      Click <strong>Add CrCl Band</strong> to create an interval or <strong>Standard Preset</strong> to load standard 4-stage CKD tiers.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {renalBands.map((band, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400">
                              Band #{idx + 1}
                            </span>
                            <span className="font-mono font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                              CrCl:{" "}
                              {band.min === null || band.min === ("" as any)
                                ? `< ${band.max}`
                                : band.max === null || band.max === ("" as any)
                                ? `> ${band.min}`
                                : `${band.min} – ${band.max}`}{" "}
                              mL/min
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveRenalBand(idx)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete this CrCl band"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Min and Max CrCl range inputs */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                              Min CrCl (mL/min) <span className="font-normal text-slate-400">(leave empty if &lt; Max)</span>:
                            </label>
                            <input
                              type="number"
                              value={band.min ?? ""}
                              onChange={(e) =>
                                handleUpdateRenalBand(idx, {
                                  min:
                                    e.target.value === ""
                                      ? null
                                      : parseFloat(e.target.value),
                                })
                              }
                              placeholder="e.g. 50 (or empty)"
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs sm:text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                              Max CrCl (mL/min) <span className="font-normal text-slate-400">(leave empty if &gt; Min)</span>:
                            </label>
                            <input
                              type="number"
                              value={band.max ?? ""}
                              onChange={(e) =>
                                handleUpdateRenalBand(idx, {
                                  max:
                                    e.target.value === ""
                                      ? null
                                      : parseFloat(e.target.value),
                                })
                              }
                              placeholder="e.g. 80 (or empty)"
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs sm:text-sm"
                            />
                          </div>
                        </div>

                        {/* Dose Text description for this band */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                            Dose Adjustment Instruction for this Band (`dose_text`):
                          </label>
                          <input
                            type="text"
                            value={band.dose_text}
                            onChange={(e) =>
                              handleUpdateRenalBand(idx, {
                                dose_text: e.target.value,
                              })
                            }
                            placeholder="e.g. 500 to 1,000 mg every 12 hours, or 50% standard maintenance dose"
                            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Hepatic Impairment */}
              <div>
                <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Hepatic Impairment Guidance
                </label>
                <textarea
                  value={hepaticText}
                  onChange={(e) => setHepaticText(e.target.value)}
                  placeholder="No dosage adjustment necessary for mild-to-moderate impairment. For severe impairment (Child-Pugh C), reduce maintenance dose by 50% if renal clearance is also reduced."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 leading-relaxed focus:ring-2 focus:ring-sky-500 focus:outline-none resize-none text-sm"
                />
              </div>
            </div>
          )}

          {/* TAB 4: SAFETY & CYP */}
          {activeTab === "safety" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  FDA Black Box Warnings (one per line)
                </label>
                <textarea
                  value={blackBoxText}
                  onChange={(e) => setBlackBoxText(e.target.value)}
                  placeholder="Leave empty if no black box warning applies"
                  rows={3}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 leading-relaxed focus:ring-2 focus:ring-sky-500 focus:outline-none resize-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    CYP3A4
                  </label>
                  <select
                    value={cyp3a4}
                    onChange={(e) => setCyp3a4(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="none">none</option>
                    <option value="substrate">substrate</option>
                    <option value="inhibitor_weak">inhibitor (weak)</option>
                    <option value="inhibitor_strong">inhibitor (strong)</option>
                    <option value="inducer_weak">inducer (weak)</option>
                    <option value="inducer_strong">inducer (strong)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    CYP2C19
                  </label>
                  <select
                    value={cyp2c19}
                    onChange={(e) => setCyp2c19(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="none">none</option>
                    <option value="substrate">substrate</option>
                    <option value="inhibitor_weak">inhibitor (weak)</option>
                    <option value="inhibitor_strong">inhibitor (strong)</option>
                    <option value="inducer_weak">inducer (weak)</option>
                    <option value="inducer_strong">inducer (strong)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    P-gp
                  </label>
                  <select
                    value={pgp}
                    onChange={(e) => setPgp(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="none">none</option>
                    <option value="substrate">substrate</option>
                    <option value="inhibitor">inhibitor</option>
                    <option value="inducer">inducer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    QT Prolongation
                  </label>
                  <select
                    value={qtRisk}
                    onChange={(e) => setQtRisk(e.target.value as QtRiskTier)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="none">none</option>
                    <option value="conditional">conditional</option>
                    <option value="possible">possible</option>
                    <option value="known">known</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Myasthenia Gravis Safety
                  </label>
                  <select
                    value={mgSafety}
                    onChange={(e) => setMgSafety(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="safe">
                      Safe (No neuromuscular junction impairment)
                    </option>
                    <option value="caution">
                      Caution (Use with close monitoring)
                    </option>
                    <option value="may_worsen">
                      May Worsen (Exacerbates muscle weakness)
                    </option>
                    <option value="avoid">
                      Avoid (Contraindicated in Myasthenia Gravis)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    ACB Score (Anticholinergic Burden: 0 - 3)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="3"
                    value={acbScore}
                    onChange={(e) =>
                      setAcbScore(parseInt(e.target.value, 10) || 0)
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PREGNANCY & LACTATION */}
          {activeTab === "pregnancy" && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 text-xs sm:text-sm">
                <span className="font-bold text-rose-800 dark:text-rose-300 block mb-1">
                  🤰 Reproductive, Pregnancy &amp; Lactation Timeline
                </span>
                <p className="text-rose-700 dark:text-rose-400">
                  Single source of truth synced to both the Drug Detail view and Pregnancy &amp; Lactation tab. Mark conditional fields as N/A when not clinically applicable.
                </p>
              </div>

              {/* Stage 1: Preconception Planning */}
              <div className="p-4 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/10 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                    Preconception Planning
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Optional / Condition-specific
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Folic Acid Supplementation
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={folicAcidNa}
                        onChange={(e) => setFolicAcidNa(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Not applicable (N/A)</span>
                    </label>
                  </div>
                  <textarea
                    rows={2}
                    disabled={folicAcidNa}
                    value={folicAcidNa ? "" : folicAcid}
                    onChange={(e) => setFolicAcid(e.target.value)}
                    placeholder={
                      folicAcidNa
                        ? "Marked as not clinically applicable"
                        : "e.g. High-dose folic acid (4-5 mg/day) preconception and through first trimester..."
                    }
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Contraceptive Interactions &amp; Family Planning
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={contraceptionNa}
                        onChange={(e) => setContraceptionNa(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Not applicable (N/A)</span>
                    </label>
                  </div>
                  <textarea
                    rows={2}
                    disabled={contraceptionNa}
                    value={contraceptionNa ? "" : contraception}
                    onChange={(e) => setContraception(e.target.value)}
                    placeholder={
                      contraceptionNa
                        ? "Marked as not clinically applicable"
                        : "e.g. Enzyme-inducing interactions with hormonal contraceptives; recommend non-hormonal IUD..."
                    }
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900"
                  />
                </div>
              </div>

              {/* Stage 2: Pregnancy Safety, PK & Malformations */}
              <div className="p-4 rounded-2xl border border-rose-200/80 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/10 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                    Pregnancy Safety, Pharmacokinetics &amp; Malformations
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Core classification &amp; registry data
                  </span>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Pregnancy Safety Tier
                  </label>
                  <select
                    value={pregnancyTier}
                    onChange={(e) => setPregnancyTier(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="none">None / Not Specified</option>
                    <option value="preferred">Preferred (Lowest recognized malformation risk in class)</option>
                    <option value="caution">Caution (Use with monitoring / intermediate risk)</option>
                    <option value="avoid">Avoid (Contraindicated / Major teratogenic risk)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Pregnancy Pharmacokinetics &amp; Therapeutic Drug Monitoring
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={pregnancyPkNa}
                        onChange={(e) => setPregnancyPkNa(e.target.checked)}
                        className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span>Not applicable (N/A)</span>
                    </label>
                  </div>
                  <textarea
                    rows={2}
                    disabled={pregnancyPkNa}
                    value={pregnancyPkNa ? "" : pregnancyPk}
                    onChange={(e) => setPregnancyPk(e.target.value)}
                    placeholder={
                      pregnancyPkNa
                        ? "Marked as not clinically applicable"
                        : "e.g. Clearance increases significantly during 2nd/3rd trimesters; monitor serum levels monthly..."
                    }
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm leading-relaxed focus:ring-2 focus:ring-rose-500 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900"
                  />
                </div>

                {/* MCM Registry Entries */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Major Congenital Malformations (MCM per Registry)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setMcmList((prev) => [
                          ...prev,
                          { registry: "", percent: 0, ci95: "", n_exposed: undefined, dose_stratum: "", refs: [] },
                        ])
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Registry</span>
                    </button>
                  </div>

                  {mcmList.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                      No registry MCM entries added. Click &quot;Add Registry&quot; if cohort/registry malformation rates are available.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {mcmList.map((entry, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-2"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                            <input
                              type="text"
                              value={entry.registry}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMcmList((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, registry: val } : item))
                                );
                              }}
                              placeholder="Registry (e.g. EURAP, NAAED)"
                              className="sm:col-span-5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                            />
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={entry.percent}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setMcmList((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, percent: Number.isNaN(val) ? 0 : val } : item
                                  )
                                );
                              }}
                              placeholder="MCM %"
                              className="sm:col-span-2 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                            />
                            <input
                              type="text"
                              value={entry.ci95 || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMcmList((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, ci95: val } : item))
                                );
                              }}
                              placeholder="95% CI (e.g. 1.6%–3.1%)"
                              className="sm:col-span-4 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setMcmList((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="sm:col-span-1 p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center cursor-pointer"
                              title="Remove registry entry"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="number"
                              min="0"
                              value={entry.n_exposed ?? ""}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const val = raw ? parseInt(raw, 10) : undefined;
                                setMcmList((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, n_exposed: val } : item))
                                );
                              }}
                              placeholder="Exposed pregnancies (n)"
                              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                            />
                            <input
                              type="text"
                              value={entry.dose_stratum || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMcmList((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, dose_stratum: val } : item))
                                );
                              }}
                              placeholder="Dose stratum (e.g. first-trimester monotherapy)"
                              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Stage 3: Postpartum Dose Adjustment */}
              <div className="p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Postpartum
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Optional / TDM-guided drugs
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Postpartum Management
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={postpartumNa}
                        onChange={(e) => setPostpartumNa(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Not applicable (N/A)</span>
                    </label>
                  </div>
                  <textarea
                    rows={2}
                    disabled={postpartumNa}
                    value={postpartumNa ? "" : postpartum}
                    onChange={(e) => setPostpartum(e.target.value)}
                    placeholder={
                      postpartumNa
                        ? "Marked as not clinically applicable"
                        : "e.g. Taper dose back toward pre-pregnancy baseline within 10–14 days postpartum to prevent toxicity..."
                    }
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm leading-relaxed focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900"
                  />
                </div>
              </div>

              {/* Stage 4: Lactation & Infant Exposure */}
              <div className="p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Lactation &amp; Infant Exposure
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Core breastfeeding data
                  </span>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Relative Infant Dose (RID)
                  </label>
                  <input
                    type="text"
                    value={lactationRid}
                    onChange={(e) => setLactationRid(e.target.value)}
                    placeholder="e.g. 1% to 2% (RID < 10% is generally compatible)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Lactation Safety Summary
                  </label>
                  <textarea
                    rows={3}
                    value={lactationSummary}
                    onChange={(e) => setLactationSummary(e.target.value)}
                    placeholder="e.g. Excreted into human milk in low concentrations; monitor infant for sedation or poor feeding..."
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm leading-relaxed focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: FDA DRUG INTERACTIONS */}
          {activeTab === "interactions" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
                <div>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm sm:text-base block">
                    ⚡ FDA Prescribing Information Interactions (Section 7)
                  </span>
                  <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Document critical drug-drug interactions with both neurological and non-neurological co-medications (antimicrobials, contraceptives, cardiac agents).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddInteraction}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Interaction</span>
                </button>
              </div>

              {interactionsList.length === 0 ? (
                <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    No specific FDA Section 7 interactions recorded for this drug yet.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddInteraction}
                    className="px-4 py-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add First Interaction</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {interactionsList.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                              Interacting Drug or Class #{idx + 1}
                            </label>
                            <input
                              type="text"
                              value={item.drug_or_class}
                              onChange={(e) =>
                                handleUpdateInteraction(idx, "drug_or_class", e.target.value)
                              }
                              placeholder="e.g. Carbapenem Antibiotics (Meropenem, Imipenem)"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-purple-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                              Severity Tier
                            </label>
                            <select
                              value={item.severity || "major"}
                              onChange={(e) =>
                                handleUpdateInteraction(idx, "severity", e.target.value as any)
                              }
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-purple-500"
                            >
                              <option value="contraindicated">🔴 Contraindicated</option>
                              <option value="major">🟠 Major</option>
                              <option value="moderate">🟡 Moderate</option>
                              <option value="minor">⚪ Minor</option>
                            </select>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveInteraction(idx)}
                          className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer self-start mt-6"
                          title="Remove interaction"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                          Clinical Effect / Pharmacokinetic Impact
                        </label>
                        <textarea
                          rows={2}
                          value={item.effect}
                          onChange={(e) =>
                            handleUpdateInteraction(idx, "effect", e.target.value)
                          }
                          placeholder="e.g. Clinically significant reduction in serum valproic acid concentrations (often by 60-90%), resulting in rapid loss of seizure control."
                          className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm leading-relaxed focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1.5">
                          Clinical Management &amp; Dosage Recommendation
                        </label>
                        <textarea
                          rows={2}
                          value={item.management}
                          onChange={(e) =>
                            handleUpdateInteraction(idx, "management", e.target.value)
                          }
                          placeholder="e.g. Avoid concomitant use. Alternative antibacterial or anticonvulsant therapy should be considered if carbapenems are required."
                          className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm leading-relaxed focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          </div>

          {/* Modal Footer */}
          <div className="shrink-0 px-4 py-3.5 sm:px-6 sm:py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer text-xs sm:text-sm"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="min-h-[44px] px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50 cursor-pointer text-xs sm:text-sm"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving &amp; Updating...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save &amp; Update Now</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {conflictState && (
        <ConflictDialog
          isOpen={true}
          base={baseDrugSnapshot}
          mine={conflictState.mine}
          cloudRow={conflictState.cloudRow}
          baseRev={conflictState.baseRev}
          submitting={conflictState.submitting}
          error={conflictState.error}
          darkMode={darkMode}
          onResolve={handleResolveConflict}
          onCancel={() => setConflictState(null)}
        />
      )}
    </div>
  );
}
