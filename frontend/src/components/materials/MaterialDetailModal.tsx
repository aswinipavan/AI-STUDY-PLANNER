'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect, useMemo } from 'react';
import { StudyMaterial, MaterialTopic, MaterialChapter } from '@/types/api.types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  FileText,
  Image as ImageIcon,
  Video,
  File,
  Sparkles,
  BookOpen,
  Layers,
  Key,
  Gauge,
  X,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  ExternalLink,
  Search
} from 'lucide-react';
import styles from './materialDetailModal.module.css';

export type MaterialTabType = 'summary' | 'topics' | 'keywords' | 'complexity';
export type ModalSizePreset = 'standard' | 'wide' | 'fullscreen';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  material: StudyMaterial;
  initialTab?: MaterialTabType;
  onPreviewFile?: () => void;
}

export default function MaterialDetailModal({
  isOpen,
  onClose,
  material,
  initialTab = 'summary',
  onPreviewFile
}: Props) {
  const [activeTab, setActiveTab] = useState<MaterialTabType>(initialTab);
  const [sizePreset, setSizePreset] = useState<ModalSizePreset>('standard');
  const [copied, setCopied] = useState(false);
  const [topicSearch, setTopicSearch] = useState('');

  // Sync initial tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setTopicSearch('');
    }
  }, [isOpen, initialTab]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Parse topics, chapters, keywords
  const parsedTopics: MaterialTopic[] = useMemo(() => {
    if (!material.extractedTopics) return [];
    if (Array.isArray(material.extractedTopics)) return material.extractedTopics;
    try {
      return JSON.parse(material.extractedTopics);
    } catch {
      return [];
    }
  }, [material.extractedTopics]);

  const _parsedChapters: MaterialChapter[] = useMemo(() => {
    if (!material.extractedChapters) return [];
    if (Array.isArray(material.extractedChapters)) return material.extractedChapters;
    try {
      return JSON.parse(material.extractedChapters);
    } catch {
      return [];
    }
  }, [material.extractedChapters]);

  const parsedKeywords: string[] = useMemo(() => {
    if (!material.extractedKeywords) return [];
    if (Array.isArray(material.extractedKeywords)) return material.extractedKeywords;
    try {
      return JSON.parse(material.extractedKeywords);
    } catch {
      return [];
    }
  }, [material.extractedKeywords]);

  // Filter topics
  const filteredTopics = useMemo(() => {
    if (!topicSearch.trim()) return parsedTopics;
    const query = topicSearch.toLowerCase();
    return parsedTopics.filter(
      (t) =>
        t.name?.toLowerCase().includes(query) ||
        t.chapter?.toLowerCase().includes(query)
    );
  }, [parsedTopics, topicSearch]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (material.fileType) {
      case 'pdf':   return <FileText size={20} color="#f87171" />;
      case 'image': return <ImageIcon size={20} color="#60a5fa" />;
      case 'video': return <Video size={20} color="#c084fc" />;
      default:      return <File size={20} color="#34d399" />;
    }
  };

  const handleCopySummary = async () => {
    if (!material.aiSummary) return;
    try {
      await navigator.clipboard.writeText(material.aiSummary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy summary:', err);
    }
  };

  const toggleMaximize = () => {
    setSizePreset((prev) => (prev === 'fullscreen' ? 'standard' : 'fullscreen'));
  };

  const displayTitle = material.title
    ? material.title.replace(/_/g, ' ')
    : 'Untitled Material';

  const subjectName =
    material.subjectName ||
    (typeof material.subject === 'object' &&
      (material.subject?.name || (material.subject as { subjectName?: string })?.subjectName)) ||
    '';

  const difficulty = material.overallDifficulty;
  const difficultyScore = material.difficultyScore;

  const sizeClass =
    sizePreset === 'fullscreen'
      ? styles.sizeFullscreen
      : sizePreset === 'wide'
      ? styles.sizeWide
      : styles.sizeStandard;

  return (
    <div
      className={styles.backdrop}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${displayTitle} details`}
    >
      <div
        className={`${styles.modal} ${sizeClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <div className={styles.iconWrap}>{getIcon()}</div>
            <div className={styles.titleMeta}>
              <h3 className={styles.title} title={displayTitle}>
                {displayTitle}
              </h3>
              <div className={styles.badgeRow}>
                <span className={styles.fileTypeBadge}>{material.fileType}</span>
                {subjectName && (
                  <span className={styles.subjectBadge}>
                    <BookOpen size={10} />
                    {subjectName}
                  </span>
                )}
                {difficulty && (
                  <span
                    className={`${styles.diffBadge} ${
                      difficulty === 'HARD'
                        ? styles.diffHard
                        : difficulty === 'MEDIUM'
                        ? styles.diffMedium
                        : styles.diffEasy
                    }`}
                  >
                    <Gauge size={10} />
                    {difficulty} {difficultyScore ? `• ${difficultyScore}/100` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Size Adjuster & Controls */}
          <div className={styles.headerControls}>
            <div className={styles.sizeButtonGroup} role="group" aria-label="Modal size presets">
              <button
                type="button"
                className={`${styles.sizeBtn} ${sizePreset === 'standard' ? styles.sizeBtnActive : ''}`}
                onClick={() => setSizePreset('standard')}
                title="Standard width (720px)"
              >
                Standard
              </button>
              <button
                type="button"
                className={`${styles.sizeBtn} ${sizePreset === 'wide' ? styles.sizeBtnActive : ''}`}
                onClick={() => setSizePreset('wide')}
                title="Wide width (980px)"
              >
                Wide
              </button>
            </div>

            <button
              type="button"
              className={styles.iconBtn}
              onClick={toggleMaximize}
              title={sizePreset === 'fullscreen' ? 'Restore size' : 'Maximize fullscreen'}
              aria-label={sizePreset === 'fullscreen' ? 'Restore size' : 'Maximize fullscreen'}
            >
              {sizePreset === 'fullscreen' ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              title="Close modal (Esc)"
              aria-label="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className={styles.navTabs} role="tablist">
          {material.aiSummary && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'summary'}
              className={`${styles.tabBtn} ${activeTab === 'summary' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('summary')}
            >
              <Sparkles size={13} />
              <span>AI Summary</span>
            </button>
          )}

          {parsedTopics.length > 0 && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'topics'}
              className={`${styles.tabBtn} ${activeTab === 'topics' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('topics')}
            >
              <Layers size={13} />
              <span>Key Topics</span>
              <span className={styles.tabCountBadge}>{parsedTopics.length}</span>
            </button>
          )}

          {parsedKeywords.length > 0 && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'keywords'}
              className={`${styles.tabBtn} ${activeTab === 'keywords' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('keywords')}
            >
              <Key size={13} />
              <span>Concepts</span>
              <span className={styles.tabCountBadge}>{parsedKeywords.length}</span>
            </button>
          )}

          {(material.difficultyReason || difficulty) && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'complexity'}
              className={`${styles.tabBtn} ${activeTab === 'complexity' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('complexity')}
            >
              <Gauge size={13} />
              <span>Complexity</span>
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className={styles.contentArea}>
          {/* AI Summary Tab */}
          {activeTab === 'summary' && material.aiSummary && (
            <div>
              <div className={styles.summaryHeaderRow}>
                <div className={styles.summaryHeaderTitle}>
                  <Sparkles size={14} />
                  <span>Curriculum Breakdown & Insights</span>
                </div>
                <button
                  type="button"
                  className={styles.copySummaryBtn}
                  onClick={handleCopySummary}
                  title="Copy summary text"
                >
                  {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
                </button>
              </div>

              <div className={styles.proseContainer}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {material.aiSummary}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Topics & Chapters Tab */}
          {activeTab === 'topics' && (
            <div>
              {parsedTopics.length > 6 && (
                <div className={styles.topicsSearchWrap}>
                  <Search size={14} className={styles.topicsSearchIcon} />
                  <input
                    type="text"
                    placeholder="Search topics or chapters..."
                    value={topicSearch}
                    onChange={(e) => setTopicSearch(e.target.value)}
                    className={styles.topicsSearchInput}
                  />
                </div>
              )}

              <div className={styles.topicsGrid}>
                {filteredTopics.map((topic, idx) => (
                  <div key={idx} className={styles.topicCard}>
                    <span className={styles.topicName}>{topic.name}</span>
                    {topic.chapter && (
                      <span className={styles.topicChapterPill}>
                        <BookOpen size={10} />
                        Chapter: {topic.chapter}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {filteredTopics.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--muted-foreground))' }}>
                  No topics matching &quot;{topicSearch}&quot;
                </div>
              )}
            </div>
          )}

          {/* Concepts & Keywords Tab */}
          {activeTab === 'keywords' && (
            <div className={styles.keywordsGrid}>
              {parsedKeywords.map((kw, idx) => (
                <span key={idx} className={styles.keywordCard}>
                  <Key size={11} />
                  {kw}
                </span>
              ))}
            </div>
          )}

          {/* Complexity Analysis Tab */}
          {activeTab === 'complexity' && (
            <div className={styles.complexityContainer}>
              <div className={styles.complexityGaugeCard}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Overall Difficulty Rating
                  </div>
                  <div className={styles.complexityScoreValue}>
                    {difficulty || 'MODERATE'} {difficultyScore ? `• ${difficultyScore}/100` : ''}
                  </div>
                </div>
                {difficulty && (
                  <span
                    className={`${styles.diffBadge} ${
                      difficulty === 'HARD'
                        ? styles.diffHard
                        : difficulty === 'MEDIUM'
                        ? styles.diffMedium
                        : styles.diffEasy
                    }`}
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}
                  >
                    <Gauge size={14} />
                    {difficulty}
                  </span>
                )}
              </div>

              {material.difficultyReason && (
                <div className={styles.complexityDetailsBox}>
                  <div className={styles.complexityDetailsTitle}>
                    <Gauge size={13} />
                    <span>Complexity Analysis & Rationale</span>
                  </div>
                  <p className={styles.complexityDetailsText}>{material.difficultyReason}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <span className={styles.resizeHint}>
            📐 Drag bottom-right corner ⇲ to adjust size
          </span>

          <div className={styles.footerActions}>
            {material.fileUrl && onPreviewFile && (
              <button
                type="button"
                className={styles.previewBtn}
                onClick={onPreviewFile}
              >
                <ExternalLink size={13} />
                <span>Open File</span>
              </button>
            )}
            <button
              type="button"
              className={styles.closeFooterBtn}
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
