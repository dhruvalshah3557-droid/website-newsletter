require('dotenv').config();

const { NewsStore } = require('./store');
const { AdminUploader } = require('./uploader');
const { isLowQualitySource, uniqueDescription } = require('./article-text');

async function main() {
  const store = new NewsStore();
  const articles = store.getArticles();

  const maxUpload = Number(process.env.MAX_UPLOAD || 10);
  const maxAgeDays = Number(process.env.MAX_AGE_DAYS || 90);
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;

  const candidates = articles
    .filter((article) => !article.uploadedAt)
    .filter((article) => (article.title || '').trim())
    .filter((article) => !isLowQualitySource(article))
    .filter((article) => uniqueDescription(article.title, article.description) || article.image)
    .filter((article) => {
      const published = new Date(article.publishedAt || 0).getTime();
      return Number.isFinite(published) && published >= cutoff;
    })
    .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime())
    .slice(0, maxUpload);

  console.log(
    `[upload-run] ${articles.length} stored articles, ${candidates.length} new candidates (max ${maxUpload}, last ${maxAgeDays} days)`
  );

  if (candidates.length === 0) {
    console.log('[upload-run] Nothing new to upload.');
    process.exit(0);
  }

  const uploader = new AdminUploader();
  const result = await uploader.uploadNewArticles(candidates);
  const uploadedIds = candidates
    .filter((article) => uploader.uploaded.has(article.id))
    .map((article) => article.id);
  store.markUploaded(uploadedIds);
  console.log(`[upload-run] Result: ${JSON.stringify(result)}`);
  process.exit(result.errors.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`[upload-run] Failed: ${err.message}`);
  process.exit(1);
});
