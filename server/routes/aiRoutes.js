const express = require("express");
const OpenAI = require("openai");

const router = express.Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /api/ai/generate-tasks
// Body: { groupId, promptText }
// Returns: { tasks: [...], usage: <number> }
router.post("/generate-tasks", async (req, res) => {
  const { groupId, promptText } = req.body;

  if (!groupId) {
    return res.status(400).json({ error: "groupId is required." });
  }
  if (!promptText || !promptText.trim()) {
    return res.status(400).json({ error: "promptText is required." });
  }

  const systemPrompt = `You are a project planning assistant for university group assignments.
Given an assignment brief or description, generate a practical task breakdown for a student team.
Respond ONLY with a valid JSON array of tasks — no markdown, no explanation, no code fences.
Each task must have these exact fields:
  id (number), title (string), description (string),
  priority ("High" | "Medium" | "Low"), effort_hours (number 1–8),
  status ("TO_DO"), assigned_to (string — suggest a generic role like "Frontend Dev" or "Backend Dev").
Generate between 4 and 8 tasks.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: promptText.trim() },
    ],
    temperature: 0.7,
    max_tokens: 1200,
  }).catch((err) => {
    console.error("[OpenAI] API error:", err.message);
    return null;
  });

  if (!completion) {
    return res.status(502).json({ error: "AI service unavailable. Check your OPENAI_API_KEY and account credits." });
  }

  let tasks = [];
  try {
    const raw = completion.choices[0].message.content.trim();
    // Strip accidental markdown code fences if model adds them
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
    tasks = JSON.parse(cleaned);
    if (!Array.isArray(tasks)) throw new Error("Not an array");
  } catch {
    console.error("[OpenAI] Failed to parse response:", completion.choices[0].message.content);
    return res.status(500).json({ error: "AI returned an unexpected format. Please try again." });
  }

  res.json({
    message: "AI task generation successful",
    tasks,
    // TODO (Dilraj): track real per-group generation count in task_plans table
    usage: 1,
  });
});

module.exports = router;
