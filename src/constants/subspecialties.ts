export interface SubspecialtyItem {
  label: string;
  value: string;
}

export const SUBSPECIALTY_LIST = [
  "All Subspecialties",
  "Stroke",
  "Neurocritical Care",
  "Epilepsy",
  "Dementia",
  "Neuroimmunology",
  "Neuromuscular",
  "Movement Disorders",
  "Headache & Pain",
  "CNS Infections",
  "Neuro-Oncology",
  "Other",
] as const;

export type SubspecialtyType = (typeof SUBSPECIALTY_LIST)[number];

export const SUBSPECIALTY_TABS: SubspecialtyItem[] = [
  { label: "All Subspecialties", value: "All" },
  { label: "Stroke", value: "Stroke" },
  { label: "Neurocritical Care", value: "Neurocritical Care" },
  { label: "Epilepsy", value: "Epilepsy" },
  { label: "Dementia", value: "Dementia" },
  { label: "Neuroimmunology", value: "Neuroimmunology" },
  { label: "Neuromuscular", value: "Neuromuscular" },
  { label: "Movement Disorders", value: "Movement Disorders" },
  { label: "Headache & Pain", value: "Headache & Pain" },
  { label: "CNS Infections", value: "CNS Infections" },
  { label: "Neuro-Oncology", value: "Neuro-Oncology" },
  { label: "Other", value: "Other" },
];
