import api from './api';

export async function getAssessments() {
  const response = await api.get('/assessments');
  return response.data;
}

export async function getAssessmentByGroup(groupId) {
  const response = await api.get(`/groups/${groupId}/assessments`);
  return response.data;
}

export async function createAssessment(payload) {
  const response = await api.post('/assessments', payload);
  return response.data;
}
