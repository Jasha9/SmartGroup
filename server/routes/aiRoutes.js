const express = require("express");

const router = express.Router();

router.post("/generate-tasks", async (req, res) => {
  const mockTasks = [
    {
      id: 1,
      title: "Set up project repository",
      description: "Initialize GitHub repository and folder structure.",
      assigned_to: "Jashandeep",
      priority: "High",
      effort_hours: 2,
      status: "TO_DO",
    },
    {
      id: 2,
      title: "Create backend API structure",
      description: "Set up Express routes, controllers, and middleware.",
      assigned_to: "Dilraj",
      priority: "High",
      effort_hours: 4,
      status: "TO_DO",
    },
    {
      id: 3,
      title: "Build Kanban board UI",
      description: "Create task board layout with task cards.",
      assigned_to: "Khushi",
      priority: "Medium",
      effort_hours: 3,
      status: "IN_PROGRESS",
    },
  ];

  res.json({
    message: "Mock AI task generation successful",
    tasks: mockTasks,
  });
});

module.exports = router;
