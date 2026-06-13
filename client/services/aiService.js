import api from "./api";

export async function getGroups() {
  try {
    const response = await api.get("/groups");
    return response.data;
  } catch (err) {
    throw new Error(err.response?.data?.error || "Failed to load groups.");
  }
}

export async function generateTasks({ groupId = '', assignmentText = '', assignmentFile = null, assessmentTitle = '', assessmentDueDate = '' } = {}) {
  try {
    const formData = new FormData();

    if (groupId) {
      formData.append('groupId', groupId);
    }

    if (assignmentText.trim()) {
      formData.append('assignmentText', assignmentText.trim());
    }

    if (assessmentTitle.trim()) {
      formData.append('assessmentTitle', assessmentTitle.trim());
    }

    if (assessmentDueDate) {
      formData.append('assessmentDueDate', assessmentDueDate);
    }

    if (assignmentFile) {
      formData.append('assignmentFile', assignmentFile);
    }

    const response = await api.post('/ai/generate-tasks', formData);
    return response.data;
  } catch (err) {
    const error = new Error(err.response?.data?.error || "Failed to generate tasks.");
    error.response = err.response;
    throw error;
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
