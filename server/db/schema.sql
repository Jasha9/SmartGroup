CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'STUDENT',
  is_onboarded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS groups (
  group_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'PENDING',
  created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS memberships (
  membership_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(group_id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'MEMBER',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, group_id)
);

CREATE TABLE IF NOT EXISTS task_plans (
  plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(group_id) ON DELETE CASCADE,
  task_json JSONB,
  generation_count INT DEFAULT 0,
  last_gen_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assessments (
  assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(group_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE,
  created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(group_id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES assessments(assessment_id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(user_id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'TO_DO',
  priority VARCHAR(50) DEFAULT 'MEDIUM',
  effort_hours INT DEFAULT 1,
  progress_percentage INT DEFAULT 0,
  is_signed BOOLEAN DEFAULT FALSE,
  due_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS group_messages (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(group_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS group_message_mentions (
  mention_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES group_messages(message_id) ON DELETE CASCADE,
  mentioned_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(message_id, mentioned_user_id)
);

CREATE TABLE IF NOT EXISTS task_comments (
  comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(task_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_negotiations (
  negotiation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(task_id) ON DELETE CASCADE,
  requested_by UUID REFERENCES users(user_id) ON DELETE CASCADE,
  requested_to UUID REFERENCES users(user_id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comment_mentions (
  mention_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES task_comments(comment_id) ON DELETE CASCADE,
  mentioned_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(comment_id, mentioned_user_id)
);

CREATE TABLE IF NOT EXISTS subtasks (
  subtask_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(task_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS charters (
  charter_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(group_id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(task_id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'PENDING',
  is_signed BOOLEAN DEFAULT FALSE,
  signed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(group_id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(task_id) ON DELETE CASCADE,
  title VARCHAR(255),
  message TEXT NOT NULL,
  type VARCHAR(50),
  related_task_id UUID REFERENCES tasks(task_id) ON DELETE CASCADE,
  related_group_id UUID REFERENCES groups(group_id) ON DELETE CASCADE,
  related_assessment_id UUID REFERENCES assessments(assessment_id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contribution_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(task_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(group_id) ON DELETE CASCADE,
  action_type VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE assessments
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS progress_percentage INT DEFAULT 0;

ALTER TABLE task_negotiations
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS title VARCHAR(255);

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS related_task_id UUID REFERENCES tasks(task_id) ON DELETE CASCADE;

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS related_group_id UUID REFERENCES groups(group_id) ON DELETE CASCADE;

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS related_assessment_id UUID REFERENCES assessments(assessment_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_group_assessment ON tasks(group_id, assessment_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id, created_at);
CREATE INDEX IF NOT EXISTS idx_task_negotiations_task ON task_negotiations(task_id, created_at);
CREATE INDEX IF NOT EXISTS idx_task_negotiations_requested_to_status ON task_negotiations(requested_to, status);
CREATE INDEX IF NOT EXISTS idx_group_messages_group_created ON group_messages(group_id, created_at);
CREATE INDEX IF NOT EXISTS idx_group_message_mentions_message ON group_message_mentions(message_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at);
