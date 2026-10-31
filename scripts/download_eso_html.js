const fs = require('fs');

async function main() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const res = await fetch('https://eso-stroke.org/guidelines/eso-guideline-directory');
  const html = await res.text();
  fs.writeFileSync('data/eso_directory_raw.html', html, 'utf8');
  console.log('Saved raw HTML, length:', html.length);
}

main();
