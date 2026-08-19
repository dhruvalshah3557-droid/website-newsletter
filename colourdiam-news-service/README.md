# ColourDiam News Service

A standalone Node.js web service that automatically fetches jewellery and diamond
industry news, filters and scores it for relevance, and presents it on a clean,
server-rendered news page with a dark navy + gold luxury theme that matches the
look and feel of [colourdiam.com](https://www.colourdiam.com).

It is designed to run independently of the main ASP.NET e-commerce website. The
site owner simply links to the news page URL from the main site.

## Features

- **Three news source types**
  - Hand-picked jewellery/diamond/auction RSS feeds (Rapaport, JCK, National
    Jeweler, The Jewellery Editor, Natural Diamonds, AGTA, Medium, Gem Society).
  - Google News RSS search with 7 niche keyword queries.
  - Optional NewsAPI.org querying when `NEWSAPI_KEY` is set (skipped gracefully
    otherwise).
- **Relevance scoring** — articles are scored by keyword matches in the title vs
  description, then sorted by score and date. Negative keywords filter out
  clearly irrelevant items (e.g. "Diamondbacks").
- **Deduplication** — by normalized title and URL. If the same article arrives
  from multiple sources, the first is kept and the source list is merged.
- **Persistence** — JSON file at `data/news.json` (no database required). Keeps
  the newest `MAX_ARTICLES` (default 200).
- **Scheduled fetching** — initial fetch on startup, then on a cron schedule
  (default every 4 hours) using `node-cron`.
- **REST API** — news JSON API, manual fetch trigger with token protection, and
  a health endpoint.

## Tech stack

- Node.js 18+
- Express
- node-cron
- rss-parser
- dotenv

## Setup

```bash
cd colourdiam-news-service
npm install
cp .env.example .env
```

Edit `.env` to taste (port, cron schedule, fetch token, optional NewsAPI key).

## Running

```bash
npm start          # start the server (initial fetch runs on startup)
npm run dev        # start with --watch for development
npm run fetch      # run a one-off fetch without starting the server
./start.sh         # convenience wrapper that loads .env
```

## Configuration

| Variable          | Default        | Description                                     |
| ----------------- | -------------- | ----------------------------------------------- |
| `PORT`            | `3001`         | HTTP port for the web server                    |
| `CRON_SCHEDULE`   | `0 */4 * * *`  | Cron schedule for automatic fetching            |
| `FETCH_TOKEN`     | *(empty)*      | Static token protecting `/api/fetch`            |
| `NEWSAPI_KEY`     | *(empty)*      | Optional NewsAPI.org key                        |
| `MAX_ARTICLES`    | `200`          | Max articles kept in storage                    |
| `FETCH_TIMEOUT_MS`| `15000`        | Timeout (ms) for all outbound HTTP requests     |
| `GIT_AUTOPUSH`    | `true`         | Auto-commit & push `data/news.json` to the configured git remote after every fetch |

> **Security note:** set `FETCH_TOKEN` in production. If it is empty, `/api/fetch`
> is open and a warning is logged. Never commit `.env`.

## Endpoints

| Route       | Description                                                  |
| ----------- | ------------------------------------------------------------ |
| `GET /`     | Server-rendered news page (categories, search, cards)        |
| `GET /api/news` | JSON of stored articles. Supports `?category=` and `?q=` query params |
| `GET /api/fetch` | Manually trigger a fetch. Requires `?token=<FETCH_TOKEN>` (or `Authorization: Bearer`) if set |
| `GET /health`    | Health check with article count and last fetch time     |

Example JSON API calls:

```bash
curl 'http://localhost:3001/api/news?category=Auction'
curl 'http://localhost:3001/api/news?q=pink%20diamond'
curl 'http://localhost:3001/api/fetch?token=YOUR_TOKEN'
```

## Data file structure

`data/news.json`:

```json
{
  "lastFetchAt": "2026-01-01T00:00:00.000Z",
  "articles": [
    {
      "id": "1735689600000-abc123",
      "title": "Rare pink diamond sells for record price",
      "link": "https://...",
      "source": "Google News",
      "sourceName": "The Jewellery Editor",
      "publishedAt": "2026-01-01T00:00:00.000Z",
      "description": "...",
      "image": "https://...",
      "category": "Colored Diamonds",
      "sources": ["The Jewellery Editor", "Natural Diamonds"],
      "relevanceScore": 9
    }
  ]
}
```

## Scheduling

- The initial fetch runs automatically on server startup.
- Automatic fetches run on the cron schedule in `CRON_SCHEDULE` (default every
  4 hours). Cron expressions are 5 fields, e.g. `0 */4 * * *` (every 4 hours),
  `30 6 * * *` (6:30 AM daily).
- Each fetch result is logged with a timestamp.
- After every successful fetch, `data/news.json` is auto-committed and pushed to
  the configured git remote (`GIT_AUTOPUSH=true`). Set `GIT_AUTOPUSH=false` to
  disable. The repository must already have a remote and the commit identity must
  be configured (see below).

### Auto-push to GitHub

The service saves every news update to GitHub automatically. To set this up on a
fresh machine:

```bash
git init
git remote add origin https://github.com/<user>/<repo>.git
git config user.name  "Your Name"
git config user.email "your@email.com"
git push -u origin main
```

After that, each scheduled fetch will create a commit (`chore: auto-update news
data [...]`) and push it to `origin`. You can confirm it works by checking the
service log for `[git] Committed and pushed news data to origin/<branch>.`

## Deploying / linking from the main site

1. Deploy this service to any Node.js host (VPS, Render, Railway, Fly.io, a
   Docker container, etc.) — it does not depend on the ASP.NET website at all.
2. Expose the port on which the service runs (default `3001`).
3. On the main site, add a link or menu item pointing to the news service base
   URL, e.g. `https://news.yourdomain.com` or
   `https://www.colourdiam.com/news-service/` if reverse-proxied.
4. Optionally reverse-proxy a sub-path from the ASP.NET site to this service
   (e.g. in IIS URL Rewrite or nginx) so it appears under the main domain.
5. Recommended nginx snippet:

```nginx
location /news {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

6. Set a strong `FETCH_TOKEN` and (optionally) a `NEWSAPI_KEY`.

## Logs

The service logs fetch progress and results with timestamps, e.g.:

```
[fetcher] The Jewellery Editor: 20 items
[fetcher] fetched 156 raw items, 89 relevant after filtering
[scheduler] Fetch complete in 8.2s: fetched=89 added=41 existing=48 total=200
```
