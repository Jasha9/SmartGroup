import api from './api';

export async function getTasks(groupId) {
  const response = await api.get('/tasks', { params: { groupId } });
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
