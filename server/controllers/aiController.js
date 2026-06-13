const OpenAI = require("openai");
const { PDFParse } = require("pdf-parse");
const pool = require('../db/db');

const DAILY_GENERATION_LIMIT = 3;
const QUOTA_WINDOW_MS = 24 * 60 * 60 * 1000;

const SYSTEM_PROMPT = `You are a project planning assistant for university group assignments.
Given an assignment description, generate a practical task breakdown for a student team.
Respond ONLY with a valid JSON array of tasks — no markdown, no explanation, no code fences.
Each task must have exactly these fields:
  title (string),
  description (string),
  priority ("HIGH" | "MEDIUM" | "LOW"),
  estimated_hours (number, 1–8),
  status ("TO_DO").
Generate a balanced set of concrete tasks that can be distributed fairly across the team.`;

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function buildUsagePayload(planRow, now = new Date()) {
  const lastGeneratedAt = planRow?.last_gen_at ? new Date(planRow.last_gen_at) : null;
  const generationCount = Number(planRow?.generation_count || 0);
  const lastGeneratedAtMs = lastGeneratedAt?.getTime() || null;
  const windowActive = lastGeneratedAtMs ? now.getTime() - lastGeneratedAtMs < QUOTA_WINDOW_MS : false;
  const remaining = windowActive ? Math.max(0, DAILY_GENERATION_LIMIT - generationCount) : DAILY_GENERATION_LIMIT;
  const resetAt = lastGeneratedAtMs ? new Date(lastGeneratedAtMs + QUOTA_WINDOW_MS) : null;

  return {
    generationCount: windowActive ? generationCount : 0,
    limit: DAILY_GENERATION_LIMIT,
    remaining,
    resetAt: resetAt?.toISOString() || null,
    windowActive,
  };
}

async function assertGroupAccess(groupId, userId) {
  const accessCheck = await pool.query(
    `SELECT 1 FROM memberships WHERE group_id = $1 AND user_id = $2`,
    [groupId, userId]
  );

  return accessCheck.rowCount > 0;
}

async function getGroupMemberCount(groupId) {
  const result = await pool.query(
    `SELECT COUNT(*)::INT AS member_count
     FROM memberships
     WHERE group_id = $1`,
    [groupId]
  );

  return result.rows[0]?.member_count || 0;
}

function parseAssessmentDueDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function getPlanningWindowDays(dueDate, now = new Date()) {
  if (!dueDate) return null;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const diffMs = end.getTime() - start.getTime();
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

function buildAssignmentPrompt(assignmentText, memberCount, assessmentMeta = {}) {
  const normalizedMemberCount = Math.max(1, Number(memberCount) || 1);
  const minimumTasks = normalizedMemberCount;
  const targetTasks = Math.min(Math.max(normalizedMemberCount, 4), 8);
  const title = String(assessmentMeta.title || '').trim();
  const dueDate = assessmentMeta.dueDate || null;
  const planningWindowDays = Number.isFinite(assessmentMeta.planningWindowDays)
    ? Math.max(0, assessmentMeta.planningWindowDays)
    : null;
  const todayIso = new Date().toISOString().slice(0, 10);
  const dueIso = dueDate ? dueDate.toISOString().slice(0, 10) : null;

  return [
    `Team size: ${normalizedMemberCount} members.`,
    title ? `Assessment title: ${title}.` : null,
    `Today's date: ${todayIso}.`,
    dueIso ? `Assessment due date: ${dueIso}.` : 'Assessment due date: not provided.',
    planningWindowDays === null
      ? 'Planning window: unknown. Keep timeline assumptions conservative.'
      : planningWindowDays === 0
        ? 'Planning window: due now or overdue. Prioritise immediate deliverables and critical path work.'
        : `Planning window: ${planningWindowDays} day(s) until due date.`,
    `Generate at least ${minimumTasks} tasks and aim for around ${targetTasks} tasks so the work can be distributed fairly.`,
    'Split large work into smaller concrete tasks when needed so no one member gets a much heavier workload than the others.',
    'Keep the estimated_hours balanced across the overall plan so each member can receive a similar total workload.',
    'Adjust task granularity to the available days left so the team has actionable checkpoints before the due date.',
    'Avoid a plan where one task carries most of the effort unless the assignment requirements force it.',
    '',
    'Assignment brief:',
    assignmentText,
  ].filter(Boolean).join('\n');
}

async function getOrCreateTaskPlan(client, groupId) {
  const inserted = await client.query(
    `INSERT INTO task_plans (group_id, generation_count, last_gen_at)
     VALUES ($1, 0, NULL)
     ON CONFLICT (group_id) DO UPDATE SET group_id = EXCLUDED.group_id
     RETURNING plan_id, group_id, generation_count, last_gen_at`,
    [groupId]
  );

  return inserted.rows[0];
}

async function reserveGenerationSlot(client, groupId) {
  const now = new Date();
  const planRow = await getOrCreateTaskPlan(client, groupId);
  const currentUsage = buildUsagePayload(planRow, now);

  if (currentUsage.windowActive && currentUsage.generationCount >= DAILY_GENERATION_LIMIT) {
    const error = new Error('Daily AI generation quota reached for this group. Please wait until the quota resets.');
    error.statusCode = 429;
    error.usage = currentUsage;
    throw error;
  }

  const nextCount = currentUsage.windowActive ? currentUsage.generationCount + 1 : 1;
  const updated = await client.query(
    `UPDATE task_plans
     SET generation_count = $1,
         last_gen_at = $2
     WHERE group_id = $3
     RETURNING plan_id, group_id, generation_count, last_gen_at`,
    [nextCount, now.toISOString(), groupId]
  );

  return buildUsagePayload(updated.rows[0], now);
}

async function releaseGenerationSlot(client, groupId) {
  const planRow = await getOrCreateTaskPlan(client, groupId);
  const now = new Date();
  const currentUsage = buildUsagePayload(planRow, now);
  const nextCount = Math.max(0, currentUsage.generationCount - 1);
  const nextLastGeneratedAt = nextCount === 0 ? null : planRow.last_gen_at;

  const updated = await client.query(
    `UPDATE task_plans
     SET generation_count = $1,
         last_gen_at = $2
     WHERE group_id = $3
     RETURNING plan_id, group_id, generation_count, last_gen_at`,
    [nextCount, nextLastGeneratedAt, groupId]
  );

  return buildUsagePayload(updated.rows[0], now);
}

function isPdfFile(file) {
  if (!file) return false;

  const mimeType = String(file.mimetype || '').toLowerCase();
  const fileName = String(file.originalname || '').toLowerCase();

  return mimeType === 'application/pdf' || fileName.endsWith('.pdf');
}

async function resolveAssignmentText(req) {
  const rawAssignmentText = String(req.body?.assignmentText || '').trim();

  if (req.file) {
    if (!isPdfFile(req.file)) {
      const error = new Error('Invalid PDF format. Please ensure the file is in .pdf format.');
      error.statusCode = 400;
      throw error;
    }

    try {
      const parser = new PDFParse({ data: req.file.buffer });
      const parsed = await parser.getText();
      await parser.destroy();

      const extractedText = String(parsed?.text || '').trim();

      if (!extractedText) {
        const error = new Error('The uploaded PDF does not contain readable text. Please upload a text-based PDF or paste the assignment brief.');
        error.statusCode = 400;
        throw error;
      }

      return extractedText;
    } catch (err) {
      if (err.statusCode) {
        throw err;
      }

      console.error('[AI] PDF parsing failed:', err.message);

      const error = new Error('Invalid PDF format. Please ensure the file is not corrupted and is in .pdf format.');
      error.statusCode = 400;
      throw error;
    }
  }

  if (!rawAssignmentText) {
    const error = new Error('assignmentText is required when no PDF is uploaded.');
    error.statusCode = 400;
    throw error;
  }

  return rawAssignmentText;
}

async function generateTasks(req, res) {
  const groupId = String(req.body?.groupId || '').trim();

  if (!groupId) {
    return res.status(400).json({ success: false, error: 'groupId is required.' });
  }

  try {
    const hasAccess = await assertGroupAccess(groupId, req.user.user_id);
    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'Access denied to this group.' });
    }
  } catch (err) {
    console.error('[AI] Failed to validate group access:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to validate group access.' });
  }

  let assignmentText;
  try {
    assignmentText = await resolveAssignmentText(req);
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, error: err.message || 'Invalid assignment input.' });
  }

  let memberCount;
  try {
    memberCount = await getGroupMemberCount(groupId);
  } catch (err) {
    console.error('[AI] Failed to resolve group member count:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to load group member count.' });
  }

  const assessmentTitle = String(req.body?.assessmentTitle || '').trim();
  const assessmentDueDate = parseAssessmentDueDate(req.body?.assessmentDueDate);
  const planningWindowDays = getPlanningWindowDays(assessmentDueDate);

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ success: false, error: "OPENAI_API_KEY is not configured on the server." });
  }

  const client = await pool.connect();
  let usage;
  try {
    await client.query('BEGIN');
    usage = await reserveGenerationSlot(client, groupId);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Failed to reserve AI generation quota.',
      data: err.usage ? { usage: err.usage } : undefined,
    });
  }
  client.release();

  let completion;
  try {
    const openai = getOpenAIClient();
    const planningPrompt = buildAssignmentPrompt(assignmentText, memberCount, {
      title: assessmentTitle,
      dueDate: assessmentDueDate,
      planningWindowDays,
    });
    completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: planningPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1200,
    });
  } catch (err) {
    const rollbackClient = await pool.connect();
    try {
      await rollbackClient.query('BEGIN');
      usage = await releaseGenerationSlot(rollbackClient, groupId);
      await rollbackClient.query('COMMIT');
    } catch (rollbackErr) {
      await rollbackClient.query('ROLLBACK');
      console.error('[AI] Failed to release quota after API error:', rollbackErr.message);
    } finally {
      rollbackClient.release();
    }

    console.error("[OpenAI] API error:", err.message);
    return res.status(502).json({
      success: false,
      error: "AI service unavailable. Check your OPENAI_API_KEY and account credits.",
      data: { usage },
    });
  }

  let tasks;
  try {
    const raw = completion.choices[0].message.content.trim();
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    tasks = JSON.parse(cleaned);
    if (!Array.isArray(tasks)) throw new Error("Response is not an array");
  } catch (err) {
    const rollbackClient = await pool.connect();
    try {
      await rollbackClient.query('BEGIN');
      usage = await releaseGenerationSlot(rollbackClient, groupId);
      await rollbackClient.query('COMMIT');
    } catch (rollbackErr) {
      await rollbackClient.query('ROLLBACK');
      console.error('[AI] Failed to release quota after parse error:', rollbackErr.message);
    } finally {
      rollbackClient.release();
    }

    console.error("[OpenAI] Failed to parse response:", completion.choices[0].message.content);
    return res.status(500).json({
      success: false,
      error: "AI returned an unexpected format. Please try again.",
      data: { usage },
    });
  }

  return res.json({
    success: true,
    data: {
      tasks,
      usage,
      memberCount,
      planningWindowDays,
      dueDate: assessmentDueDate ? assessmentDueDate.toISOString() : null,
    },
  });
}

module.exports = { generateTasks };
