const fs = require('fs');

const html = fs.readFileSync('data/eso_directory_raw.html', 'utf8');

// Find all accordion or section titles
const regex = /<(h[2-4]|strong|p|li)[^>]*>([\s\S]*?)<\/\1>/gi;
// Let's inspect the table or list structure in the HTML
// Let's write out text content or find all table rows / card elements
const tableMatches = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];
console.log('Table rows found:', tableMatches.length);

// If no table rows, check accordion / list items
const liMatches = html.match(/<li[\s\S]*?<\/li>/gi) || [];
console.log('LI items found:', liMatches.length);

// Let's write a script to extract each guideline topic block
// Let's inspect snippet of html where guidelines are listed
const idx = html.indexOf('Aneurysmal Subarachnoid Haemorrhage');
console.log('Snippet around first guideline:\n', html.substring(idx - 200, idx + 800));
