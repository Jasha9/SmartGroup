import api from "./api";

export async function getGroups() {
  try {
    const response = await api.get("/groups");
    return response.data;
  } catch (err) {
    throw new Error(err.response?.data?.error || "Failed to load groups.");
  }
}

export async function generateTasks(assignmentText) {
  try {
    const response = await api.post("/ai/generate-tasks", { assignmentText });
    return response.data;
  } catch (err) {
    throw new Error(err.response?.data?.error || "Failed to generate tasks.");
  }
}

export async function saveAssignedTasks(groupId, tasks, assessmentMeta = {}) {
  try {
    const response = await api.post("/tasks/bulk", {
      groupId,
      tasks,
      ...assessmentMeta,
    });
    return response.data;
  } catch (err) {
    throw new Error(err.response?.data?.error || "Failed to save tasks.");
  }
}

export async function saveTasks(groupId, tasks) {
  try {
    const response = await api.post("/tasks", { groupId, tasks });
    return response.data;
  } catch (err) {
    throw new Error(err.response?.data?.error || "Failed to save tasks.");
  }
}
