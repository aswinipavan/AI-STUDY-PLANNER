'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSubjects } from '@/hooks/useSubjects';
import { materialsApi } from '@/api/materials.api';
import { performanceApi } from '@/api/performance.api';
import { QK } from '@/constants/queryKeys';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import MaterialCard from '@/components/materials/MaterialCard';
import { AppButton } from '@/components/ui/AppButton';
import { BookOpen, FileText, Plus, Trophy } from 'lucide-react';
import { SlideOver } from '@/components/modals/SlideOver';

interface SubjectDetailProps {
  subjectId: string;
}

export default function SubjectDetailClient({ subjectId }: SubjectDetailProps) {
  const qc = useQueryClient();
  const [slideOpen, setSlideOpen] = useState(false);
  const [score, setScore] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Fetch Subject Info
  const { data: subjects = [], isLoading: loadingSubjects } = useSubjects();
  const subject = subjects.find((s) => s.id === subjectId);

  // 2. Fetch Materials for this subject
  const { data: materials = [], isLoading: loadingMats, error: matsError, refetch: refetchMats } = useQuery({
    queryKey: ['materials', subjectId],
    queryFn: () => materialsApi.getBySubject(subjectId),
    enabled: !!subjectId,
  });

  // 3. Add Mark Mutation
  const { mutate: addMark, isPending: isAddingMark } = useMutation({
    mutationFn: () => performanceApi.addMark({ subjectId, score: Number(score), date }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.priority });
      qc.invalidateQueries({ queryKey: QK.performance });
      setSlideOpen(false);
      setScore('');
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || 'Failed to add mark');
    }
  });

  if (loadingSubjects || loadingMats) return (
    <div className="p-6 max-w-7xl mx-auto space-y-4 animate-pulse">
      <div className="h-10 w-1/3 bg-muted rounded-xl"></div>
      <div className="h-4 w-1/4 bg-muted rounded-xl mb-6"></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-muted rounded-xl"></div>
        ))}
      </div>
    </div>
  );

  if (!subject) return (
    <div className="p-6">
      <ErrorState message="Subject not found" onRetry={() => window.history.back()} />
    </div>
  );

  if (matsError) return <div className="p-6"><ErrorState message="Could not load materials." onRetry={refetchMats} /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title={subject.name}
        subtitle="Manage materials and track your performance"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Subjects', href: '/subjects' },
          { label: subject.name }
        ]}
        action={
          <AppButton leftIcon={<Plus className="w-4 h-4" />} onClick={() => setSlideOpen(true)}>
            Add Mark
          </AppButton>
        }
      />

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm min-h-[400px]">
        <div className="flex items-center space-x-2 mb-6">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-card-foreground">Study Materials</h3>
        </div>

        {materials.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            message={`No materials uploaded for ${subject.name} yet.`}
            action={{ label: 'Upload Materials', onClick: () => window.location.href = '/materials' }}
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {materials.map(mat => (
              <MaterialCard key={mat.id} material={mat} />
            ))}
          </div>
        )}
      </div>

      <SlideOver isOpen={slideOpen} onClose={() => setSlideOpen(false)} title="Record Exam Mark">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            Add a new score for <span className="font-bold">{subject.name}</span> to track your performance trend.
          </p>

          {errorMsg && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20 font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Score (%)</label>
            <div className="relative">
              <input 
                type="number" 
                min="0" 
                max="100" 
                value={score} 
                onChange={(e) => setScore(e.target.value)}
                className="w-full pl-4 pr-10 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                placeholder="e.g. 85"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">%</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          <div className="pt-4">
            <AppButton 
              className="w-full" 
              leftIcon={<Trophy className="w-4 h-4" />} 
              onClick={() => addMark()} 
              disabled={isAddingMark || !score}
            >
              {isAddingMark ? 'Saving...' : 'Save Mark'}
            </AppButton>
          </div>
        </div>
      </SlideOver>
    </div>
  );
}
