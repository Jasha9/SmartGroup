import api from './api';

export async function getTasks(groupId) {
  const response = await api.get('/tasks', { params: { groupId } });
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
  const response = await api.post('/charters/negotiate', {
    taskId,
    ...payload,
  });
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

export async function createTask(data) {
  const response = await api.post('/tasks', data);
  return response.data;
}

export async function updateTask(taskId, data) {
  const response = await api.patch(`/tasks/${taskId}`, data);
  return response.data;
}

export async function updateTaskStatus(taskId, status) {
  const response = await api.patch(`/tasks/${taskId}/status`, { status });
  return response.data;
}
