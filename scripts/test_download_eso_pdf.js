const fs = require('fs');

async function testDownload() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
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
