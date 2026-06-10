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

pool.query(`
  CREATE TABLE IF NOT EXISTS assessments (
    assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(group_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).catch((err) => {
  console.error('[db:init] Failed to ensure assessments table:', err.message);
});

pool.query(`
  ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS assessment_id UUID REFERENCES assessments(assessment_id) ON DELETE SET NULL
`).catch((err) => {
  console.error('[db:init] Failed to ensure tasks.assessment_id column:', err.message);
});

pool.query(`
  CREATE TABLE IF NOT EXISTS group_messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(group_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).catch((err) => {
  console.error('[db:init] Failed to ensure group_messages table:', err.message);
});

pool.query(`
  CREATE TABLE IF NOT EXISTS task_comments (
    comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(task_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).catch((err) => {
  console.error('[db:init] Failed to ensure task_comments table:', err.message);
});

pool.query(`
  CREATE TABLE IF NOT EXISTS task_negotiations (
    negotiation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(task_id) ON DELETE CASCADE,
    requested_by UUID REFERENCES users(user_id) ON DELETE CASCADE,
    requested_to UUID REFERENCES users(user_id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).catch((err) => {
  console.error('[db:init] Failed to ensure task_negotiations table:', err.message);
});

module.exports = pool;
