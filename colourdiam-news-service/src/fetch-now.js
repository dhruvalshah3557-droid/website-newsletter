require('dotenv').config();

const { NewsFetcher } = require('./fetcher');
const { NewsStore } = require('./store');
const { categorize } = require('./categorize');
const { autoPush } = require('./git-push');

async function main() {
  const store = new NewsStore();
  const fetcher = new NewsFetcher();

  console.log(`[fetch-now] Fetching news at ${new Date().toISOString()}`);
  const articles = await fetcher.fetchAll();
  const categorized = articles.map((article) => ({
    ...article,
    category: categorize(`${article.title} ${article.description}`)
  }));
  const { added, existing } = store.addBatch(categorized);
  store.setLastFetchAt(new Date().toISOString());

  console.log(
    `[fetch-now] Done: fetched=${articles.length} added=${added} existing=${existing} total=${store.stats().total}`
  );
  const gitResult = autoPush();
  console.log(`[fetch-now] GitHub auto-push result: ${JSON.stringify(gitResult)}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(`[fetch-now] Failed: ${err.message}`);
  process.exit(1);
});
