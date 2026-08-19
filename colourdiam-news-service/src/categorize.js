const CATEGORY_RULES = [
  {
    name: 'Auction',
    keywords: [
      'auction',
      "christie's",
      'christies',
      "sotheby's",
      'sothebys',
      'phillips auction',
      'hammer price',
      'sold for',
      'lot ',
      'bidding',
      'estimate',
      'record price'
    ]
  },
  {
    name: 'Met Gala',
    keywords: ['met gala', 'metropolitan museum', 'gala']
  },
  {
    name: 'Colored Diamonds',
    keywords: [
      'colored diamond',
      'coloured diamond',
      'fancy color',
      'fancy colour',
      'pink diamond',
      'blue diamond',
      'yellow diamond',
      'green diamond',
      'red diamond',
      'orange diamond',
      'violet diamond',
      'champagne diamond',
      'brown diamond'
    ]
  },
  {
    name: 'Loose Diamonds',
    keywords: [
      'loose diamond',
      'rough diamond',
      'diamond grading',
      'diamond cut',
      'carat',
      'clarity',
      'girdle',
      'brilliance',
      'lab-grown diamond',
      'synthetic diamond',
      'natural diamond'
    ]
  },
  {
    name: 'Jewelry',
    keywords: [
      'jewelry',
      'jewellery',
      'ring',
      'necklace',
      'bracelet',
      'earring',
      'pendant',
      'brooch',
      'engagement',
      'gemstone',
      'gold',
      'platinum',
      'gemologist'
    ]
  }
];

const DEFAULT_CATEGORY = 'Industry News';

const CATEGORIES = [
  'All',
  'Auction',
  'Met Gala',
  'Colored Diamonds',
  'Loose Diamonds',
  'Jewelry',
  'Industry News'
];

function categorize(text) {
  const lower = (text || '').toLowerCase();
  let best = null;
  let bestScore = 0;

  for (const rule of CATEGORY_RULES) {
    let score = 0;
    for (const keyword of rule.keywords) {
      if (lower.includes(keyword)) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = rule.name;
    }
  }

  return best || DEFAULT_CATEGORY;
}

module.exports = { categorize, CATEGORIES };
