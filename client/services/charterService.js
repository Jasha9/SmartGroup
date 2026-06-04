import api from './api';

export async function getCharter(groupId) {
  const response = await api.get('/charters', { params: { groupId } });
  return response.data;
}

export async function signCharter(groupId) {
  const response = await api.post('/charters/sign', { groupId });
  return response.data;
}
