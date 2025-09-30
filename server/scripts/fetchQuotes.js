// server/scripts/fetchQuotes.js
// pulls today's movers (TOP_GAINERS_LOSERS) and hits our /api/stocks/price/:symbol to seed quotes

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const axios = require('axios');
const pool = require('../db/pool');

// where our own API lives (React never sees provider keys)
const API_BASE = `http://${process.env.HOST || '127.0.0.1'}:${process.env.PORT || 8081}`;

// pacing + batch controls (set in PowerShell before running)
// ex: $env:AV_CALLS_PER_MINUTE=5; $env:SEED_BATCH=30
const PER_MIN   = Number(process.env.AV_CALLS_PER_MINUTE || 5);   // requests/minute to our API
const BATCH     = Number(process.env.SEED_BATCH || 10);           // cap how many symbols this run

// fallback selection filters (only used if movers are empty / rate-limited)
const EXCHANGE    = process.env.SEED_EXCHANGE || '';              // e.g. 'NASDAQ'
const ONLY_LISTED = String(process.env.SEED_ONLY_LISTED || 'true').toLowerCase() !== 'false';

// Alpha Vantage config for movers call
const AV_BASE = 'https://www.alphavantage.co/query';
const AV_KEY  = process.env.STOCK_API_KEY;

// split BATCH between gainers/losers (can override via env)
// ex: $env:SEED_GAINERS=15; $env:SEED_LOSERS=15
const TAKE_GAINERS = Number(process.env.SEED_GAINERS || Math.ceil(BATCH / 2));
const TAKE_LOSERS  = Number(process.env.SEED_LOSERS  || Math.floor(BATCH / 2));

// simple sleep for throttling
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// AV will include one of these when throttled or errored
function limitHit(d) {
  return d && (d.Note || d.Information || d['Error Message']);
}

// ---------------------------
// getTopMovers()
// asks AV for today's top gainers/losers and returns a de-duped symbol list
// ---------------------------
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

    // trim each list to our desired size
    const gainers = Array.isArray(data?.top_gainers) ? data.top_gainers.slice(0, Math.max(0, TAKE_GAINERS)) : [];
    const losers  = Array.isArray(data?.top_losers)  ? data.top_losers.slice(0, Math.max(0, TAKE_LOSERS))  : [];

    // keep order: gainers first, then losers. remove duplicates. cap to BATCH overall.
    const ordered = [...gainers, ...losers];
    const seen = new Set();
    const symbols = [];

    for (const it of ordered) {
      const sym = String(it?.ticker || '').trim().toUpperCase();
      if (!sym || seen.has(sym)) continue;
      seen.add(sym);
      symbols.push(sym);
      if (symbols.length >= BATCH) break; // respect our overall cap
    }

    return symbols;
  } catch (e) {
    console.warn('[fetchQuotes] movers fetch failed:', e.message);
    return [];
  }
}

// ---------------------------
// getDbBackfillList()
// fallback: pick symbols by "never or oldest fetched" from our DB
// keeps the pipeline alive if AV movers are rate-limited
// ---------------------------
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

// ---------------------------
// main
// tries movers first; if empty, falls back to DB list
// throttles calls to our own /api/stocks/price/:symbol
// ---------------------------
(async () => {
  try {
    // 1) prefer what's moving today
    let symbols = await getTopMovers();

    // 2) if nothing (rate limit / no data), fallback to oldest/never fetched
    if (symbols.length === 0) {
      console.log('[fetchQuotes] using DB fallback list…');
      symbols = await getDbBackfillList();
    }

    if (symbols.length === 0) {
      console.log('[fetchQuotes] nothing to fetch');
      process.exit(0);
    }

    // throttle to avoid hammering our server / provider
    const rpm = Math.max(1, PER_MIN);
    const gap = Math.ceil(60000 / rpm);
    console.log(`[fetchQuotes] fetching ${symbols.length} symbols @ ~${rpm}/min`);

    // 3) for each symbol, call our REST endpoint that normalizes + upserts
    for (let i = 0; i < symbols.length; i++) {
      const sym = symbols[i];
      try {
        console.log(`[quotes] ${sym}`);
        await axios.get(`${API_BASE}/api/stocks/price/${sym}`);
      } catch (e) {
        // don't crash the whole run on one failure
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
    // close pg pool so the process can exit cleanly
    await pool.end();
  }
})();
