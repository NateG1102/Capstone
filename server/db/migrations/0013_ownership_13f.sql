CREATE TABLE ownership (
  id                 BIGSERIAL PRIMARY KEY,
  accession_number   TEXT        NOT NULL,
  period_end         DATE        NOT NULL,            -- from SUBMISSION.PERIODOFREPORT
  filer_cik          BIGINT      NOT NULL,            -- from SUBMISSION.CIK
  filer_name         TEXT        NOT NULL,            -- from COVERPAGE.FILINGMANAGER_NAME

  cusip              TEXT        NOT NULL,            -- from INFOTABLE.CUSIP
  symbol             TEXT,                            -- optional: map later via your symbols table
  name_of_issuer     TEXT,                            -- INFOTABLE.NAMEOFISSUER
  title_of_class     TEXT,                            -- INFOTABLE.TITLEOFCLASS

  value_thousands    NUMERIC,                         -- INFOTABLE.VALUE (thousands of $)
  shares             BIGINT,                          -- INFOTABLE.SSHPRNAMT
  shares_type        TEXT,                            -- INFOTABLE.SSHPRNAMTTYPE (SH/PRN)
  put_call           TEXT,                            -- INFOTABLE.PUTCALL (optional)
  investment_discretion TEXT,                         -- INFOTABLE.INVESTMENTDISCRETION
  other_manager      INTEGER,                         -- INFOTABLE.OTHERMANAGER
  voting_auth_sole   BIGINT,
  voting_auth_shared BIGINT,
  voting_auth_none   BIGINT,

  infotable_sk       BIGINT,                          -- INFOTABLE.INFOTABLE_SK (unique row id inside filing)
  inserted_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- avoid duplicates from re-imports (same filing line)
CREATE UNIQUE INDEX ux_ownership_unique_line
  ON ownership (accession_number, filer_cik, cusip, COALESCE(infotable_sk,0));

-- lookup helpers
CREATE INDEX ix_ownership_symbol ON ownership(symbol);
CREATE INDEX ix_ownership_cusip  ON ownership(cusip);
CREATE INDEX ix_ownership_period ON ownership(period_end);

COMMIT;