const axios = require('axios');
const KEY = process.env.NEWS_API_KEY;

const fallback = (symbol) => ([
  { title: `${symbol} market wrap (sample)`, source:'Sample', url:'#', publishedAt: new Date().toISOString() },
  { title: `${symbol} analyst note (sample)`, source:'Sample', url:'#', publishedAt: new Date().toISOString() }
]);

exports.getNews = async (req, res) => {
  const symbol = (req.query.symbol || 'AAPL').toUpperCase();
  if (!KEY) return res.json({ symbol, articles: fallback(symbol) });
  try {
    const url = new URL('https://newsapi.org/v2/everything');
    url.searchParams.set('q', symbol);
    url.searchParams.set('language', 'en');
    url.searchParams.set('pageSize', '10');
    const r = await axios.get(url.toString(), { headers: { 'X-Api-Key': KEY } });
    const articles = (r.data.articles || []).map(a => ({
      title: a.title, source: a.source?.name, url: a.url, publishedAt: a.publishedAt
    }));
    res.json({ symbol, articles });
  } catch (e) {
    res.status(500).json({ error:'News fetch failed', detail:e?.message, articles: fallback(symbol) });
  }
};
