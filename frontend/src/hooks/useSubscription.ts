import { useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionsApi } from '@/api/subscriptions.api';
import { QK } from '@/constants/queryKeys';

export const useSubscription = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: subscriptionsApi.verifyPayment,
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.subscription }),
  });
};
