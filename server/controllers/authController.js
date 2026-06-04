const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const pool = require("../db/db");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function createToken(user) {
  return jwt.sign(
    {
      user_id: user.user_id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
}

function setAuthCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000,
  });
}

async function googleLogin(req, res) {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        error: "Google credential is required.",
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const email = payload.email;
    const fullName = payload.name;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email not found in Google account.",
      });
    }

    if (!email.endsWith("@gmail.com")) {
      return res.status(403).json({
        success: false,
        error: "Only Gmail accounts are allowed.",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO users (email, full_name, role, is_onboarded)
      VALUES ($1, $2, 'STUDENT', false)
      ON CONFLICT (email)
      DO UPDATE SET full_name = EXCLUDED.full_name
      RETURNING user_id, email, full_name, role, is_onboarded
      `,
      [email, fullName]
    );

    const user = result.rows[0];
    const token = createToken(user);

    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      message: "Google login successful.",
      data: {
        user,
      },
    });
  } catch (error) {
    console.error("Google login error:", error);

    return res.status(401).json({
      success: false,
      error: "Google authentication failed.",
    });
  }
}

async function getMe(req, res) {
  try {
    const result = await pool.query(
      `SELECT user_id, email, full_name, role, is_onboarded, created_at FROM users WHERE user_id = $1`,
      [req.user.user_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }
    return res.status(200).json({ success: true, data: { user: result.rows[0] } });
  } catch (error) {
    console.error('getMe error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch user.' });
  }
}

async function logout(req, res) {
  res.clearCookie("token");

  return res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
}

async function updateProfile(req, res) {
  try {
    const userId = req.user.user_id;
    const { full_name } = req.body;
    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ success: false, error: 'Display name is required.' });
    }
    const result = await pool.query(
      `UPDATE users SET full_name = $1 WHERE user_id = $2
       RETURNING user_id, email, full_name, role, is_onboarded`,
      [full_name.trim(), userId]
    );
    const user = result.rows[0];
    const token = createToken(user);
    setAuthCookie(res, token);
    return res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update profile.' });
  }
}

module.exports = {
  googleLogin,
  getMe,
  logout,
  updateProfile,
};
