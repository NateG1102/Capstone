BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.cusip_map (
  symbol TEXT PRIMARY KEY,
  cusip  TEXT UNIQUE NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_ownership_cusip   ON public.ownership (cusip);
CREATE INDEX IF NOT EXISTS ix_ownership_period  ON public.ownership (period_end);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='ix_symbols_name_trgm'
  ) THEN
    EXECUTE 'CREATE INDEX ix_symbols_name_trgm ON public.symbols USING gin (lower(name) gin_trgm_ops)';
  END IF;
END$$;

WITH
norm_syms AS (
  SELECT
    UPPER(TRIM(symbol)) AS symbol,
    lower(
      regexp_replace(
        regexp_replace(
          regexp_replace(trim(name), '\s+', ' ', 'g'),
          '\b(the|co\.?|corp\.?|corporation|inc\.?|incorporated|ltd\.?|limited|plc|sa|ag|nv|group|holdings?)\b','',
          'gi'
        ),
        '[^a-z0-9 ]','', 'g'
      )
    ) AS display_name
  FROM public.symbols
  WHERE symbol <> '' AND name <> ''
),
latest AS (
  SELECT cusip, MAX(period_end) AS period_end
  FROM public.ownership
  WHERE cusip IS NOT NULL AND cusip <> ''
  GROUP BY cusip
),
norm_issuers AS (
  SELECT
    upper(trim(o.cusip)) AS cusip,
    lower(
      regexp_replace(
        regexp_replace(
          regexp_replace(trim(o.name_of_issuer), '\s+', ' ', 'g'),
          '\b(the|co\.?|corp\.?|corporation|inc\.?|incorporated|ltd\.?|limited|plc|sa|ag|nv|group|holdings?)\b','',
          'gi'
        ),
        '[^a-z0-9 ]','', 'g'
      )
    ) AS issuer_name
  FROM public.ownership o
  JOIN latest l ON l.cusip = o.cusip AND l.period_end = o.period_end
  WHERE o.name_of_issuer IS NOT NULL AND o.name_of_issuer <> ''
),
-- exact prefix first, then fuzzy
exact AS (
  SELECT i.cusip,
         s.symbol,
         1.0::float AS sim
  FROM norm_issuers i
  JOIN norm_syms   s
    ON i.issuer_name LIKE s.display_name || '%'
),
fuzzy AS (
  SELECT i.cusip,
         s.symbol,
         similarity(i.issuer_name, s.display_name) AS sim
  FROM norm_issuers i
  JOIN norm_syms   s
    ON similarity(i.issuer_name, s.display_name) > 0.48
),
cands AS (
  SELECT * FROM exact
  UNION ALL
  SELECT * FROM fuzzy
),

-- 1) choose the best match PER CUSIP (so each CUSIP maps to one symbol)
winners_by_cusip AS (
  SELECT DISTINCT ON (cusip)
         cusip, symbol, sim
  FROM cands
  WHERE cusip ~ '^[0-9A-Z]{9}$'
  ORDER BY cusip, sim DESC
),

-- 2) now also ensure only one row PER SYMBOL (pick the highest-sim if duplicates)
final_winners AS (
  SELECT DISTINCT ON (symbol)
         symbol, cusip, sim
  FROM winners_by_cusip
  ORDER BY symbol, sim DESC
)

INSERT INTO public.cusip_map(symbol, cusip)
SELECT symbol, cusip
FROM final_winners
ON CONFLICT (symbol) DO UPDATE
  SET cusip = EXCLUDED.cusip;


COMMIT;

-- reports
SELECT COUNT(*) AS mapped_symbols FROM public.cusip_map;
SELECT * FROM public.cusip_map ORDER BY symbol LIMIT 25;
