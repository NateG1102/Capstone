const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST || '127.0.0.1',
  port: Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || 'stockdash',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on('connect', () => console.log('[pg] connected'));
pool.on('error', (err) => console.error('[pg] pool error', err));

module.exports = pool;
