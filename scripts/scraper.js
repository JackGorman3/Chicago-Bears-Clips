/**
 * Chicago Bears Article Scraper
 * Runs via GitHub Actions daily at 6 AM UTC.
 * Scrapes articles from configured news sources published in the last 26 hours
 * and writes them to public/data/articles.json.
 */

import { load } from 'cheerio';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, '..', 'public', 'data', 'articles.json');
const LOOKBACK_HOURS = 26; // slightly more than 24h to cover timezone edge cases
const MAX_FOLLOW_PER_SITE = 10; // limit full-content fetches per site

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function urlToId(url) {
  return createHash('md5').update(url).digest('hex').slice(0, 16);
}

function isRecent(dateStr) {
  if (!dateStr) return true; // include if we can't determine date
  const date = new Date(dateStr);
  if (isNaN(date)) return true;
  return Date.now() - date.getTime() < LOOKBACK_HOURS * 60 * 60 * 1000;
}

function cleanText(str) {
  return (str || '').replace(/\s+/g, ' ').trim();
}

function resolveUrl(href, pageUrl) {
  if (!href) return null;
  href = href.trim();
  if (href.startsWith('http')) return href;
  if (href.startsWith('//')) return 'https:' + href;
  if (href.startsWith('/')) {
    try {
      const base = new URL(pageUrl);
      return base.origin + href;
    } catch { return null; }
  }
  return null;
}

async function fetchPage(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    clearTimeout(timer);
    if (!resp.ok) {
      console.warn(`  HTTP ${resp.status} from ${url}`);
      return null;
    }
    return await resp.text();
  } catch (err) {
    clearTimeout(timer);
    console.warn(`  Fetch failed (${url}): ${err.message}`);
    return null;
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// ESPN — public JSON API (most reliable source)
// ---------------------------------------------------------------------------

async function scrapeEspn() {
  console.log('Scraping ESPN (API)...');
  try {
    const resp = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?team=3&limit=50',
      { headers: { Accept: 'application/json' } }
    );
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    const cutoff = Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000;
    const articles = (data.articles || [])
      .filter(a => {
        const ts = new Date(a.published || a.lastModified || 0).getTime();
        return ts > cutoff;
      })
      .map(a => ({
        id: urlToId(a.links?.web?.href || String(a.id)),
        title: cleanText(a.headline || ''),
        author: a.byline || null,
        source: 'ESPN',
        sourceUrl: a.links?.web?.href || '',
        publishedAt: a.published || null,
        excerpt: a.description || null,
        content: a.story || a.description || '',
        scrapedAt: new Date().toISOString(),
      }));

    console.log(`  Found ${articles.length} recent articles`);
    return articles;
  } catch (err) {
    console.error(`  ESPN error: ${err.message}`);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Generic HTML listing page scraper
// ---------------------------------------------------------------------------

async function scrapeHtmlListing(config) {
  console.log(`Scraping ${config.source}...`);
  const html = await fetchPage(config.listUrl);
  if (!html) return [];

  const $ = load(html);
  const articles = [];
  const seen = new Set();

  $(config.selectors.items).each((i, el) => {
    const $el = $(el);

    // Title
    const title = cleanText($el.find(config.selectors.title).first().text());
    if (!title || title.length < 5) return;

    // Link — look inside the item, then fall back to closest anchor
    const $link = $el.find(config.selectors.link || 'a').first();
    const href = $link.attr('href') || $el.closest('a').attr('href');
    const url = resolveUrl(href, config.listUrl);
    if (!url || seen.has(url)) return;
    seen.add(url);

    // Date
    const $date = $el.find((config.selectors.date || 'time')).first();
    const publishedAt =
      $date.attr('datetime') ||
      $date.attr('data-date') ||
      cleanText($date.text()) ||
      null;

    if (publishedAt && !isRecent(publishedAt)) return;

    // Author
    const author = config.selectors.author
      ? cleanText($el.find(config.selectors.author).first().text()) || null
      : null;

    // Excerpt
    const excerpt = config.selectors.excerpt
      ? cleanText($el.find(config.selectors.excerpt).first().text()) || null
      : null;

    articles.push({
      id: urlToId(url),
      title,
      author,
      source: config.source,
      sourceUrl: url,
      publishedAt,
      excerpt,
      content: excerpt || '',
      scrapedAt: new Date().toISOString(),
    });
  });

  console.log(`  Found ${articles.length} articles on listing page`);
  return articles;
}

// ---------------------------------------------------------------------------
// Follow article links to fetch full body text (non-paywalled sites only)
// ---------------------------------------------------------------------------

async function enrichWithContent(articles, bodySelector) {
  const limited = articles.slice(0, MAX_FOLLOW_PER_SITE);
  const results = [];

  for (const article of limited) {
    if (!article.sourceUrl) {
      results.push(article);
      continue;
    }
    const html = await fetchPage(article.sourceUrl);
    if (html) {
      const $ = load(html);
      const $body = $(bodySelector).first();
      if ($body.length) {
        $body.find('script, style, figure, figcaption, .ad, [class*="ad-"], [class*="promo"], [class*="related"]').remove();
        const text = cleanText($body.text());
        if (text.length > 200) {
          article.content = text;
        }
      }
    }
    results.push(article);
    await sleep(600); // be polite
  }

  // Articles beyond the limit keep their excerpt as content
  for (const article of articles.slice(MAX_FOLLOW_PER_SITE)) {
    results.push(article);
  }

  return results;
}

// ---------------------------------------------------------------------------
// RSS / Atom feed parser
// ---------------------------------------------------------------------------

async function scrapeRss(config) {
  console.log(`Scraping ${config.source} (RSS)...`);
  const xml = await fetchPage(config.rssUrl);
  if (!xml) return [];

  const $ = load(xml, { xmlMode: true });
  const articles = [];
  const cutoff = Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000;

  const items = $('item').length ? $('item') : $('entry');
  items.each((i, el) => {
    const $el = $(el);
    const title = cleanText($el.find('title').first().text());
    const link =
      $el.find('link').first().attr('href') ||
      cleanText($el.find('link').first().text());
    const pubDate =
      cleanText($el.find('pubDate').text()) ||
      cleanText($el.find('published').text()) ||
      cleanText($el.find('updated').text());
    const description = $el.find('description, summary, content').first().text();
    const author =
      cleanText($el.find('author name').text()) ||
      cleanText($el.find('dc\\:creator').text());

    if (!title || !link) return;

    if (pubDate) {
      const ts = new Date(pubDate).getTime();
      if (!isNaN(ts) && ts < cutoff) return;
    }

    const contentText = cleanText(description.replace(/<[^>]*>/g, ''));
    articles.push({
      id: urlToId(link),
      title,
      author: author || null,
      source: config.source,
      sourceUrl: link,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : null,
      excerpt: contentText.slice(0, 400) || null,
      content: contentText,
      scrapedAt: new Date().toISOString(),
    });
  });

  console.log(`  Found ${articles.length} articles`);
  return articles;
}

// ---------------------------------------------------------------------------
// Site configurations
// Selectors are best-effort and may need tuning if a site changes its markup.
// Run `node scripts/scraper.js` locally to test and adjust.
// ---------------------------------------------------------------------------

const SITE_CONFIGS = [
  {
    source: 'Chicago Bears Official',
    listUrl: 'https://www.chicagobears.com/news/',
    selectors: {
      items: '.nfl-c-article-list__item, article, li.d3-o-media-object',
      title: '.nfl-c-article-list__headline, h1, h2, h3',
      link: 'a',
      date: 'time',
      author: '.nfl-c-article-list__author, [class*="author"]',
      excerpt: '.nfl-c-article-list__abstract, [class*="abstract"], p',
    },
    followLinks: true,
    articleBodySelector: '.nfl-c-article__body, [class*="article-body"], .article-content',
  },
  {
    source: 'AP News',
    listUrl: 'https://apnews.com/hub/chicago-bears',
    selectors: {
      items: '.PageList-items-item, [data-key="feed-card"], .FeedCard, [class*="FeedCard"]',
      title: '.Component-headline, [class*="headline"], h1, h2, h3',
      link: 'a[href*="/article/"]',
      date: '.Timestamp, [data-source="timestamp"], time',
      author: '.Component-bylines, [class*="byline"]',
      excerpt: '.Component-summary, p',
    },
    followLinks: true,
    articleBodySelector: '.RichTextStoryBody, [class*="ArticleBody"], .article-body',
  },
  {
    source: 'Chicago Tribune',
    listUrl: 'https://www.chicagotribune.com/sports/chicago-bears/',
    selectors: {
      items: 'article, .promo, [class*="story-promo"], [class*="article-promo"]',
      title: 'h2, h3, [class*="promo-title"], [class*="headline"]',
      link: 'a',
      date: 'time, [class*="timestamp"], [class*="date"]',
      author: '[class*="byline"], [class*="author"]',
      excerpt: 'p, [class*="summary"], [class*="abstract"]',
    },
    // Paywalled: full-text not available, headlines/excerpts only
  },
  {
    source: 'Chicago Sun-Times',
    listUrl: 'https://chicago.suntimes.com/chicago-bears',
    selectors: {
      items: 'article, [class*="story"], [class*="post-item"], [class*="feed-item"]',
      title: 'h2, h3, [class*="title"], [class*="headline"]',
      link: 'a',
      date: 'time, [class*="date"], [class*="timestamp"]',
      author: '[class*="author"], [class*="byline"]',
      excerpt: 'p, [class*="excerpt"], [class*="summary"]',
    },
    // Paywalled: headlines/excerpts only
  },
  {
    source: "Crain's Chicago Business",
    listUrl: 'https://www.chicagobusiness.com/search?q=chicago+bears&f=all',
    selectors: {
      items: 'article, [class*="search-result"], [class*="story-item"]',
      title: 'h2, h3, [class*="headline"], [class*="title"]',
      link: 'a',
      date: 'time, [class*="date"], [class*="published"]',
      author: '[class*="author"], [class*="byline"]',
      excerpt: 'p, [class*="summary"], [class*="teaser"]',
    },
    // Paywalled: headlines only
  },
  {
    source: 'The Athletic',
    listUrl: 'https://www.nytimes.com/athletic/football/nfl/chicago-bears/',
    selectors: {
      items: '[data-testid="story-wrapper"], article, [class*="story-item"]',
      title: '[data-testid="headline"], h2, h3',
      link: 'a',
      date: 'time, [data-testid="todays-date"], [class*="timestamp"]',
      author: '[data-testid="byline"], [class*="byline"]',
      excerpt: 'p, [data-testid="summary"], [class*="summary"]',
    },
    // Paywalled: headlines only
  },
  {
    source: 'Daily Herald',
    listUrl: 'https://www.dailyherald.com/sports/chicago-bears/',
    selectors: {
      items: 'article, .story, [class*="article-item"], [class*="list-item"]',
      title: 'h2, h3, .headline, [class*="title"]',
      link: 'a',
      date: 'time, .timestamp, [class*="date"]',
      author: '.byline, [class*="author"]',
      excerpt: 'p, .summary, [class*="excerpt"]',
    },
  },
  {
    source: '670 The Score',
    listUrl: 'https://670thescore.com/category/chicago-bears/',
    selectors: {
      items: 'article, .post, [class*="article-card"]',
      title: 'h2, h3, .entry-title, [class*="post-title"]',
      link: 'h2 a, h3 a, .entry-title a, a',
      date: 'time, .entry-date, [class*="post-date"]',
      author: '.author, .entry-author, [class*="author-name"]',
      excerpt: '.excerpt, .entry-summary, p',
    },
  },
  {
    source: 'Fox 32 Chicago',
    listUrl: 'https://www.fox32chicago.com/tag/chicago-bears',
    selectors: {
      items: 'article, [class*="story-"], [class*="article-card"], [class*="content-list"]',
      title: 'h2, h3, [class*="headline"], [class*="title"]',
      link: 'a',
      date: 'time, [class*="date"], [class*="timestamp"]',
      author: '[class*="byline"], [class*="author"]',
      excerpt: 'p, [class*="dek"], [class*="excerpt"]',
    },
  },
  {
    source: 'Marquee Sports Network',
    listUrl: 'https://www.marqueesportsnetwork.com/?s=chicago+bears',
    selectors: {
      items: 'article, [class*="post-card"], .card, [class*="search-result"]',
      title: 'h2, h3, .entry-title, [class*="post-title"]',
      link: 'h2 a, h3 a, .entry-title a, a',
      date: 'time, [class*="post-date"], [class*="date"]',
      author: '[class*="author"], .byline',
      excerpt: '.entry-summary, p',
    },
  },
  {
    source: 'CBS Chicago',
    listUrl: 'https://www.cbsnews.com/chicago/tag/chicago-bears/',
    selectors: {
      items: 'article, [class*="item--"], [class*="story"], .item',
      title: 'h2, h3, [class*="title"], [class*="headline"]',
      link: 'a',
      date: 'time, [class*="date"], [class*="timestamp"]',
      author: '[class*="author"], [class*="byline"]',
      excerpt: 'p, [class*="dek"], [class*="summary"]',
    },
  },
  {
    source: 'WGN News',
    listUrl: 'https://wgntv.com/sports/chicago-bears/',
    selectors: {
      items: 'article, [class*="article-"], .story-card, .post',
      title: 'h2, h3, [class*="headline"], [class*="title"]',
      link: 'a',
      date: 'time, [class*="date"], [class*="timestamp"]',
      author: '[class*="author"], [class*="byline"]',
      excerpt: 'p, [class*="excerpt"], [class*="summary"]',
    },
  },
  {
    source: 'CHGO Sports',
    listUrl: 'https://chgosports.com/?s=bears',
    selectors: {
      items: 'article, [class*="post"], .card',
      title: 'h2, h3, .entry-title',
      link: 'h2 a, h3 a, .entry-title a, a',
      date: 'time, [class*="date"]',
      author: '[class*="author"]',
      excerpt: '.entry-summary, p',
    },
  },

  // ---------------------------------------------------------------------------
  // Google Alerts RSS
  // To enable: go to google.com/alerts, create an alert for "Chicago Bears",
  // set delivery to "RSS feed", copy the feed URL, and paste it below.
  // ---------------------------------------------------------------------------
  // {
  //   source: 'Google Alerts',
  //   type: 'rss',
  //   rssUrl: 'https://www.google.com/alerts/feeds/YOUR_ID/YOUR_KEY',
  // },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run() {
  console.log('\n=== Chicago Bears Article Scraper ===');
  console.log(`Lookback window: ${LOOKBACK_HOURS} hours\n`);

  // Load existing articles so we don't lose ones already scraped today
  let existingArticles = [];
  if (existsSync(OUTPUT_PATH)) {
    try {
      const raw = JSON.parse(readFileSync(OUTPUT_PATH, 'utf-8'));
      existingArticles = raw.articles || [];
    } catch {
      // ignore parse errors
    }
  }

  const allNew = [];

  // ESPN via API
  allNew.push(...await scrapeEspn());

  // HTML listing sites
  for (const config of SITE_CONFIGS) {
    try {
      if (config.type === 'rss') {
        allNew.push(...await scrapeRss(config));
        continue;
      }

      let articles = await scrapeHtmlListing(config);

      if (config.followLinks && articles.length > 0) {
        console.log(`  Fetching full content for up to ${MAX_FOLLOW_PER_SITE} articles...`);
        articles = await enrichWithContent(articles, config.articleBodySelector);
      }

      allNew.push(...articles);
    } catch (err) {
      console.error(`Error scraping ${config.source}: ${err.message}`);
    }
  }

  // Deduplicate: new articles override existing ones with same id.
  // Keep existing articles that are still within the lookback window.
  const cutoff = Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000;
  const byId = new Map();

  for (const a of existingArticles) {
    const ts = a.publishedAt ? new Date(a.publishedAt).getTime() : Date.now();
    if (!a.publishedAt || ts > cutoff) {
      byId.set(a.id, a);
    }
  }

  for (const a of allNew) {
    if (a.id && a.title) {
      byId.set(a.id, a);
    }
  }

  const articles = [...byId.values()].sort(
    (a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)
  );

  const output = {
    lastUpdated: new Date().toISOString(),
    articles,
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`\nDone. Saved ${articles.length} total articles to public/data/articles.json`);
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
