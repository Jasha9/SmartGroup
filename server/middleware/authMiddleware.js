const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  try {
    const token =
      req.cookies?.token ||
      req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Access denied. No token provided.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: "Invalid or expired token.",
    });
  }
}

module.exports = authMiddleware;
