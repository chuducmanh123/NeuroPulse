const fs = require('fs');

const html = fs.readFileSync('data/eso_directory_raw.html', 'utf8');

// The ESO Guideline Directory is organized into categories or tables.
// Let's find all guideline entries.
// Each guideline typically has:
// - Title
// - Link to full text (academic.oup.com, doi.org, journals.sagepub.com)
// - Optional link to Slide Deck PDF (wp-content/uploads/...)
// - Optional link to Video (youtube)

// Let's parse all sections/tables or blocks
// Let's extract all <a> tags that are guideline titles or slide decks
const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
let m;
const allLinks = [];
while ((m = linkRegex.exec(html)) !== null) {
  const href = m[1].replace(/&#038;/g, '&');
  const text = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  allLinks.push({ href, text });
}

// Categorize links
const fullTextLinks = [];
const slideDeckPdfs = [];
const otherPdfs = [];

for (const l of allLinks) {
  const h = l.href;
  const t = l.text;

  // Direct PDFs
  if (h.toLowerCase().includes('.pdf')) {
    if (t.toLowerCase().includes('slide') || t.toLowerCase().includes('presentation') || h.toLowerCase().includes('presentation') || h.toLowerCase().includes('slides')) {
      slideDeckPdfs.push(l);
    } else {
      otherPdfs.push(l);
    }
  } else if (
    h.includes('academic.oup.com/esj') ||
    h.includes('doi.org/10.1177/23969873') ||
    h.includes('doi.org/10.1093/esj') ||
    h.includes('journals.sagepub.com') ||
    h.includes('doi.org/10.1111/ene') ||
    h.includes('doi.org/10.1111/ijs') ||
    h.includes('doi.org/10.1159') ||
    h.includes('doi.org/10.1007')
  ) {
    if (t.length > 10 && !t.toLowerCase().includes('download') && !t.toLowerCase().includes('watch')) {
      fullTextLinks.push(l);
    }
  }
}

console.log('--- KẾT QUẢ PHÂN TÍCH ESO DIRECTORY ---');
console.log('Tổng số đường dẫn bài toàn văn (Full-Text Articles):', fullTextLinks.length);
console.log('Tổng số tệp Slide Deck PDF tóm tắt (Direct PDF):', slideDeckPdfs.length);
console.log('Tổng số tệp PDF khác (SOP, Guidelines cũ đa ngôn ngữ):', otherPdfs.length);

console.log('\n--- DANH SÁCH BÀI TOÀN VĂN (FULL-TEXT) ---');
fullTextLinks.forEach((x, i) => {
  console.log(`${i + 1}. [${x.text}] -> ${x.href}`);
});

console.log('\n--- DANH SÁCH TỆP SLIDE DECK PDF TẢI TRỰC TIẾP ---');
slideDeckPdfs.forEach((x, i) => {
  console.log(`${i + 1}. [${x.text}] -> ${x.href}`);
});

console.log('\n--- DANH SÁCH TỆP PDF KHÁC (SOP, DỊCH THUẬT, BẢN CŨ) ---');
otherPdfs.forEach((x, i) => {
  console.log(`${i + 1}. [${x.text}] -> ${x.href}`);
});
