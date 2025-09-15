-- 1) QUOTES — short-lived cache of latest quote
CREATE TABLE IF NOT EXISTS quotes (
  symbol          TEXT PRIMARY KEY,
  price           NUMERIC(18,4) NOT NULL,
  change          NUMERIC(18,4),
  change_percent  NUMERIC(6,3),                -- store as numeric: e.g. -0.530 (%)
  fetched_at      TIMESTAMP NOT NULL DEFAULT now()
);

-- Helpful index to force “fresh within N seconds” scans to use the timestamp
CREATE INDEX IF NOT EXISTS idx_quotes_fetched_at ON quotes (fetched_at DESC);


-- 2) PRICES — daily time series (for 1w/1m/6m/1y charts)
CREATE TABLE IF NOT EXISTS prices (
  symbol  TEXT NOT NULL,
  date    DATE NOT NULL,
  close   NUMERIC(18,4) NOT NULL,
  PRIMARY KEY (symbol, date)
);

-- If you ever want quick latest-close lookups:
CREATE INDEX IF NOT EXISTS idx_prices_symbol_date_desc ON prices (symbol, date DESC);


-- 3) NEWS — normalized headlines per symbol
CREATE TABLE IF NOT EXISTS news (
  id            SERIAL PRIMARY KEY,
  symbol        TEXT NOT NULL,
  title         TEXT NOT NULL,
  source        TEXT,
  url           TEXT,
  published_at  TIMESTAMP,
  inserted_at   TIMESTAMP NOT NULL DEFAULT now()
);

-- Prevent exact duplicate article URLs
CREATE UNIQUE INDEX IF NOT EXISTS ux_news_url ON news (url);

-- Fast “recent news per symbol”
CREATE INDEX IF NOT EXISTS idx_news_symbol_published ON news (symbol, published_at DESC);


-- 4) OWNERSHIP — top holders snapshot
CREATE TABLE IF NOT EXISTS ownership (
  id          SERIAL PRIMARY KEY,
  symbol      TEXT NOT NULL,
  institution TEXT NOT NULL,
  shares      BIGINT,                -- raw share count
  percent     NUMERIC(6,3),          -- e.g. 7.200 (%)
  as_of       DATE,                  -- filing or snapshot date
  inserted_at TIMESTAMP NOT NULL DEFAULT now(),
  -- avoid obvious duplicates for the same reporting date
  UNIQUE (symbol, institution, as_of)
);

CREATE INDEX IF NOT EXISTS idx_ownership_symbol ON ownership (symbol);
CREATE INDEX IF NOT EXISTS idx_ownership_asof ON ownership (as_of DESC);


-- 5) CHAT_LOGS — optional audit trail of Q&A (for UX improvements)
CREATE TABLE IF NOT EXISTS chat_logs (
  id       BIGSERIAL PRIMARY KEY,
  symbol   TEXT,
  role     TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content  TEXT NOT NULL,
  ts       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_logs_symbol_ts ON chat_logs (symbol, ts DESC);