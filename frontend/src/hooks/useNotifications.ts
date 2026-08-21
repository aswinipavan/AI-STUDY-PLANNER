import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/api/notifications.api';
import { QK } from '@/constants/queryKeys';
import { useBackendHealth } from '@/hooks/useBackendHealth';

export const useNotifications = () => {
  const { isReady } = useBackendHealth();

  return useQuery({
    queryKey: QK.notifications,
    queryFn: notificationsApi.getAll,
    staleTime: 2 * 60 * 1000, // 2 min — notifications aren't urgent
    refetchInterval: 60000, // 60s — reduced from 30s to lower polling pressure
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    enabled: isReady, // Don't fire until backend is confirmed warm
  });
};
