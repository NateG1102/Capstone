const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../db/pool');

function readTSV(filePath) {
  const buf = fs.readFileSync(filePath);
  return parse(buf, { columns: true, skip_empty_lines: true, delimiter: '\t' });
}

function toNum(n) {
  // returns a JS number (float) or null
  if (n === null || n === undefined) return null;
  const s = String(n).trim();
  if (!s) return null;
  const cleaned = s.replace(/[, ]+/g, ''); // remove commas/spaces
  const v = Number(cleaned);
  return Number.isFinite(v) ? v : null;
}

function toInt(n) {
  // use when you KNOW the field is integer; otherwise prefer toNum()
  const v = toNum(n);
  return Number.isFinite(v) ? Math.trunc(v) : null;
}

function toISODateFromSec(ddMONyyyy) {
  // PERIODOFREPORT like "30-JUN-2025"
  if (!ddMONyyyy) return null;
  const [d, mon, y] = String(ddMONyyyy).split('-');
  const months = {
    JAN:'01', FEB:'02', MAR:'03', APR:'04', MAY:'05', JUN:'06',
    JUL:'07', AUG:'08', SEP:'09', OCT:'10', NOV:'11', DEC:'12'
  };
  const mm = months[(mon || '').toUpperCase()] || '01';
  if (!y || !d) return null;
  return `${y}-${mm}-${String(d).padStart(2,'0')}`;
}

(async () => {
  const folder = process.argv[2];
  if (!folder) {
    console.error('Usage: node scripts/load13fFolder.js <folder-with-TSVs>');
    process.exit(1);
  }

  const subPath  = path.join(folder, 'SUBMISSION.tsv');
  const covPath  = path.join(folder, 'COVERPAGE.tsv');
  const infoPath = path.join(folder, 'INFOTABLE.tsv');

  if (!fs.existsSync(subPath) || !fs.existsSync(covPath) || !fs.existsSync(infoPath)) {
    console.error('Missing one of SUBMISSION.tsv, COVERPAGE.tsv, INFOTABLE.tsv in', folder);
    process.exit(1);
  }

  console.log('[13F] reading SUBMISSION.tsv…');
  const submissions = readTSV(subPath);
  const subByAcc = new Map();
  for (const s of submissions) {
    const acc = String(s.ACCESSION_NUMBER || '').trim();
    if (!acc) continue;
    subByAcc.set(acc, {
      cik: toNum(s.CIK),                               // keep as number
      period_end: toISODateFromSec(s.PERIODOFREPORT)   // ISO
    });
  }

  console.log('[13F] reading COVERPAGE.tsv…');
  const covers = readTSV(covPath);
  const nameByAcc = new Map();
  for (const c of covers) {
    const acc = String(c.ACCESSION_NUMBER || '').trim();
    if (!acc) continue;
    nameByAcc.set(acc, String(c.FILINGMANAGER_NAME || '').trim());
  }

  console.log('[13F] reading INFOTABLE.tsv…');
  const infos = readTSV(infoPath);

  console.log(`[13F] inserting ${infos.length} rows…`);
  const client = await pool.connect();
  let inserted = 0, skipped = 0;
  const sampleErrors = [];

  try {
    await client.query('begin');

    for (const r of infos) {
      try {
        const acc   = String(r.ACCESSION_NUMBER || '').trim();
        if (!acc) { skipped++; continue; }

        const meta  = subByAcc.get(acc) || {};
        const fname = nameByAcc.get(acc) || null;

        const params = {
          accession_number: acc,
          period_end: meta.period_end || null,
          filer_cik: meta.cik || null,      // NUMERIC in PG is fine
          filer_name: fname,

          cusip: (r.CUSIP || '').trim(),
          symbol: null, 
          name_of_issuer: (r.NAMEOFISSUER || '').trim(),
          title_of_class: (r.TITLEOFCLASS || '').trim(),

          value_thousands: toNum(r.VALUE),        // NUMERIC
          shares: toNum(r.SSHPRNAMT),             // NUMERIC (can be PRN types)
          shares_type: (r.SSHPRNAMTTYPE || '').trim() || null,
          put_call: (r.PUTCALL || '').trim() || null,
          investment_discretion: (r.INVESTMENTDISCRETION || '').trim() || null,
          other_manager: toNum(r.OTHERMANAGER),   

          voting_auth_sole: toNum(r.VOTING_AUTH_SOLE),
          voting_auth_shared: toNum(r.VOTING_AUTH_SHARED),
          voting_auth_none: toNum(r.VOTING_AUTH_NONE),

          infotable_sk: toNum(r.INFOTABLE_SK)
        };

        if (!params.cusip) { skipped++; continue; }

        await client.query(
          `
          INSERT INTO ownership (
            accession_number, period_end, filer_cik, filer_name,
            cusip, symbol, name_of_issuer, title_of_class,
            value_thousands, shares, shares_type, put_call,
            investment_discretion, other_manager,
            voting_auth_sole, voting_auth_shared, voting_auth_none,
            infotable_sk
          )
          VALUES (
            $1,$2,$3,$4,
            $5,$6,$7,$8,
            $9,$10,$11,$12,
            $13,$14,
            $15,$16,$17,
            $18
          )
          ON CONFLICT (accession_number, filer_cik, cusip, COALESCE(infotable_sk,0))
          DO UPDATE SET
            value_thousands = EXCLUDED.value_thousands,
            shares          = EXCLUDED.shares,
            shares_type     = EXCLUDED.shares_type,
            put_call        = EXCLUDED.put_call,
            investment_discretion = EXCLUDED.investment_discretion,
            other_manager   = EXCLUDED.other_manager,
            voting_auth_sole   = EXCLUDED.voting_auth_sole,
            voting_auth_shared = EXCLUDED.voting_auth_shared,
            voting_auth_none   = EXCLUDED.voting_auth_none
          `,
          [
            params.accession_number, params.period_end, params.filer_cik, params.filer_name,
            params.cusip, params.symbol, params.name_of_issuer, params.title_of_class,
            params.value_thousands, params.shares, params.shares_type, params.put_call,
            params.investment_discretion, params.other_manager,
            params.voting_auth_sole, params.voting_auth_shared, params.voting_auth_none,
            params.infotable_sk
          ]
        );

        inserted++;
      } catch (rowErr) {
        skipped++;
        if (sampleErrors.length < 5) {
          sampleErrors.push(rowErr.message);
        }
      }
    }

    await client.query('commit');
    console.log(`[13F] done ✔ inserted=${inserted}, skipped=${skipped}`);
    if (sampleErrors.length) {
      console.log('[13F] sample row errors:', sampleErrors);
    }
  } catch (e) {
    await client.query('rollback');
    console.error('[13F] error:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
