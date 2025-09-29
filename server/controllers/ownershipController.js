// server/controllers/ownershipController.js
const axios = require('axios');

const FMP_BASE = process.env.OWNERSHIP_API_BASE || 'https://financialmodelingprep.com/api/v4';
const FMP_KEY  = process.env.OWNERSHIP_API_KEY || '';

exports.getInstitutionalOwnership = async (req, res) => {
  const symbol = (req.params.symbol || 'AAPL').toUpperCase();
  if (!FMP_KEY) return res.status(400).json({ error: 'Set OWNERSHIP_API_KEY in server/.env' });

  try {
    const url = `${FMP_BASE}/institutional-ownership/symbol-ownership`;
    const { data } = await axios.get(url, {
      params: { symbol, includeCurrentQuarter: false, apikey: FMP_KEY }
    });

    const holders = (Array.isArray(data) ? data : [])
      .map(r => ({
        institution: r.investorName || r.institution || 'Unknown',
        shares: Number(r.numberOfShares || r.shares || 0),
        percent: r.percent?.toString?.() ?? null,
        as_of: (r.reportDate || r.filedDate || '').slice(0, 10)
      }))
      .filter(h => h.shares > 0)
      .sort((a,b) => b.shares - a.shares)
      .slice(0, 50);

    res.json({ symbol, holders, source: 'fmp' });
  } catch (e) {
    console.error('[ownership:fmp]', e?.response?.status || '', e.message);
    res.status(500).json({ error: 'Ownership fetch failed', detail: e.message });
  }
};
