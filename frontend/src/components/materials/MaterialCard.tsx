'use client';

import React, { useState } from 'react';
import { StudyMaterial } from '@/types/api.types';
import Image from 'next/image';
import { FileText, Image as ImageIcon, Video, File, Trash2, Sparkles, ChevronDown, ChevronUp, Tag } from 'lucide-react';
import { useDeleteMaterial } from '@/hooks/useMaterials';
import styles from '@/app/(dashboard)/materials/materials.module.css';

interface Props {
  material: StudyMaterial;
}

export default function MaterialCard({ material }: Props) {
  const { mutate: deleteMaterial, isPending } = useDeleteMaterial();
  const [showLightbox, setShowLightbox] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const getIcon = () => {
    switch (material.fileType) {
      case 'pdf':   return <FileText size={24} color="#f87171" />;
      case 'image': return <ImageIcon size={24} color="#60a5fa" />;
      case 'video': return <Video size={24} color="#c084fc" />;
      default:      return <File size={24} color="#34d399" />;
    }
  };

  const handlePreview = () => {
    if (material.fileType === 'pdf') {
      window.open(material.fileUrl, '_blank');
    } else if (material.fileType === 'image') {
      setShowLightbox(true);
    } else {
      const link = document.createElement('a');
      link.href = material.fileUrl;
      link.download = material.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this material?')) {
      deleteMaterial(material.id);
    }
  };

  const hasAiData = material.aiSummary || material.aiCategorizedSubject;

  return (
    <>
      <div className={styles.matCard}>
        {/* Delete button */}
        <button
          onClick={handleDelete}
          disabled={isPending}
          className={styles.btnDelete}
          aria-label="Delete material"
        >
          <Trash2 size={16} />
        </button>

        {/* Clickable preview area */}
        <div onClick={handlePreview} style={{ cursor: 'pointer', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className={styles.matIconWrap}>
            {getIcon()}
          </div>

          <h4 className={styles.matTitle} title={material.title}>
            {material.title}
          </h4>

          <span className={styles.matType}>
            {material.fileType}
          </span>
        </div>

        {/* AI Category badge */}
        {material.aiCategorizedSubject && (
          <div className={styles.aiCategoryBadge}>
            <Tag size={10} />
            <span>{material.aiCategorizedSubject}</span>
          </div>
        )}

        {/* AI Summary toggle */}
        {material.aiSummary && (
          <button
            className={styles.aiSummaryToggle}
            onClick={(e) => { e.stopPropagation(); setShowSummary(!showSummary); }}
            title="View AI Summary"
          >
            <Sparkles size={12} />
            <span>AI Summary</span>
            {showSummary ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}

        {/* AI Summary panel */}
        {showSummary && material.aiSummary && (
          <div className={styles.aiSummaryPanel} onClick={(e) => e.stopPropagation()}>
            <p className={styles.aiSummaryText}>{material.aiSummary}</p>
          </div>
        )}

        {/* Pending AI analysis indicator */}
        {!hasAiData && (
          <div className={styles.aiPendingBadge}>
            <Sparkles size={10} />
            <span>AI analyzing...</span>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {showLightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowLightbox(false)}
        >
          <div className="relative w-full h-full max-w-5xl max-h-[90vh]">
            <Image
              src={material.fileUrl}
              alt={material.title}
              fill
              className="object-contain drop-shadow-2xl"
              unoptimized
            />
          </div>
        </div>
      )}
    </>
  );
}
