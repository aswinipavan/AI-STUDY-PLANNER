import { apiClient } from '@/lib/apiClient';

export const subscriptionsApi = {
  createOrder: async (plan: 'monthly' | 'yearly'): Promise<{ orderId: string; amount: number; currency: string; keyId: string }> => {
    const planType = plan === 'monthly' ? 'PREMIUM_MONTHLY' : 'PREMIUM_YEARLY';
    const response = await apiClient.post('/api/subscriptions/order', { planType });
    return response.data;
  },

  verifyPayment: async (data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }): Promise<{ success: boolean }> => {
    const response = await apiClient.post('/api/subscriptions/verify', {
      razorpayOrderId: data.razorpay_order_id,
      razorpayPaymentId: data.razorpay_payment_id,
      razorpaySignature: data.razorpay_signature,
    });
    return response.data;
  },

  getStatus: async (): Promise<{ isPremium: boolean; plan: string; expiresAt: string }> => {
    const response = await apiClient.get('/api/subscriptions/status');
    return response.data;
  },
};
