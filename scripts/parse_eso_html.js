const fs = require('fs');

const html = fs.readFileSync('data/eso_directory_raw.html', 'utf8');
console.log('HTML size:', html.length);

const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
let match;
const links = [];
while ((match = linkRegex.exec(html)) !== null) {
  const href = match[1];
  const text = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  if (text.length > 5) {
    links.push({ href, text });
  }
}

console.log('Total text links found:', links.length);

// Let's inspect unique links and their destinations
const guidelineLinks = links.filter(l => {
  const t = l.text.toLowerCase();
  const h = l.href.toLowerCase();
  return (
    h.includes('sagepub.com') ||
    h.includes('doi.org') ||
    h.includes('.pdf') ||
    h.includes('guidelines') ||
    t.includes('guideline') ||
    t.includes('consensus') ||
    t.includes('recommendation')
  );
});

console.log('Guideline related links count:', guidelineLinks.length);

// Print out
const seen = new Set();
const uniqueGuidelines = [];
for (const gl of guidelineLinks) {
  const key = gl.href;
  if (!seen.has(key)) {
    seen.add(key);
    uniqueGuidelines.push(gl);
  }
}

console.log('Unique guideline related links count:', uniqueGuidelines.length);
uniqueGuidelines.forEach((l, i) => {
  console.log(`[${i+1}] ${l.text}\n     URL: ${l.href}`);
});
