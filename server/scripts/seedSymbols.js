// server/scripts/seedSymbols.js
const path = require('path');
const https = require('https');
const { parse } = require('csv-parse/sync');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../db/pool');

const KEY = process.env.STOCK_API_KEY;


function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

(async () => {
  try {
    if (!KEY) throw new Error('missing STOCK_API_KEY');
    const url = `https://www.alphavantage.co/query?function=LISTING_STATUS&apikey=${KEY}`;

    console.log('[symbols] downloading…');
    const buf = await download(url);

    console.log('[symbols] parsing…');
    const rows = parse(buf, { columns: true, skip_empty_lines: true });
    console.log(`[symbols] ${rows.length} rows`);

    const client = await pool.connect();
    try {
      await client.query('begin');
      for (const r of rows) {
        const symbol = (r.symbol || '').trim();
        if (!symbol) continue;
        const name = r.name || null;
        const exchange = r.exchange || null;
        const assetType = r.assetType || null;
        const ipoDate = r.ipoDate || null;
        const delisted = (r.status || '').toLowerCase() === 'delisted';
        await client.query(
          `insert into symbols(symbol, name, exchange, asset_type, ipo_date, delisted, raw)
           values($1,$2,$3,$4,nullif($5,'')::date,$6,$7::jsonb)
           on conflict(symbol) do update
             set name=$2, exchange=$3, asset_type=$4, ipo_date=nullif($5,'')::date,
                 delisted=$6, raw=$7::jsonb`,
          [symbol, name, exchange, assetType, ipoDate, delisted, JSON.stringify(r)]
        );
      }
      await client.query('commit');
      console.log('[symbols] done');
    } catch (e) {
      await client.query('rollback'); throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('[symbols] error:', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
