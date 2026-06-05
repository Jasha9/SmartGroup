import api from './api';

export async function getGroups() {
  const response = await api.get('/groups');
  return response.data;
}

export async function getGroupMembers(groupId) {
  const response = await api.get(`/groups/${groupId}/members`);
  return response.data;
}

export async function addGroupMember(groupId, payload) {
  const response = await api.post(`/groups/${groupId}/members`, payload);
  return response.data;
}

export async function createGroup(data) {
  const response = await api.post('/groups', data);
  return response.data;
}

export async function updateGroup(groupId, data) {
  const response = await api.put(`/groups/${groupId}`, data);
  return response.data;
}

export async function deleteGroup(groupId) {
  const response = await api.delete(`/groups/${groupId}`);
  return response.data;
}
