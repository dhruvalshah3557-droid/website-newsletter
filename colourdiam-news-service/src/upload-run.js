require('dotenv').config();

const { NewsStore } = require('./store');
const { AdminUploader } = require('./uploader');

async function main() {
  const store = new NewsStore();
  const articles = store.getArticles();

  const maxUpload = Number(process.env.MAX_UPLOAD || 10);
  const candidates = articles.slice(0, maxUpload);

  console.log(
    `[upload-run] ${articles.length} stored articles, uploading up to ${candidates.length} newest`
  );

  const uploader = new AdminUploader();
  const result = await uploader.uploadNewArticles(candidates);
  console.log(`[upload-run] Result: ${JSON.stringify(result)}`);
  process.exit(result.errors.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`[upload-run] Failed: ${err.message}`);
  process.exit(1);
});
