import api from './api';

export async function getGroups() {
  const response = await api.get('/groups');
  return response.data;
}

export async function createGroup(data) {
  const response = await api.post('/groups', data);
  return response.data;
}
