const fs = require('fs');
const path = require('path');

const DEFAULT_STORE_PATH = path.join(__dirname, '..', 'data', 'news.json');

class NewsStore {
  constructor(filePath = DEFAULT_STORE_PATH) {
    this.filePath = filePath;
    this.data = { lastFetchAt: null, articles: [] };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        this.data.lastFetchAt = parsed.lastFetchAt || null;
        this.data.articles = Array.isArray(parsed.articles) ? parsed.articles : [];
      }
    } catch (err) {
      console.warn(`[store] Could not load ${this.filePath}: ${err.message}`);
      this.data = { lastFetchAt: null, articles: [] };
    }
  }

  persist() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.filePath);
  }

  getArticles() {
    return this.data.articles;
  }

  getLastFetchAt() {
    return this.data.lastFetchAt;
  }

  normalizeTitle(title) {
    return String(title || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  findDuplicate(article) {
    const normTitle = this.normalizeTitle(article.title);
    const normLink = String(article.link || '')
      .toLowerCase()
      .replace(/[#?].*$/, '')
      .replace(/\/+$/, '');

    return this.data.articles.find((existing) => {
      const existingNorm = this.normalizeTitle(existing.title);
      if (normTitle && existingNorm && normTitle === existingNorm) {
        return true;
      }
      if (normLink && existing.link) {
        const existingLink = String(existing.link)
          .toLowerCase()
          .replace(/[#?].*$/, '')
          .replace(/\/+$/, '');
        if (normLink === existingLink) {
          return true;
        }
      }
      return false;
    });
  }

  upsertArticle(article) {
    const existing = this.findDuplicate(article);
    if (existing) {
      if (article.sourceName && existing.sourceName !== article.sourceName) {
        const sources = new Set(existing.sources || [existing.sourceName || 'unknown']);
        sources.add(article.sourceName);
        existing.sources = Array.from(sources);
        existing.sourceName = existing.sourceName || article.sourceName;
        this.persist();
      }
      return { action: 'existing', article: existing };
    }

    const now = new Date().toISOString();
    const record = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      title: article.title,
      link: article.link,
      source: article.source,
      sourceName: article.sourceName,
      publishedAt: article.publishedAt || now,
      description: article.description || '',
      image: article.image || null,
      category: article.category || 'Industry News',
      sources: [article.sourceName || article.source || 'unknown'],
      relevanceScore: article.relevanceScore || 0
    };

    this.data.articles.push(record);
    return { action: 'added', article: record };
  }

  addBatch(articles) {
    let added = 0;
    let existing = 0;

    for (const article of articles) {
      const result = this.upsertArticle(article);
      if (result.action === 'added') {
        added += 1;
      } else {
        existing += 1;
      }
    }

    this.sortArticles();
    this.data.articles = this.data.articles.slice(0, Number(process.env.MAX_ARTICLES || 200));
    this.persist();
    return { added, existing };
  }

  sortArticles() {
    this.data.articles.sort((a, b) => {
      const scoreDiff = (b.relevanceScore || 0) - (a.relevanceScore || 0);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      return new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime();
    });
  }

  setLastFetchAt(timestamp) {
    this.data.lastFetchAt = timestamp;
    this.persist();
  }

  clear() {
    this.data = { lastFetchAt: null, articles: [] };
    this.persist();
  }

  stats() {
    return {
      total: this.data.articles.length,
      lastFetchAt: this.data.lastFetchAt
    };
  }
}

module.exports = { NewsStore };
