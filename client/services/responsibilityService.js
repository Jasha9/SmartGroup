import { acceptCharter, getCharter, negotiateCharter } from './charterService';
import { getGroups } from './groupService';

export async function getResponsibilities() {
  const groupsRes = await getGroups();
  const groups = groupsRes?.data?.groups || groupsRes?.groups || [];

  const results = await Promise.all(
    groups.map(async (group) => {
      const groupId = group.group_id || group.id;
      const charter = await getCharter(groupId);
      return {
        group,
        responsibilities: charter?.data?.responsibilities || charter?.responsibilities || [],
      };
    })
  );

  return { success: true, data: { groups: results } };
}

export async function acceptResponsibility(taskId, groupId = null) {
  return acceptCharter({ taskId, groupId });
}

export async function requestChange(taskId, groupId = null) {
  return negotiateCharter({ taskId, groupId });
}
