// server/scripts/fetchQuotes.js
// selects symbols by oldest fetched_at (or never fetched) and slowly hits /api/stocks/price/:symbol
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const axios = require('axios');
const pool = require('../db/pool');

const API_BASE = `http://${process.env.HOST || '127.0.0.1'}:${process.env.PORT || 8081}`;
const PER_MIN   = Number(process.env.AV_CALLS_PER_MINUTE || 5);   // adjust to your key
const BATCH     = Number(process.env.SEED_BATCH || 10);           // how many this run
const EXCHANGE  = process.env.SEED_EXCHANGE || '';                // e.g., 'NASDAQ' to filter
const ONLY_LISTED = String(process.env.SEED_ONLY_LISTED || 'true').toLowerCase() !== 'false';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  try {
    // pick symbols with no quote yet, then oldest fetched
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
    if (!rows.length) {
      console.log('[quotes] nothing to fetch (maybe already filled?)');
      process.exit(0);
    }

    console.log(`[quotes] fetching ${rows.length} symbols @ ~${PER_MIN}/min`);
    const gap = Math.ceil(60000 / Math.max(1, PER_MIN));

    for (let i = 0; i < rows.length; i++) {
      const sym = rows[i].symbol;
      try {
        console.log(`[quotes] ${sym}`);
        await axios.get(`${API_BASE}/api/stocks/price/${sym}`);
      } catch (e) {
        console.warn(`[quotes] ${sym} -> ${e?.response?.status || ''} ${e.message}`);
      }
      if (i < rows.length - 1) await sleep(gap);
    }

    console.log('[quotes] done');
    process.exit(0);
  } catch (e) {
    console.error('[quotes] error:', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
