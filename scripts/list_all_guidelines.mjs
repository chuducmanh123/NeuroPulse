import fs from 'fs';

const cloud = JSON.parse(fs.readFileSync('public/data/neuroguide_cloud.json', 'utf8'));
console.log('Total guidelines in cloud:', cloud.guidelines?.length);
cloud.guidelines?.forEach((g, i) => {
  const recCount = g.recommendations?.length || g.allPracticeChanges?.length || g.total_recommendations || 0;
  console.log(`${i+1}. [${g.id}] (${g.society || 'Unknown'}, ${g.year}) ${g.title} -> ${recCount} recs`);
});

// Also check data/guidelines_store/catalog.json
const catalog = JSON.parse(fs.readFileSync('data/guidelines_store/catalog.json', 'utf8'));
console.log('\nCatalog entries count:', Object.keys(catalog).length);
Object.values(catalog).forEach((c, i) => {
  console.log(`${i+1}. [${c.guideline_id}] (${c.society}, ${c.year}) ${c.title} -> ${c.total_recommendations} recs`);
});
