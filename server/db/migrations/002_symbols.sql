
create table if not exists symbols (
  symbol     text primary key,
  name       text,
  exchange   text,
  asset_type text,
  ipo_date   date,
  delisted   boolean default false,
  raw        jsonb,
  created_at timestamptz default now()
);

create index if not exists symbols_exchange_idx on symbols(exchange);
