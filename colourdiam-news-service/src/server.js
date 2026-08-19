const express = require('express');
const path = require('path');
const cron = require('node-cron');
const { NewsFetcher } = require('./fetcher');
const { NewsStore } = require('./store');
const { categorize, CATEGORIES } = require('./categorize');
const { autoPush } = require('./git-push');

const PORT = Number(process.env.PORT || 3001);
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 */4 * * *';
const FETCH_TOKEN = process.env.FETCH_TOKEN || '';

const store = new NewsStore();
const fetcher = new NewsFetcher();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function runFetch() {
  const started = Date.now();
  console.log(`[scheduler] Starting fetch at ${new Date().toISOString()}`);
  try {
    const articles = await fetcher.fetchAll();
    const categorized = articles.map((article) => ({
      ...article,
      category: categorize(`${article.title} ${article.description}`)
    }));
    const { added, existing } = store.addBatch(categorized);
    store.setLastFetchAt(new Date().toISOString());
    const duration = Date.now() - started;
    console.log(
      `[scheduler] Fetch complete in ${duration}ms: fetched=${articles.length} added=${added} existing=${existing} total=${store.stats().total}`
    );
    const gitResult = autoPush();
    return { fetched: articles.length, added, existing, total: store.stats().total, duration, git: gitResult };
  } catch (err) {
    console.error(`[scheduler] Fetch failed: ${err.message}`);
    return { error: err.message };
  }
}

app.get('/', (req, res) => {
  const articles = store.getArticles();
  const lastFetchAt = store.getLastFetchAt();
  res.send(renderNewsPage(articles, lastFetchAt));
});

app.get('/api/news', (req, res) => {
  let articles = store.getArticles();
  const { category, q } = req.query;

  if (category && category !== 'All') {
    articles = articles.filter((a) => a.category === category);
  }
  if (q) {
    const query = String(q).toLowerCase();
    articles = articles.filter(
      (a) =>
        (a.title || '').toLowerCase().includes(query) ||
        (a.description || '').toLowerCase().includes(query) ||
        (a.sourceName || '').toLowerCase().includes(query)
    );
  }

  res.json({
    lastFetchAt: store.getLastFetchAt(),
    total: articles.length,
    articles
  });
});

function requireToken(req, res) {
  if (!FETCH_TOKEN) {
    console.warn('[security] FETCH_TOKEN not set; /api/fetch is unprotected.');
    return true;
  }
  const token = req.query.token || (req.headers.authorization && req.headers.authorization.replace(/^Bearer\s+/i, ''));
  if (token !== FETCH_TOKEN) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

app.get('/api/fetch', async (req, res) => {
  if (!requireToken(req, res)) {
    return;
  }
  const result = await runFetch();
  if (result.error) {
    res.status(500).json(result);
    return;
  }
  res.json(result);
});

app.get('/health', (req, res) => {
  const stats = store.stats();
  res.json({ status: 'ok', uptime: process.uptime(), ...stats });
});

function renderNewsPage(articles, lastFetchAt) {
  const fmtDate = (iso) => {
    if (!iso) return 'Unknown';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const cards = articles.map((a) => `
    <article class="card" data-category="${escapeHtml(a.category)}" data-title="${escapeHtml(a.title).toLowerCase()}" data-source="${escapeHtml(a.sourceName || a.source || '').toLowerCase()}" data-desc="${escapeHtml(truncate(a.description, 500)).toLowerCase()}">
      ${a.image ? `<img class="card-img" src="${escapeHtml(a.image)}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}
      <div class="card-body">
        <div class="card-meta">
          <span class="badge badge-${categoryClass(a.category)}">${escapeHtml(a.category)}</span>
          <span class="card-source">${escapeHtml(a.sourceName || a.source || '')}</span>
        </div>
        <h3 class="card-title"><a href="${escapeHtml(a.link)}" target="_blank" rel="noopener">${escapeHtml(a.title)}</a></h3>
        <p class="card-desc">${escapeHtml(truncate(a.description, 220))}</p>
        <div class="card-footer">
          <span class="card-date">${escapeHtml(fmtDate(a.publishedAt))}</span>
          <a class="read-more" href="${escapeHtml(a.link)}" target="_blank" rel="noopener">Read More &rarr;</a>
        </div>
      </div>
    </article>
  `).join('');

  const categoryTabs = CATEGORIES.map((c) => `
    <button class="tab${c === 'All' ? ' active' : ''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ColourDiam News - Fancy Color Diamond &amp; Jewelry News</title>
  <link rel="stylesheet" href="/style.css">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>&#128142;</text></svg>">
</head>
<body>
  <header class="header">
    <div class="container header-inner">
      <a class="logo" href="/">ColourDiam <span>News</span></a>
      <nav class="header-nav">
        <a href="https://www.colourdiam.com" target="_blank" rel="noopener">ColourDiam.com</a>
        <a href="/api/news" target="_blank">JSON API</a>
        <a href="/health" target="_blank">Health</a>
      </nav>
    </div>
  </header>

  <section class="hero">
    <div class="container">
      <h1>Fancy Color Diamond &amp; Jewelry News</h1>
      <p>Curated headlines for the rare colored diamond and fine jewelry market, automatically gathered and ranked.</p>
    </div>
  </section>

  <main class="container">
    <div class="toolbar">
      <div class="tabs" id="tabs">${categoryTabs}</div>
      <input class="search" id="search" type="search" placeholder="Search news&hellip;" aria-label="Search news">
    </div>

    <div class="last-fetch">Last updated: <span id="last-fetch">${escapeHtml(fmtDate(lastFetchAt))}</span></div>

    <section class="grid" id="grid">${cards}</section>
    <div class="empty" id="empty" style="display:none">No articles found.</div>
  </main>

  <footer class="footer">
    <div class="container">
      <p>&copy; <span id="year"></span> <a href="https://www.colourdiam.com" target="_blank" rel="noopener">ColourDiam.com</a> &mdash; Rare Fancy Color Diamonds.</p>
    </div>
  </footer>

  <script src="/app.js"></script>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncate(str, len) {
  const s = String(str || '');
  return s.length > len ? s.slice(0, len).trimEnd() + '...' : s;
}

function categoryClass(cat) {
  const map = {
    Auction: 'auction',
    'Met Gala': 'metgala',
    'Colored Diamonds': 'colored',
    'Loose Diamonds': 'loose',
    Jewelry: 'jewelry',
    'Industry News': 'industry'
  };
  return map[cat] || 'industry';
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[server] ColourDiam News Service listening on http://localhost:${PORT}`);
    console.log(`[scheduler] Cron schedule: ${CRON_SCHEDULE}`);
    if (!FETCH_TOKEN) {
      console.warn('[security] FETCH_TOKEN is not set. /api/fetch is unprotected.');
    }
  });

  if (cron.validate(CRON_SCHEDULE)) {
    cron.schedule(CRON_SCHEDULE, async () => {
      await runFetch();
    });
    console.log(`[scheduler] Scheduled automatic fetch with cron: ${CRON_SCHEDULE}`);
  } else {
    console.error(`[scheduler] Invalid CRON_SCHEDULE "${CRON_SCHEDULE}". Automatic fetching disabled.`);
  }

  runFetch().then((result) => {
    console.log(`[startup] Initial fetch done: ${JSON.stringify(result)}`);
  });
}

module.exports = { app, runFetch, renderNewsPage };
