const fs = require('fs');

const html = fs.readFileSync('data/eso_directory_raw.html', 'utf8');

// Parse DOIs or article URLs
const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
let m;

const guidelinesMap = new Map();

while ((m = linkRegex.exec(html)) !== null) {
  let href = m[1].replace(/&#038;/g, '&').trim();
  let text = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

  // Normalize DOI links
  let normKey = null;
  const doiMatch = href.match(/10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/i);
  if (doiMatch) {
    normKey = doiMatch[0].toLowerCase();
  } else if (href.includes('academic.oup.com/esj')) {
    const oupMatch = href.match(/article\/\d+\/\d+\/([a-z0-9]+)\/(\d+)/i);
    normKey = oupMatch ? oupMatch[0] : href;
  }

  if (normKey && text.length > 10 && !text.toLowerCase().includes('download') && !text.toLowerCase().includes('watch')) {
    if (!guidelinesMap.has(normKey)) {
      guidelinesMap.set(normKey, {
        title: text,
        url: href,
        doi: doiMatch ? doiMatch[0] : null,
        slideDeckPdf: null
      });
    }
  }
}

// Find all unique slide deck PDF links
const slideDeckUrls = new Set();
const slideRegex = /href=["'](https:\/\/eso-stroke\.org\/wp-content\/uploads\/[^"']+\.pdf)["']/gi;
while ((m = slideRegex.exec(html)) !== null) {
  const pdfUrl = m[1];
  if (!pdfUrl.includes('Proposal') && !pdfUrl.includes('MWG') && !pdfUrl.includes('MoU') && !pdfUrl.includes('sop-')) {
    slideDeckUrls.add(pdfUrl);
  }
}

console.log('Tổng số guideline chính thức duy nhất (theo DOI/Article):', guidelinesMap.size);
console.log('Tổng số file Slide Deck / Presentation PDF tải trực tiếp từ web ESO:', slideDeckUrls.size);

let idx = 1;
for (const [key, item] of guidelinesMap.entries()) {
  console.log(`${idx++}. ${item.title}`);
  console.log(`   Link: ${item.url}`);
}

console.log('\n--- CÁC FILE SLIDE DECK PDF CÓ THỂ TẢI TRỰC TIẾP TỪ SERVER ESO ---');
Array.from(slideDeckUrls).forEach((url, i) => {
  console.log(`${i+1}. ${url}`);
});
