const fs = require('fs');
const path = require('path');
const { uniqueDescription, publisherFromTitle } = require('./article-text');

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
    let parsed = text;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      parsed = text;
    }
    const savedId = Number(parsed);
    const ok = res.status >= 200 && res.status < 300 && (parsed === true || savedId > 0);
    return { status: res.status, body: String(text).slice(0, 300), ok, savedId: Number.isFinite(savedId) ? savedId : 0 };
  }

  escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  formatCreatedDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return '';
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getUTCDate()}.${months[d.getUTCMonth()]}.${d.getUTCFullYear()}`;
  }

  buildBodyHtml(article) {
    const title = article.title || '';
    const description = uniqueDescription(title, article.description);
    const link = this.escapeHtml(article.link);
    const source = this.escapeHtml(
      publisherFromTitle(title, article.sourceName || article.source || 'source')
    );
    const image = this.escapeHtml(article.image);
    const parts = [];
    if (image) {
      parts.push(`<p><img src="${image}" alt="${this.escapeHtml(title)}" style="max-width:100%;height:auto;"></p>`);
    }
    if (description) {
      parts.push(`<p>${this.escapeHtml(description)}</p>`);
    }
    if (link) {
      parts.push(`<p><a href="${link}" target="_blank" rel="noopener">Read more at ${source}</a></p>`);
    }
    return parts.join('\n');
  }

  buildPayload(article) {
    const title = article.title || '';
    const description = uniqueDescription(title, article.description);
    const link = article.link || '';
    const image = article.image || '';
    const source = publisherFromTitle(title, article.sourceName || article.source || '');
    const publishedAt = article.publishedAt || '';
    const category = article.category || 'Industry News';
    const bodyHtml = this.buildBodyHtml(article);
    const meta = (description || title).slice(0, 250);

    return {
      Subject: title,
      Title: title,
      DescpBody: bodyHtml,
      DescpBodySave: bodyHtml,
      MetaDescp: meta,
      LogoPath: image,
      Image: image,
      Link: link,
      Description: description,
      PublishedDate: publishedAt,
      CreatedDate: this.formatCreatedDate(publishedAt),
      Category: category,
      Source: source,
      UniquId: 0
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
        if (result.ok) {
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

  authHeaders() {
    return {
      'User-Agent':
        'Mozilla/5.0 (compatible; ColourDiamNewsBot/1.0; +https://www.colourdiam.com)',
      'X-Requested-With': 'XMLHttpRequest',
      ...(this.cookie ? { Cookie: this.cookie } : {})
    };
  }

  async request(method, url, payload) {
    const res = await this.withTimeout(async (signal) => {
      const options = {
        method,
        headers: this.authHeaders(),
        signal,
        redirect: 'manual'
      };
      if (payload) {
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        options.body = new URLSearchParams(payload).toString();
      }
      return fetch(url, options);
    });
    const text = await res.text();
    return { status: res.status, body: text, location: res.headers.get('location') || '' };
  }

  async getNews(uniquId) {
    const url = uniquId
      ? `${BASE_URL}/Home/GetNews?UniquId=${encodeURIComponent(uniquId)}`
      : `${BASE_URL}/Home/GetNews`;
    const result = await this.request('GET', url);
    try {
      return JSON.parse(result.body);
    } catch (err) {
      return null;
    }
  }

  isEmptyNews(item) {
    if (!item || !item.UniquId) {
      return false;
    }
    const subject = String(item.Subject || '').trim();
    const body = String(item.DescpBody || item.DescpBodySave || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return !subject && !body;
  }

  extractAdminHints(html) {
    const text = String(html || '');
    const ajax = Array.from(
      text.matchAll(/url\s*:\s*["']([^"']+)["']/gi),
      (m) => m[1]
    );
    const actions = Array.from(
      text.matchAll(/["']\/Admin\/[A-Za-z0-9]+["']/g),
      (m) => m[0].replace(/['"]/g, '')
    );
    const deleteCalls = Array.from(
      text.matchAll(/Delete[A-Za-z]*|delEntry|onDeleteSuccess|UniquId|ProdId/g),
      (m) => m[0]
    );
    const tableIds = Array.from(text.matchAll(/id=["']([^"']*News[^"']*)["']/gi), (m) => m[1]);
    return {
      ajax: Array.from(new Set(ajax)).slice(0, 20),
      actions: Array.from(new Set(actions)).slice(0, 20),
      deleteCalls: Array.from(new Set(deleteCalls)).slice(0, 20),
      tableIds: Array.from(new Set(tableIds)).slice(0, 20)
    };
  }

  async inspectNewsAdmin() {
    const page = await this.request('GET', `${BASE_URL}/Admin/News`);
    const html = page.body || '';
    const scriptSrc = Array.from(html.matchAll(/src=["']([^"']+\.js[^"']*)["']/gi), (m) => m[1]);
    const dataTableAjax = Array.from(html.matchAll(/ajax\s*:\s*["']([^"']+)["']/gi), (m) => m[1]);
    const inlineScripts = (html.match(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi) || [])
      .map((s) => s.replace(/<\/?script[^>]*>/gi, '').trim())
      .filter((s) => /News|Delete|ajax|DataTable|UniquId/i.test(s))
      .map((s) => s.slice(0, 1500));
    const listAttempts = [];
    const listUrls = ['/Admin/NewsList', '/Admin/GetNewsList', '/Admin/NewsMaster', '/Admin/News'];
    for (const path of listUrls) {
      const payloads = [
        {},
        { draw: 1, start: 0, length: 200 },
        { UniquId: 0, PartialViewName: '_NewsList' }
      ];
      for (const payload of payloads) {
        const result = await this.request('POST', `${BASE_URL}${path}`, payload);
        listAttempts.push({
          path,
          payload,
          status: result.status,
          length: result.body.length,
          preview: String(result.body).slice(0, 400)
        });
        if (result.status >= 200 && result.status < 300 && result.body.length > 20) {
          break;
        }
      }
    }
    return {
      status: page.status,
      location: page.location,
      length: page.body.length,
      snippet: html.slice(0, 4000),
      tail: html.slice(-4000),
      scriptSrc,
      dataTableAjax,
      inlineScripts,
      hints: this.extractAdminHints(html),
      listAttempts
    };
  }

  async deleteNews(uniquId) {
    const endpoint = process.env.DELETE_ENDPOINT || '/Admin/DeleteNews';
    const payloads = [
      { UniquId: uniquId },
      { ProdId: uniquId },
      { DelId: uniquId },
      { UniquId: uniquId, ProdId: uniquId, DelId: uniquId }
    ];
    for (const payload of payloads) {
      const result = await this.request('POST', `${BASE_URL}${endpoint}`, payload);
      const text = String(result.body || '').trim();
      let parsed = text;
      try {
        parsed = JSON.parse(text);
      } catch (err) {
        parsed = text;
      }
      const ok =
        result.status >= 200 &&
        result.status < 300 &&
        parsed !== false &&
        parsed !== 'false' &&
        !/error|fail|invalid|permission/i.test(String(text).slice(0, 200));
      if (ok) {
        return { ok: true, status: result.status, body: text.slice(0, 200), payload };
      }
      if (result.status !== 411 && result.status !== 400) {
        return { ok: false, status: result.status, body: text.slice(0, 200), payload };
      }
    }
    return { ok: false, status: 0, body: 'all delete payloads failed', payload: null };
  }

  async deleteEmptyNews({ minId = 1, maxId = 0, dryRun = false } = {}) {
    const latest = await this.getNews();
    const latestId = Number(latest && latest.UniquId) || 0;
    const end = maxId > 0 ? maxId : latestId;
    const start = Math.max(1, Number(minId) || 1);
    console.log(`[cleanup] Scanning news ids ${start}..${end} (latest=${latestId})`);

    const empty = [];
    const kept = [];
    const missing = [];

    for (let id = start; id <= end; id += 1) {
      const item = await this.getNews(id);
      const got = Number(item && item.UniquId) || 0;
      if (!got) {
        missing.push(id);
        continue;
      }
      if (this.isEmptyNews(item)) {
        empty.push(got);
      } else {
        kept.push(got);
      }
    }

    console.log(
      `[cleanup] Found empty=${empty.length} filled=${kept.length} missing=${missing.length}`
    );

    const deleted = [];
    const errors = [];
    if (dryRun) {
      console.log(`[cleanup][dry-run] Would delete: ${empty.join(', ')}`);
      return { empty, kept: kept.length, missing: missing.length, deleted, errors, dryRun: true };
    }

    for (const id of empty) {
      try {
        const result = await this.deleteNews(id);
        if (result.ok) {
          const check = await this.getNews(id);
          const stillThere = Number(check && check.UniquId) === id && this.isEmptyNews(check);
          if (stillThere) {
            errors.push({ id, error: 'delete reported ok but record still empty' });
            console.error(`[cleanup] Still present after delete: ${id}`);
          } else {
            deleted.push(id);
            console.log(`[cleanup] Deleted empty newsletter ${id}`);
          }
        } else {
          errors.push({ id, status: result.status, body: result.body });
          console.error(`[cleanup] Delete failed ${id}: HTTP ${result.status} ${result.body}`);
        }
      } catch (err) {
        errors.push({ id, error: err.message });
        console.error(`[cleanup] Delete error ${id}: ${err.message}`);
      }
    }

    return { empty, kept: kept.length, missing: missing.length, deleted, errors, dryRun: false };
  }
}

module.exports = { AdminUploader };
