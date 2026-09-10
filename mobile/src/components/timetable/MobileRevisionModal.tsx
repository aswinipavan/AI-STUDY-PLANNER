import React, {useState, useEffect, useCallback} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {COLORS} from '@/constants/colors';
import {SPACING, RADIUS} from '@/constants/theme';
import {getSlotRevision, completeSlotRevision} from '@/api/revision.api';
import type {SlotRevisionResponse} from '@/types/revision.types';

interface MobileRevisionModalProps {
  slotId: string | null;
  topic: string | null;
  subjectName: string;
  isOpen: boolean;
  onClose: () => void;
  onRevisionCompleted?: (revision: SlotRevisionResponse) => void;
}

type TabType = 'summary' | 'traps' | 'quiz' | 'scorecard';

export function MobileRevisionModal({
  slotId,
  topic,
  subjectName,
  isOpen,
  onClose,
  onRevisionCompleted,
}: MobileRevisionModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [revision, setRevision] = useState<SlotRevisionResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Quiz state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [savedScore, setSavedScore] = useState<number | null>(null);

  const fetchRevision = useCallback(async () => {
    if (!slotId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSlotRevision(slotId);
      setRevision(data);
      if (data.isCompleted && data.score !== undefined && data.score !== null) {
        setIsCompleted(true);
        setSavedScore(data.score);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load AI revision experience');
    } finally {
      setIsLoading(false);
    }
  }, [slotId]);

  useEffect(() => {
    if (isOpen && slotId) {
      setActiveTab('summary');
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      fetchRevision();
    }
  }, [isOpen, slotId, fetchRevision]);

  if (!isOpen || !slotId) return null;

  const quizQuestions = revision?.quizQuestions || [];
  const currentQuestion = quizQuestions[currentQuestionIndex];

  // Calculate score
  const correctCount = quizQuestions.reduce((acc, q, idx) => {
    return userAnswers[idx] === q.correctOptionIndex ? acc + 1 : acc;
  }, 0);
  const scorePercentage = quizQuestions.length > 0
    ? Math.round((correctCount / quizQuestions.length) * 100)
    : 0;

  const handleSelectOption = (optionIndex: number) => {
    if (userAnswers[currentQuestionIndex] !== undefined) return; // Answered already
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: optionIndex,
    }));
  };

  const handleCompleteRevision = async () => {
    if (!slotId) return;
    setIsSubmitting(true);
    try {
      const answersList = quizQuestions.map((_, idx) => userAnswers[idx] ?? -1);
      const res = await completeSlotRevision(slotId, {
        score: scorePercentage,
        answers: answersList,
      });
      setIsCompleted(true);
      setSavedScore(scorePercentage);
      if (onRevisionCompleted) {
        onRevisionCompleted(res);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to record revision completion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestartQuiz = () => {
    setUserAnswers({});
    setCurrentQuestionIndex(0);
    setActiveTab('quiz');
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleBlock}>
              <View style={styles.badgeRow}>
                <View style={styles.aiBadge}>
                  <Text style={styles.aiBadgeText}>✨ AI REVISION MODE</Text>
                </View>
                <View style={styles.subjectBadge}>
                  <Text style={styles.subjectBadgeText}>{subjectName}</Text>
                </View>
              </View>
              <Text style={styles.topicText} numberOfLines={1}>
                {topic || 'Session Topic Review'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
              accessibilityLabel="Close revision modal"
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Navigation Tab Bar */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'summary' && styles.tabBtnActive]}
              onPress={() => setActiveTab('summary')}
            >
              <Text style={[styles.tabBtnText, activeTab === 'summary' && styles.tabBtnTextActive]}>
                Summary
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'traps' && styles.tabBtnActive]}
              onPress={() => setActiveTab('traps')}
            >
              <Text style={[styles.tabBtnText, activeTab === 'traps' && styles.tabBtnTextActive]}>
                Key Points
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'quiz' && styles.tabBtnActive]}
              onPress={() => setActiveTab('quiz')}
            >
              <Text style={[styles.tabBtnText, activeTab === 'quiz' && styles.tabBtnTextActive]}>
                Quiz ({quizQuestions.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'scorecard' && styles.tabBtnActive]}
              onPress={() => setActiveTab('scorecard')}
            >
              <Text style={[styles.tabBtnText, activeTab === 'scorecard' && styles.tabBtnTextActive]}>
                Scorecard
              </Text>
            </TouchableOpacity>
          </View>

          {/* Body Content */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.PRIMARY_LIGHT} />
              <Text style={styles.loadingText}>Generating AI Revision Experience…</Text>
              <Text style={styles.loadingSubtext}>Synthesizing key formulas, traps, and 5 quiz questions</Text>
            </View>
          ) : error && !revision ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
              <TouchableOpacity onPress={fetchRevision} style={styles.retryBtn}>
                <Text style={styles.retryBtnText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : revision ? (
            <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent}>
              {/* TAB 1: SUMMARY & FORMULAS */}
              {activeTab === 'summary' && (
                <View style={styles.sectionGap}>
                  {/* Concise Summary */}
                  <View style={styles.card}>
                    <Text style={styles.cardHeaderTitle}>📖 CONCISE SUMMARY</Text>
                    <Text style={styles.summaryProse}>{revision.summary}</Text>
                  </View>

                  {/* Key Concepts */}
                  {revision.keyConcepts && revision.keyConcepts.length > 0 && (
                    <View style={styles.card}>
                      <Text style={styles.cardHeaderTitle}>💡 CORE CONCEPTS</Text>
                      <View style={styles.chipsWrap}>
                        {revision.keyConcepts.map((concept, idx) => (
                          <View key={idx} style={styles.conceptChip}>
                            <Text style={styles.conceptChipText}>{concept}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Important Formulas */}
                  {revision.importantFormulas && revision.importantFormulas.length > 0 && (
                    <View style={styles.card}>
                      <Text style={styles.cardHeaderTitle}>📐 IMPORTANT FORMULAS</Text>
                      <View style={styles.formulasList}>
                        {revision.importantFormulas.map((f, idx) => (
                          <View key={idx} style={styles.formulaItem}>
                            <Text style={styles.formulaTitle}>{f.title}</Text>
                            <View style={styles.formulaBox}>
                              <Text style={styles.formulaCode}>{f.formula}</Text>
                            </View>
                            {f.description && (
                              <Text style={styles.formulaDesc}>{f.description}</Text>
                            )}
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.primaryNextBtn}
                    onPress={() => setActiveTab('traps')}
                  >
                    <Text style={styles.primaryNextBtnText}>Next: Key Points & Traps ➔</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* TAB 2: KEY POINTS & WEAK AREAS */}
              {activeTab === 'traps' && (
                <View style={styles.sectionGap}>
                  {/* Quick Revision Points */}
                  {revision.quickRevisionPoints && revision.quickRevisionPoints.length > 0 && (
                    <View style={styles.card}>
                      <Text style={styles.cardHeaderTitle}>⚡ QUICK REVISION POINTS</Text>
                      {revision.quickRevisionPoints.map((point, idx) => (
                        <View key={idx} style={styles.pointRow}>
                          <Text style={styles.pointDot}>✓</Text>
                          <Text style={styles.pointText}>{point}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Weak Areas & Traps */}
                  {revision.weakAreas && revision.weakAreas.length > 0 && (
                    <View style={[styles.card, styles.weakAreasCard]}>
                      <Text style={[styles.cardHeaderTitle, styles.weakAreasTitle]}>
                        ⚠️ COMMON EXAM TRAPS & WEAK AREAS
                      </Text>
                      {revision.weakAreas.map((area, idx) => (
                        <View key={idx} style={styles.trapRow}>
                          <Text style={styles.trapDot}>!</Text>
                          <Text style={styles.trapText}>{area}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.primaryNextBtn}
                    onPress={() => setActiveTab('quiz')}
                  >
                    <Text style={styles.primaryNextBtnText}>
                      Start 5-Question Quiz ➔
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* TAB 3: 5-QUESTION QUIZ */}
              {activeTab === 'quiz' && currentQuestion && (
                <View style={styles.sectionGap}>
                  {/* Question Header & Progress Bar */}
                  <View style={styles.quizHeader}>
                    <Text style={styles.quizProgressText}>
                      Question {currentQuestionIndex + 1} of {quizQuestions.length}
                    </Text>
                    <View style={styles.progressDotsRow}>
                      {quizQuestions.map((_, idx) => {
                        const isAnswered = userAnswers[idx] !== undefined;
                        const isCurrent = idx === currentQuestionIndex;
                        const isCorrect = isAnswered && userAnswers[idx] === quizQuestions[idx].correctOptionIndex;
                        return (
                          <View
                            key={idx}
                            style={[
                              styles.progressDot,
                              isCurrent && styles.progressDotCurrent,
                              isAnswered && (isCorrect ? styles.progressDotCorrect : styles.progressDotIncorrect),
                            ]}
                          />
                        );
                      })}
                    </View>
                  </View>

                  {/* Question Card */}
                  <View style={styles.questionCard}>
                    <Text style={styles.questionText}>
                      {currentQuestion.id}. {currentQuestion.question}
                    </Text>
                  </View>

                  {/* MCQ Options */}
                  <View style={styles.optionsList}>
                    {currentQuestion.options.map((option, optIdx) => {
                      const selectedOpt = userAnswers[currentQuestionIndex];
                      const isSelected = selectedOpt === optIdx;
                      const isCorrect = optIdx === currentQuestion.correctOptionIndex;
                      const hasAnswered = selectedOpt !== undefined;

                      const isOptionCorrect = hasAnswered && isCorrect;
                      const isOptionIncorrect = hasAnswered && isSelected && !isCorrect;

                      return (
                        <TouchableOpacity
                          key={optIdx}
                          style={[
                            styles.optionBtn,
                            isOptionCorrect && styles.optionCorrect,
                            isOptionIncorrect && styles.optionIncorrect,
                          ]}
                          disabled={hasAnswered}
                          onPress={() => handleSelectOption(optIdx)}
                        >
                          <View style={styles.optionIndexBadge}>
                            <Text style={styles.optionIndexText}>
                              {String.fromCharCode(65 + optIdx)}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.optionBtnText,
                              isOptionCorrect && styles.optionCorrectText,
                              isOptionIncorrect && styles.optionIncorrectText,
                            ]}
                          >
                            {option}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Instant Explanation Box */}
                  {userAnswers[currentQuestionIndex] !== undefined && (
                    <View style={styles.explanationBox}>
                      <Text style={styles.explanationTitle}>
                        {userAnswers[currentQuestionIndex] === currentQuestion.correctOptionIndex
                          ? '🎉 Correct!'
                          : '💡 Explanation'}
                      </Text>
                      <Text style={styles.explanationText}>
                        {currentQuestion.explanation}
                      </Text>
                    </View>
                  )}

                  {/* Question Navigation Controls */}
                  <View style={styles.quizNavRow}>
                    <TouchableOpacity
                      style={[styles.quizNavBtn, currentQuestionIndex === 0 && styles.quizNavBtnDisabled]}
                      disabled={currentQuestionIndex === 0}
                      onPress={() => setCurrentQuestionIndex((prev) => prev - 1)}
                    >
                      <Text style={styles.quizNavBtnText}>← Previous</Text>
                    </TouchableOpacity>

                    {currentQuestionIndex < quizQuestions.length - 1 ? (
                      <TouchableOpacity
                        style={styles.quizNavBtnPrimary}
                        onPress={() => setCurrentQuestionIndex((prev) => prev + 1)}
                      >
                        <Text style={styles.quizNavBtnPrimaryText}>Next Question →</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.quizNavBtnPrimary}
                        onPress={() => setActiveTab('scorecard')}
                      >
                        <Text style={styles.quizNavBtnPrimaryText}>View Scorecard ➔</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* TAB 4: SCORECARD & COMPLETION */}
              {activeTab === 'scorecard' && (
                <View style={styles.sectionGap}>
                  <View style={styles.scorecardHero}>
                    <Text style={styles.scorecardTrophy}>
                      {scorePercentage >= 80 ? '🏆' : scorePercentage >= 60 ? '🎯' : '📚'}
                    </Text>
                    <Text style={styles.scorecardTitle}>Revision Scorecard</Text>
                    <Text style={styles.scorecardSubtitle}>
                      {scorePercentage >= 80
                        ? 'Mastery Achieved! Outstanding understanding.'
                        : scorePercentage >= 60
                        ? 'Solid Performance! Ready for the exam.'
                        : 'Good Effort! Consider reviewing key formulas.'}
                    </Text>

                    <View style={styles.scoreCircle}>
                      <Text style={styles.scoreCircleText}>{scorePercentage}%</Text>
                      <Text style={styles.scoreCircleSubtext}>
                        {correctCount} of {quizQuestions.length} correct
                      </Text>
                    </View>
                  </View>

                  {/* Score breakdown list */}
                  <View style={styles.card}>
                    <Text style={styles.cardHeaderTitle}>QUESTION BREAKDOWN</Text>
                    {quizQuestions.map((q, idx) => {
                      const userAns = userAnswers[idx];
                      const isCorrect = userAns === q.correctOptionIndex;
                      return (
                        <View key={idx} style={styles.breakdownRow}>
                          <Text style={[styles.breakdownIcon, isCorrect ? styles.iconCorrect : styles.iconIncorrect]}>
                            {isCorrect ? '✓' : '✕'}
                          </Text>
                          <Text style={styles.breakdownQuestionText} numberOfLines={1}>
                            Q{idx + 1}: {q.question}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Actions */}
                  <View style={styles.scorecardActions}>
                    <TouchableOpacity
                      style={styles.restartBtn}
                      onPress={handleRestartQuiz}
                    >
                      <Text style={styles.restartBtnText}>Retake Quiz</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.completeBtn, isCompleted && styles.completeBtnDone]}
                      disabled={isSubmitting}
                      onPress={handleCompleteRevision}
                    >
                      <Text style={styles.completeBtnText}>
                        {isSubmitting
                          ? 'Saving…'
                          : isCompleted
                          ? '✓ Revision Completed'
                          : 'Complete Revision'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          ) : null}

          {/* Modal Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.closeFooterBtn}>
              <Text style={styles.closeFooterBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.BG_SURFACE,
    borderTopLeftRadius: RADIUS.LG,
    borderTopRightRadius: RADIUS.LG,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BG_BORDER,
  },
  headerTitleBlock: {
    flex: 1,
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiBadge: {
    backgroundColor: 'rgba(108,99,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.4)',
    borderRadius: RADIUS.FULL,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 2,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.PRIMARY_LIGHT,
    letterSpacing: 0.5,
  },
  subjectBadge: {
    backgroundColor: 'rgba(0,212,170,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.3)',
    borderRadius: RADIUS.FULL,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 2,
  },
  subjectBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.SECONDARY,
    textTransform: 'uppercase',
  },
  topicText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  closeBtn: {
    padding: SPACING.XS,
  },
  closeBtnText: {
    fontSize: 18,
    color: COLORS.TEXT_MUTED,
    fontWeight: '700',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.BG_ELEVATED,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BG_BORDER,
    paddingHorizontal: SPACING.SM,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: SPACING.SM + 2,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: COLORS.PRIMARY,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.TEXT_MUTED,
  },
  tabBtnTextActive: {
    color: COLORS.PRIMARY_LIGHT,
    fontWeight: '800',
  },
  loadingContainer: {
    padding: SPACING.XL * 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.MD,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  loadingSubtext: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    textAlign: 'center',
  },
  errorContainer: {
    padding: SPACING.XL,
    alignItems: 'center',
    gap: SPACING.MD,
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444',
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
    borderRadius: RADIUS.SM,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  scrollBody: {
    maxHeight: 500,
  },
  scrollContent: {
    padding: SPACING.MD,
  },
  sectionGap: {
    gap: SPACING.MD,
  },
  card: {
    backgroundColor: COLORS.BG_ELEVATED,
    borderRadius: RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
    padding: SPACING.MD,
    gap: SPACING.SM,
  },
  cardHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: COLORS.TEXT_MUTED,
  },
  summaryProse: {
    fontSize: 13,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 20,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  conceptChip: {
    backgroundColor: 'rgba(108,99,255,0.15)',
    borderColor: 'rgba(108,99,255,0.3)',
    borderWidth: 1,
    borderRadius: RADIUS.FULL,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 3,
  },
  conceptChipText: {
    fontSize: 11,
    color: COLORS.PRIMARY_LIGHT,
    fontWeight: '600',
  },
  formulasList: {
    gap: SPACING.SM,
  },
  formulaItem: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: RADIUS.SM,
    padding: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
    gap: 4,
  },
  formulaTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  formulaBox: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: SPACING.SM,
    borderRadius: RADIUS.SM,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.SECONDARY,
  },
  formulaCode: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: COLORS.SECONDARY,
    fontWeight: '700',
  },
  formulaDesc: {
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
  },
  primaryNextBtn: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.MD,
    borderRadius: RADIUS.MD,
    alignItems: 'center',
    marginTop: SPACING.SM,
  },
  primaryNextBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 2,
  },
  pointDot: {
    color: '#10b981',
    fontWeight: '800',
    fontSize: 13,
  },
  pointText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 18,
  },
  weakAreasCard: {
    backgroundColor: 'rgba(239,68,68,0.05)',
    borderColor: 'rgba(239,68,68,0.2)',
  },
  weakAreasTitle: {
    color: '#ef4444',
  },
  trapRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 2,
  },
  trapDot: {
    color: '#ef4444',
    fontWeight: '800',
    fontSize: 13,
  },
  trapText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 18,
  },
  quizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quizProgressText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.TEXT_MUTED,
  },
  progressDotsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  progressDotCurrent: {
    backgroundColor: COLORS.PRIMARY_LIGHT,
    transform: [{scale: 1.2}],
  },
  progressDotCorrect: {
    backgroundColor: '#10b981',
  },
  progressDotIncorrect: {
    backgroundColor: '#ef4444',
  },
  questionCard: {
    backgroundColor: COLORS.BG_ELEVATED,
    borderRadius: RADIUS.MD,
    padding: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
  },
  questionText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 20,
  },
  optionsList: {
    gap: SPACING.SM,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BG_ELEVATED,
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
    borderRadius: RADIUS.SM,
    padding: SPACING.SM + 2,
    gap: SPACING.SM,
  },
  optionBtnText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.TEXT_PRIMARY,
  },
  optionCorrect: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderColor: 'rgba(16,185,129,0.4)',
  },
  optionCorrectText: {
    color: '#10b981',
    fontWeight: '700',
  },
  optionIncorrect: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderColor: 'rgba(239,68,68,0.4)',
  },
  optionIncorrectText: {
    color: '#ef4444',
    fontWeight: '700',
  },
  optionIndexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIndexText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.TEXT_SECONDARY,
  },
  explanationBox: {
    backgroundColor: 'rgba(108,99,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.25)',
    borderRadius: RADIUS.SM,
    padding: SPACING.SM + 2,
    gap: 4,
  },
  explanationTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.PRIMARY_LIGHT,
  },
  explanationText: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 18,
  },
  quizNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.SM,
    marginTop: SPACING.XS,
  },
  quizNavBtn: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: RADIUS.SM,
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
  },
  quizNavBtnDisabled: {
    opacity: 0.4,
  },
  quizNavBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
  },
  quizNavBtnPrimary: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
    borderRadius: RADIUS.SM,
  },
  quizNavBtnPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  scorecardHero: {
    alignItems: 'center',
    backgroundColor: COLORS.BG_ELEVATED,
    borderRadius: RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
    padding: SPACING.LG,
    gap: 6,
  },
  scorecardTrophy: {
    fontSize: 36,
  },
  scorecardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.TEXT_PRIMARY,
  },
  scorecardSubtitle: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    textAlign: 'center',
  },
  scoreCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,212,170,0.1)',
    borderWidth: 2,
    borderColor: COLORS.SECONDARY,
    borderRadius: RADIUS.FULL,
    width: 100,
    height: 100,
    marginTop: SPACING.SM,
  },
  scoreCircleText: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.SECONDARY,
  },
  scoreCircleSubtext: {
    fontSize: 10,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  breakdownIcon: {
    fontSize: 14,
    fontWeight: '800',
    width: 16,
  },
  iconCorrect: {
    color: '#10b981',
  },
  iconIncorrect: {
    color: '#ef4444',
  },
  breakdownQuestionText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.TEXT_PRIMARY,
  },
  scorecardActions: {
    flexDirection: 'row',
    gap: SPACING.SM,
  },
  restartBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
    paddingVertical: SPACING.MD,
    borderRadius: RADIUS.MD,
    alignItems: 'center',
  },
  restartBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.TEXT_SECONDARY,
  },
  completeBtn: {
    flex: 1,
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.MD,
    borderRadius: RADIUS.MD,
    alignItems: 'center',
  },
  completeBtnDone: {
    backgroundColor: '#10b981',
  },
  completeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BG_BORDER,
  },
  closeFooterBtn: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: RADIUS.SM,
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
  },
  closeFooterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
  },
});
