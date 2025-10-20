// server/controllers/socialController.js
// Keep Reddit links; replace Stocktwits with Twitter (X) cashtag search embed

const axios = require('axios');

// helper to keep it safe
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// normalize a Reddit post to a common shape (kept)
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
// now returns Reddit-only links (Stocktwits removed)
exports.getSocialBySymbol = async (req, res) => {
  const symbol = (req.params.symbol || 'AAPL').toUpperCase();
  const limit = clamp(Number(req.query.limit || 20), 1, 50);

  try {
    // Reddit public search JSON (kept behavior)
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

    // newest first + cap to limit (already limited upstream)
    const items = (reddits || [])
      .filter(x => x && x.text && x.url)
      .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));

    return res.json({ symbol, count: items.length, items });
  } catch (err) {
    console.error('[social]', err.message);
    return res.status(500).json({ error: 'Social fetch failed', detail: err.message });
  }
};

// GET /api/social/twitter/:symbol
// Twitter (X) cashtag timeline: open link in new tab + use only $SYMBOL
exports.getTwitterEmbedBySymbol = async (req, res) => {
  try {
    const raw = (req.params.symbol || req.query.symbol || 'AAPL').toUpperCase().trim();

    // Use ONLY the cashtag for a clean, focused timeline
    const cashtag = `$${raw}`;
    const q = encodeURIComponent(cashtag); // encodes the $ properly
    const href = `https://twitter.com/search?q=${q}&src=typed_query&f=live`;

    // Add target="_blank" to open the timeline link in a new tab
    const html = `
<div style="width:100%;">
  <a class="twitter-timeline"
     href="${href}"
     target="_blank"
     rel="noopener noreferrer">
     Tweets about ${cashtag}
  </a>
  <script async src="https://platform.twitter.com/widgets.js"></script>
</div>`.trim();

    return res.json({ symbol: raw, query: cashtag, html });
  } catch (err) {
    console.warn('[twitter-embed] error:', err?.message || err);
    return res.status(500).json({ error: 'failed to build twitter embed' });
  }
};
