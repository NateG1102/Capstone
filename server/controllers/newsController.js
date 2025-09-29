// server/controllers/newsController.js
// Alpha Vantage NEWS_SENTIMENT → news for the stock being viewed
const axios = require('axios');

const AV_BASE = 'https://www.alphavantage.co/query';
const KEY = process.env.STOCK_API_KEY || '';

// format a YYYYMMDDTHHMM like AV expects (we’ll default to last 7 days)
function ymdHM(d) {
  const pad = (n) => String(n).padStart(2, '0');
  const y = d.getUTCFullYear();
  const m = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const h = pad(d.getUTCHours());
  const mi = pad(d.getUTCMinutes());
  return `${y}${m}${day}T${h}${mi}`;
}

// normalize AV feed item to what the UI usually needs
function pickFeedItem(x) {
  // x.time_published: "YYYYMMDDTHHMMSS"
  let publishedAt = '';
  if (x?.time_published) {
    const t = x.time_published;
    const iso = `${t.slice(0,4)}-${t.slice(4,6)}-${t.slice(6,8)}T${t.slice(9,11)}:${t.slice(11,13)}:${t.slice(13,15)}Z`;
    publishedAt = iso;
  }
  // sentiment per-ticker (if present)
  let tickerLabel = x?.overall_sentiment_label || '';
  let tickerScore = x?.overall_sentiment_score ?? null;

  return {
    title: x?.title || '',
    source: x?.source || '',
    link: x?.url || '',
    publishedAt,
    description: x?.summary || '',
    sentimentLabel: tickerLabel,
    sentimentScore: typeof tickerScore === 'number' ? tickerScore : null
  };
}

// GET /api/news/:symbol  -> AV NEWS_SENTIMENT
// optional query params: topics=earnings,technology  limit=10  days=7  sort=LATEST|EARLIEST|RELEVANCE
exports.getNewsBySymbol = async (req, res) => {
  try {
    const symbol = (req.params.symbol || 'AAPL').toUpperCase();
    if (!KEY) return res.status(400).json({ error: 'Missing STOCK_API_KEY in server/.env' });

    // inputs
    const limit = Math.min(Number(req.query.limit || 10), 50);
    const sort = (req.query.sort || 'LATEST').toUpperCase();
    const topics = (req.query.topics || '').trim();       // e.g. "earnings,technology"
    const days = Math.max(1, Math.min(Number(req.query.days || 7), 90));

    // time window default: last N days (UTC)
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const time_from = ymdHM(from);

    // call AV
    const params = {
      function: 'NEWS_SENTIMENT',
      tickers: symbol,
      time_from,
      sort,                 // LATEST (default) | EARLIEST | RELEVANCE
      limit,                // 1..50 (AV default 50)
      apikey: KEY
    };
    if (topics) params.topics = topics;

    const { data } = await axios.get(AV_BASE, { params });

    // AV returns { items, feed: [...], ... } or an { Information / Note } when throttled
    if (data?.Note || data?.Information || data?.['Error Message']) {
      return res.status(429).json({ error: 'Alpha Vantage limit or error', detail: data });
    }

    const feed = Array.isArray(data?.feed) ? data.feed : [];
    const items = feed.map(pickFeedItem).filter(n => n.title && n.link);

    return res.json({
      symbol,
      items,
      meta: {
        queried: { topics: topics || null, sort, time_from },
        totalFromAPI: data?.items ?? items.length,
        provider: 'alphavantage:NEWS_SENTIMENT'
      }
    });
  } catch (e) {
    console.error('[news:av]', e?.response?.status || '', e.message);
    return res.status(500).json({ error: 'News fetch failed', detail: e.message });
  }
};
