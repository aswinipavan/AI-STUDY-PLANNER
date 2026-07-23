'use client';

import React, { useState } from 'react';
import Script from 'next/script';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { subscriptionsApi } from '@/api/subscriptions.api';
import { QK } from '@/constants/queryKeys';
import { useAuthStore } from '@/stores/authStore';
import { Check, Crown, Zap, Star } from 'lucide-react';
import styles from './subscription.module.css';

declare global {
  interface Window {
    Razorpay: new (...args: unknown[]) => { open: () => void };
  }
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export default function SubscriptionPage() {
  const qc = useQueryClient();
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState<'monthly' | 'yearly' | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const { data: status } = useQuery({
    queryKey: QK.subscription,
    queryFn: subscriptionsApi.getStatus,
  });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSubscribe = async (plan: 'monthly' | 'yearly') => {
    setLoading(plan);
    try {
      const order = await subscriptionsApi.createOrder(plan);

      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'AI Study Planner',
        description: `${plan} Premium Plan`,
        prefill: { name: user?.name, email: user?.email },
        theme: { color: '#00A896' },
        handler: async (res: RazorpayResponse) => {
          await subscriptionsApi.verifyPayment(res);
          qc.invalidateQueries({ queryKey: QK.subscription });
          if (user) setUser({ ...user, isPremium: true });
          showToast('Premium activated! 🎉');
        },
      });

      rzp.open();
    } catch (_err) {
      showToast('Payment failed. Please try again.', 'error');
    } finally {
      setLoading(null);
    }
  };

  const plans = [
    {
      id: 'monthly' as const,
      name: 'Monthly',
      price: '₹299',
      period: '/month',
      description: 'Perfect for exam season',
      features: ['AI Chat Assistant', 'Unlimited Materials', 'Performance Analytics', 'Priority Study Plans'],
      badge: null,
    },
    {
      id: 'yearly' as const,
      name: 'Yearly',
      price: '₹1,999',
      period: '/year',
      description: 'Best value — 44% off',
      features: ['Everything in Monthly', 'Advanced AI Insights', 'Export Reports', 'Early Access Features'],
      badge: 'BEST VALUE',
    },
  ];

  return (
    <div className={styles.container}>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      {toast && (
        <div className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
          {toast.msg}
        </div>
      )}

      <div className={styles.contentWrap}>
        <div className={styles.header}>
          <div className={styles.crownBadge}>
            <Crown size={16} />
            <span>Go Premium</span>
          </div>
          <h1 className={styles.title}>Unlock Your Full Potential</h1>
          <p className={styles.subtitle}>
            Get AI-powered study plans, unlimited resources, and deep performance analytics.
          </p>
        </div>

        {status?.isPremium && (
          <div className={styles.statusCard}>
            <Star size={24} />
            <div>
              <p className={styles.statusTitle}>You&apos;re a Premium Member!</p>
              <p className={styles.statusDesc}>
                Your plan: <strong>{status.plan}</strong> — expires {new Date(status.expiresAt || '').toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        {!status?.isPremium && (
          <div className={styles.grid}>
            {plans.map((plan, i) => (
              <div
                key={plan.id}
                className={`${styles.planCard} ${plan.badge ? styles.planCardPremium : ''}`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {plan.badge && (
                  <span className={styles.bestValueBadge}>{plan.badge}</span>
                )}

                <div>
                  <h3 className={styles.planName}>{plan.name}</h3>
                  <p className={styles.planDesc}>{plan.description}</p>
                  <div className={styles.priceWrap}>
                    <span className={styles.priceVal}>{plan.price}</span>
                    <span className={styles.pricePeriod}>{plan.period}</span>
                  </div>
                </div>

                <ul className={styles.featureList}>
                  {plan.features.map(f => (
                    <li key={f} className={styles.featureItem}>
                      <div className={styles.checkIconWrap}>
                        <Check size={12} />
                      </div>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={!!loading}
                  className={`${styles.btnSubscribe} ${plan.badge ? styles.btnPrimary : styles.btnSecondary}`}
                >
                  {loading === plan.id ? (
                    <>
                      <div className={styles.spinner} />
                      <span>Opening Checkout...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={16} />
                      <span>Subscribe {plan.name}</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        <p className={styles.securityNotice}>
          🔒 All payments are 100% secure. Signature verification is handled server-side. We never store card details.
        </p>
      </div>
    </div>
  );
}
