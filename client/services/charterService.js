import api from './api';

export async function getCharter(groupId) {
  const response = await api.get(`/charters/${groupId}`);
  return response.data;
}

export async function acceptCharter(input) {
  // Backward-compatible: accept either taskId or payload object.
  const payload = typeof input === 'object' && input !== null ? input : { taskId: input };
  const response = await api.post('/charters/accept', payload);
  return response.data;
}

export async function negotiateCharter(input) {
  // Backward-compatible: accept either taskId or payload object.
  const payload = typeof input === 'object' && input !== null ? input : { taskId: input };
  const response = await api.post('/charters/negotiate', payload);
  return response.data;
}
