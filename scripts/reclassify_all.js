const fs = require('fs');
const path = require('path');

const SUBSPECIALTY_RULES = [
  ['Stroke', /\b(stroke|ischemic|infarction|thrombectomy|thrombolysis|tenecteplase|alteplase|intracerebral hemorrhage|subarachnoid hemorrhage|intracranial bleeding|intracranial hemorrhage|aneurysm|carotid|endovascular|neurovascular|cerebral ischemia|small vessel disease|cerebral amyloid angiopathy|cavernous malformation|arteriovenous malformation|venous sinus thrombosis)\b/i],
  ['Neurocritical Care', /\b(neurocritical|intensive care|critical care|status epilepticus|intracranial pressure|cerebral edema|coma|unresponsive wakefulness|minimally conscious|brain death|targeted temperature|post-cardiac arrest|mechanical ventilation|extubation|neuro-icu|delirium|traumatic brain injury|tbi|concussion|head injury|head trauma)\b/i],
  ['Epilepsy', /\b(epilep\w*|seizure\w*|antiseizure|ictal|interictal|dravet|lennox-gastaut|focal cortical dysplasia|sudep)\b/i],
  ['Dementia', /\b(alzheimer\w*|dementia|amyloid|tau|p-tau\w*|lecanemab|donanemab|cognitive decline|cognitive impairment|frontotemporal|lewy body|apoe|memory clinic|normal pressure hydrocephalus)\b/i],
  ['Neuroimmunology', /\b(multiple sclerosis|demyelinating|neuromyelitis|nmosd|mogad|mog antibody|autoimmune encephalitis|myelitis|transverse myelitis|optic neuritis|neurosarcoidosis|cns vasculitis|natalizumab|ocrelizumab|ofatumumab|remibrutinib)\b/i],
  ['Neuromuscular', /\b(myasthenia|neuropath\w*|polyneuropathy|guillain-barr\w*|cidp|als|amyotrophic lateral sclerosis|motor neuron|myopath\w*|muscular dystrophy|spinal muscular atrophy|charcot-marie-tooth|radiculopathy|plexopathy|foot drop|efgartigimod|tofersen|nusinersen)\b/i],
  ['Movement Disorders', /\b(parkinson\w*|tremor|ataxia|dystonia|chorea|huntington\w*|dyskinesia|synuclein|alpha-synuclein|levodopa|deep brain stimulation|progressive supranuclear palsy|multiple system atrophy|tourette)\b/i],
  ['Headache & Pain', /\b(migraine|headache|cluster headache|trigeminal neuralgia|cgrp|ubrogepant|atogepant|rimegepant|erenumab|fremanezumab|galcanezumab|neuropathic pain|chronic pain|idiopathic intracranial hypertension)\b/i],
  ['CNS Infections', /\b(meningit\w*|meningoencephalit\w*|brain abscess|epidural abscess|subdural empyema|tuberculous meningitis|cns tuberculosis|neurosyphilis|herpes simplex virus encephalitis|hsv encephalitis|cryptococc\w*|cerebral toxoplasmosis|varicella zoster\w*|vzv encephalitis|neurocysticercosis|arbovirus|japanese encephalitis|lyme neuroborreliosis|neuroborreliosis|progressive multifocal leukoencephalopathy|pml|cerebral malaria|rabies|ventriculit\w*|cns viral infection|cns bacterial infection|cns fungal infection|cns parasitic infection|cns infection|infectious encephalitis)\b/i],
  ['Neuro-Oncology', /\b(glioblastoma|glioma|meningioma|astrocytoma|oligodendroglioma|medulloblastoma|brain tumor|brain metastasis|brain metastases|cns lymphoma|primary central nervous system lymphoma|neuro-oncology|schwannoma|ependymoma|spinal mass)\b/i]
];

function classifyArticle(title, abstract) {
  const matched = [];
  for (const [sub, rx] of SUBSPECIALTY_RULES) {
    if (rx.test(title)) matched.push(sub);
  }
  const corpus = (title + ' ' + (abstract || '')).toLowerCase();
  for (const [sub, rx] of SUBSPECIALTY_RULES) {
    if (!matched.includes(sub) && rx.test(corpus)) {
      matched.push(sub);
    }
  }
  if (matched.length === 0) matched.push('Other');
  return matched;
}

// 1. Reclassify articles.json
const articlesPath = path.join(__dirname, '..', 'public', 'data', 'articles.json');
const articles = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));
const artCounts = {};
for (const a of articles) {
  const matched = classifyArticle(a.title, a.abstract);
  if (!a.neurology_classification) a.neurology_classification = {};
  a.neurology_classification.subspecialty = matched[0];
  a.neurology_classification.subspecialties = matched.slice(0, 3);
  artCounts[matched[0]] = (artCounts[matched[0]] || 0) + 1;
}
const articlesTmp = path.join(__dirname, '..', 'public', 'data', 'articles.tmp.json');
fs.writeFileSync(articlesTmp, JSON.stringify(articles, null, 2), 'utf8');
fs.renameSync(articlesTmp, articlesPath);
console.log('Reclassified articles:', JSON.stringify(artCounts, null, 2));

// 2. Reclassify cases.json
const casesPath = path.join(__dirname, '..', 'public', 'data', 'cases.json');
const cases = JSON.parse(fs.readFileSync(casesPath, 'utf8'));
const caseCounts = {};
for (const c of cases) {
  const text = [
    c.title,
    c.presentation?.chief_complaint,
    c.presentation?.history_of_present_illness,
    c.resolution?.final_diagnosis,
    c.resolution?.clinical_discussion,
    ...(c.resolution?.related_keywords || [])
  ].filter(Boolean).join(' ');

  let newSub = c.subspecialty;
  if (newSub === 'Vascular & Stroke') newSub = 'Stroke';
  if (newSub === 'Cognitive & Dementia') newSub = 'Dementia';
  if (newSub === 'Traumatic Brain Injury (TBI)') newSub = 'Neurocritical Care';

  const matched = classifyArticle(c.title + ' ' + (c.resolution?.final_diagnosis || ''), text);
  if (matched.length > 0 && matched[0] !== 'Other') {
    newSub = matched[0];
  }

  c.subspecialty = newSub;
  c.subspecialties = (c.subspecialties || []).map(s => {
    if (s === 'Vascular & Stroke') return 'Stroke';
    if (s === 'Cognitive & Dementia') return 'Dementia';
    if (s === 'Traumatic Brain Injury (TBI)') return 'Neurocritical Care';
    return s;
  });
  if (!c.subspecialties.includes(newSub)) {
    c.subspecialties = [newSub, ...c.subspecialties.filter(s => s !== newSub)];
  }

  caseCounts[c.subspecialty] = (caseCounts[c.subspecialty] || 0) + 1;
}
const casesTmp = path.join(__dirname, '..', 'public', 'data', 'cases.tmp.json');
fs.writeFileSync(casesTmp, JSON.stringify(cases, null, 2), 'utf8');
fs.renameSync(casesTmp, casesPath);
console.log('Reclassified cases:', JSON.stringify(caseCounts, null, 2));
