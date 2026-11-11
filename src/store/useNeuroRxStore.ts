// Zustand store for NeuroRx patient context
// Reference: SPEC-neurorx.md Section 6 & NEURORX-GUARDRAILS.md (G2)
// Pure in-memory session store — NO LOCALSTORAGE (zero persistence of patient identifiers)

import { create } from "zustand";
import type { PatientInput, PatientParsed } from "@/lib/neurorx/patient";
import { parsePatient } from "@/lib/neurorx/patient";

export interface NeuroRxStoreState {
  patientInput: PatientInput;
  patientParsed: PatientParsed;
  errors: string[];

  // Actions
  setField: <K extends keyof PatientInput>(field: K, value: PatientInput[K]) => void;
  setPatient: (input: PatientInput) => void;
  initFromSearchParams: (searchParams: URLSearchParams) => void;
  clearPatient: () => void;
}

const DEFAULT_INPUT: PatientInput = {
  ageYears: undefined,
  sex: undefined,
  weightKg: undefined,
  heightCm: undefined,
  scr: undefined,
  crclManual: undefined,
  onHemodialysis: false,
};

const INITIAL_PARSED = parsePatient(DEFAULT_INPUT);

export const useNeuroRxStore = create<NeuroRxStoreState>((set) => ({
  patientInput: DEFAULT_INPUT,
  patientParsed: INITIAL_PARSED.patient,
  errors: INITIAL_PARSED.errors,

  setField: (field, value) =>
    set((state) => {
      const nextInput = { ...state.patientInput, [field]: value };
      const res = parsePatient(nextInput);
      return {
        patientInput: nextInput,
        patientParsed: res.patient,
        errors: res.errors,
      };
    }),

  setPatient: (input) =>
    set(() => {
      const res = parsePatient(input);
      return {
        patientInput: input,
        patientParsed: res.patient,
        errors: res.errors,
      };
    }),

  initFromSearchParams: (searchParams) =>
    set((state) => {
      const nextInput = { ...state.patientInput };

      const w = searchParams.get("w");
      if (w) {
        const val = parseFloat(w);
        if (!isNaN(val) && val > 0) nextInput.weightKg = val;
      }

      const crcl = searchParams.get("crcl");
      if (crcl) {
        const val = parseFloat(crcl);
        if (!isNaN(val) && val > 0) nextInput.crclManual = val;
      }

      const scr = searchParams.get("scr");
      if (scr) {
        const isMgDl = scr.toLowerCase().includes("mgdl");
        const numVal = parseFloat(scr);
        if (!isNaN(numVal) && numVal > 0) {
          nextInput.scr = {
            value: numVal,
            unit: isMgDl ? "mg/dL" : "umol/L",
          };
        }
      }

      const age = searchParams.get("age");
      if (age) {
        const val = parseInt(age, 10);
        if (!isNaN(val) && val >= 0) nextInput.ageYears = val;
      }

      const sex = searchParams.get("sex");
      if (sex === "male" || sex === "female") {
        nextInput.sex = sex;
      }

      const ht = searchParams.get("ht");
      if (ht) {
        const val = parseFloat(ht);
        if (!isNaN(val) && val > 0) nextInput.heightCm = val;
      }

      const res = parsePatient(nextInput);
      return {
        patientInput: nextInput,
        patientParsed: res.patient,
        errors: res.errors,
      };
    }),

  clearPatient: () =>
    set(() => ({
      patientInput: DEFAULT_INPUT,
      patientParsed: INITIAL_PARSED.patient,
      errors: [],
    })),
}));
