const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.ADMIN_BASE_URL || 'https://www.colourdiam.com';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const UPLOAD_ENDPOINT = process.env.UPLOAD_ENDPOINT || '/Admin/SaveNews';
const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS || 15000);

const UPLOADED_STORE = path.join(__dirname, '..', 'data', 'uploaded.json');

class AdminUploader {
  constructor() {
    this.cookie = '';
    this.uploaded = this.loadUploaded();
  }

  loadUploaded() {
    try {
      if (fs.existsSync(UPLOADED_STORE)) {
        const raw = JSON.parse(fs.readFileSync(UPLOADED_STORE, 'utf8'));
        return Array.isArray(raw) ? new Set(raw) : new Set();
      }
    } catch (err) {
      console.warn(`[uploader] Could not load ${UPLOADED_STORE}: ${err.message}`);
    }
    return new Set();
  }

  persistUploaded() {
    const dir = path.dirname(UPLOADED_STORE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(UPLOADED_STORE, JSON.stringify(Array.from(this.uploaded), null, 2));
  }

  withTimeout(fetchFn) {
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
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

  async login() {
    if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
      throw new Error('ADMIN_USERNAME / ADMIN_PASSWORD are not set. Cannot upload.');
    }

    console.log(`[uploader] Logging in to ${BASE_URL}/Admin/LoginDetail ...`);
    const body = new URLSearchParams({
      UserName: ADMIN_USERNAME,
      Password: ADMIN_PASSWORD
    });

    const res = await this.withTimeout(async (signal) => {
      const response = await fetch(`${BASE_URL}/Admin/LoginDetail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent':
            'Mozilla/5.0 (compatible; ColourDiamNewsBot/1.0; +https://www.colourdiam.com)',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: body.toString(),
        signal,
        redirect: 'manual'
      });
      return response;
    });

    const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    if (setCookies.length > 0) {
      this.cookie = setCookies.map((c) => c.split(';')[0]).join('; ');
    }

    const text = await res.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch (err) {
      // not JSON
    }

    console.log(`[uploader] Login response: HTTP ${res.status}, body: ${text.slice(0, 120)}`);
    if (!data) {
      throw new Error(`Login failed: unexpected response (HTTP ${res.status})`);
    }
    if (data === '' || data === null || data.Error === 'InValid User Id Or Password.') {
      throw new Error('Login failed: invalid credentials');
    }
    return data;
  }

  async uploadArticle(article) {
    const payload = this.buildPayload(article);
    const body = new URLSearchParams(payload);

    const res = await this.withTimeout(async (signal) => {
      const response = await fetch(`${BASE_URL}${UPLOAD_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent':
            'Mozilla/5.0 (compatible; ColourDiamNewsBot/1.0; +https://www.colourdiam.com)',
          'X-Requested-With': 'XMLHttpRequest',
          ...(this.cookie ? { Cookie: this.cookie } : {})
        },
        body: body.toString(),
        signal,
        redirect: 'manual'
      });
      return response;
    });

    const text = await res.text();
    return { status: res.status, body: text.slice(0, 300) };
  }

  buildPayload(article) {
    const field = (fallback) =>
      fallback ||
      process.env[`FIELD_${fallback}`] ||
      '';
    return {
      Title: article.title || '',
      Link: article.link || '',
      Description: article.description || '',
      Image: article.image || '',
      PublishedDate: article.publishedAt || '',
      Category: article.category || 'Industry News',
      Source: article.sourceName || article.source || ''
    };
  }

  async uploadNewArticles(articles, { dryRun = false } = {}) {
    if (!Array.isArray(articles)) {
      return { uploaded: 0, skipped: 0, errors: [] };
    }

    await this.login();

    let uploaded = 0;
    let skipped = 0;
    const errors = [];

    for (const article of articles) {
      if (this.uploaded.has(article.id)) {
        skipped += 1;
        continue;
      }
      if (dryRun) {
        console.log(`[uploader][dry-run] Would upload: ${article.title}`);
        uploaded += 1;
        continue;
      }
      try {
        const result = await this.uploadArticle(article);
        if (result.status >= 200 && result.status < 300) {
          this.uploaded.add(article.id);
          console.log(`[uploader] Uploaded: ${article.title}`);
          uploaded += 1;
        } else {
          errors.push({ id: article.id, title: article.title, status: result.status, body: result.body });
          console.error(`[uploader] Upload failed (HTTP ${result.status}): ${article.title} -> ${result.body}`);
        }
      } catch (err) {
        errors.push({ id: article.id, title: article.title, error: err.message });
        console.error(`[uploader] Upload error: ${article.title} -> ${err.message}`);
      }
    }

    this.persistUploaded();
    return { uploaded, skipped, errors };
  }
}

module.exports = { AdminUploader };
