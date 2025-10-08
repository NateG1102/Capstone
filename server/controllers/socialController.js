// server/controllers/socialController.js
// Pulls recent symbol chatter from StockTwits and Reddit (no keys required)

const axios = require('axios');

// helper to keep it safe
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// normalize a StockTwits post to a common shape
function normalizeTwit(m) {
  const user = m?.user?.username || m?.user?.name || 'unknown';
  const txt  = (m?.body || '').trim();
  const url  = m?.links?.length ? (m.links[0]?.url || '') : '';
  const ts   = m?.created_at ? new Date(m.created_at).toISOString() : null;
  const id   = m?.id ? String(m.id) : null;
  return {
    source: 'stocktwits',
    author: user,
    text: txt,
    url: url || (id ? `https://stocktwits.com/messages/${id}` : ''),
    publishedAt: ts
  };
}

// normalize a Reddit post to a common shape
function normalizeReddit(p) {
  const d = p?.data || {};
  const user = d?.author || 'u/unknown';
  const txt  = (d?.selftext || '').trim() || d?.title || '';
  const perma = d?.permalink ? `https://www.reddit.com${d.permalink}` : '';
  const ts   = d?.created_utc ? new Date(d.created_utc * 1000).toISOString() : null;
  return {
    source: 'reddit',
    author: user,
    text: txt,
    url: perma,
    publishedAt: ts,
    subreddit: d?.subreddit || ''
  };
}

// GET /api/social/:symbol?limit=20
exports.getSocialBySymbol = async (req, res) => {
  const symbol = (req.params.symbol || 'AAPL').toUpperCase();
  const limit = clamp(Number(req.query.limit || 20), 1, 50);

  try {
    // 1) StockTwits (public)
    const stUrl = `https://api.stocktwits.com/api/2/streams/symbol/${encodeURIComponent(symbol)}.json`;
    let twits = [];
    try {
      const { data } = await axios.get(stUrl, { timeout: 7000 });
      const msgs = Array.isArray(data?.messages) ? data.messages : [];
      twits = msgs.map(normalizeTwit);
    } catch (e) {
      // keep going even if ST fails
      console.warn('[social] stocktwits failed:', e.message);
    }

    // 2) Reddit public search JSON
    // simple query: the ticker as plain text and with $ prefixed
    const q = `${symbol} OR $${symbol}`;
    const rdUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&sort=new&limit=${limit}`;
    let reddits = [];
    try {
      const { data } = await axios.get(rdUrl, {
        headers: { 'User-Agent': 'stocksyncer/1.0' },
        timeout: 7000
      });
      const posts = Array.isArray(data?.data?.children) ? data.data.children : [];
      reddits = posts.map(normalizeReddit);
    } catch (e) {
      console.warn('[social] reddit failed:', e.message);
    }

    // merge + sort newest first + cap to limit
    const merged = [...twits, ...reddits]
      .filter(x => x && x.text && x.url)
      .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))
      .slice(0, limit);

    return res.json({ symbol, count: merged.length, items: merged });
  } catch (err) {
    console.error('[social]', err.message);
    return res.status(500).json({ error: 'Social fetch failed', detail: err.message });
  }
};
