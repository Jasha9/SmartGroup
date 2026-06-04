const nodemailer = require('nodemailer');

// ---------------------------------------------------------------------------
// Transport — uses Gmail SMTP with an App Password stored in .env
// REQUIRED env vars:
//   GMAIL_USER   — the sending Gmail address (e.g. smartgroup.notify@gmail.com)
//   GMAIL_PASS   — Gmail App Password (16-char, no spaces)
// ---------------------------------------------------------------------------
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

// Shared HTML wrapper
const wrap = (body) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    body { margin:0; padding:0; background:#f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .container { max-width:560px; margin:40px auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
    .header { background:linear-gradient(135deg,#2563eb,#7c3aed); padding:32px 40px; }
    .header h1 { margin:0; color:#ffffff; font-size:22px; font-weight:700; letter-spacing:-0.3px; }
    .header p  { margin:6px 0 0; color:rgba(255,255,255,0.75); font-size:13px; }
    .body   { padding:32px 40px; }
    .body p { margin:0 0 16px; color:#334155; font-size:15px; line-height:1.6; }
    .cta    { display:inline-block; margin-top:8px; padding:12px 28px; background:linear-gradient(135deg,#2563eb,#7c3aed); color:#ffffff!important; font-weight:600; font-size:15px; border-radius:10px; text-decoration:none; }
    .tag    { display:inline-block; padding:3px 10px; border-radius:999px; font-size:12px; font-weight:600; }
    .tag-high   { background:#fee2e2; color:#991b1b; }
    .tag-medium { background:#fef9c3; color:#854d0e; }
    .tag-low    { background:#dcfce7; color:#166534; }
    .footer { padding:20px 40px; background:#f8fafc; border-top:1px solid #e2e8f0; font-size:12px; color:#94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    ${body}
    <div class="footer">You're receiving this because your email was registered with SmartGroup. &copy; 2026 SmartGroup.</div>
  </div>
</body>
</html>`;

// ---------------------------------------------------------------------------
// sendGroupInvite
//   Sent to each invited member when a group is created.
// ---------------------------------------------------------------------------
async function sendGroupInvite({ toEmail, inviterName, groupName, appUrl }) {
  const url = appUrl || process.env.CLIENT_URL || 'http://localhost:3000';

  const html = wrap(`
    <div class="header">
      <h1>You've been invited to a group</h1>
      <p>SmartGroup &mdash; Collaborative Workspace</p>
    </div>
    <div class="body">
      <p>Hi there,</p>
      <p>
        <strong>${escHtml(inviterName)}</strong> has added you to the group
        <strong>&ldquo;${escHtml(groupName)}&rdquo;</strong> on SmartGroup.
      </p>
      <p>Sign in with this Gmail address to see the group workspace, tasks, and team charter.</p>
      <a href="${url}/login" class="cta">Open SmartGroup &rarr;</a>
    </div>`);

  await transporter.sendMail({
    from: `"SmartGroup" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: `${inviterName} invited you to "${groupName}" on SmartGroup`,
    html,
  });
}

// ---------------------------------------------------------------------------
// sendTaskAssigned
//   Sent to the assignee when a task is saved/assigned from the AI planner.
// ---------------------------------------------------------------------------
async function sendTaskAssigned({ toEmail, assigneeName, taskTitle, groupName, priority, dueDate, appUrl }) {
  const url = appUrl || process.env.CLIENT_URL || 'http://localhost:3000';
  const priorityClass = priority === 'HIGH' || priority === 'High' ? 'tag-high'
                      : priority === 'LOW'  || priority === 'Low'  ? 'tag-low'
                      : 'tag-medium';
  const dueLine = dueDate
    ? `<p>Due: <strong>${escHtml(dueDate)}</strong></p>`
    : '';

  const html = wrap(`
    <div class="header">
      <h1>New task assigned to you</h1>
      <p>SmartGroup &mdash; ${escHtml(groupName)}</p>
    </div>
    <div class="body">
      <p>Hi ${escHtml(assigneeName || 'there')},</p>
      <p>
        You have a new task in <strong>&ldquo;${escHtml(groupName)}&rdquo;</strong>:
      </p>
      <p style="font-size:17px; font-weight:600; color:#1e293b;">
        ${escHtml(taskTitle)}
        &nbsp;<span class="tag ${priorityClass}">${escHtml(priority || 'Medium')}</span>
      </p>
      ${dueLine}
      <p>Log in to accept the task and track your progress.</p>
      <a href="${url}/dashboard/workspace" class="cta">View task &rarr;</a>
    </div>`);

  await transporter.sendMail({
    from: `"SmartGroup" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: `New task: "${taskTitle}" — ${groupName}`,
    html,
  });
}

// Simple HTML escaper — prevents XSS in injected strings
function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = { sendGroupInvite, sendTaskAssigned };
