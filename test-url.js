const testUrls = [
  "https://hfanhwznppxngpbjkgno.supabase.co/storage/v1/object/public/pdfs/questions_1754529370170_.pdf",
  "https://hfanhwznppxngpbjkgno.supabase.co/storage/v1/object/public/pdfs/answers_1754529371816_.pdf"
];

async function testUrl(url) {
  try {
    console.log(`Testing: ${url}`);
    const response = await fetch(url, { method: 'HEAD' });
    console.log(`Status: ${response.status} - ${response.statusText}`);
    console.log(`Size: ${response.headers.get('content-length')} bytes`);
    console.log(`Type: ${response.headers.get('content-type')}`);
    console.log('---');
  } catch (error) {
    console.error(`Error testing ${url}:`, error.message);
  }
}

async function main() {
  for (const url of testUrls) {
    await testUrl(url);
  }
}

main();
