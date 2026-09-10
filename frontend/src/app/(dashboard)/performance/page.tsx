'use client';

import React, { useState } from 'react';
import { usePerformanceReport, usePriority, useAcademicReadiness, useAiPerformanceAnalysis } from '@/hooks/usePerformance';
import { SubjectPerformance, Mark } from '@/types/api.types';
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line,
  ScatterChart, Scatter, ZAxis,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Lightbulb,
  Medal,
  Sparkles,
  Brain,
  BarChart3,
  Activity,
  Award,
} from 'lucide-react';
import styles from './performance.module.css';

interface TooltipItem {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string;
}

interface CustomChartTooltipProps {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string;
  unit?: string;
}

function CustomChartTooltip({ active, payload, label, unit = '%' }: CustomChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className={styles.customTooltip}>
      {label && <div className={styles.tooltipLabel}>{label}</div>}
      <div className={styles.tooltipPayloadList}>
        {payload.map((item, idx) => (
          <div key={idx} className={styles.tooltipItem}>
            <span
              className={styles.tooltipDot}
              style={{ backgroundColor: item.color || 'hsl(var(--primary))' }}
            />
            <span className={styles.tooltipName}>{item.name || item.dataKey}:</span>
            <span className={styles.tooltipValue}>
              {typeof item.value === 'number' ? `${item.value.toFixed(1)}${unit}` : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PerformancePage() {
  const { data: report, isLoading: loadingReport } = usePerformanceReport();
  const { data: priority, isLoading: loadingPriority } = usePriority();
  const { data: readiness } = useAcademicReadiness();
  const { data: aiAnalysis, isLoading: loadingAiAnalysis, refetch: runAiAnalysis } = useAiPerformanceAnalysis();
  const [showAnalysis, setShowAnalysis] = useState(false);

  const handleAnalyzeClick = async () => {
    setShowAnalysis(true);
    await runAiAnalysis();
  };

  const hasTrend = Boolean(report?.trend && (report.trend === 'improving' || report.trend === 'declining' || report.trend === 'stable'));

  const trendIcon = report?.trend === 'improving' ? (
    <TrendingUp size={16} className={styles.trendIconUp} />
  ) : report?.trend === 'declining' ? (
    <TrendingDown size={16} className={styles.trendIconDown} />
  ) : (
    <Minus size={16} className={styles.trendIconStable} />
  );

  const trendData = report?.subjectBreakdown?.flatMap((sub: SubjectPerformance) =>
    (sub.marksHistory || []).map((m: Mark) => ({
      date: m.date,
      [sub.subjectName]: m.score,
    }))
  ).reduce((acc: Record<string, unknown>[], cur: Record<string, unknown>) => {
    const existing = acc.find((d: Record<string, unknown>) => d.date === cur.date);
    if (existing) { Object.assign(existing, cur); return acc; }
    return [...acc, cur];
  }, []) ?? [];

  const subjectColors = ['#0d9488', '#7c3aed', '#0284c7', '#d97706', '#059669', '#ec4899'];

  const hasSubjectData = Boolean(
    report?.subjectBreakdown &&
    report.subjectBreakdown.length > 0 &&
    report.subjectBreakdown.some((s: SubjectPerformance) => (s.averageScore ?? 0) > 0 || (s.marksHistory && s.marksHistory.length > 0))
  );

  const correlationData = (report?.subjectBreakdown ?? [])
    .map((s: SubjectPerformance) => ({
      hours: (s.marksHistory?.length ?? 0) * 2,
      score: s.averageScore ?? 0,
      name: s.subjectName,
    }))
    .filter((d) => d.hours > 0 || d.score > 0);

  const hasCorrelationData = correlationData.length > 0;

  const readinessTier = readiness
    ? readiness.overallReadiness >= 80
      ? { label: 'Exam Ready', color: styles.tierHigh }
      : readiness.overallReadiness >= 55
      ? { label: 'Good Progress', color: styles.tierMedium }
      : readiness.overallReadiness >= 35
      ? { label: 'Developing', color: styles.tierDeveloping }
      : { label: 'Getting Started', color: styles.tierLow }
    : null;

  return (
    <div className={styles.container}>
      <div className={styles.headerGroup}>
        <div>
          <h1 className={styles.pageTitle}>Performance Analytics</h1>
          <p className={styles.pageSubtitle}>A detailed breakdown of your academic progress and AI readiness.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleAnalyzeClick}
            disabled={loadingAiAnalysis}
            className={styles.btnAnalyze}
            id="btn-analyze-performance"
          >
            <Sparkles size={16} />
            {loadingAiAnalysis ? 'Analyzing...' : 'Analyze My Performance'}
          </button>
          {hasTrend && (
            <div className={styles.trendBadge}>
              {trendIcon}
              <span>{report?.trend}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── PHASE 6: ACADEMIC READINESS CARD ── */}
      {readiness && (
        <div className={styles.readinessCard}>
          <div className={styles.readinessHeader}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Brain size={22} className={styles.readinessIcon} />
                <h3 className={styles.cardTitle} style={{ fontSize: '1.25rem' }}>Academic Readiness Index</h3>
                {readinessTier && (
                  <span className={`${styles.readinessTierBadge} ${readinessTier.color}`}>
                    {readinessTier.label}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'hsl(var(--muted-foreground))', margin: '0.35rem 0 0 0' }}>
                Multi-factor composite preparedness score based on performance, upcoming exams, consistency, and syllabus coverage.
              </p>
            </div>
            <div className={styles.readinessScoreBig}>
              {readiness.overallReadiness}%
            </div>
          </div>

          <div className={styles.readinessPillarsGrid}>
            <div className={styles.pillarItem}>
              <div className={styles.pillarLabelRow}>
                <span>Subject Performance</span>
                <span className={styles.pillarScore}>{readiness.subjectPerformanceScore}%</span>
              </div>
              <div className={styles.pillarBar}>
                <div
                  className={styles.pillarFill}
                  style={{
                    width: `${readiness.subjectPerformanceScore}%`,
                    background: 'linear-gradient(90deg, #0d9488, #14b8a6)',
                  }}
                />
              </div>
            </div>

            <div className={styles.pillarItem}>
              <div className={styles.pillarLabelRow}>
                <span>Exam Preparation</span>
                <span className={styles.pillarScore}>{readiness.examPreparationScore}%</span>
              </div>
              <div className={styles.pillarBar}>
                <div
                  className={styles.pillarFill}
                  style={{
                    width: `${readiness.examPreparationScore}%`,
                    background: 'linear-gradient(90deg, #0284c7, #38bdf8)',
                  }}
                />
              </div>
            </div>

            <div className={styles.pillarItem}>
              <div className={styles.pillarLabelRow}>
                <span>Study Consistency</span>
                <span className={styles.pillarScore}>{readiness.studyConsistencyScore}%</span>
              </div>
              <div className={styles.pillarBar}>
                <div
                  className={styles.pillarFill}
                  style={{
                    width: `${readiness.studyConsistencyScore}%`,
                    background: 'linear-gradient(90deg, #7c3aed, #a855f7)',
                  }}
                />
              </div>
            </div>

            <div className={styles.pillarItem}>
              <div className={styles.pillarLabelRow}>
                <span>Material Coverage</span>
                <span className={styles.pillarScore}>{readiness.materialCoverageScore}%</span>
              </div>
              <div className={styles.pillarBar}>
                <div
                  className={styles.pillarFill}
                  style={{
                    width: `${readiness.materialCoverageScore}%`,
                    background: 'linear-gradient(90deg, #d97706, #f59e0b)',
                  }}
                />
              </div>
            </div>
          </div>

          {readiness.aiExplanation && (
            <div className={styles.aiExplanationBox}>
              <Sparkles size={16} className={styles.aiExplanationIcon} />
              <span>{readiness.aiExplanation}</span>
            </div>
          )}
        </div>
      )}

      {/* ── PHASE 4: AI PERFORMANCE ANALYSIS DIAGNOSTIC ── */}
      {showAnalysis && aiAnalysis && (
        <div className={styles.analysisCard}>
          <div className={styles.cardTitleWrap}>
            <Sparkles size={20} color="#7c3aed" />
            <h3 className={styles.cardTitle}>AI Performance Diagnostic & Action Plan</h3>
          </div>

          <p style={{ fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 1rem 0', color: 'hsl(var(--foreground))' }}>
            {aiAnalysis.aiDetailedSummary}
          </p>

          <div className={styles.analysisDetailsGrid}>
            <div className={styles.analysisBox}>
              <div className={styles.analysisBoxTitle}>Current Grade</div>
              <div className={styles.analysisBoxVal}>{aiAnalysis.performanceGrade} ({aiAnalysis.currentPerformance.toFixed(1)}%)</div>
            </div>

            <div className={styles.analysisBox}>
              <div className={styles.analysisBoxTitle}>Exam Urgency</div>
              <div className={styles.analysisBoxVal} style={{ fontSize: '0.875rem' }}>{aiAnalysis.examUrgency}</div>
            </div>

            <div className={styles.analysisBox}>
              <div className={styles.analysisBoxTitle}>Target Daily Study</div>
              <div className={styles.analysisBoxVal} style={{ color: 'hsl(var(--primary))' }}>{aiAnalysis.recommendedStudyDuration}</div>
            </div>
          </div>

          {aiAnalysis.weakAreas && aiAnalysis.weakAreas.length > 0 && (
            <div className={styles.weakAreasBox}>
              <span className={styles.weakAreasTitle}>Focus Areas (Weakest Subjects)</span>
              <ul className={styles.weakAreasList}>
                {aiAnalysis.weakAreas.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {loadingReport ? (
        <div className={styles.skeletonGrid}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className={styles.skeletonCard} style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            
            {/* 1. OVERALL SCORE CARD */}
            <div className={styles.card}>
              <div className={styles.cardHeaderRow}>
                <div className={styles.cardTitleWrap}>
                  <Award size={18} className="text-teal-600 dark:text-teal-400" />
                  <h3 className={styles.cardTitle}>Overall Score</h3>
                </div>
                {report?.overallAverage != null && report.overallAverage > 0 && (
                  <span className={styles.cardHeaderBadge}>Active</span>
                )}
              </div>

              <div className={styles.scoreRingContainer}>
                {report?.overallAverage != null && report.overallAverage > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart
                        cx="50%" cy="50%" innerRadius="70%" outerRadius="100%"
                        data={[
                          { name: 'Max', value: 100, fill: 'hsl(var(--muted))' },
                          { name: 'Score', value: report.overallAverage, fill: 'url(#scoreGradient)' }
                        ]}
                        startAngle={90} endAngle={-270}
                      >
                        <defs>
                          <linearGradient id="scoreGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#0d9488" />
                            <stop offset="100%" stopColor="#0284c7" />
                          </linearGradient>
                        </defs>
                        <RadialBar dataKey="value" cornerRadius={10} background={{ fill: 'hsl(var(--muted))' }} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className={styles.scoreValueWrap}>
                      <span className={styles.scoreValue}>{report.overallAverage.toFixed(0)}%</span>
                      <span className={styles.scoreLabel}>Average GPA</span>
                    </div>
                  </>
                ) : (
                  <div className={styles.emptyGaugeContainer}>
                    <div className={styles.ghostGaugeRing}>
                      <span className={styles.scoreValuePlaceholder}>--%</span>
                      <span className={styles.scoreLabelPlaceholder}>No Data Yet</span>
                    </div>
                    <p className={styles.emptyCardHint}>
                      Log marks in Subjects to calculate your overall average.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 2. SUBJECT BREAKDOWN CARD */}
            <div className={styles.card} style={{ animationDelay: '0.1s' }}>
              <div className={styles.cardHeaderRow}>
                <div className={styles.cardTitleWrap}>
                  <BarChart3 size={18} className="text-teal-600 dark:text-teal-400" />
                  <h3 className={styles.cardTitle}>Subject Breakdown</h3>
                </div>
                {hasSubjectData && (
                  <span className={styles.cardHeaderBadge}>
                    {report?.subjectBreakdown?.length} Subjects
                  </span>
                )}
              </div>

              {hasSubjectData ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    layout="vertical"
                    data={report?.subjectBreakdown?.map((s: SubjectPerformance) => ({
                      name: s.subjectName,
                      score: s.averageScore ?? 0,
                    }))}
                    margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} opacity={0.6} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} width={90} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomChartTooltip unit="%" />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
                    <Bar dataKey="score" fill="url(#barGradient)" radius={[0, 6, 6, 0]} barSize={18}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#0d9488" />
                          <stop offset="100%" stopColor="#0284c7" />
                        </linearGradient>
                      </defs>
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.emptyChartPlaceholder}>
                  <div className={styles.ghostBarList}>
                    <div className={styles.ghostBarItem} style={{ width: '75%' }} />
                    <div className={styles.ghostBarItem} style={{ width: '50%' }} />
                    <div className={styles.ghostBarItem} style={{ width: '65%' }} />
                  </div>
                  <div className={styles.emptyChartOverlay}>
                    <BarChart3 size={24} className={styles.emptyChartIcon} />
                    <span className={styles.emptyChartTitle}>No Subject Breakdown</span>
                    <span className={styles.emptyChartSubtitle}>Record marks in Subjects to compare score performance across courses.</span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. SCORE TREND CARD */}
            <div className={styles.card} style={{ animationDelay: '0.2s' }}>
              <div className={styles.cardHeaderRow}>
                <div className={styles.cardTitleWrap}>
                  <TrendingUp size={18} className="text-teal-600 dark:text-teal-400" />
                  <h3 className={styles.cardTitle}>Score Trend</h3>
                </div>
                {trendData.length > 0 && (
                  <span className={styles.cardHeaderBadge}>Timeline</span>
                )}
              </div>

              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
                    <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
                    <Tooltip content={<CustomChartTooltip unit="%" />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    {report?.subjectBreakdown?.map((sub: SubjectPerformance, i: number) => (
                      <Line
                        key={sub.subjectId}
                        type="monotone"
                        dataKey={sub.subjectName}
                        stroke={subjectColors[i % subjectColors.length]}
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: 'hsl(var(--card))', strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.emptyChartPlaceholder}>
                  <svg className={styles.ghostTrendSvg} viewBox="0 0 300 80" fill="none">
                    <path
                      d="M0 60 C 60 70, 90 20, 150 40 C 210 60, 240 15, 300 25"
                      stroke="hsl(var(--border))"
                      strokeWidth="3"
                      strokeDasharray="4 4"
                      fill="none"
                    />
                  </svg>
                  <div className={styles.emptyChartOverlay}>
                    <TrendingUp size={24} className={styles.emptyChartIcon} />
                    <span className={styles.emptyChartTitle}>No Score Trend History</span>
                    <span className={styles.emptyChartSubtitle}>Test and quiz scores over time will plot your trajectory curve here.</span>
                  </div>
                </div>
              )}
            </div>

            {/* 4. STUDY VS SCORE CORRELATION CARD */}
            <div className={styles.card} style={{ animationDelay: '0.3s' }}>
              <div className={styles.cardHeaderRow}>
                <div className={styles.cardTitleWrap}>
                  <Activity size={18} className="text-teal-600 dark:text-teal-400" />
                  <div>
                    <h3 className={styles.cardTitle}>Study vs Score Correlation</h3>
                  </div>
                </div>
                {hasCorrelationData && (
                  <span className={styles.cardHeaderBadge}>Insight</span>
                )}
              </div>

              {hasCorrelationData ? (
                <ResponsiveContainer width="100%" height={220}>
                  <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
                    <XAxis dataKey="hours" name="Study Hours" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} unit="h" />
                    <YAxis dataKey="score" name="Score" domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} unit="%" />
                    <ZAxis range={[60, 120]} />
                    <Tooltip cursor={{ strokeDasharray: '3 3', stroke: 'hsl(var(--muted-foreground))' }} content={<CustomChartTooltip unit="" />} />
                    <Scatter
                      name="Subject Performance"
                      data={correlationData}
                      fill="#0d9488"
                      fillOpacity={0.85}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.emptyChartPlaceholder}>
                  <div className={styles.ghostScatterPoints}>
                    <div className={styles.ghostDot} style={{ top: '65%', left: '20%' }} />
                    <div className={styles.ghostDot} style={{ top: '45%', left: '45%' }} />
                    <div className={styles.ghostDot} style={{ top: '25%', left: '75%' }} />
                  </div>
                  <div className={styles.emptyChartOverlay}>
                    <Sparkles size={24} className={styles.emptyChartIcon} />
                    <span className={styles.emptyChartTitle}>No Correlation Data Yet</span>
                    <span className={styles.emptyChartSubtitle}>Log study sessions and exam scores to discover your optimal study duration.</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {report?.recommendations && report.recommendations.length > 0 && (
              <div className={styles.card} style={{ animationDelay: '0.4s' }}>
                <div className={styles.cardTitleWrap}>
                  <Lightbulb size={20} className="text-amber-500" />
                  <h3 className={styles.cardTitle}>AI Recommendations</h3>
                </div>
                <div className={styles.recGrid}>
                  {report.recommendations.map((rec: string, i: number) => (
                    <div key={i} className={styles.recItem}>
                      <span className={styles.recNumber}>{i + 1}</span>
                      <p className={styles.recText}>{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!loadingPriority && priority && (
              <div className={styles.card} style={{ animationDelay: '0.5s' }}>
                <div className={styles.cardHeaderRow}>
                  <div className={styles.cardTitleWrap}>
                    <Medal size={20} className="text-teal-600 dark:text-teal-400" />
                    <h3 className={styles.cardTitle}>Subject Priority Ranking</h3>
                  </div>
                  <span className={styles.cardHeaderBadge}>AI Evaluated</span>
                </div>
                <div className={styles.priorityList}>
                  {(Array.isArray(priority) ? priority : []).map((item, idx) => {
                    let rankClass = styles.priorityRank;
                    if (idx === 0) rankClass += ` ${styles.rank1}`;
                    else if (idx === 1) rankClass += ` ${styles.rank2}`;
                    else if (idx === 2) rankClass += ` ${styles.rank3}`;
                    else if (idx === 3) rankClass += ` ${styles.rank4}`;
                    else if (idx === 4) rankClass += ` ${styles.rank5}`;
                    else rankClass += ` ${styles.rankOther}`;
                    
                    return (
                      <div key={item.id || idx} className={styles.priorityItem}>
                        <div className={styles.priorityLeft}>
                          <span className={rankClass}>#{idx + 1}</span>
                          <div>
                            <span className={styles.priorityName}>{item.subjectName}</span>
                            {item.reasons && item.reasons.length > 0 && (
                              <p className={styles.priorityReason}>{item.reasons[0]}</p>
                            )}
                          </div>
                        </div>
                        <span className={styles.priorityScorePill}>
                          {item.averagePercentage != null ? `${Math.round(item.averagePercentage)}% Avg` : `Priority Score: ${item.priorityScore}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

