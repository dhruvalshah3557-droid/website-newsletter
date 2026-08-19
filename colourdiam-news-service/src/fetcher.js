const Parser = require('rss-parser');

const RELEVANT_KEYWORDS = [
  'diamond',
  'jewelry',
  'jewellery',
  'gemstone',
  'gold',
  'auction',
  "christie's",
  "sotheby's",
  'met gala',
  'jewelry industry',
  'jewellery industry',
  'ring',
  'necklace',
  'bracelet',
  'earring',
  'loose diamond',
  'colored diamond',
  'fancy color',
  'fancy colour',
  'coloured diamond'
];

const NEGATIVE_KEYWORDS = [
  'diamondbacks',
  'movie review',
  'film review',
  'album review',
  'book review',
  'diamond league',
  'baseball',
  'mlb',
  'nba',
  'nfl',
  'nhl',
  'soccer',
  'football match',
  'espn',
  'sports scores',
  'diamond ring pop',
  'video game',
  'minecraft',
  'crypto'
];

const RSS_FEEDS = [
  {
    name: 'Rapaport',
    url: 'https://www.diamonds.net/News/NewsFeed.aspx'
  },
  {
    name: 'JCK Online',
    url: 'https://www.jckonline.com/feed/'
  },
  {
    name: 'National Jeweler',
    url: 'https://www.nationaljeweler.com/rss'
  },
  {
    name: 'The Jewellery Editor',
    url: 'https://www.thejewelleryeditor.com/feed/'
  },
  {
    name: 'Natural Diamonds',
    url: 'https://www.naturaldiamonds.com/feed/'
  },
  {
    name: 'AGTA',
    url: 'https://agta.org/feed/'
  },
  {
    name: 'Medium Diamonds',
    url: 'https://www.medium.com/feed/tag/diamonds'
  },
  {
    name: 'Gem Society',
    url: 'https://www.gemsociety.org/feed/'
  }
];

const GOOGLE_NEWS_QUERIES = [
  'Met Gala auction',
  'fancy color diamond',
  'colored diamond auction',
  'diamond jewelry news',
  'jewelry auction Christie\'s OR Sotheby\'s',
  'diamond industry',
  'pink diamond OR blue diamond auction'
];

const NEWSAPI_QUERIES = [
  'diamond jewelry',
  'Met Gala auction'
];

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&ndash;|&mdash;/g, '-')
    .replace(/&hellip;/g, '...')
    .replace(/\s+/g, ' ')
    .trim();
}

function computeRelevanceScore(title, description) {
  const titleLower = String(title || '').toLowerCase();
  const descLower = String(description || '').toLowerCase();
  let score = 0;

  for (const keyword of RELEVANT_KEYWORDS) {
    if (titleLower.includes(keyword)) {
      score += 3;
    } else if (descLower.includes(keyword)) {
      score += 1;
    }
  }

  return score;
}

function isRelevant(title, description) {
  const text = `${title} ${description}`.toLowerCase();

  for (const negative of NEGATIVE_KEYWORDS) {
    if (text.includes(negative)) {
      return false;
    }
  }

  for (const keyword of RELEVANT_KEYWORDS) {
    if (text.includes(keyword)) {
      return true;
    }
  }

  return false;
}

function extractImage(item) {
  if (item.enclosure && item.enclosure.url) {
    return item.enclosure.url;
  }
  if (item['media:content'] && item['media:content'].url) {
    return item['media:content'].url;
  }
  if (item['media:content'] && item['media:content'].$ && item['media:content'].$.url) {
    return item['media:content'].$.url;
  }
  if (item['media:thumbnail'] && item['media:thumbnail'].url) {
    return item['media:thumbnail'].url;
  }
  if (item['media:thumbnail'] && item['media:thumbnail'].$ && item['media:thumbnail'].$.url) {
    return item['media:thumbnail'].$.url;
  }
  const content = item['content:encoded'] || item.content || item.description || '';
  const match = String(content).match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match) {
    return match[1];
  }
  return null;
}

function buildArticle(item, source) {
  const title = stripHtml(item.title);
  const description = stripHtml(item.contentSnippet || item.content || item.summary || item.description || '');
  const publishedAt = item.isoDate || item.pubDate || item.published || new Date().toISOString();

  const relevanceScore = computeRelevanceScore(title, description);

  return {
    title,
    link: item.link || '',
    source: source.name,
    sourceName: source.name,
    publishedAt,
    description: description.slice(0, 500),
    image: extractImage(item),
    relevanceScore
  };
}

function withTimeout(fetchFn, timeoutMs) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    fetchFn(controller.signal)
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

class NewsFetcher {
  constructor(options = {}) {
    this.timeoutMs = Number(options.timeoutMs || process.env.FETCH_TIMEOUT_MS || 15000);
    this.newsApiKey = options.newsApiKey || process.env.NEWSAPI_KEY || '';
    this.parser = new Parser({
      timeout: this.timeoutMs,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; ColourDiamNewsBot/1.0; +https://www.colourdiam.com)'
      }
    });
  }

  async fetchFeed(feed) {
    const xml = await withTimeout(async (signal) => {
      const res = await fetch(feed.url, {
        signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; ColourDiamNewsBot/1.0; +https://www.colourdiam.com)'
        }
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return res.text();
    }, this.timeoutMs);

    const response = await this.parser.parseString(xml);
    const items = response.items || [];
    return items
      .map((item) => buildArticle(item, feed))
      .filter((article) => article.title && article.link);
  }

  async fetchGoogleNews() {
    const results = [];
    await Promise.allSettled(
      GOOGLE_NEWS_QUERIES.map(async (query) => {
        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
          query
        )}&hl=en-US&gl=US&ceid=US:en`;
        const feed = { name: 'Google News', url };
        const articles = await this.fetchFeed(feed);
        results.push(...articles);
      })
    );
    return results;
  }

  async fetchNewsApi() {
    if (!this.newsApiKey) {
      console.log('[fetcher] NEWSAPI_KEY not set, skipping NewsAPI queries.');
      return [];
    }

    const results = [];
    await Promise.allSettled(
      NEWSAPI_QUERIES.map(async (query) => {
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
          query
        )}&language=en&sortBy=publishedAt&pageSize=50`;
        const response = await withTimeout(async (signal) => {
          const res = await fetch(url, {
            signal,
            headers: { Authorization: `Bearer ${this.newsApiKey}` }
          });
          return res.json();
        }, this.timeoutMs);

        const articles = response.articles || [];
        for (const article of articles) {
          const source = { name: article.source && article.source.name ? article.source.name : 'NewsAPI' };
          results.push(
            buildArticle(
              {
                title: article.title,
                link: article.url,
                contentSnippet: article.description || article.content || '',
                isoDate: article.publishedAt,
                urlToImage: article.urlToImage
              },
              source
            )
          );
        }
      })
    );
    return results;
  }

  async fetchAll() {
    const results = [];

    const feedResults = RSS_FEEDS.map(async (feed) => {
      try {
        const articles = await this.fetchFeed(feed);
        console.log(`[fetcher] ${feed.name}: ${articles.length} items`);
        return articles;
      } catch (err) {
        console.warn(`[fetcher] ${feed.name} failed: ${err.message}`);
        return [];
      }
    });

    const googleResults = this.fetchGoogleNews().catch((err) => {
      console.warn(`[fetcher] Google News failed: ${err.message}`);
      return [];
    });

    const newsApiResults = this.fetchNewsApi().catch((err) => {
      console.warn(`[fetcher] NewsAPI failed: ${err.message}`);
      return [];
    });

    const settled = await Promise.allSettled([...feedResults, googleResults, newsApiResults]);

    for (const result of settled) {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        results.push(...result.value);
      }
    }

    const relevant = results.filter((article) => isRelevant(article.title, article.description));
    console.log(
      `[fetcher] fetched ${results.length} raw items, ${relevant.length} relevant after filtering`
    );
    return relevant;
  }
}

module.exports = {
  NewsFetcher,
  RSS_FEEDS,
  GOOGLE_NEWS_QUERIES,
  NEWSAPI_QUERIES,
  RELEVANT_KEYWORDS,
  NEGATIVE_KEYWORDS,
  isRelevant,
  computeRelevanceScore
};
