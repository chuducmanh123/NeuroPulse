async function testArticle() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const urls = [
    'https://doi.org/10.1177/23969873241257223',
    'https://academic.oup.com/esj/article/11/5/aakag043/8671382'
  ];
  for (const url of urls) {
    console.log('\nTesting article link:', url);
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        },
        redirect: 'follow'
      });
      console.log('Status:', res.status, 'Final URL:', res.url);
    } catch (e) {
      console.error('Error:', e.message);
    }
  }
}
testArticle();
