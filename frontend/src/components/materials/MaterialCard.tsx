'use client';

import React, { useState } from 'react';
import { StudyMaterial, MaterialTopic, MaterialChapter } from '@/types/api.types';
import Image from 'next/image';
import {
  FileText,
  Image as ImageIcon,
  Video,
  File,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Tag,
  BookOpen,
  RotateCw,
  Gauge,
  Layers,
  Key
} from 'lucide-react';
import { useDeleteMaterial } from '@/hooks/useMaterials';
import { materialsApi } from '@/api/materials.api';
import { useQueryClient } from '@tanstack/react-query';
import { QK } from '@/constants/queryKeys';
import styles from '@/app/(dashboard)/materials/materials.module.css';

interface Props {
  material: StudyMaterial;
}

export default function MaterialCard({ material }: Props) {
  const qc = useQueryClient();
  const { mutate: deleteMaterial, isPending } = useDeleteMaterial();
  const [showLightbox, setShowLightbox] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showIntelligence, setShowIntelligence] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);

  // Parse topics, chapters, keywords safely
  const parsedTopics: MaterialTopic[] = React.useMemo(() => {
    if (!material.extractedTopics) return [];
    if (Array.isArray(material.extractedTopics)) return material.extractedTopics;
    try {
      return JSON.parse(material.extractedTopics);
    } catch {
      return [];
    }
  }, [material.extractedTopics]);

  const parsedChapters: MaterialChapter[] = React.useMemo(() => {
    if (!material.extractedChapters) return [];
    if (Array.isArray(material.extractedChapters)) return material.extractedChapters;
    try {
      return JSON.parse(material.extractedChapters);
    } catch {
      return [];
    }
  }, [material.extractedChapters]);

  const parsedKeywords: string[] = React.useMemo(() => {
    if (!material.extractedKeywords) return [];
    if (Array.isArray(material.extractedKeywords)) return material.extractedKeywords;
    try {
      return JSON.parse(material.extractedKeywords);
    } catch {
      return [];
    }
  }, [material.extractedKeywords]);

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

  const handleReprocess = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsReprocessing(true);
      await materialsApi.reprocess(material.id);
      qc.invalidateQueries({ queryKey: QK.materials });
    } catch (err) {
      console.error('Reprocessing error:', err);
    } finally {
      setIsReprocessing(false);
    }
  };

  const status = material.processingStatus || (material.aiSummary ? 'COMPLETED' : 'PENDING');
  const difficulty = material.overallDifficulty;
  const difficultyScore = material.difficultyScore;

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

        {/* Processing Status Badge */}
        {status === 'PROCESSING' || status === 'PENDING' ? (
          <div className={styles.nlpBadgePending}>
            <Sparkles size={10} />
            <span>NLP Analyzing...</span>
          </div>
        ) : status === 'FAILED' ? (
          <div>
            <div className={styles.nlpBadgeFailed}>
              <span>Failed</span>
            </div>
            <button
              onClick={handleReprocess}
              disabled={isReprocessing}
              className={styles.retryBtn}
            >
              <RotateCw size={10} className={isReprocessing ? 'animate-spin' : ''} />
              <span>Retry</span>
            </button>
          </div>
        ) : (
          <div className={styles.nlpBadgeCompleted}>
            <Sparkles size={10} />
            <span>NLP Processed</span>
          </div>
        )}

        {/* Difficulty Badge */}
        {difficulty && (
          <div className={`${styles.diffBadge} ${
            difficulty === 'HARD' ? styles.diffHard :
            difficulty === 'MEDIUM' ? styles.diffMedium : styles.diffEasy
          }`}>
            <Gauge size={10} />
            <span>{difficulty} {difficultyScore ? `• ${difficultyScore}/100` : ''}</span>
          </div>
        )}

        {/* Action Buttons Row */}
        <div className={styles.intelActionRow}>
          {material.aiSummary && (
            <button
              className={styles.intelToggleBtn}
              onClick={(e) => { e.stopPropagation(); setShowSummary(!showSummary); setShowIntelligence(false); }}
              title="View Summary"
            >
              <Sparkles size={11} />
              <span>Summary</span>
              {showSummary ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          )}

          {(parsedTopics.length > 0 || parsedChapters.length > 0 || parsedKeywords.length > 0 || material.difficultyReason) && (
            <button
              className={styles.intelToggleBtn}
              onClick={(e) => { e.stopPropagation(); setShowIntelligence(!showIntelligence); setShowSummary(false); }}
              title="View Extracted Topics & Chapters"
            >
              <BookOpen size={11} />
              <span>Topics ({parsedTopics.length})</span>
              {showIntelligence ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          )}
        </div>

        {/* AI Summary Panel */}
        {showSummary && material.aiSummary && (
          <div className={styles.aiSummaryPanel} onClick={(e) => e.stopPropagation()}>
            <p className={styles.aiSummaryText}>{material.aiSummary}</p>
          </div>
        )}

        {/* Intelligence Details Panel (Topics, Chapters, Keywords, Difficulty) */}
        {showIntelligence && (
          <div className={styles.intelDetailsPanel} onClick={(e) => e.stopPropagation()}>
            {/* Extracted Topics */}
            {parsedTopics.length > 0 && (
              <>
                <div className={styles.intelSectionHeader}>
                  <Layers size={11} />
                  <span>Key Topics</span>
                </div>
                <div className={styles.topicList}>
                  {parsedTopics.map((t, idx) => (
                    <div key={idx} className={styles.topicItem}>
                      <strong>{t.name}</strong>
                      {t.chapter && <span className={styles.topicChapterLabel}>Chapter: {t.chapter}</span>}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Extracted Keywords */}
            {parsedKeywords.length > 0 && (
              <>
                <div className={styles.intelSectionHeader}>
                  <Key size={11} />
                  <span>Concepts & Terms</span>
                </div>
                <div className={styles.keywordWrap}>
                  {parsedKeywords.map((kw, idx) => (
                    <span key={idx} className={styles.keywordChip}>{kw}</span>
                  ))}
                </div>
              </>
            )}

            {/* Difficulty Reason */}
            {material.difficultyReason && (
              <>
                <div className={styles.intelSectionHeader}>
                  <Gauge size={11} />
                  <span>Complexity Analysis</span>
                </div>
                <p className={styles.diffReasonText}>{material.difficultyReason}</p>
              </>
            )}
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
