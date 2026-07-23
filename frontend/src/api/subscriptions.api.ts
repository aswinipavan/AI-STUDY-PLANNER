import { apiClient } from '@/lib/apiClient';

export const subscriptionsApi = {
  createOrder: async (plan: string): Promise<{ orderId: string; amount: number; currency: string; keyId: string }> => {
    const response = await apiClient.post('/api/subscriptions/order', { plan });
    return response.data;
  },

  verifyPayment: async (data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }): Promise<{ success: boolean }> => {
    const response = await apiClient.post('/api/subscriptions/verify', data);
    return response.data;
  },

  getStatus: async (): Promise<{ isPremium: boolean; plan: string; expiresAt: string }> => {
    const response = await apiClient.get('/api/subscriptions/status');
    return response.data;
  },
};
