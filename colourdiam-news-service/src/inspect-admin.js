const { AdminUploader } = require('./uploader');

async function main() {
  const uploader = new AdminUploader();
  console.log('[inspect] Logging in...');
  await uploader.login();

  const url = 'https://www.colourdiam.com/Admin/News';
  console.log(`[inspect] Fetching ${url} ...`);
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ColourDiamNewsBot/1.0)',
      Cookie: uploader.cookie
    }
  });
  const html = await res.text();
  console.log(`[inspect] HTTP ${res.status}, ${html.length} bytes`);

  const forms = html.match(/<form[\s\S]*?<\/form>/gi) || [];
  console.log(`[inspect] Found ${forms.length} form(s)`);

  const inputs = html.match(/<(input|select|textarea)[^>]*>/gi) || [];
  console.log(`[inspect] Found ${inputs.length} input/select/textarea elements`);
  for (const tag of inputs) {
    console.log(`  ${tag.replace(/\s+/g, ' ').slice(0, 200)}`);
  }

  const scripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const script of scripts) {
    const body = script.replace(/<\/?script[^>]*>/gi, '');
    if (/Ajax|ajax|Post|POST|Url|url:/.test(body)) {
      console.log('\n[inspect] AJAX script snippet:');
      console.log(body.slice(0, 1500));
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(`[inspect] Failed: ${err.message}`);
  process.exit(1);
});
