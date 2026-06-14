import api from './api';

export async function getTasks(groupId, assessmentId, options = {}) {
  const { includeAcceptedOnly = true } = options;
  const params = { groupId };
  if (assessmentId) {
    params.assessmentId = assessmentId;
  }
  params.includeAcceptedOnly = includeAcceptedOnly;
  const response = await api.get('/tasks', { params });
  return response.data;
}

export async function getMyTasks() {
  const response = await api.get('/tasks/my-tasks');
  return response.data;
}

export async function acceptTask(taskId) {
  const response = await api.post('/charters/accept', { taskId });
  return response.data;
}

export async function requestTaskChange(taskId, payload = {}) {
  const response = await api.post(`/tasks/${taskId}/request-change`, payload);
  return response.data;
}

export async function getTaskChangeRequests() {
  const response = await api.get('/tasks/change-requests');
  return response.data;
}

export async function acceptTaskChangeRequest(id) {
  const response = await api.post(`/tasks/change-requests/${id}/accept`);
  return response.data;
}

export async function rejectTaskChangeRequest(id) {
  const response = await api.post(`/tasks/change-requests/${id}/reject`);
  return response.data;
}

export async function getTaskComments(taskId) {
  const response = await api.get(`/tasks/${taskId}/comments`);
  return response.data;
}

export async function addTaskComment(taskId, comment_text) {
  const response = await api.post(`/tasks/${taskId}/comments`, { comment_text });
  return response.data;
}

export async function getTaskSubtasks(taskId) {
  const response = await api.get(`/tasks/${taskId}/subtasks`);
  return response.data;
}

export async function addTaskSubtask(taskId, title) {
  const response = await api.post(`/tasks/${taskId}/subtasks`, { title });
  return response.data;
}

export async function updateTaskSubtask(taskId, subtaskId, payload) {
  const response = await api.patch(`/tasks/${taskId}/subtasks/${subtaskId}`, payload);
  return response.data;
}

export async function createTask(data) {
  const response = await api.post('/tasks', data);
  return response.data;
}

export async function updateTask(taskId, data) {
  const response = await api.patch(`/tasks/${taskId}`, data);
  return response.data;
}

export async function updateTaskStatus(taskId, status) {
  try {
    const response = await api.patch(`/tasks/${taskId}/status`, { status });
    return response.data;
  } catch (primaryError) {
    // Some backend deployments expose status updates via PATCH /tasks/:taskId.
    try {
      const fallbackResponse = await api.patch(`/tasks/${taskId}`, { status });
      return fallbackResponse.data;
    } catch {
      throw primaryError;
    }
  }
}
