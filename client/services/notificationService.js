import api from './api';

export async function getNotifications() {
  const response = await api.get('/notifications');
  return response.data;
}

export async function createNotification(payload) {
  const response = await api.post('/notifications', payload);
  return response.data;
}

export async function createMentionNotification(payload) {
  const response = await api.post('/notifications', {
    ...payload,
    type: payload?.type || 'GROUP_MENTION',
  });
  return response.data;
}

export async function markNotificationRead(id) {
  const response = await api.patch(`/notifications/${id}/read`);
  return response.data;
}

export async function markNotificationsReadByContext(payload) {
  const response = await api.patch('/notifications/read-by-context', payload);
  return response.data;
}
