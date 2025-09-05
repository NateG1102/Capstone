const axios = require('axios');
const AV_BASE = 'https://www.alphavantage.co/query';
const KEY = process.env.STOCK_API_KEY;

const limitHit = (d) => d && (d.Note || d.Information || d['Error Message']);

exports.getStockPrice = async (req, res) => {
  try {
    const symbol = (req.params.symbol || 'AAPL').toUpperCase();
    const r = await axios.get(AV_BASE, { params: { function:'GLOBAL_QUOTE', symbol, apikey: KEY } });
    if (limitHit(r.data)) return res.status(429).json({ error: 'Alpha Vantage limit or error', detail: r.data });
    const q = r.data['Global Quote'];
    if (!q) return res.status(404).json({ error: 'No quote' });
    res.json({
      symbol: q['01. symbol'],
      price: q['05. price'],
      change: q['09. change'],
      changePercent: q['10. change percent']
    });
  } catch (e) {
    res.status(500).json({ error: 'Upstream error', detail: e?.message });
  }
};

exports.getHistoricalDaily = async (req, res) => {
  try {
    const symbol = (req.params.symbol || 'AAPL').toUpperCase();
    const r = await axios.get(AV_BASE, {
      params: { function:'TIME_SERIES_DAILY_ADJUSTED', symbol, outputsize:'full', apikey: KEY }
    });
    if (limitHit(r.data)) return res.status(429).json({ error: 'Alpha Vantage limit or error', detail: r.data });
    const ts = r.data['Time Series (Daily)'];
    if (!ts) return res.status(404).json({ error: 'No historical data' });
    const rows = Object.entries(ts)
      .map(([date, v]) => ({ date, close: parseFloat(v['4. close']) }))
      .sort((a, b) => a.date.localeCompare(b.date));
    res.json({ symbol, rows });
  } catch (e) {
    res.status(500).json({ error: 'Upstream error', detail: e?.message });
  }
};
