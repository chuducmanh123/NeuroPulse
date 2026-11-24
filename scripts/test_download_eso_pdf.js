const fs = require('fs');

async function testDownload() {
  const url = 'https://eso-stroke.org/wp-content/uploads/ESO-Guideline-Stroke-Associated-Pneumonia_Presentation.pdf';
  console.log('Downloading test PDF:', url);
  const res = await fetch(url);
  console.log('Status:', res.status, res.headers.get('content-type'));
  const buf = await res.arrayBuffer();
  console.log('Downloaded bytes:', buf.byteLength);
  const header = Buffer.from(buf.slice(0, 5)).toString();
  console.log('Magic bytes header:', header);
}

testDownload();
