'use client';

import React from 'react';
import { useUpcomingExams } from '@/hooks/useDashboard';
import { Calendar } from 'lucide-react';

export default function ExamsWidget() {
  const { data: exams } = useUpcomingExams();

  const displayExams = exams?.slice(0, 3) || [];

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-card-foreground">Upcoming Exams</h3>
        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
          {exams?.length || 0} Total
        </span>
      </div>

      {displayExams.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No upcoming exams. You&apos;re all clear!</p>
      ) : (
        <div className="space-y-4">
          {displayExams.map((exam) => (
            <div key={exam.id} className="flex items-center p-3 rounded-lg bg-background border border-border/50">
              <div className="p-2 bg-primary/10 text-primary rounded-lg mr-4">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{exam.subject?.name || 'Untitled Exam'}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{exam.notes || 'No notes'}</p>
              </div>
              <div className="text-right ml-4">
                <p className="text-xs font-bold text-foreground">
                  {new Date(exam.examDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
                <p className={`text-[10px] font-medium mt-1 uppercase ${
                  exam.difficulty === 'hard' ? 'text-destructive' : 
                  exam.difficulty === 'medium' ? 'text-amber-500' : 'text-green-500'
                }`}>
                  {exam.difficulty}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
