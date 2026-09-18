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

function cleanText(text) {
  return stripHtml(text)
    .replace(/Continue reading on Medium\s*»?/gi, '')
    .replace(/The post .+ appeared first on .+$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalize(text) {
  return cleanText(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueDescription(title, description) {
  const desc = cleanText(description);
  if (!desc) {
    return '';
  }
  const titleNorm = normalize(title);
  const descNorm = normalize(desc);
  if (!descNorm || descNorm === titleNorm) {
    return '';
  }
  if (titleNorm && (descNorm.startsWith(titleNorm) || titleNorm.startsWith(descNorm))) {
    const remainder = descNorm.replace(titleNorm, '').trim();
    if (!remainder || remainder.split(' ').filter(Boolean).length <= 6) {
      return '';
    }
  }
  return desc;
}

function publisherFromTitle(title, fallback) {
  const match = String(title || '').match(/\s-\s([A-Za-z0-9][A-Za-z0-9 .&']{1,50})$/);
  if (match) {
    return match[1].trim();
  }
  return fallback || '';
}

function isLowQualitySource(article) {
  const source = `${article.sourceName || ''} ${article.source || ''} ${article.link || ''}`.toLowerCase();
  return source.includes('medium.com') || source.includes('medium diamonds');
}

module.exports = {
  stripHtml,
  cleanText,
  uniqueDescription,
  publisherFromTitle,
  isLowQualitySource
};
