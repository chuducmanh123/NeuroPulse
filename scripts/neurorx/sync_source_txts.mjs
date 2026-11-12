import fs from 'fs';
import path from 'path';

const sourcesDir = 'data/neurorx/sources';
const jsonFiles = fs.readdirSync(sourcesDir).filter(f => f.startsWith('fda-') && f.endsWith('.json'));

let appendedCount = 0;

for (const jf of jsonFiles) {
  const tf = jf.replace('.json', '.txt');
  const txtPath = path.join(sourcesDir, tf);
  if (!fs.existsSync(txtPath)) continue;

  const raw = JSON.parse(fs.readFileSync(path.join(sourcesDir, jf), 'utf-8'));
  const res = raw.results ? raw.results[0] : raw;
  let txt = fs.readFileSync(txtPath, 'utf-8');

  let additions = [];
  const candidateKeys = ['precautions', 'nursing_mothers', 'pregnancy', 'drug_interactions', 'use_in_specific_populations'];

  for (const k of candidateKeys) {
    if (res[k] && Array.isArray(res[k]) && res[k].length > 0) {
      const sectionText = res[k].join('\n\n').trim();
      const sample = sectionText.slice(0, 40);
      if (sample && !txt.includes(sample)) {
        additions.push(`=== ${k.toUpperCase()} ===\n${sectionText}`);
      }
    }
  }

  if (additions.length > 0) {
    const newContent = txt.trimEnd() + '\n\n' + additions.join('\n\n') + '\n';
    fs.writeFileSync(txtPath, newContent, 'utf-8');
    console.log(`Appended ${additions.length} section(s) to ${tf}`);
    appendedCount++;
  }
}

console.log(`Total source files updated: ${appendedCount}`);
