const OpenAI = require("openai");

const SYSTEM_PROMPT = `You are SmartGroup's AI planning engine for university group assessments.
Follow this workflow exactly when given an assessment brief and team context:
1) Assessment Analysis
2) Deliverable Detection
3) Marking Criteria Analysis
4) Section Extraction
5) Workload Estimation
6) Team Size Analysis
7) Balanced Task Generation
8) Task Dependencies
9) Task Categorization
10) Optional Task Assignment Suggestions
11) Milestone Generation
12) Fairness Score Calculation

Respond ONLY with a valid JSON object and nothing else. No markdown, no explanation, no code fences.

The output must look like this:
{
  "assessmentAnalysis": {
    "assessmentTitle": "",
    "assessmentType": "",
    "deliverables": [],
    "dueDate": "",
    "presentationDate": "",
    "wordCount": 0,
    "sections": [],
    "markingCriteria": [{ "section": "", "weight": 0 }],
    "topics": []
  },
  "deliverables": [],
  "milestones": [{ "title": "", "dueDate": "", "description": "" }],
  "fairnessScore": 0,
  "workloadSummary": {
    "totalEffortHours": 0,
    "targetHoursPerMember": 0,
    "teamSize": 0,
    "tasksByPriority": { "HIGH": 0, "MEDIUM": 0, "LOW": 0 }
  },
  "tasks": [
    {
      "title": "",
      "description": "",
      "category": "Research",
      "priority": "MEDIUM",
      "effortHours": 0,
      "dueDate": "",
      "suggestedOwner": "",
      "assignmentReason": "",
      "dependsOn": [],
      "assessmentSection": ""
    }
  ]
}

Use the assessment brief to detect deliverables, marking criteria, section names, and assessment type.
Use the team size to determine task count:
  2 members => 6-8 tasks
  3 members => 9-12 tasks
  4 members => 12-16 tasks
  5 members => 15-20 tasks
If the brief references more than 5 members, still generate a balanced plan similar to the 5-member range.
Use marking weights to assign more effort, higher priority, and more tasks to heavier sections.
Generate tasks that map to real assessment sections and deliverables, not generic placeholders.
Use dependencies logically for task flow.
If member skills are provided, include suggestedOwner and assignmentReason. If not, leave those fields as empty strings.
Always return a fairnessScore between 0 and 100.

When the brief is for a marketing or campaign-style project, structure tasks around the following workstreams:
  - Strategy & Persona Development
  - Omni-Channel & Creative Execution
  - Analytics, Budgeting & Integration
Include outputs such as digital footprint audits, SWOT matrices, buyer personas, paid/earned/owned media frameworks, conversion messaging hooks, six-month activation timelines, budget allocation sheets, KPI frameworks, group charters, and PDF compilation.
Create tasks with specific titles and useful detail, for example:
  - Conduct competitor digital footprint audit and document website, social, SEO, and PR positioning.
  - Develop two buyer personas with digital micro-moments, pain points, and device habits.
  - Map a paid/earned/owned media acquisition journey and recommend target platforms.
  - Draft conversion messaging hooks and format for a 6-month campaign timeline.
  - Build a $150,000 AUD budget architecture with CPA, ROAS, and CTR assumptions.
  - Compile the final group charter and prepare the submission PDF.
Avoid generic task names like 'Review assignment guidelines', 'Research topic', or 'Draft sections'.
`; 

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function generateTasks(req, res) {
  const { assignmentText, groupSize, assessmentTitle, assessmentDueDate } = req.body;

  if (!assignmentText || !assignmentText.trim()) {
    return res.status(400).json({ success: false, error: "assignmentText is required." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ success: false, error: "OPENAI_API_KEY is not configured on the server." });
  }

  const userPrompt = [`Assignment Brief:
${assignmentText.trim()}`];
  if (typeof groupSize === 'number') {
    userPrompt.push(`Team size: ${groupSize} member${groupSize === 1 ? '' : 's'}`);
  }
  if (assessmentTitle) {
    userPrompt.push(`Assessment title: ${assessmentTitle}`);
  }
  if (assessmentDueDate) {
    userPrompt.push(`Assessment due date: ${assessmentDueDate}`);
  }

  let completion;
  try {
    const openai = getOpenAIClient();
    completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt.join('\n\n') },
      ],
      temperature: 0.7,
      max_tokens: 1400,
    });
  } catch (err) {
    console.error("[OpenAI] API error:", err.message);
    return res.status(502).json({ success: false, error: "AI service unavailable. Check your OPENAI_API_KEY and account credits." });
  }

  let plan;
  try {
    const raw = completion.choices[0].message.content.trim();
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    plan = JSON.parse(cleaned);
    if (!plan || typeof plan !== 'object' || !Array.isArray(plan.tasks)) {
      throw new Error("Response is not a valid SmartGroup plan object.");
    }
  } catch (err) {
    console.error("[OpenAI] Failed to parse response:", completion.choices[0].message.content);
    return res.status(500).json({ success: false, error: "AI returned an unexpected format. Please try again." });
  }

  return res.json({
    success: true,
    data: plan,
  });
}

module.exports = { generateTasks };
