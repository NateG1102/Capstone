const fs = require('fs');
const path = require('path');
const pool = require('./pool');

(async () => {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'migrations', '001_init.sql'), 'utf8');
    await pool.query(sql);
    console.log('Migration applied.');
  } catch (e) {
    console.error('Migration failed:', e);
  } finally {
    await pool.end();
  }
})();
