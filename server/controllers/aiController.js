const OpenAI = require("openai");

const SYSTEM_PROMPT = `You are a project planning assistant for university group assignments.
Given an assignment description, generate a practical task breakdown for a student team.
Respond ONLY with a valid JSON array of tasks — no markdown, no explanation, no code fences.
Each task must have exactly these fields:
  title (string),
  description (string),
  priority ("HIGH" | "MEDIUM" | "LOW"),
  estimated_hours (number, 1–8),
  status ("TO_DO").
Generate between 4 and 8 tasks.`;

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function generateTasks(req, res) {
  const { assignmentText } = req.body;

  if (!assignmentText || !assignmentText.trim()) {
    return res.status(400).json({ success: false, error: "assignmentText is required." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ success: false, error: "OPENAI_API_KEY is not configured on the server." });
  }

  let completion;
  try {
    const openai = getOpenAIClient();
    completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: assignmentText.trim() },
      ],
      temperature: 0.7,
      max_tokens: 1200,
    });
  } catch (err) {
    console.error("[OpenAI] API error:", err.message);
    return res.status(502).json({ success: false, error: "AI service unavailable. Check your OPENAI_API_KEY and account credits." });
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
    console.error("[OpenAI] Failed to parse response:", completion.choices[0].message.content);
    return res.status(500).json({ success: false, error: "AI returned an unexpected format. Please try again." });
  }

  return res.json({
    success: true,
    data: { tasks },
  });
}

module.exports = { generateTasks };
