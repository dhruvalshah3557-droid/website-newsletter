require('dotenv').config();

const { AdminUploader } = require('./uploader');

async function main() {
  const uploader = new AdminUploader();
  await uploader.login();

  const inspect = await uploader.inspectNewsAdmin();
  console.log(
    `[cleanup] Admin/News HTTP ${inspect.status} location=${inspect.location} bytes=${inspect.length}`
  );
  const deleteHints = inspect.snippet.match(/Delete[A-Za-z]+|DelNews|UniquId|ProdId|SaveNews/g) || [];
  console.log(`[cleanup] Admin/News hints: ${Array.from(new Set(deleteHints)).join(', ')}`);

  const minId = Number(process.env.CLEANUP_MIN_ID || 1200);
  const maxId = Number(process.env.CLEANUP_MAX_ID || 0);
  const dryRun = String(process.env.CLEANUP_DRY_RUN || 'false').toLowerCase() === 'true';
  const result = await uploader.deleteEmptyNews({ minId, maxId, dryRun });
  console.log(`[cleanup] Result: ${JSON.stringify(result)}`);
  process.exit(result.errors && result.errors.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`[cleanup] Failed: ${err.message}`);
  process.exit(1);
});
