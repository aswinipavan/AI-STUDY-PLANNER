'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSubjects } from '@/hooks/useSubjects';
import { timetableApi } from '@/api/timetable.api';
import { useMutation } from '@tanstack/react-query';
import { AppButton } from '@/components/ui/AppButton';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  CheckSquare, Square, ChevronRight, ChevronLeft,
  Zap, Clock, Calendar, BarChart2, Eye
} from 'lucide-react';
import styles from './generate.module.css';
import { useAuthStore } from '@/stores/authStore';
import { calcStudyPeriod, ENUM_TO_LABEL } from '@/utils/studyPeriodUtils';

const STEPS = [
  { id: 1, title: 'Subjects', icon: CheckSquare },
  { id: 2, title: 'Hours', icon: Clock },
  { id: 3, title: 'Style', icon: BarChart2 },
  { id: 4, title: 'Schedule', icon: Calendar },
  { id: 5, title: 'Review', icon: Eye },
];

const STUDY_STYLES = [
  { value: 'intense', label: 'Intense', description: 'Long sessions, deep focus, fast progress' },
  { value: 'balanced', label: 'Balanced', description: 'Mix of focused work and regular breaks' },
  { value: 'relaxed', label: 'Relaxed', description: 'Shorter sessions, spaced repetition' },
];

// Fallback durations only — used when a subject has no upcoming exam and no target deadline is set.
// Deliberately NOT capped at 4 weeks: the planning window must never impose a fixed maximum.
const DURATIONS = ['1 week', '2 weeks', '3 weeks', '4 weeks', '6 weeks', '8 weeks', '12 weeks'];

const DAY_MS = 1000 * 60 * 60 * 24;

interface GeneratePayload {
  subjectIds: string[];
  availableHoursPerDay: number;
  style: 'intense' | 'balanced' | 'relaxed';
  startDate: string;
  durationDays: number;
  useDeadlines?: boolean;
  targetDeadlineDate?: string;
}

const DURATION_DAYS: Record<string, number> = {
  '1 week': 7,
  '2 weeks': 14,
  '3 weeks': 21,
  '4 weeks': 28,
  '6 weeks': 42,
  '8 weeks': 56,
  '12 weeks': 84,
};

export default function GenerateTimetablePage() {
  const router = useRouter();
  const { data: subjects = [] } = useSubjects();
  const { user } = useAuthStore();

  // Derive the user's saved study period so we can show it in the wizard.
  // This mirrors how the backend TimetableService computes slot start/end times.
  const savedWindowEnum = user?.preferredStudyTime ?? 'EVENING';
  const savedStartLabel = ENUM_TO_LABEL[savedWindowEnum] ?? '5:00 PM';
  const savedHoursDefault = user?.availableHoursPerDay ?? 2;

  const [step, setStep] = useState(1);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [hoursPerDay, setHoursPerDay] = useState(Math.round(savedHoursDefault));
  const [studyStyle, setStudyStyle] = useState('balanced');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('2 weeks');
  const [useDeadlines, setUseDeadlines] = useState(true);
  const [targetDeadlineDate, setTargetDeadlineDate] = useState<string | null>(null);
  const [error, setError] = useState('');

  // The furthest upcoming exam among the selected subjects. This — not the coarse duration picker —
  // is what actually drives the plan length when "Use exam deadlines" is on, so we surface it to the
  // user instead of implying a fixed 1–4 week window. The backend remains authoritative.
  const furthestExamDate: Date | null = (() => {
    const start = new Date(startDate);
    const dates = subjects
      .filter((s) => selectedSubjects.includes(s.id))
      .map((s) => s.examDate)
      .filter((d): d is string => Boolean(d))
      .map((d) => new Date(d))
      .filter((d) => !Number.isNaN(d.getTime()) && d.getTime() >= start.getTime());
    if (dates.length === 0) return null;
    return dates.reduce((a, b) => (a.getTime() >= b.getTime() ? a : b));
  })();

  // Human-readable description of the real planning window, honouring the same precedence the backend
  // uses: explicit target deadline → furthest exam → fallback duration.
  const planHorizon: { short: string; sentence: string } = (() => {
    const start = new Date(startDate);
    const fmt = (d: string | Date) =>
      new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
    const daysUntil = (end: Date) => Math.max(0, Math.ceil((end.getTime() - start.getTime()) / DAY_MS));
    const plural = (n: number) => (n === 1 ? '' : 's');

    if (!useDeadlines) {
      if (targetDeadlineDate) {
        const days = daysUntil(new Date(targetDeadlineDate));
        return {
          short: `Until ${fmt(targetDeadlineDate)} · ${days} day${plural(days)}`,
          sentence: `every day from now until ${fmt(targetDeadlineDate)} — about ${days} day${plural(days)} of preparation.`,
        };
      }
      return {
        short: 'Target deadline not set',
        sentence: "a target date you haven't chosen yet — pick one below.",
      };
    }
    if (furthestExamDate) {
      const days = daysUntil(furthestExamDate);
      return {
        short: `Until your last exam · ${fmt(furthestExamDate)} · ~${days} day${plural(days)}`,
        sentence: `every day from now until your last exam on ${fmt(furthestExamDate)} — about ${days} day${plural(days)} of preparation. It won't be capped to a fixed number of weeks.`,
      };
    }
    return {
      short: `${duration} (fallback — no upcoming exams)`,
      sentence: `${duration} — used because your selected subjects have no upcoming exam dates yet.`,
    };
  })();

  const { mutate: generate, isPending } = useMutation({
    mutationFn: (payload: GeneratePayload) => timetableApi.generate(payload),
    onSuccess: () => router.push('/timetable'),
    onError: (err: Error) => setError(err.message || 'Failed to generate timetable'),
  });

  const toggleSubject = (id: string) =>
    setSelectedSubjects((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );

  const canAdvance = () => {
    if (step === 1) return selectedSubjects.length > 0;
    return true;
  };

  const handleGenerate = () => {
    setError('');
    generate({
      subjectIds: selectedSubjects,
      availableHoursPerDay: hoursPerDay,
      style: studyStyle as 'intense' | 'balanced' | 'relaxed',
      startDate,
      durationDays: DURATION_DAYS[duration] ?? 14,
      useDeadlines,
      targetDeadlineDate: targetDeadlineDate || undefined,
    });
  };

  return (
    <div className={styles.container}>
      <PageHeader
        title="Generate AI Timetable"
        subtitle="Let AI create your personalised study schedule in 5 steps."
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Timetable', href: '/timetable' },
          { label: 'Generate' },
        ]}
      />

      {/* Step indicator */}
      <div className={styles.stepIndicator}>
        {STEPS.map((s, i) => {
          const isActive = step === s.id;
          const isDone = step > s.id;
          
          let circleClass = styles.stepCirclePending;
          if (isDone) circleClass = styles.stepCircleDone;
          else if (isActive) circleClass = styles.stepCircleActive;

          return (
            <React.Fragment key={s.id}>
              <div className={styles.stepNode}>
                <div className={`${styles.stepCircle} ${circleClass}`}>
                  {isDone ? <CheckSquare size={16} /> : s.id}
                </div>
                <span className={`${styles.stepLabel} ${isActive ? styles.stepLabelActive : styles.stepLabelPending}`}>
                  {s.title}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`${styles.stepLine} ${isDone ? styles.stepLineDone : styles.stepLinePending}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step content */}
      <div className={styles.card}>

        {step === 1 && (
          <div>
            <h2 className={styles.stepTitle}>Which subjects to include?</h2>
            <div className={styles.subjectList}>
              {subjects.length === 0 ? (
                <p style={{ color: 'var(--color-muted-foreground)', fontSize: '0.875rem' }}>
                  No subjects found. <Link href="/subjects" style={{ color: 'var(--color-primary)' }}>Add subjects first.</Link>
                </p>
              ) : (
                subjects.map((sub) => {
                  const selected = selectedSubjects.includes(sub.id);
                  return (
                    <button
                      key={sub.id}
                      onClick={() => toggleSubject(sub.id)}
                      className={`${styles.selectableCard} ${selected ? styles.selectableCardSelected : ''}`}
                    >
                      <div className={styles.subjectInfo}>
                        <div className={styles.subjectColor} style={{ backgroundColor: sub.color || 'hsl(var(--primary))' }} />
                        <span className={styles.subjectName}>{sub.name}</span>
                      </div>
                      {selected ? <CheckSquare size={20} className={styles.checkboxIcon} /> : <Square size={20} className={styles.checkboxIcon} />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className={styles.stepTitle}>How many hours per day?</h2>
            <div className={styles.hoursHeader}>
              <span className={styles.hoursValue}>{hoursPerDay}</span>
              <span className={styles.hoursUnit}>hours / day</span>
            </div>
            <input
              type="range" min={1} max={12} step={1}
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(Number(e.target.value))}
              className={styles.rangeInput}
            />
            <div className={styles.rangeLabels}>
              <span>1h (light)</span><span>6h (standard)</span><span>12h (max)</span>
            </div>
            {/* Study period preview — shows the actual window the timetable generator will use */}
            {(() => {
              const period = calcStudyPeriod(savedWindowEnum, hoursPerDay);
              return (
                <div style={{
                  marginTop: '1.25rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(0, 229, 192, 0.06)',
                  border: '1px solid rgba(0, 229, 192, 0.25)',
                  borderLeft: '3px solid var(--color-primary)',
                  fontSize: '0.875rem',
                  lineHeight: 1.5,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                }}
                  data-testid="wizard-study-period-preview"
                >
                  <Clock size={15} style={{ marginTop: 2, flexShrink: 0, color: 'var(--color-primary)' }} aria-hidden="true" />
                  <span>
                    <span style={{ color: 'var(--color-muted-foreground)' }}>
                      Based on your saved start-time preference ({savedStartLabel}), your daily study window will be:{' '}
                    </span>
                    <strong data-testid="wizard-study-period-value">{period.label}</strong>
                    {period.crossesMidnight && (
                      <p style={{ margin: '0.375rem 0 0', fontSize: '0.8125rem', color: '#d97706' }}>
                        ⚠ This extends past midnight. Change your start time in Settings or reduce the hours.
                      </p>
                    )}
                  </span>
                </div>
              );
            })()}
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className={styles.stepTitle}>What&apos;s your study style?</h2>
            <div className={styles.styleList}>
              {STUDY_STYLES.map((style) => {
                const selected = studyStyle === style.value;
                return (
                  <button
                    key={style.value}
                    onClick={() => setStudyStyle(style.value)}
                    className={`${styles.selectableCard} ${styles.styleCard} ${selected ? styles.selectableCardSelected : ''}`}
                  >
                    <p className={styles.styleTitle}>{style.label}</p>
                    <p className={styles.styleDesc}>{style.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className={styles.stepTitle}>When do you want to start?</h2>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className={styles.dateInput}
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Duration</label>
              <div className={styles.durationGrid}>
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`${styles.durationBtn} ${duration === d ? styles.durationBtnSelected : ''}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-muted-foreground)', marginTop: '0.5rem' }}>
                Only used as a fallback when a subject has no upcoming exam and no target deadline is set.
              </p>
            </div>

            <div className={styles.inputGroup} style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
              <label className={styles.inputLabel}>Study Planning Mode</label>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input
                    type="radio"
                    name="deadlineMode"
                    checked={useDeadlines}
                    onChange={() => setUseDeadlines(true)}
                  />
                  <span>Use exam deadlines (automatic prioritization)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input
                    type="radio"
                    name="deadlineMode"
                    checked={!useDeadlines}
                    onChange={() => setUseDeadlines(false)}
                  />
                  <span>Set a target deadline</span>
                </label>
              </div>
              
              {!useDeadlines && (
                <div style={{ marginTop: '1rem' }}>
                  <label style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>Target exam date</label>
                  <input
                    type="date"
                    value={targetDeadlineDate || ''}
                    onChange={(e) => setTargetDeadlineDate(e.target.value)}
                    min={startDate}
                    className={styles.dateInput}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-muted-foreground)', marginTop: '0.5rem' }}>
                    {targetDeadlineDate
                      ? `${Math.max(0, Math.ceil((new Date(targetDeadlineDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)))} days available for study`
                      : 'Choose a date to see available study time'}
                  </p>
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: '1.5rem',
                padding: '0.875rem 1rem',
                borderRadius: '0.5rem',
                background: 'var(--color-muted, rgba(127,127,127,0.08))',
                border: '1px solid var(--color-border)',
              }}
            >
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted-foreground)', lineHeight: 1.5, margin: 0 }}>
                <strong style={{ color: 'var(--color-foreground)' }}>Your plan will cover</strong>{' '}
                {planHorizon.sentence}
              </p>
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <h2 className={styles.stepTitle}>Review your plan</h2>
            {error && <div className={styles.errorBox}>{error}</div>}
            <div className={styles.reviewList}>
              {[
                { label: 'Subjects', value: subjects.filter(s => selectedSubjects.includes(s.id)).map(s => s.name).join(', ') || '—' },
                { label: 'Daily Study', value: `${hoursPerDay} hours/day` },
                {
                  label: 'Daily study window',
                  value: (() => {
                    const period = calcStudyPeriod(savedWindowEnum, hoursPerDay);
                    return period.label + (period.crossesMidnight ? ' ⚠ crosses midnight' : '');
                  })(),
                },
                { label: 'Study Style', value: studyStyle.charAt(0).toUpperCase() + studyStyle.slice(1) },
                { label: 'Start Date', value: new Date(startDate).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) },
                { label: 'Plan covers', value: planHorizon.short },
                { label: 'Planning Mode', value: useDeadlines ? 'Auto-prioritize by exam dates' : 'Target deadline: ' + (targetDeadlineDate ? new Date(targetDeadlineDate).toLocaleDateString(undefined, { day: 'numeric', month: 'long' }) : 'Not set') },
              ].map(({ label, value }) => (
                <div key={label} className={styles.reviewRow}>
                  <span className={styles.reviewLabel}>{label}</span>
                  <span className={styles.reviewValue}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={styles.navBar}>
        <AppButton
          variant="outline"
          leftIcon={<ChevronLeft size={16} />}
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 1}
        >
          Back
        </AppButton>

        {step < 5 ? (
          <AppButton
            rightIcon={<ChevronRight size={16} />}
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance()}
          >
            Next
          </AppButton>
        ) : (
          <AppButton
            leftIcon={<Zap size={16} />}
            onClick={handleGenerate}
            disabled={isPending}
          >
            {isPending ? 'Generating...' : 'Generate My Timetable'}
          </AppButton>
        )}
      </div>
    </div>
  );
}
