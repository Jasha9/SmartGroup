import api from './api';

export async function getTasks(groupId) {
  const response = await api.get('/tasks', { params: { groupId } });
  return response.data;
}

export async function createTask(data) {
  const response = await api.post('/tasks', data);
  return response.data;
}
