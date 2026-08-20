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
import { TrendingUp, TrendingDown, Minus, Lightbulb, Medal, Sparkles, Brain, CheckCircle2, AlertCircle } from 'lucide-react';
import styles from './performance.module.css';

export default function PerformancePage() {
  const { data: report, isLoading: loadingReport } = usePerformanceReport();
  const { data: priority, isLoading: loadingPriority } = usePriority();
  const { data: readiness, isLoading: loadingReadiness } = useAcademicReadiness();
  const { data: aiAnalysis, isLoading: loadingAiAnalysis, refetch: runAiAnalysis } = useAiPerformanceAnalysis();
  const [showAnalysis, setShowAnalysis] = useState(false);

  const handleAnalyzeClick = async () => {
    setShowAnalysis(true);
    await runAiAnalysis();
  };

  const trendIcon = report?.trend === 'improving' ? (
    <TrendingUp size={20} color="#34d399" />
  ) : report?.trend === 'declining' ? (
    <TrendingDown size={20} color="#f87171" />
  ) : (
    <Minus size={20} color="#fbbf24" />
  );

  const trendData = report?.subjectBreakdown?.flatMap((sub: SubjectPerformance) =>
    sub.marksHistory.map((m: Mark) => ({
      date: m.date,
      [sub.subjectName]: m.score,
    }))
  ).reduce((acc: Record<string, unknown>[], cur: Record<string, unknown>) => {
    const existing = acc.find((d: Record<string, unknown>) => d.date === cur.date);
    if (existing) { Object.assign(existing, cur); return acc; }
    return [...acc, cur];
  }, []) ?? [];

  const subjectColors = ['#00e5c0', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981'];

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
          {report && (
            <div className={styles.trendBadge}>
              {trendIcon}
              <span>{report.trend}</span>
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
                <Brain size={22} color="#00e5c0" />
                <h3 className={styles.cardTitle} style={{ fontSize: '1.25rem' }}>Academic Readiness Index</h3>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted-foreground)', margin: '0.25rem 0 0 0' }}>
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
                <div className={styles.pillarFill} style={{ width: `${readiness.subjectPerformanceScore}%`, background: '#00e5c0' }} />
              </div>
            </div>

            <div className={styles.pillarItem}>
              <div className={styles.pillarLabelRow}>
                <span>Exam Preparation</span>
                <span className={styles.pillarScore}>{readiness.examPreparationScore}%</span>
              </div>
              <div className={styles.pillarBar}>
                <div className={styles.pillarFill} style={{ width: `${readiness.examPreparationScore}%`, background: '#38bdf8' }} />
              </div>
            </div>

            <div className={styles.pillarItem}>
              <div className={styles.pillarLabelRow}>
                <span>Study Consistency</span>
                <span className={styles.pillarScore}>{readiness.studyConsistencyScore}%</span>
              </div>
              <div className={styles.pillarBar}>
                <div className={styles.pillarFill} style={{ width: `${readiness.studyConsistencyScore}%`, background: '#a855f7' }} />
              </div>
            </div>

            <div className={styles.pillarItem}>
              <div className={styles.pillarLabelRow}>
                <span>Material Coverage</span>
                <span className={styles.pillarScore}>{readiness.materialCoverageScore}%</span>
              </div>
              <div className={styles.pillarBar}>
                <div className={styles.pillarFill} style={{ width: `${readiness.materialCoverageScore}%`, background: '#f59e0b' }} />
              </div>
            </div>
          </div>

          {readiness.aiExplanation && (
            <div className={styles.aiExplanationBox}>
              <Sparkles size={16} color="#00e5c0" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{readiness.aiExplanation}</span>
            </div>
          )}
        </div>
      )}

      {/* ── PHASE 4: AI PERFORMANCE ANALYSIS DIAGNOSTIC ── */}
      {showAnalysis && aiAnalysis && (
        <div className={styles.analysisCard}>
          <div className={styles.cardTitleWrap}>
            <Sparkles size={20} color="#a855f7" />
            <h3 className={styles.cardTitle}>AI Performance Diagnostic & Action Plan</h3>
          </div>

          <p style={{ fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 1rem 0' }}>
            {aiAnalysis.aiDetailedSummary}
          </p>

          <div className={styles.analysisDetailsGrid}>
            <div className={styles.analysisBox}>
              <div className={styles.analysisBoxTitle}>Current Grade</div>
              <div className={styles.analysisBoxVal}>{aiAnalysis.performanceGrade} ({aiAnalysis.currentPerformance.toFixed(1)}%)</div>
            </div>

            <div className={styles.analysisBox}>
              <div className={styles.analysisBoxTitle}>Exam Urgency</div>
              <div className={styles.analysisBoxVal} style={{ fontSize: '0.8125rem' }}>{aiAnalysis.examUrgency}</div>
            </div>

            <div className={styles.analysisBox}>
              <div className={styles.analysisBoxTitle}>Target Daily Study</div>
              <div className={styles.analysisBoxVal} style={{ color: '#00e5c0' }}>{aiAnalysis.recommendedStudyDuration}</div>
            </div>
          </div>

          {aiAnalysis.weakAreas && aiAnalysis.weakAreas.length > 0 && (
            <div style={{ marginTop: '1rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f87171', textTransform: 'uppercase' }}>Focus Areas (Weakest Subjects)</span>
              <ul style={{ margin: '0.35rem 0 0 1.25rem', padding: 0, fontSize: '0.8125rem', color: 'var(--color-foreground)' }}>
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
            
            <div className={styles.card}>
              <div className={styles.cardTitleWrap}>
                <h3 className={styles.cardTitle}>Overall Score</h3>
              </div>
              <div className={styles.scoreRingContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%" cy="50%" innerRadius="70%" outerRadius="100%"
                    data={[{ name: 'Score', value: report?.overallAverage ?? 0, fill: '#00e5c0' }]}
                    startAngle={180} endAngle={-180}
                  >
                    <RadialBar dataKey="value" cornerRadius={10} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className={styles.scoreValueWrap}>
                  <span className={styles.scoreValue}>{report?.overallAverage?.toFixed(0) ?? 0}%</span>
                  <span className={styles.scoreLabel}>Average</span>
                </div>
              </div>
            </div>

            <div className={styles.card} style={{ animationDelay: '0.1s' }}>
              <div className={styles.cardTitleWrap}>
                <h3 className={styles.cardTitle}>Subject Breakdown</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  layout="vertical"
                  data={report?.subjectBreakdown?.map((s: SubjectPerformance) => ({ name: s.subjectName, score: s.averageScore }))}
                  margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: '#888', fontSize: 11 }} axisLine={{ stroke: '#333' }} tickLine={{ stroke: '#333' }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#888', fontSize: 11 }} width={80} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }} />
                  <Bar dataKey="score" fill="#00e5c0" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className={styles.card} style={{ animationDelay: '0.2s' }}>
              <div className={styles.cardTitleWrap}>
                <h3 className={styles.cardTitle}>Score Trend</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                  <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 10 }} axisLine={{ stroke: '#333' }} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#888', fontSize: 11 }} axisLine={{ stroke: '#333' }} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  {report?.subjectBreakdown?.map((sub: SubjectPerformance, i: number) => (
                    <Line
                      key={sub.subjectId}
                      type="monotone"
                      dataKey={sub.subjectName}
                      stroke={subjectColors[i % subjectColors.length]}
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#111', strokeWidth: 2 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className={styles.card} style={{ animationDelay: '0.3s' }}>
              <div className={styles.cardTitleWrap}>
                <h3 className={styles.cardTitle}>Study vs Score Correlation</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                  <XAxis dataKey="hours" name="Hours Studied" tick={{ fill: '#888', fontSize: 11 }} axisLine={{ stroke: '#333' }} tickLine={false} />
                  <YAxis dataKey="score" name="Score" domain={[0, 100]} tick={{ fill: '#888', fontSize: 11 }} axisLine={{ stroke: '#333' }} tickLine={false} />
                  <ZAxis range={[50, 100]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3', stroke: '#555' }} contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }} />
                  <Scatter
                    name="Performance"
                    data={report?.subjectBreakdown?.map((s: SubjectPerformance) => ({
                      hours: s.marksHistory.length * 2,
                      score: s.averageScore,
                    }))}
                    fill="#00e5c0"
                    fillOpacity={0.8}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {report?.recommendations && report.recommendations.length > 0 && (
              <div className={styles.card} style={{ animationDelay: '0.4s' }}>
                <div className={styles.cardTitleWrap}>
                  <Lightbulb size={20} color="#f59e0b" />
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
                <div className={styles.cardTitleWrap}>
                  <Medal size={20} color="#00e5c0" />
                  <h3 className={styles.cardTitle}>Subject Priority Ranking</h3>
                </div>
                <div className={styles.priorityList}>
                  {(Array.isArray(priority) ? priority : []).map((item, idx) => {
                    let rankClass = styles.priorityRank;
                    if (idx === 0) rankClass += ` ${styles.rank1}`;
                    else if (idx === 1) rankClass += ` ${styles.rank2}`;
                    else rankClass += ` ${styles.rank3}`;
                    
                    return (
                      <div key={item.id || idx} className={styles.priorityItem}>
                        <div className={styles.priorityLeft}>
                          <span className={rankClass}>#{idx + 1}</span>
                          <span className={styles.priorityName}>{item.subjectName}</span>
                        </div>
                        <span className={styles.priorityScore}>
                          {item.averagePercentage != null ? `${Math.round(item.averagePercentage)}% avg` : `Score: ${item.priorityScore}`}
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
