// server/controllers/stockController.js
const axios = require('axios');
const pool = require('../db/pool');

// base url + key for Alpha Vantage
const AV_BASE = 'https://www.alphavantage.co/query';
const KEY = process.env.STOCK_API_KEY;

// AV will return these fields when you hit rate limits / errors
const limitHit = (d) => d && (d.Note || d.Information || d['Error Message']);

// simple cache controls
const QUOTE_TTL_SECONDS = 60;   // serve quote from DB if it's fresher than this
const HISTORY_MIN_ROWS   = 250; // if we already saved at least this many days, read history from DB

// ---------- PRICE ----------
// returns the latest price for :symbol
// 1) try DB cache (fast + no API hit)
// 2) if stale/missing => call Alpha Vantage
// 3) upsert into DB so future calls are cached
async function getStockPrice(req, res) {
  try {
    const symbol = (req.params.symbol || 'AAPL').toUpperCase();

    // step 1: DB cache (recent quote)
    const { rows: cached } = await pool.query(
      `select price, change, change_percent, fetched_at
         from quotes
        where symbol = $1
          and fetched_at > now() - interval '${QUOTE_TTL_SECONDS} seconds'`,
      [symbol]
    );
    if (cached.length) {
      const q = cached[0];
      return res.json({
        symbol,
        price: q.price,
        change: q.change,
        changePercent: q.change_percent,
        cached: true   // let the client know this was a cached hit
      });
    }

    // step 2: live fetch from Alpha Vantage
    const r = await axios.get(AV_BASE, {
      params: { function: 'GLOBAL_QUOTE', symbol, apikey: KEY }
    });
    if (limitHit(r.data)) {
      // when rate-limited we surface a 429 so the client can show a friendly msg
      return res.status(429).json({ error: 'Alpha Vantage limit or error', detail: r.data });
    }
    const q = r.data['Global Quote'];
    if (!q) return res.status(404).json({ error: 'No quote' });

    // normalize fields the way our UI expects
    const price = Number(q['05. price']);
    const change = Number(q['09. change']);
    const changePercentStr = q['10. change percent'] || ''; // e.g. "0.53%"
    const changePercentNum = Number(changePercentStr.replace('%', '').trim());

    // step 3: save/refresh cache in DB (one row per symbol, updated each fetch)
    await pool.query(
      `insert into quotes(symbol, price, change, change_percent, fetched_at)
       values($1, $2, $3, $4, now())
       on conflict (symbol)
       do update set price=$2, change=$3, change_percent=$4, fetched_at=now()`,
      [symbol, price, change, changePercentNum]
    );

    return res.json({
      symbol,
      price,
      change,
      changePercent: changePercentNum,
      cached: false
    });
  } catch (e) {
    console.error('getStockPrice', e.message);
    res.status(500).json({ error: 'Upstream error', detail: e?.message });
  }
}

// ---------- HISTORY ----------
// daily candles for :symbol (close only)
// 1) if we already stored at least HISTORY_MIN_ROWS days, serve from DB
// 2) else pull full series from AV, persist it (upsert/ignore dupes), then return
async function getHistoricalDaily(req, res) {
  try {
    const symbol = (req.params.symbol || 'AAPL').toUpperCase();

    // step 1: see if we have enough data saved already
    const { rows: cnt } = await pool.query(
      `select count(*)::int as n from prices where symbol=$1`,
      [symbol]
    );
    if (cnt[0].n > HISTORY_MIN_ROWS) {
      // read straight from DB (already sorted oldest -> newest)
      const { rows } = await pool.query(
        `select to_char(date,'YYYY-MM-DD') as date, close
           from prices
          where symbol=$1
          order by date asc`,
        [symbol]
      );
      return res.json({ symbol, rows });
    }

    // step 2: fetch full history from Alpha Vantage
    const r = await axios.get(AV_BASE, {
      params: { function: 'TIME_SERIES_DAILY_ADJUSTED', symbol, outputsize: 'full', apikey: KEY }
    });
    if (limitHit(r.data)) {
      return res.status(429).json({ error: 'Alpha Vantage limit or error', detail: r.data });
    }
    const ts = r.data['Time Series (Daily)'];
    if (!ts) return res.status(404).json({ error: 'No historical data' });

    // turn "YYYY-MM-DD" => { date, close } and sort ascending for the chart
    const rows = Object.entries(ts)
      .map(([date, v]) => ({ date, close: Number(v['4. close']) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // step 3: bulk insert new rows (ignore if we already have that day)
    const client = await pool.connect();
    try {
      await client.query('begin');
      for (const r of rows) {
        await client.query(
          `insert into prices(symbol, date, close)
           values($1, $2::date, $3)
           on conflict (symbol, date) do nothing`,
          [symbol, r.date, r.close]
        );
      }
      await client.query('commit');
    } catch (err) {
      await client.query('rollback');
      throw err;
    } finally {
      client.release();
    }

    return res.json({ symbol, rows });
  } catch (e) {
    console.error('getHistoricalDaily', e.message);
    res.status(500).json({ error: 'Upstream error', detail: e?.message });
  }
}

// ---------- LIST QUOTES (for table/grid) ----------
// returns a simple paged list for the UI table
// ordered by most recent fetch time
async function listQuotes(req, res) {
  try {
    const limit  = Math.min(Number(req.query.limit || 50), 200); // hard cap to avoid huge pulls
    const offset = Math.max(Number(req.query.offset || 0), 0);
    const { rows } = await pool.query(
      `select symbol, price, change, change_percent, fetched_at
         from quotes
        order by fetched_at desc
        limit $1 offset $2`,
      [limit, offset]
    );
    res.json({ items: rows, limit, offset });
  } catch (e) {
    console.error('listQuotes', e.message);
    res.status(500).json({ error: e.message });
  }
}

// export handlers
module.exports = {
  getStockPrice,
  getHistoricalDaily,
  listQuotes,
};
