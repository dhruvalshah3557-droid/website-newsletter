require('dotenv').config();

const { AdminUploader } = require('./uploader');

async function main() {
  const uploader = new AdminUploader();
  await uploader.login();

  const inspect = await uploader.inspectNewsAdmin();
  console.log(
    `[cleanup] Admin/News HTTP ${inspect.status} location=${inspect.location} bytes=${inspect.length}`
  );
  console.log(`[cleanup] Admin/News hints: ${JSON.stringify(inspect.hints)}`);
  console.log(`[cleanup] scriptSrc: ${JSON.stringify(inspect.scriptSrc)}`);
  console.log(`[cleanup] dataTableAjax: ${JSON.stringify(inspect.dataTableAjax)}`);
  for (const script of inspect.inlineScripts || []) {
    console.log(`[cleanup] inline script:\n${script}`);
  }
  console.log(`[cleanup] Admin/News tail:\n${inspect.tail}`);
  for (const attempt of inspect.listAttempts || []) {
    console.log(
      `[cleanup] List ${attempt.path} ${JSON.stringify(attempt.payload)} HTTP ${attempt.status} bytes=${attempt.length}`
    );
    console.log(`[cleanup] List preview: ${attempt.preview}`);
  }

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
