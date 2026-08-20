import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/api/notifications.api';
import { QK } from '@/constants/queryKeys';

export const useNotifications = () => {
  return useQuery({
    queryKey: QK.notifications,
    queryFn: notificationsApi.getAll,
    staleTime: 60 * 1000, // 1 min
    refetchInterval: 30000, // Poll every 30s
  });
};
