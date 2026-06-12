import api from './api';

export async function getGroups() {
  const response = await api.get('/groups');
  return response.data;
}

export async function getGroupMembers(groupId) {
  const response = await api.get(`/groups/${groupId}/members`);
  return response.data;
}

export async function getGroupAssessments(groupId) {
  const response = await api.get(`/groups/${groupId}/assessments`);
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

export async function getGroupMessages(groupId) {
  const response = await api.get(`/groups/${groupId}/messages`);
  return response.data;
}

export async function sendGroupMessage(groupId, messageText, mentions = []) {
  const response = await api.post(`/groups/${groupId}/messages`, {
    message_text: messageText,
    mentions,
  });
  return response.data;
}

export async function addGroupMessage(groupId, message_text) {
  const response = await api.post(`/groups/${groupId}/messages`, { message_text });
  return response.data;
}
