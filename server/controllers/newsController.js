// server/controllers/newsController.js
// Alpha Vantage NEWS_SENTIMENT → save to DB + return to client

const axios = require('axios');
const pool = require('../db/pool');

const AV_BASE = 'https://www.alphavantage.co/query';
const KEY = process.env.STOCK_API_KEY || '';

// YYYYMMDDTHHMM (UTC)
function ymdHM(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
}

// AV → normalized record for UI/DB
function pickFeedItem(x) {
  let publishedAt = null;
  if (x?.time_published) {
    const t = x.time_published; // "YYYYMMDDTHHMMSS"
    const iso = `${t.slice(0,4)}-${t.slice(4,6)}-${t.slice(6,8)}T${t.slice(9,11)}:${t.slice(11,13)}:${t.slice(13,15)}Z`;
    publishedAt = iso;
  }
  return {
    title: x?.title || '',
    source: x?.source || '',
    url: x?.url || '',
    publishedAt
  };
}

// bulk insert; keep inserted_at as default now()
async function saveNewsBatch(symbol, items) {
  if (!items.length) return { inserted: 0, skipped: 0 };
  // build placeholders: ($1,$2,$3,$4,$5), ($6,$7,$8,$9,$10), ...
  const colsPerRow = 5; // symbol, title, source, url, published_at
  const values = [];
  const params = [];
  let p = 1;

  for (const it of items) {
    // skip if missing basics
    if (!it.title || !it.url) continue;
    values.push(`($${p++}, $${p++}, $${p++}, $${p++}, $${p++})`);
    params.push(symbol, it.title, it.source || null, it.url, it.publishedAt ? new Date(it.publishedAt) : null);
  }

  if (!values.length) return { inserted: 0, skipped: items.length };

  // NOTE: ON CONFLICT needs a unique index on (symbol, url). See DDL note below.
  const sql = `
    INSERT INTO news (symbol, title, source, url, published_at)
    VALUES ${values.join(',')}
    ON CONFLICT (symbol, url) DO NOTHING
  `;

  const r = await pool.query(sql, params);
  return { inserted: r.rowCount || 0, skipped: items.length - (r.rowCount || 0) };
}

// GET /api/news/:symbol  -> AV NEWS_SENTIMENT
// query: topics=earnings,technology  limit=10  days=7  sort=LATEST|EARLIEST|RELEVANCE
exports.getNewsBySymbol = async (req, res) => {
  try {
    const symbol = (req.params.symbol || 'AAPL').toUpperCase();
    if (!KEY) return res.status(400).json({ error: 'Missing STOCK_API_KEY in server/.env' });

    const limit = Math.min(Number(req.query.limit || 10), 50);
    const sort = (req.query.sort || 'LATEST').toUpperCase();
    const topics = (req.query.topics || '').trim();
    const days = Math.max(1, Math.min(Number(req.query.days || 7), 90));

    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const time_from = ymdHM(from);

    const params = {
      function: 'NEWS_SENTIMENT',
      tickers: symbol,
      time_from,
      sort,
      limit,
      apikey: KEY
    };
    if (topics) params.topics = topics;

    const { data } = await axios.get(AV_BASE, { params });

    if (data?.Note || data?.Information || data?.['Error Message']) {
      return res.status(429).json({ error: 'Alpha Vantage limit or error', detail: data });
    }

    const feed = Array.isArray(data?.feed) ? data.feed : [];
    const items = feed.map(pickFeedItem).filter(n => n.title && n.url);

    // save to DB (best effort; don’t fail the whole request if insert has a minor issue)
    let metaDB = { inserted: 0, skipped: 0 };
    try {
      metaDB = await saveNewsBatch(symbol, items);
    } catch (dbErr) {
      // log and continue returning the feed
      console.warn('[news:insert]', dbErr.message);
    }

    return res.json({
      symbol,
      items,
      meta: {
        queried: { topics: topics || null, sort, time_from },
        totalFromAPI: data?.items ?? items.length,
        db: metaDB,
        provider: 'alphavantage:NEWS_SENTIMENT'
      }
    });
  } catch (e) {
    console.error('[news:av]', e?.response?.status || '', e.message);
    return res.status(500).json({ error: 'News fetch failed', detail: e.message });
  }
};
