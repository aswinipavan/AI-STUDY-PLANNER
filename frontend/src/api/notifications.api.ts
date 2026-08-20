import { apiClient } from '@/lib/apiClient';
import { NotificationItem } from '@/types/api.types';

export const notificationsApi = {
  getAll: async (): Promise<NotificationItem[]> => {
    const response = await apiClient.get('/api/notifications');
    return response.data.data ?? response.data;
  },
};
