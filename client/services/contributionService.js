import api from './api';

export async function getContributions(groupId) {
  const response = await api.get(`/contributions/${groupId}`);
  return response.data;
}
