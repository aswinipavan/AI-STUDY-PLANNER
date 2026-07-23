'use client';

import React from 'react';
import { usePerformanceReport, usePriority } from '@/hooks/usePerformance';
import { SubjectPerformance, Mark } from '@/types/api.types';
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line,
  ScatterChart, Scatter, ZAxis,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Lightbulb, Medal } from 'lucide-react';
import styles from './performance.module.css';

export default function PerformancePage() {
  const { data: report, isLoading: loadingReport } = usePerformanceReport();
  const { data: priority, isLoading: loadingPriority } = usePriority();

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
          <p className={styles.pageSubtitle}>A detailed breakdown of your academic progress.</p>
        </div>
        {report && (
          <div className={styles.trendBadge}>
            {trendIcon}
            <span>{report.trend}</span>
          </div>
        )}
      </div>

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
                  {(Array.isArray(priority) ? priority : []).map((item: { subjectId: string; subjectName?: string; priority: number; averageScore?: number }, idx: number) => {
                    let rankClass = styles.priorityRank;
                    if (idx === 0) rankClass += ` ${styles.rank1}`;
                    else if (idx === 1) rankClass += ` ${styles.rank2}`;
                    else rankClass += ` ${styles.rank3}`;
                    
                    return (
                      <div key={item.subjectId} className={styles.priorityItem}>
                        <div className={styles.priorityLeft}>
                          <span className={rankClass}>#{idx + 1}</span>
                          <span className={styles.priorityName}>{item.subjectName}</span>
                        </div>
                        <span className={styles.priorityScore}>{item.averageScore}% avg</span>
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
