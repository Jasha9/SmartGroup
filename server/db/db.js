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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).catch((err) => {
  console.error('[db:init] Failed to ensure assessments table:', err.message);
});

pool.query(`
  CREATE TABLE IF NOT EXISTS task_plans (
    plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(group_id) ON DELETE CASCADE,
    task_json JSONB,
    generation_count INT DEFAULT 0,
    last_gen_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).catch((err) => {
  console.error('[db:init] Failed to ensure task_plans table:', err.message);
});

pool.query(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_task_plans_group_unique ON task_plans(group_id)
`).catch((err) => {
  console.error('[db:init] Failed to ensure unique task_plans group index:', err.message);
});

pool.query(`
  ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS assessment_id UUID REFERENCES assessments(assessment_id) ON DELETE SET NULL
`).catch((err) => {
  console.error('[db:init] Failed to ensure tasks.assessment_id column:', err.message);
});

pool.query(`
  ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS progress_percentage INT DEFAULT 0
`).catch((err) => {
  console.error('[db:init] Failed to ensure tasks.progress_percentage column:', err.message);
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
  CREATE TABLE IF NOT EXISTS group_message_mentions (
    mention_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES group_messages(message_id) ON DELETE CASCADE,
    mentioned_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, mentioned_user_id)
  )
`).catch((err) => {
  console.error('[db:init] Failed to ensure group_message_mentions table:', err.message);
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
  )
`).catch((err) => {
  console.error('[db:init] Failed to ensure task_negotiations table:', err.message);
});

pool.query(`
  ALTER TABLE task_negotiations
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP
`).catch((err) => {
  console.error('[db:init] Failed to ensure task_negotiations.resolved_at column:', err.message);
});

pool.query(`
  CREATE TABLE IF NOT EXISTS comment_mentions (
    mention_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID REFERENCES task_comments(comment_id) ON DELETE CASCADE,
    mentioned_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(comment_id, mentioned_user_id)
  )
`).catch((err) => {
  console.error('[db:init] Failed to ensure comment_mentions table:', err.message);
});

pool.query(`
  CREATE TABLE IF NOT EXISTS subtasks (
    subtask_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(task_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).catch((err) => {
  console.error('[db:init] Failed to ensure subtasks table:', err.message);
});

pool.query(`
  ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS title VARCHAR(255)
`).catch((err) => {
  console.error('[db:init] Failed to ensure notifications.title column:', err.message);
});

pool.query(`
  ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS related_task_id UUID REFERENCES tasks(task_id) ON DELETE CASCADE
`).catch((err) => {
  console.error('[db:init] Failed to ensure notifications.related_task_id column:', err.message);
});

pool.query(`
  ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS related_group_id UUID REFERENCES groups(group_id) ON DELETE CASCADE
`).catch((err) => {
  console.error('[db:init] Failed to ensure notifications.related_group_id column:', err.message);
});

pool.query(`
  ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS related_assessment_id UUID REFERENCES assessments(assessment_id) ON DELETE SET NULL
`).catch((err) => {
  console.error('[db:init] Failed to ensure notifications.related_assessment_id column:', err.message);
});

module.exports = pool;
