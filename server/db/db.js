const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? {
        rejectUnauthorized: false,
      }
    : false,
});

// Keep older databases compatible with new notification-task workflow.
pool.query(`
  ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(task_id) ON DELETE CASCADE
`).catch((err) => {
  console.error('[db:init] Failed to ensure notifications.task_id column:', err.message);
});

module.exports = pool;
