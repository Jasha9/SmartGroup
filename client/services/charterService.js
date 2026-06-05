import api from './api';

export async function getCharter(groupId) {
  const response = await api.get('/charters', { params: { groupId } });
  return response.data;
}

export async function signCharter(groupId) {
  const response = await api.post('/charters/sign', { groupId });
  return response.data;
}

export async function acceptCharter({ notificationId, taskId, groupId }) {
  const response = await api.post('/charters/accept', { notificationId, taskId, groupId });
  return response.data;
}

export async function negotiateCharter({ notificationId, taskId, groupId }) {
  const response = await api.post('/charters/negotiate', { notificationId, taskId, groupId });
  return response.data;
}
