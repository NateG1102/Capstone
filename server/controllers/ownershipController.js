// server/controllers/ownershipController.js
// Institutional ownership from local 13F DB (robust to blank strings / schema variance)

const pool = require('../db/pool');

/** Get column names for a table (lowercased). */
async function getCols(client, table) {
  const { rows } = await client.query(
    `SELECT LOWER(column_name) AS c
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1`,
    [table.toLowerCase()]
  );
  return new Set(rows.map(r => r.c));
}

/** Return the first candidate that actually exists. */
function firstExisting(cols, candidates) {
  for (const c of candidates) {
    if (cols.has(c.toLowerCase())) return c;
  }
  return null;
}

/** Build a safe text expression for institution name. */
function buildInstitutionExpr(cols) {
  const nameCol = firstExisting(cols, [
    'manager_name', 'investor_name', 'institution_name', 'filer_name', 'name', 'manager'
  ]);
  return nameCol ? `NULLIF(o.${nameCol}, '')` : `'Unknown'`;
}

/** Build a safe numeric expression (single chosen col) for shares. */
function buildSharesExpr(cols) {
  const shareCol = firstExisting(cols, [
    'shares',          // normalized
    'shrs_or_prn_amt', // common SEC 13F
    'ssh_prn_amt'      // common SEC 13F
  ]);
  if (!shareCol) return '0::numeric';
  // Regex guard: only cast if it looks like a number; else 0
  // Works whether the column is text or numeric (the ::text handles both)
  return `
    CASE
      WHEN NULLIF(o.${shareCol}::text, '') ~ '^[0-9]+(\\.[0-9]+)?$' THEN o.${shareCol}::numeric
      ELSE 0::numeric
    END
  `;
}

/** Build a safe "as of" date/text expression. */
function buildAsOfExpr(cols) {
  const dateCol = firstExisting(cols, [
    'report_date', 'filed_date', 'period_of_report', 'as_of', 'quarter_end'
  ]);
  if (!dateCol) return 'NULL::text';
  // Return raw text (we’ll trim to YYYY-MM-DD in JS)
  return `NULLIF(o.${dateCol}::text, '')`;
}

/** Optional filing URL if present. */
function buildFilingExpr(cols) {
  return cols.has('filing_url') ? 'NULLIF(o.filing_url, \'\')' : 'NULL::text';
}

/** Try to get shares outstanding for % calc. */
async function getSharesOutstanding(client, symbol) {
  // company_meta(symbol, shares_outstanding)
  try {
    const { rows } = await client.query(
      `SELECT shares_outstanding FROM company_meta WHERE UPPER(symbol)=UPPER($1) LIMIT 1`,
      [symbol]
    );
    const v = rows?.[0]?.shares_outstanding;
    if (v != null && !Number.isNaN(Number(v))) return Number(v);
  } catch (_) {}

  // symbols(shares_outstanding)
  try {
    const { rows } = await client.query(
      `SELECT shares_outstanding FROM symbols WHERE UPPER(symbol)=UPPER($1) LIMIT 1`,
      [symbol]
    );
    const v = rows?.[0]?.shares_outstanding;
    if (v != null && !Number.isNaN(Number(v))) return Number(v);
  } catch (_) {}

  return null;
}

/**
 * GET /api/ownership/:symbol
 * -> { symbol, holders: [{ institution, shares, percent, as_of, filing }], source }
 */
exports.getInstitutionalOwnership = async (req, res) => {
  const symbol = (req.params.symbol || 'AAPL').toUpperCase();

  try {
    const client = await pool.connect();
    try {
      const oCols = await getCols(client, 'ownership');

      // Do we have ownership.symbol?
      const hasOwnershipSymbol = oCols.has('symbol');
      // Do we have ownership.cusip and a cusip_map?
      const hasOwnershipCusip = oCols.has('cusip');

      let hasCusipMap = false;
      const { rows: chk } = await client.query(
        `SELECT to_regclass('public.cusip_map') AS exists`
      );
      hasCusipMap = Boolean(chk?.[0]?.exists);

      const instExpr   = buildInstitutionExpr(oCols);
      const sharesExpr = buildSharesExpr(oCols);
      const asOfExpr   = buildAsOfExpr(oCols);
      const filingExpr = buildFilingExpr(oCols);

      // Build WHERE path(s)
      const whereParts = [];
      if (hasOwnershipSymbol) whereParts.push(`UPPER(o.symbol) = UPPER($1)`);
      if (hasOwnershipCusip && hasCusipMap) whereParts.push(`UPPER(m.symbol) = UPPER($1)`);

      if (whereParts.length === 0) {
        // Nowhere to map a symbol → return empty (prevents SQL errors)
        return res.json({ symbol, holders: [], source: '13F(db)' });
      }

      const joinCusipMap = hasOwnershipCusip && hasCusipMap
        ? 'LEFT JOIN cusip_map m ON m.cusip = o.cusip'
        : '';

      // Aggregate by institution + as_of + filing; ignore rows where shares parse to 0
      const sql = `
        SELECT
          COALESCE(${instExpr}, 'Unknown') AS institution,
          SUM(${sharesExpr})::numeric AS shares,
          ${asOfExpr} AS as_of,
          ${filingExpr} AS filing
        FROM ownership o
        ${joinCusipMap}
        WHERE (${whereParts.join(' OR ')})
        GROUP BY COALESCE(${instExpr}, 'Unknown'), ${asOfExpr}, ${filingExpr}
        HAVING SUM(${sharesExpr}) > 0
        ORDER BY SUM(${sharesExpr}) DESC
        LIMIT 50
      `;

      const { rows } = await client.query(sql, [symbol]);

      // Optional % computation
      const so = await getSharesOutstanding(client, symbol);

      const holders = rows.map(r => {
        const shares = Number(r.shares || 0);
        // normalize as_of → YYYY-MM-DD if possible
        let asOf = r.as_of ? String(r.as_of) : null;
        if (asOf && asOf.length >= 10) asOf = asOf.slice(0, 10);

        return {
          institution: r.institution || 'Unknown',
          shares,
          percent: so ? (shares / so) * 100 : null,
          as_of: asOf,
          filing: r.filing || null
        };
      });

      return res.json({ symbol, holders, source: '13F(db)' });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('[ownership:db]', e.message);
    return res.status(500).json({ error: 'Ownership fetch failed (DB)', detail: e.message });
  }
};
