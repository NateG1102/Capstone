const axios = require('axios');

const OWN_BASE = process.env.OWNERSHIP_API_BASE; // optional
const OWN_KEY  = process.env.OWNERSHIP_API_KEY;  // optional

const sample = (symbol) => ({
  symbol,
  holders: [
    { institution: 'Vanguard Group', shares: 100000000, percent: 7.2, filing: '#' },
    { institution: 'BlackRock',      shares:  95000000, percent: 6.8, filing: '#' },
    { institution: 'State Street',   shares:  40000000, percent: 2.9, filing: '#' }
  ],
  asOf: 'sample'
});

exports.getOwnership = async (req, res) => {
  const symbol = (req.params.symbol || 'AAPL').toUpperCase();
  if (!OWN_BASE || !OWN_KEY) return res.json(sample(symbol));
  try {
    const url = `${OWN_BASE}/v3/institutional-ownership?symbol=${symbol}&apikey=${OWN_KEY}`;
    const r = await axios.get(url);
    const holders = (r.data || []).slice(0,10).map(h => ({
      institution: h?.owner || h?.name || 'Institution',
      shares: h?.shares || h?.share || 0,
      percent: h?.percent || h?.weight || null,
      filing: h?.link || '#'
    }));
    res.json({ symbol, holders, asOf: new Date().toISOString().slice(0,10) });
  } catch {
    res.json(sample(symbol));
  }
};
