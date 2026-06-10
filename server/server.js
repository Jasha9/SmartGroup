const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const taskRoutes = require('./routes/taskRoutes');
const aiRoutes = require('./routes/aiRoutes');
const charterRoutes = require('./routes/charterRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const contributionRoutes = require('./routes/contributionRoutes');

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:3000",
  "http://127.0.0.1:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({
    message: "SmartGroup API is running successfully",
    status: "OK",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    project: "SmartGroup",
    frontend: process.env.CLIENT_URL || "http://localhost:3000",
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/charters', charterRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/contributions', contributionRoutes);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`SmartGroup server running on port ${PORT}`);
});
