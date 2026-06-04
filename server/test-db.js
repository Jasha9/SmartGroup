const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set in server/.env');
  process.exit(1);
}

const client = new Client({ connectionString: url });

(async () => {
  try {
    await client.connect();
    const res = await client.query('SELECT NOW() AS now');
    console.log('DB connected. Server time:', res.rows[0].now);
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('DB connection error:', err.message || err);
    process.exit(1);
  }
})();
