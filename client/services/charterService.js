import api from './api';

export async function getCharter(groupId) {
  const response = await api.get(`/charters/${groupId}`);
  return response.data;
}

export async function acceptCharter(taskId) {
  const response = await api.post('/charters/accept', { taskId });
  return response.data;
}

export async function negotiateCharter(taskId) {
  const response = await api.post('/charters/negotiate', { taskId });
  return response.data;
}
