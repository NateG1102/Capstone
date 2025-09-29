// server/controllers/ownershipController.js
// returns institutional holders for the requested symbol using SEC-API
const axios = require('axios');

const SEC_API_KEY  = process.env.SEC_API_KEY || '';
const SEC_API_BASE = process.env.SEC_API_BASE || 'https://api.sec-api.io';

// GET /api/ownership/:symbol
exports.getInstitutionalOwnership = async (req, res) => {
  // symbol we’re looking at on the page
  const symbol = (req.params.symbol || 'AAPL').toUpperCase();

  // make sure key exists
  if (!SEC_API_KEY) {
    return res.status(400).json({ error: 'Missing SEC_API_KEY in server/.env' });
  }

  try {
    // pull recent 13F filings that list this ticker in holdings
    const body = {
      query: {
        query_string: {
          query: `formType:"13F-HR" AND holdings.ticker:"${symbol}"`
        }
      },
      from: 0,
      size: 40, // enough for a solid list
      sort: [{ filedAt: { order: "desc" } }],
      source: [
        "filer",
        "periodOfReport",
        "holdings.ticker",
        "holdings.shares"
      ]
    };

    const { data } = await axios.post(
      SEC_API_BASE,
      body,
      { params: { token: SEC_API_KEY }, headers: { "Content-Type": "application/json" } }
    );

    const filings = Array.isArray(data?.filings) ? data.filings : [];
    if (!filings.length) {
      return res.json({ symbol, holders: [] });
    }

    // aggregate by institution for this ticker
    const byInst = new Map();
    for (const f of filings) {
      const name =
        f?.filer?.name ||
        f?.filer?.companyName ||
        'Unknown';
      const asOf = f?.periodOfReport || null;

      const holds = Array.isArray(f?.holdings) ? f.holdings : [];
      for (const h of holds) {
        if ((h?.ticker || '').toUpperCase() !== symbol) continue;
        const shares = Number(h?.shares || 0);
        if (!shares) continue;

        if (!byInst.has(name)) {
          byInst.set(name, { institution: name, shares: 0, as_of: asOf });
        }
        const row = byInst.get(name);
        row.shares += shares;
        // keep most recent date we see
        if (asOf && (!row.as_of || new Date(asOf) > new Date(row.as_of))) {
          row.as_of = asOf;
        }
      }
    }

    // normalize for frontend shape; 13F does not give % outstanding → null
    const holders = Array.from(byInst.values())
      .filter(r => r.shares > 0)
      .map(r => ({
        institution: r.institution,
        shares: r.shares,
        percent: null,
        as_of: (r.as_of || '').slice(0, 10) // YYYY-MM-DD
      }))
      .sort((a, b) => b.shares - a.shares)
      .slice(0, 50);

    return res.json({ symbol, holders });
  } catch (e) {
    console.error('[ownership]', e.message);
    return res.status(500).json({ error: 'Ownership fetch failed', detail: e.message });
  }
};
