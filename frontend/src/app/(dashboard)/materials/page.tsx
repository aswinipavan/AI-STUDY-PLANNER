'use client';

import React, { useState, useMemo, useId } from 'react';
import { useMaterials } from '@/hooks/useMaterials';
import { useSubjects } from '@/hooks/useSubjects';
import UploadZone from '@/components/materials/UploadZone';
import MaterialCard from '@/components/materials/MaterialCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { FileQuestion, Search } from 'lucide-react';
import styles from './materials.module.css';

export default function MaterialsPage() {
  const { data: materials = [], isLoading: loadingMats } = useMaterials();
  const { data: subjects = [] } = useSubjects();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubjectId, setFilterSubjectId] = useState<string>('all');
  const searchId = useId();
  const filterId = useId();

  // Client-side filtering
  const filteredMaterials = useMemo(() => {
    return materials.filter(mat => {
      const matchesSearch = mat.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matSubjectId = mat.subjectId || (typeof mat.subject === 'object' ? mat.subject?.id : undefined);
      const matchesSubject = filterSubjectId === 'all' || matSubjectId === filterSubjectId;
      return matchesSearch && matchesSubject;
    });
  }, [materials, searchQuery, filterSubjectId]);

  const isFiltered = searchQuery.trim() !== '' || filterSubjectId !== 'all';

  return (
    <div className={styles.container}>
      {/* The page had its own bespoke title block; every other dashboard route
          renders PageHeader, which also owns the single <h1> and the breadcrumb. */}
      <PageHeader
        title="Study Materials"
        subtitle="Upload and organize your course resources."
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Materials' }]}
      />

      <UploadZone subjects={subjects} />

      <div className={`${styles.cardBase} ${styles.gridSection}`}>

        {/* Filters & Search */}
        <div className={styles.filterBar}>
          <div className={styles.searchWrap}>
            <label className={styles.srOnly} htmlFor={searchId}>Search materials</label>
            <Search size={16} className={styles.searchIcon} aria-hidden="true" />
            <input
              id={searchId}
              type="search"
              placeholder="Search materials by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div>
            <label className={styles.srOnly} htmlFor={filterId}>Filter by subject</label>
            <select
              id={filterId}
              value={filterSubjectId}
              onChange={(e) => setFilterSubjectId(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Subjects</option>
              {subjects.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Materials Grid */}
        {loadingMats ? (
          // Grid-shaped, so the cards land where the placeholders were instead of
          // the page reflowing from a list into a grid.
          <div className={styles.grid} aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={styles.matCardSkeleton}
                style={{ animationDelay: `${i * 60}ms` }}
              />
            ))}
          </div>
        ) : filteredMaterials.length === 0 ? (
          <EmptyState
            icon={FileQuestion}
            message={
              isFiltered
                ? 'No materials match that search. Try a different title or subject.'
                : 'No materials yet. Upload a PDF, image or document above and the planner will read it for topics.'
            }
          />
        ) : (
          <div className={styles.grid}>
            {filteredMaterials.map(mat => (
              <MaterialCard key={mat.id} material={mat} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
