'use client';

import React, { useState, useMemo } from 'react';
import { useMaterials } from '@/hooks/useMaterials';
import { useSubjects } from '@/hooks/useSubjects';
import UploadZone from '@/components/materials/UploadZone';
import MaterialCard from '@/components/materials/MaterialCard';
import { Search } from 'lucide-react';
import styles from './materials.module.css';

export default function MaterialsPage() {
  const { data: materials = [], isLoading: loadingMats } = useMaterials();
  const { data: subjects = [] } = useSubjects();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubjectId, setFilterSubjectId] = useState<string>('all');

  // Client-side filtering
  const filteredMaterials = useMemo(() => {
    return materials.filter(mat => {
      const matchesSearch = mat.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSubject = filterSubjectId === 'all' || mat.subjectId === filterSubjectId;
      return matchesSearch && matchesSubject;
    });
  }, [materials, searchQuery, filterSubjectId]);

  return (
    <div className={styles.container}>
      <div className={styles.headerGroup}>
        <h1 className={styles.pageTitle}>Study Materials</h1>
        <p className={styles.pageSubtitle}>Upload and organize your course resources.</p>
      </div>

      <UploadZone subjects={subjects} />

      <div className={`${styles.cardBase} ${styles.gridSection}`}>
        
        {/* Filters & Search */}
        <div className={styles.filterBar}>
          <div className={styles.searchWrap}>
            <Search size={16} className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Search materials by title..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          
          <select 
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

        {/* Materials Grid */}
        {loadingMats ? (
          <div className="flex justify-center py-20 text-muted-foreground animate-pulse">Loading materials...</div>
        ) : filteredMaterials.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No materials found. Try adjusting your search or upload a new file.</p>
          </div>
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
