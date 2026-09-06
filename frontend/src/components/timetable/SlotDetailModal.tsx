'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
  Layers,
  Sparkles,
  Zap,
  Lock,
  Upload,
  RefreshCw,
  Check,
  ShieldCheck,
  Video,
  Play,
  ExternalLink,
} from 'lucide-react';
import { TimetableSlot, StudyEvidenceResponse, VerificationStatus, VideoRecommendation } from '@/types/api.types';
import { parseSlotDate, evaluateSessionState } from '@/utils/dateHelpers';
import { evidenceApi } from '@/api/evidence.api';
import { videoRecommendationsApi } from '@/api/videoRecommendations.api';
import { AppButton } from '@/components/ui/AppButton';
import styles from './slotDetailModal.module.css';

function getApiErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const axiosError = error as { response?: { data?: { message?: string } } };
    return axiosError.response?.data?.message || 'Something went wrong. Please try again.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Something went wrong. Please try again.';
}

interface SlotDetailModalProps {
  slot: TimetableSlot | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleStatus: (id: string, status: TimetableSlot['status']) => void;
}

function formatFullDate(value?: string): string {
  if (!value) return 'Scheduled Study Session';
  const parsed = parseSlotDate(value);
  if (!parsed) return value;
  return parsed.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(value: string): string {
  try {
    return new Date(`1970-01-01T${value}`).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return value;
  }
}

function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

export const SlotDetailModal: React.FC<SlotDetailModalProps> = ({
  slot,
  isOpen,
  onClose,
  onToggleStatus,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [evidence, setEvidence] = useState<StudyEvidenceResponse | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isCompleting, setIsCompleting] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Video Recommendations state
  const [videos, setVideos] = useState<VideoRecommendation[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState<boolean>(false);
  const [isRefreshingVideos, setIsRefreshingVideos] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoWarning, setVideoWarning] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Load existing evidence and video recommendations when modal opens
  useEffect(() => {
    if (isOpen && slot?.id) {
      setUploadError(null);
      setIsUploading(false);
      setIsCompleting(false);

      if (slot.hasEvidence && slot.evidenceStatus) {
        setEvidence({
          id: slot.evidenceId || '',
          slotId: slot.id,
          fileName: 'Submitted Study Proof',
          fileUrl: '',
          verificationStatus: slot.evidenceStatus as VerificationStatus,
          score: slot.evidenceScore,
          summary: 'Verified evidence on record for this session.',
          matchedTopics: slot.topic ? [slot.topic] : [],
          missingTopics: [],
          feedback: 'Verified through AI examination.',
          confidence: 90,
          isUsedForCompletion: slot.isCompleted,
        });
      } else {
        evidenceApi.getLatestEvidence(slot.id).then((ev) => {
          if (ev) setEvidence(ev);
          else setEvidence(null);
        }).catch(() => {
          setEvidence(null);
        });
      }

      // Fetch video recommendations asynchronously
      setIsLoadingVideos(true);
      setVideoError(null);
      setVideoWarning(null);
      videoRecommendationsApi.getVideoRecommendations(slot.id)
        .then((res) => {
          setVideos(res.recommendations || []);
          setVideoWarning(res.warningMessage || null);
        })
        .catch((err) => {
          setVideoError(getApiErrorMessage(err));
        })
        .finally(() => {
          setIsLoadingVideos(false);
        });
    } else {
      setEvidence(null);
      setVideos([]);
      setVideoError(null);
      setVideoWarning(null);
    }
  }, [isOpen, slot?.id, slot?.hasEvidence, slot?.evidenceStatus, slot?.evidenceScore, slot?.evidenceId, slot?.topic, slot?.isCompleted]);

  const handleRefreshVideos = async () => {
    if (!slot?.id || isRefreshingVideos) return;
    try {
      setIsRefreshingVideos(true);
      setVideoError(null);
      const res = await videoRecommendationsApi.refreshVideoRecommendations(slot.id);
      setVideos(res.recommendations || []);
      setVideoWarning(res.warningMessage || null);
    } catch (err) {
      setVideoError(getApiErrorMessage(err));
    } finally {
      setIsRefreshingVideos(false);
    }
  };

  if (!isOpen || !slot) return null;

  const subjectName = slot.subject?.name || 'Study Session';
  const {
    isLocked,
    isMissed,
    isActive,
    isCompleted,
    isCatchUpActive,
  } = evaluateSessionState(slot);

  const duration = slot.durationMinutes || 60;
  const whatToStudy = slot.whatToStudy && slot.whatToStudy.length > 0
    ? slot.whatToStudy
    : [
        `• Review core topics and textbook chapters for ${subjectName}`,
        `• Work through key formulas and standard solved problems`,
        `• Note down questions for revision and follow-up`,
      ];

  const handleFileSelect = async (file: File) => {
    if (!file) return;
    setUploadError(null);

    // Validate size (15MB)
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File exceeds 15MB limit. Please upload a smaller document or notes image.');
      return;
    }

    try {
      setIsUploading(true);
      const res = await evidenceApi.uploadEvidence(slot.id, file);
      setEvidence(res);
    } catch (err) {
      setUploadError(getApiErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleApproveAndComplete = async () => {
    if (!evidence?.id || isCompleting) return;
    try {
      setIsCompleting(true);
      await evidenceApi.approveCompletion(slot.id, evidence.id);
      onToggleStatus(slot.id, 'completed');
      setEvidence((prev) => prev ? { ...prev, isUsedForCompletion: true } : null);
    } catch (err) {
      setUploadError(getApiErrorMessage(err));
    } finally {
      setIsCompleting(false);
    }
  };

  const handleMarkIncomplete = () => {
    onToggleStatus(slot.id, 'pending');
  };

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-slot-title"
      data-testid="slot-detail-modal"
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <span className={styles.subjectBadge}>
              <BookOpen size={13} aria-hidden="true" />
              {subjectName}
            </span>
            <h2 id="modal-slot-title" className={styles.dateTitle}>
              {formatFullDate(slot.date)}
            </h2>
          </div>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close session details"
            data-testid="close-slot-modal-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          {/* Future Locked Alert Banner */}
          {isLocked && (
            <div className={styles.futureAlertBox} data-testid="modal-future-locked-banner">
              <Lock size={15} className={styles.futureAlertIcon} />
              <div>
                <p className={styles.futureAlertTitle}>Future Session (Locked)</p>
                <p className={styles.futureAlertDesc}>
                  This session is scheduled for {formatFullDate(slot.date)}. It will become available to complete on that day.
                </p>
              </div>
            </div>
          )}

          {/* Catch-up Carry-forward Context Banner */}
          {isCatchUpActive && slot.missedDate && (
            <div className={styles.catchUpContextBox} data-testid="modal-catchup-context">
              <div className={styles.catchUpContextIconWrapper}>
                <Zap size={16} className={styles.catchUpContextIcon} />
              </div>
              <div className={styles.catchUpContextBody}>
                <p className={styles.catchUpContextTitle}>Carry-Forward Catch-Up Session</p>
                <div className={styles.catchUpDatesRow}>
                  <span className={styles.catchUpDatePill}>
                    <strong>Original Missed:</strong> {formatFullDate(slot.missedDate)}
                  </span>
                  <span className={styles.catchUpArrow}>➔</span>
                  <span className={styles.catchUpDatePillActive}>
                    <strong>Rescheduled Execution:</strong> Today ({formatFullDate(slot.date)})
                  </span>
                </div>
                <p className={styles.catchUpContextDesc}>
                  This topic was carried forward into today&apos;s available study window to keep you on track before exams. It is actionable today and will clear the overdue topic once completed.
                </p>
              </div>
            </div>
          )}

          {/* Time and Status Banner */}
          <div className={styles.timeBanner}>
            <div className={styles.timeBlock}>
              <Clock size={16} style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
              <span>{formatTimeRange(slot.startTime, slot.endTime)}</span>
              <span className={styles.durationPill}>{duration}m</span>
            </div>

            {isCompleted ? (
              <span className={styles.statusCompleted} data-testid="modal-status-badge">
                <CheckCircle2 size={14} /> Completed
              </span>
            ) : isLocked ? (
              <span className={styles.statusLocked} data-testid="modal-status-badge">
                <Lock size={14} /> Locked (Future)
              </span>
            ) : isCatchUpActive && !isMissed ? (
              <span className={styles.statusCatchUp} data-testid="modal-status-badge">
                <Zap size={14} /> Catch-up Required
              </span>
            ) : isMissed ? (
              <span className={styles.statusMissed} data-testid="modal-status-badge">
                <AlertTriangle size={14} /> Missed Session
              </span>
            ) : isActive ? (
              <span className={styles.statusActive} data-testid="modal-status-badge">
                <Clock size={14} /> Active Now
              </span>
            ) : (
              <span className={styles.statusUpcoming} data-testid="modal-status-badge">
                <Clock size={14} /> Upcoming (Today)
              </span>
            )}
          </div>

          {/* Today's Topic */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>Today&apos;s Topic</p>
            <div className={styles.topicCard}>
              <h3 className={styles.topicTitle} data-testid="modal-topic-title">
                {slot.topic || `${subjectName} Core Focus`}
              </h3>
              {slot.chapter && (
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted-foreground)' }}>
                  Chapter: <strong style={{ color: 'var(--color-foreground)' }}>{slot.chapter}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Metadata Grid: Source Material & Difficulty */}
          <div className={styles.metaGrid}>
            <div className={styles.metaCard}>
              <span className={styles.sectionLabel} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <FileText size={11} /> Source Material
              </span>
              <span className={styles.metaValue} data-testid="modal-source-material">
                {slot.materialTitle || 'Standard Curriculum'}
              </span>
            </div>

            <div className={styles.metaCard}>
              <span className={styles.sectionLabel} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Layers size={11} /> Chapter
              </span>
              <span className={styles.metaValue} data-testid="modal-chapter-name">
                {slot.chapter || 'Unit 1'}
              </span>
            </div>

            <div className={styles.metaCard}>
              <span className={styles.sectionLabel} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Zap size={11} /> Difficulty
              </span>
              <span className={styles.metaValue} data-testid="modal-difficulty">
                {slot.difficulty || 'Medium'} {slot.difficultyScore ? `· ${slot.difficultyScore}/100` : ''}
              </span>
            </div>
          </div>

          {/* What to Study */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>What to Study</p>
            <ul className={styles.whatToStudyList} data-testid="modal-what-to-study-list">
              {whatToStudy.map((point, index) => (
                <li key={index} className={styles.whatToStudyItem}>
                  <span className={styles.bulletDot}>•</span>
                  <span>{point.replace(/^•\s*/, '')}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recommended Study Videos Section */}
          <div className={styles.section} data-testid="modal-video-recommendations-section">
            <div className={styles.videoSectionHeader}>
              <div className={styles.videoSectionTitleRow}>
                <p className={styles.sectionLabel} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Video size={14} style={{ color: '#ff4e4e' }} />
                  Recommended Study Videos
                </p>
                <span className={styles.videoAiBadge}>
                  <Sparkles size={10} /> AI Ranked
                </span>
              </div>
              <button
                type="button"
                className={styles.videoRefreshButton}
                onClick={handleRefreshVideos}
                disabled={isLoadingVideos || isRefreshingVideos}
                aria-label="Refresh video recommendations"
                data-testid="refresh-video-recommendations-btn"
              >
                <RefreshCw size={12} className={isRefreshingVideos ? styles.analyzingSpinner : ''} style={isRefreshingVideos ? { width: 12, height: 12, borderWidth: 2 } : {}} />
                <span>{isRefreshingVideos ? 'Searching...' : 'Refresh'}</span>
              </button>
            </div>

            {isLoadingVideos ? (
              <div className={styles.videoGrid} data-testid="video-recommendations-loading">
                {[1, 2, 3].map((idx) => (
                  <div key={idx} className={styles.videoSkeletonCard}>
                    <div className={styles.videoSkeletonThumb} />
                    <div className={styles.videoSkeletonContent}>
                      <div className={styles.videoSkeletonLine} style={{ width: '85%' }} />
                      <div className={styles.videoSkeletonLine} style={{ width: '60%' }} />
                      <div className={styles.videoSkeletonLine} style={{ width: '40%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : videoError ? (
              <div className={styles.futureAlertBox} style={{ borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.08)' }} data-testid="video-error-banner">
                <AlertCircle size={16} style={{ color: '#ef4444' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <p style={{ color: '#ef4444', fontSize: '0.8125rem', margin: 0 }}>{videoError}</p>
                  <button
                    type="button"
                    onClick={handleRefreshVideos}
                    style={{ background: 'transparent', border: 'none', color: '#ff4e4e', fontSize: '0.75rem', fontWeight: 600, padding: 0, textAlign: 'left', cursor: 'pointer' }}
                  >
                    Try Again ↻
                  </button>
                </div>
              </div>
            ) : videos.length > 0 ? (
              <div className={styles.videoGrid} data-testid="video-recommendations-grid">
                {videos.map((vid) => {
                  const isExcellent = vid.matchVerdict === 'EXCELLENT MATCH' || vid.matchScore >= 85;
                  const isGood = vid.matchVerdict === 'GOOD MATCH' || (vid.matchScore >= 70 && vid.matchScore < 85);
                  const pillClass = isExcellent ? styles.matchScoreExcellent : isGood ? styles.matchScoreGood : styles.matchScoreRelated;

                  return (
                    <a
                      key={vid.videoId}
                      href={vid.videoUrl || `https://www.youtube.com/watch?v=${vid.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.videoCard}
                      data-testid={`video-card-${vid.videoId}`}
                    >
                      <div className={styles.videoThumbnailContainer}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={vid.thumbnailUrl || `https://i.ytimg.com/vi/${vid.videoId}/hqdefault.jpg`}
                          alt={vid.title}
                          className={styles.videoThumbnail}
                          loading="lazy"
                        />
                        <div className={styles.videoPlayOverlay}>
                          <Play size={20} className={styles.videoPlayIcon} fill="white" />
                        </div>
                      </div>

                      <div className={styles.videoCardContent}>
                        <h4 className={styles.videoTitle} title={vid.title}>
                          {vid.title}
                        </h4>

                        {vid.channelTitle && (
                          <div className={styles.videoChannelRow}>
                            <span>{vid.channelTitle}</span>
                          </div>
                        )}

                        {vid.matchReason && (
                          <span className={styles.videoReasonText}>
                            {vid.matchReason}
                          </span>
                        )}

                        <div className={styles.videoBadgeRow}>
                          <span className={`${styles.matchScorePill} ${pillClass}`}>
                            {vid.matchScore}% Match {isExcellent ? '· High Signal' : ''}
                          </span>
                          <span className={styles.videoWatchLink}>
                            Watch on YouTube <ExternalLink size={12} />
                          </span>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className={styles.reasonBox} data-testid="video-empty-state">
                <p className={styles.reasonText}>
                  {videoWarning || 'No video recommendations found for this specific topic yet. Click Refresh to search YouTube.'}
                </p>
              </div>
            )}
          </div>

          {/* Evidence-Based Verification Section */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>Study Proof & AI Verification</p>

            {isCompleted || evidence?.isUsedForCompletion ? (
              <div className={styles.verifiedCompletedCard} data-testid="modal-verified-completed">
                <ShieldCheck size={24} style={{ color: '#10b981', flexShrink: 0 }} />
                <div className={styles.verifiedCompletedBody}>
                  <p className={styles.verifiedCompletedTitle}>
                    <Check size={16} /> Verified & Completed
                  </p>
                  <p className={styles.verifiedCompletedMeta}>
                    {evidence?.score !== undefined ? `Verified Score: ${evidence.score}/100 · ` : ''}
                    {evidence?.fileName ? `Proof: ${evidence.fileName}` : 'Proof recorded on system'}
                  </p>
                </div>
              </div>
            ) : isLocked ? (
              <div className={styles.reasonBox} data-testid="modal-evidence-locked">
                <p className={styles.reasonText}>
                  Proof submission will unlock on the scheduled study date ({formatFullDate(slot.date)}).
                </p>
              </div>
            ) : (
              <div className={styles.evidenceSection}>
                {uploadError && (
                  <div className={styles.futureAlertBox} style={{ borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.08)' }} data-testid="evidence-error-banner">
                    <AlertCircle size={16} style={{ color: '#ef4444' }} />
                    <p style={{ color: '#ef4444', fontSize: '0.8125rem', margin: 0 }}>{uploadError}</p>
                  </div>
                )}

                {isUploading ? (
                  <div className={styles.evidenceAnalyzingBox} data-testid="evidence-analyzing-box">
                    <div className={styles.analyzingSpinner} />
                    <p className={styles.analyzingTitle}>Analyzing Study Proof with AI...</p>
                    <p className={styles.analyzingDesc}>Evaluating notes, worked examples, and topic coverage against assigned curriculum.</p>
                  </div>
                ) : evidence ? (
                  <div
                    className={`${styles.verificationCard} ${
                      evidence.verificationStatus === 'APPROVED'
                        ? styles.verificationCardApproved
                        : evidence.verificationStatus === 'NEEDS_MORE_WORK'
                        ? styles.verificationCardNeedsWork
                        : styles.verificationCardReviewRequired
                    }`}
                    data-testid="evidence-verification-card"
                  >
                    <div className={styles.verificationHeader}>
                      <div>
                        {evidence.verificationStatus === 'APPROVED' && (
                          <span className={styles.statusApprovedBadge} data-testid="verification-status-approved">
                            <CheckCircle2 size={13} /> APPROVED
                          </span>
                        )}
                        {evidence.verificationStatus === 'NEEDS_MORE_WORK' && (
                          <span className={styles.statusNeedsWorkBadge} data-testid="verification-status-needs-work">
                            <AlertTriangle size={13} /> NEEDS MORE WORK
                          </span>
                        )}
                        {evidence.verificationStatus === 'REVIEW_REQUIRED' && (
                          <span className={styles.statusReviewBadge} data-testid="verification-status-review-required">
                            <FileText size={13} /> REVIEW REQUIRED
                          </span>
                        )}
                      </div>

                      {evidence.score !== undefined && (
                        <span className={styles.scorePill} data-testid="verification-score-pill">
                          Score: <strong>{evidence.score}/100</strong> {evidence.confidence ? `· ${evidence.confidence}% confidence` : ''}
                        </span>
                      )}
                    </div>

                    {evidence.summary && (
                      <p className={styles.verificationSummary} data-testid="verification-summary">
                        {evidence.summary}
                      </p>
                    )}

                    {/* Matched topics list */}
                    {evidence.matchedTopics && evidence.matchedTopics.length > 0 && (
                      <ul className={styles.topicChecksList} data-testid="verification-matched-topics">
                        {evidence.matchedTopics.map((topicItem, idx) => (
                          <li key={idx} className={styles.matchedTopicItem}>
                            <Check size={13} /> Verified concept: <strong>{topicItem}</strong>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Missing topics list */}
                    {evidence.missingTopics && evidence.missingTopics.length > 0 && (
                      <ul className={styles.topicChecksList} data-testid="verification-missing-topics">
                        {evidence.missingTopics.map((topicItem, idx) => (
                          <li key={idx} className={styles.missingTopicItem}>
                            <AlertTriangle size={13} /> Missing coverage: <strong>{topicItem}</strong>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* AI Feedback */}
                    {evidence.feedback && (
                      <div className={styles.feedbackBox} data-testid="verification-feedback">
                        <strong>AI Guidance:</strong> {evidence.feedback}
                      </div>
                    )}

                    {/* Action buttons inside card */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                      {evidence.verificationStatus === 'APPROVED' ? (
                        <AppButton
                          variant="primary"
                          leftIcon={<CheckCircle2 size={15} />}
                          loading={isCompleting}
                          onClick={handleApproveAndComplete}
                          data-testid="modal-approve-and-complete-btn"
                        >
                          Approve & Complete Session
                        </AppButton>
                      ) : (
                        <AppButton
                          variant="outline"
                          leftIcon={<RefreshCw size={15} />}
                          onClick={() => {
                            setEvidence(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          data-testid="modal-reupload-evidence-btn"
                        >
                          Submit New Proof
                        </AppButton>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className={styles.fileInputHidden}
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleFileSelect(e.target.files[0]);
                        }
                      }}
                      data-testid="modal-evidence-file-input"
                    />

                    <div
                      className={`${styles.evidenceUploadBox} ${isDragOver ? styles.evidenceDropzoneActive : ''}`}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={handleDrop}
                      data-testid="modal-evidence-dropzone"
                    >
                      <div className={styles.dropzoneIconWrapper}>
                        <Upload size={20} />
                      </div>
                      <p className={styles.dropzoneTitle}>Upload Study Proof / Notes</p>
                      <p className={styles.dropzoneSubtitle}>
                        Drag & drop or click to upload PDF notes, handwritten diagram photos, or problem solutions (up to 15MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selection Reason & Exam Context */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>Why this was scheduled</p>
            <div className={styles.reasonBox}>
              <p className={styles.reasonText} data-testid="modal-selection-reason">
                {slot.selectionReason ||
                  'Scheduled by AI Study Planner to ensure progressive mastery of syllabus topics before upcoming deadlines.'}
              </p>
              {slot.examDeadline && (
                <div className={styles.examBadge} data-testid="modal-exam-deadline">
                  <Sparkles size={13} />
                  <span>
                    {slot.examName || 'Upcoming Exam'} on {formatFullDate(slot.examDeadline)}
                    {slot.daysUntilExam !== undefined && slot.daysUntilExam !== null && (
                      <strong> ({slot.daysUntilExam} day{slot.daysUntilExam === 1 ? '' : 's'} away)</strong>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <AppButton variant="outline" onClick={onClose} data-testid="modal-close-btn">
            Close
          </AppButton>

          {isLocked ? (
            <AppButton
              variant="outline"
              leftIcon={<Lock size={16} />}
              disabled={true}
              data-testid="modal-toggle-status-btn"
            >
              Locked (Future)
            </AppButton>
          ) : isCompleted ? (
            <AppButton
              variant="outline"
              leftIcon={<Clock size={16} />}
              onClick={handleMarkIncomplete}
              data-testid="modal-toggle-status-btn"
            >
              Mark Incomplete
            </AppButton>
          ) : evidence?.verificationStatus === 'APPROVED' ? (
            <AppButton
              variant="primary"
              leftIcon={<CheckCircle2 size={16} />}
              loading={isCompleting}
              onClick={handleApproveAndComplete}
              data-testid="modal-toggle-status-btn"
            >
              Approve & Complete
            </AppButton>
          ) : (
            <AppButton
              variant="outline"
              leftIcon={<Upload size={16} />}
              onClick={() => fileInputRef.current?.click()}
              data-testid="modal-toggle-status-btn"
            >
              Submit Study Proof
            </AppButton>
          )}
        </div>
      </div>
    </div>
  );
};
