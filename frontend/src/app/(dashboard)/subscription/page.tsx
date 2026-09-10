'use client';

import React, { useMemo, useState, useSyncExternalStore } from 'react';
import Script from 'next/script';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { subscriptionsApi } from '@/api/subscriptions.api';
import { examsApi } from '@/api/exams.api';
import { QK } from '@/constants/queryKeys';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/layout/PageHeader';
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

/** Every span on the page is measured against the same twelve-month rail. */
const SCALE_MONTHS = 12;
const DAY_MS = 86_400_000;

const addMonths = (from: Date, months: number) => {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
};

const daysBetween = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / DAY_MS);

const clampPct = (n: number) => Math.min(100, Math.max(0, n));

/* Every rail is measured from "now", which the server and the browser can
   disagree about — they may not even be on the same calendar day. This store
   hands the server `null` and the browser a real date, so the markup React
   hydrates against always matches and the bars fill in from zero afterwards.
   The snapshot is cached because `getSnapshot` must be referentially stable;
   that also pins the scale for the life of the page load, which is what we
   want — a rail should not shift under the reader. */
let clientNow: Date | null = null;
const subscribeToClock = () => () => {};
const getClientNow = () => (clientNow ??= new Date());
const getServerNow = () => null;

const formatDay = (d: Date) =>
  d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** The shared ruler every rail on the page is read against. */
function ScaleHeader({ exam, beyond }: { exam: { name: string; date: Date } | null; beyond: boolean }) {
  return (
    <>
      <div className={styles.scaleHead} aria-hidden="true">
        <span>Today</span>
        <span>+6 months</span>
        <span>+12 months</span>
      </div>

      {exam && (
        <p className={styles.legend}>
          <span className={styles.legendMark} aria-hidden="true" />
          <span>
            {exam.name} on {formatDay(exam.date)}
            {beyond ? ', beyond this twelve-month view' : ''}
          </span>
        </p>
      )}
    </>
  );
}

const PLANS = [
  {
    id: 'monthly' as const,
    name: 'Monthly',
    months: 1,
    price: 299,
    priceLabel: '₹299',
    unit: 'once',
    cta: 'Pay ₹299 — 1 month',
    emphasis: false,
  },
  {
    id: 'yearly' as const,
    name: 'Yearly',
    months: 12,
    price: 1999,
    priceLabel: '₹1,999',
    unit: 'once',
    cta: 'Pay ₹1,999 — 12 months',
    emphasis: true,
  },
];

const INCLUDED = [
  { label: 'AI chat assistant', yearlyOnly: false },
  { label: 'Unlimited material uploads', yearlyOnly: false },
  { label: 'Performance analytics', yearlyOnly: false },
  { label: 'Priority study plans', yearlyOnly: false },
  { label: 'Advanced AI insights', yearlyOnly: true },
  { label: 'Exportable reports', yearlyOnly: true },
  { label: 'Early access to new features', yearlyOnly: true },
];

export default function SubscriptionPage() {
  const qc = useQueryClient();
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState<'monthly' | 'yearly' | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const now = useSyncExternalStore(subscribeToClock, getClientNow, getServerNow);

  const { data: status } = useQuery({
    queryKey: QK.subscription,
    queryFn: subscriptionsApi.getStatus,
    retry: false, // Don't retry if user has no subscription yet
  });

  const { data: exams } = useQuery({
    queryKey: QK.exams,
    queryFn: examsApi.getUpcoming,
    retry: false,
  });

  /* The soonest exam still ahead of the student. It is what makes a one-month
     plan look short when the exam is four months out. */
  const nextExam = useMemo(() => {
    if (!now || !exams?.length) return null;
    return exams
      .map((e) => ({ name: e.examName, date: new Date(e.examDate) }))
      .filter((e) => !Number.isNaN(e.date.getTime()) && e.date.getTime() >= now.getTime())
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0] ?? null;
  }, [exams, now]);

  const scale = useMemo(() => {
    if (!now) return null;
    const end = addMonths(now, SCALE_MONTHS);
    const totalDays = daysBetween(now, end);
    const examDays = nextExam ? daysBetween(now, nextExam.date) : null;
    return {
      end,
      totalDays,
      examDays,
      examPct: examDays === null ? null : clampPct((examDays / totalDays) * 100),
      examBeyondScale: examDays !== null && examDays > totalDays,
    };
  }, [now, nextExam]);

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
          showToast('Premium is active.');
        },
      });

      rzp.open();
    } catch (_err) {
      showToast("Couldn't open the payment page. Check your connection and try again.", 'error');
    } finally {
      setLoading(null);
    }
  };

  const isPremium = !!status?.isPremium;
  const hasYearly = isPremium && !!status?.plan?.toLowerCase().includes('year');

  /* ── Existing member: the same rail, meaning the same thing ────────────────
     Teal is always "the stretch the planner will run for you", so a member's
     bar measures what is left, not what is spent. A bar that filled up as the
     subscription ran down would use the page's own visual language to say the
     opposite of what it means. */
  const member = useMemo(() => {
    if (!now || !scale || !isPremium || !status?.expiresAt) return null;
    const expires = new Date(status.expiresAt);
    if (Number.isNaN(expires.getTime())) return null;
    const daysLeft = Math.max(0, daysBetween(now, expires));
    return {
      expires,
      daysLeft,
      coverPct: clampPct((daysLeft / scale.totalDays) * 100),
      shortBy:
        scale.examDays != null && scale.examDays > daysLeft ? scale.examDays - daysLeft : null,
    };
  }, [now, scale, isPremium, status]);

  return (
    <div className={styles.page}>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}
        >
          {toast.msg}
        </div>
      )}

      <PageHeader
        title="Subscription"
        subtitle={
          isPremium
            ? 'How much of your plan is left to run.'
            : 'Choose how far ahead you want the planner to run.'
        }
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Subscription' }]}
      />

      {isPremium ? (
        <section className={styles.memberPanel}>
          <div className={styles.memberHead}>
            <h2 className={styles.memberPlan}>Premium — {status?.plan ?? 'active'}</h2>
            {member && (
              <p className={styles.memberDays}>
                {member.daysLeft}
                <span className={styles.memberDaysUnit}>days left</span>
              </p>
            )}
          </div>

          <ScaleHeader exam={nextExam} beyond={!!scale?.examBeyondScale} />

          <div className={styles.rail}>
            <div className={styles.fill} style={{ ['--w' as string]: `${member?.coverPct ?? 0}%` }} />

            {member?.shortBy != null && scale?.examPct != null && (
              <div
                className={`${styles.gap} ${now ? styles.gapVisible : ''}`}
                style={{
                  ['--gap-left' as string]: `${member.coverPct}%`,
                  ['--gap-w' as string]: `${clampPct(scale.examPct - member.coverPct)}%`,
                }}
              />
            )}

            {scale?.examPct != null && (
              <div className={styles.deadline} style={{ ['--x' as string]: `${scale.examPct}%` }} />
            )}
          </div>

          <p className={styles.memberMeta}>
            {member ? (
              <span>Runs until {formatDay(member.expires)}</span>
            ) : (
              <span>Your plan is active.</span>
            )}

            {member && nextExam && (
              <>
                <span className={styles.metaDot} aria-hidden="true">
                  ·
                </span>
                {member.shortBy != null ? (
                  <span className={styles.metaShort}>
                    ends {member.shortBy} days before {nextExam.name}
                  </span>
                ) : (
                  <span className={styles.metaGood}>covers {nextExam.name}</span>
                )}
              </>
            )}
          </p>
        </section>
      ) : (
        <>
          <section className={styles.termPanel}>
            <ScaleHeader exam={nextExam} beyond={!!scale?.examBeyondScale} />

            <div className={styles.plans}>
              {PLANS.map((plan) => {
                const coverDays = scale ? daysBetween(now!, addMonths(now!, plan.months)) : 0;
                const coverPct = scale ? clampPct((coverDays / scale.totalDays) * 100) : 0;
                const covers = scale ? addMonths(now!, plan.months) : null;

                /* The stretch a plan does not reach, when an exam sits past it. */
                const shortBy =
                  scale?.examDays != null && scale.examDays > coverDays
                    ? scale.examDays - coverDays
                    : null;

                const perMonth = Math.round(plan.price / plan.months);
                const monthlyRate = PLANS[0].price;
                const savingPct = Math.round((1 - perMonth / monthlyRate) * 100);

                return (
                  <div key={plan.id} className={styles.planRow}>
                    <h2 className={styles.planName}>{plan.name}</h2>
                    <p className={styles.planPrice}>
                      {plan.priceLabel}
                      <span className={styles.planUnit}>{plan.unit}</span>
                    </p>

                    <div className={styles.rail}>
                      <div className={styles.fill} style={{ ['--w' as string]: `${coverPct}%` }} />

                      {shortBy !== null && scale?.examPct != null && (
                        <div
                          className={`${styles.gap} ${now ? styles.gapVisible : ''}`}
                          style={{
                            ['--gap-left' as string]: `${coverPct}%`,
                            ['--gap-w' as string]: `${clampPct(scale.examPct - coverPct)}%`,
                          }}
                        />
                      )}

                      {scale?.examPct != null && (
                        <div className={styles.deadline} style={{ ['--x' as string]: `${scale.examPct}%` }} />
                      )}
                    </div>

                    <p className={styles.rowMeta}>
                      {covers && <span>Covers you to {formatDay(covers)}</span>}

                      {plan.months > 1 && (
                        <>
                          <span className={styles.metaDot} aria-hidden="true">
                            ·
                          </span>
                          <span className={styles.metaGood}>
                            ₹{perMonth}/month, {savingPct}% less
                          </span>
                        </>
                      )}

                      {shortBy !== null && nextExam && (
                        <>
                          <span className={styles.metaDot} aria-hidden="true">
                            ·
                          </span>
                          <span className={styles.metaShort}>
                            ends {shortBy} days before {nextExam.name}
                          </span>
                        </>
                      )}
                    </p>

                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={!!loading}
                      className={`${styles.cta} ${plan.emphasis ? styles.ctaSolid : styles.ctaQuiet}`}
                    >
                      {loading === plan.id ? (
                        <>
                          <div className={styles.spinner} aria-hidden="true" />
                          <span>Opening Razorpay…</span>
                        </>
                      ) : (
                        <span>{plan.cta}</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* Shown to members too: on a paid plan this is the list of what you
          already have, and the tags say plainly what a yearly term adds. */}
      <section className={styles.included}>
        <h2 className={styles.includedTitle}>
          {isPremium ? 'What your plan includes' : 'What a subscription includes'}
        </h2>
        <ul className={styles.includedList}>
          {INCLUDED.map((item) => {
            const locked = item.yearlyOnly && !hasYearly;
            return (
              <li
                key={item.label}
                className={`${styles.includedItem} ${locked ? styles.yearlyOnly : ''}`}
              >
                <span>{item.label}</span>
                {locked && <span className={styles.yearlyTag}>Yearly</span>}
              </li>
            );
          })}
        </ul>
      </section>

      <p className={styles.payNote}>
        Payments go through Razorpay. Every signature is verified on our server, and card details
        never reach us.
      </p>
    </div>
  );
}
