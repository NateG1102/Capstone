// server/scripts/fetchQuotes.js
// fetch today's movers (TOP_GAINERS_LOSERS) and hit /api/stocks/price/:symbol to seed quotes
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const axios = require('axios');
const pool = require('../db/pool');

const API_BASE = `http://${process.env.HOST || '127.0.0.1'}:${process.env.PORT || 8081}`;
const PER_MIN   = Number(process.env.AV_CALLS_PER_MINUTE || 5);   // pace
const BATCH     = Number(process.env.SEED_BATCH || 10);           // max this run (cap)
const EXCHANGE  = process.env.SEED_EXCHANGE || '';                // used only in fallback
const ONLY_LISTED = String(process.env.SEED_ONLY_LISTED || 'true').toLowerCase() !== 'false';

const AV_BASE = 'https://www.alphavantage.co/query';
const AV_KEY  = process.env.STOCK_API_KEY;

// allow override of how many gainers/losers to take; default spreads BATCH roughly in half
const TAKE_GAINERS = Number(process.env.SEED_GAINERS || Math.ceil(BATCH / 2));
const TAKE_LOSERS  = Number(process.env.SEED_LOSERS  || Math.floor(BATCH / 2));

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function limitHit(d) {
  return d && (d.Note || d.Information || d['Error Message']);
}

// grab today’s top gainers/losers from AV
async function getTopMovers() {
  if (!AV_KEY) return [];
  try {
    const { data } = await axios.get(AV_BASE, {
      params: { function: 'TOP_GAINERS_LOSERS', apikey: AV_KEY }
    });
    if (limitHit(data)) {
      console.warn('[fetchQuotes] AV limit/info:', data.Note || data.Information || data['Error Message']);
      return [];
    }
    const gainers = Array.isArray(data?.top_gainers) ? data.top_gainers.slice(0, Math.max(0, TAKE_GAINERS)) : [];
    const losers  = Array.isArray(data?.top_losers)  ? data.top_losers.slice(0, Math.max(0, TAKE_LOSERS))  : [];
    const ordered = [...gainers, ...losers];

    const seen = new Set();
    const symbols = [];
    for (const it of ordered) {
      const sym = String(it?.ticker || '').trim().toUpperCase();
      if (!sym || seen.has(sym)) continue;
      seen.add(sym);
      symbols.push(sym);
      if (symbols.length >= BATCH) break; // respect overall cap
    }
    return symbols;
  } catch (e) {
    console.warn('[fetchQuotes] movers fetch failed:', e.message);
    return [];
  }
}

// original DB-ordered fallback (oldest fetched first)
async function getDbBackfillList() {
  const params = [];
  let sql = `
    select s.symbol
    from symbols s
    left join quotes q on q.symbol = s.symbol
    ${ONLY_LISTED ? 'where s.delisted = false' : ''}
    ${EXCHANGE ? (ONLY_LISTED ? 'and ' : 'where ') + 's.exchange = $1' : ''}
    order by q.fetched_at nulls first, s.symbol asc
    limit ${BATCH}
  `;
  if (EXCHANGE) params.push(EXCHANGE);
  const { rows } = await pool.query(sql, params);
  return rows.map(r => r.symbol);
}

(async () => {
  try {
    // try movers first
    let symbols = await getTopMovers();

    // if empty (rate limit / outage), fallback to DB selection
    if (symbols.length === 0) {
      console.log('[fetchQuotes] using DB fallback list…');
      symbols = await getDbBackfillList();
    }

    if (symbols.length === 0) {
      console.log('[fetchQuotes] nothing to fetch');
      process.exit(0);
    }

    const rpm = Math.max(1, PER_MIN);
    const gap = Math.ceil(60000 / rpm);
    console.log(`[fetchQuotes] fetching ${symbols.length} symbols @ ~${rpm}/min`);

    for (let i = 0; i < symbols.length; i++) {
      const sym = symbols[i];
      try {
        console.log(`[quotes] ${sym}`);
        await axios.get(`${API_BASE}/api/stocks/price/${sym}`);
      } catch (e) {
        console.warn(`[quotes] ${sym} -> ${e?.response?.status || ''} ${e.message}`);
      }
      if (i < symbols.length - 1) await sleep(gap);
    }

    console.log('[fetchQuotes] done');
    process.exit(0);
  } catch (e) {
    console.error('[fetchQuotes] error:', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
