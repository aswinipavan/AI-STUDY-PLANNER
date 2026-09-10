'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Clock,
  BookOpen,
  HelpCircle,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Award,
  Check,
} from 'lucide-react';
import styles from './revisionModal.module.css';
import { useSlotRevision, useCompleteRevision } from '@/hooks/useRevision';

interface RevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  slotId: string;
  topic?: string;
  subjectName?: string;
}

type TabType = 'summary' | 'points' | 'quiz' | 'scorecard';

export const RevisionModal: React.FC<RevisionModalProps> = ({
  isOpen,
  onClose,
  slotId,
  topic = 'Study Topic',
  subjectName = 'Subject',
}) => {
  const { data: revision, isLoading, error } = useSlotRevision(slotId, isOpen);
  const completeMutation = useCompleteRevision();

  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('summary');
      setCurrentQuizIndex(0);
      setSelectedAnswers({});
      setShowExplanation(false);
      setHasCompleted(Boolean(revision?.isCompleted));
    }
  }, [isOpen, revision?.isCompleted]);

  if (!isOpen) return null;

  const quizQuestions = revision?.quizQuestions || [];
  const currentQ = quizQuestions[currentQuizIndex];

  // Calculate score from answers
  const calculateScore = () => {
    if (!quizQuestions.length) return 0;
    let correct = 0;
    quizQuestions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctOptionIndex) {
        correct++;
      }
    });
    return Math.round((correct / quizQuestions.length) * 100);
  };

  const handleSelectOption = (optionIdx: number) => {
    if (selectedAnswers[currentQuizIndex] !== undefined) return;
    setSelectedAnswers(prev => ({ ...prev, [currentQuizIndex]: optionIdx }));
    setShowExplanation(true);
  };

  const handleNextQuiz = () => {
    setShowExplanation(false);
    if (currentQuizIndex < quizQuestions.length - 1) {
      setCurrentQuizIndex(prev => prev + 1);
    } else {
      setActiveTab('scorecard');
    }
  };

  const handleFinishRevision = () => {
    const score = calculateScore();
    completeMutation.mutate(
      {
        slotId,
        payload: { score },
      },
      {
        onSuccess: () => {
          setHasCompleted(true);
        },
      }
    );
  };

  const handleRetakeQuiz = () => {
    setSelectedAnswers({});
    setCurrentQuizIndex(0);
    setShowExplanation(false);
    setActiveTab('quiz');
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={styles.modal}
        onClick={e => e.stopPropagation()}
        data-testid="revision-modal"
      >
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.headerTitleRow}>
              <h2 className={styles.headerTitle}>
                <Sparkles className="w-5 h-5 text-indigo-400" />
                AI Revision Mode
              </h2>
              <span className={styles.timePill}>
                <Clock className="w-3.5 h-3.5" />
                5–15 min quick review
              </span>
            </div>
            <div className={styles.headerSubtitle}>
              <span>{subjectName}</span>
              <span>•</span>
              <span className="text-slate-300 font-medium">{topic}</span>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close revision modal"
            data-testid="btn-close-revision"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={styles.navTabs}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'summary' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('summary')}
            data-testid="tab-summary"
          >
            <BookOpen className="w-4 h-4" />
            Summary & Formulas
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'points' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('points')}
            data-testid="tab-points"
          >
            <AlertTriangle className="w-4 h-4" />
            Key Points & Traps
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'quiz' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('quiz')}
            data-testid="tab-quiz"
          >
            <HelpCircle className="w-4 h-4" />
            5-Question Quiz
          </button>
          {activeTab === 'scorecard' && (
            <button
              type="button"
              className={`${styles.tabBtn} ${styles.tabBtnActive}`}
              data-testid="tab-scorecard"
            >
              <Award className="w-4 h-4" />
              Scorecard
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className={styles.modalContent}>
          {isLoading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner} />
              <p>Synthesizing high-yield revision package with AI...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-950/40 border border-red-800 rounded-lg text-red-200">
              Failed to load revision content. Please try again.
            </div>
          ) : (
            <>
              {/* TAB 1: Summary & Formulas */}
              {activeTab === 'summary' && (
                <>
                  <div>
                    <h3 className={styles.sectionHeading}>
                      <BookOpen className="w-4 h-4 text-indigo-400" />
                      Concise Overview
                    </h3>
                    <div className={styles.summaryBox} data-testid="revision-summary">
                      {revision?.summary}
                    </div>
                  </div>

                  {revision?.keyConcepts && revision.keyConcepts.length > 0 && (
                    <div>
                      <h3 className={styles.sectionHeading}>Key Concepts</h3>
                      <div className={styles.conceptList}>
                        {revision.keyConcepts.map((c, i) => (
                          <span key={i} className={styles.conceptChip}>
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {revision?.importantFormulas && revision.importantFormulas.length > 0 && (
                    <div>
                      <h3 className={styles.sectionHeading}>Important Formulas & Rules</h3>
                      <div className={styles.formulaGrid}>
                        {revision.importantFormulas.map((f, i) => (
                          <div key={i} className={styles.formulaCard}>
                            <div className={styles.formulaName}>{f.name}</div>
                            <div className={styles.formulaMath}>{f.formula}</div>
                            <div className={styles.formulaExplanation}>{f.explanation}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* TAB 2: Key Points & Weak Areas */}
              {activeTab === 'points' && (
                <>
                  {revision?.quickRevisionPoints && revision.quickRevisionPoints.length > 0 && (
                    <div>
                      <h3 className={styles.sectionHeading}>
                        <Check className="w-4 h-4 text-emerald-400" />
                        Quick Revision Checklist
                      </h3>
                      <div className={styles.pointsList}>
                        {revision.quickRevisionPoints.map((p, i) => (
                          <div key={i} className={styles.pointItem}>
                            <span className="text-emerald-400 font-bold">•</span>
                            <span>{p}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {revision?.weakAreas && revision.weakAreas.length > 0 && (
                    <div className={styles.weakAreasCard}>
                      <div className={styles.weakAreasTitle}>
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        Weak Areas & Common Pitfalls to Avoid
                      </div>
                      <div>
                        {revision.weakAreas.map((w, i) => (
                          <div key={i} className={styles.weakAreaItem}>
                            {w}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* TAB 3: 5-Question Quiz */}
              {activeTab === 'quiz' && currentQ && (
                <div className={styles.quizCard} data-testid="quiz-card">
                  <div className={styles.quizProgressRow}>
                    <span>
                      Question {currentQuizIndex + 1} of {quizQuestions.length}
                    </span>
                    <span>
                      {selectedAnswers[currentQuizIndex] !== undefined
                        ? selectedAnswers[currentQuizIndex] === currentQ.correctOptionIndex
                          ? '✅ Correct'
                          : '❌ Incorrect'
                        : 'Select your answer'}
                    </span>
                  </div>
                  <div className={styles.quizProgressBar}>
                    <div
                      className={styles.quizProgressFill}
                      style={{
                        width: `${((currentQuizIndex + 1) / quizQuestions.length) * 100}%`,
                      }}
                    />
                  </div>

                  <div className={styles.questionText}>
                    {currentQ.question}
                  </div>

                  <div className={styles.optionsGrid}>
                    {currentQ.options.map((opt, optIdx) => {
                      const isSelected = selectedAnswers[currentQuizIndex] === optIdx;
                      const isAnswered = selectedAnswers[currentQuizIndex] !== undefined;
                      const isCorrect = optIdx === currentQ.correctOptionIndex;

                      let btnClass = styles.optionButton;
                      if (isAnswered) {
                        if (isCorrect) {
                          btnClass += ` ${styles.optionCorrect}`;
                        } else if (isSelected) {
                          btnClass += ` ${styles.optionIncorrect}`;
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          className={btnClass}
                          onClick={() => handleSelectOption(optIdx)}
                          disabled={isAnswered}
                          data-testid={`option-btn-${optIdx}`}
                        >
                          <span>{opt}</span>
                          {isAnswered && isCorrect && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>

                  {showExplanation && (
                    <div className={styles.explanationBox} data-testid="quiz-explanation">
                      <div className={styles.explanationTitle}>
                        {selectedAnswers[currentQuizIndex] === currentQ.correctOptionIndex
                          ? '🎉 Excellent reasoning!'
                          : '💡 Key Concept to Remember:'}
                      </div>
                      <div>{currentQ.explanation}</div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: Scorecard */}
              {activeTab === 'scorecard' && (
                <div className={styles.scorecardBox} data-testid="revision-scorecard">
                  <div className={styles.scoreBadge}>
                    {calculateScore()}%
                  </div>
                  <div className={styles.scoreTitle}>
                    {calculateScore() >= 80
                      ? '🌟 Outstanding Mastery!'
                      : calculateScore() >= 60
                      ? '🎯 Good Progress!'
                      : '📚 Keep Practicing!'}
                  </div>
                  <p className={styles.scoreDescription}>
                    You completed the 5-question AI revision on <strong>{topic}</strong>. Review your key takeaways or complete your revision session below.
                  </p>

                  <div className="flex gap-3 mt-4">
                    <button
                      type="button"
                      className={`${styles.navActionBtn} ${styles.secondaryBtn}`}
                      onClick={handleRetakeQuiz}
                    >
                      <RotateCcw className="w-4 h-4" />
                      Retake Quiz
                    </button>
                    <button
                      type="button"
                      className={`${styles.navActionBtn} ${styles.primaryBtn}`}
                      onClick={handleFinishRevision}
                      disabled={completeMutation.isPending || hasCompleted}
                      data-testid="btn-finish-revision"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {hasCompleted
                        ? '✅ Revision Completed'
                        : completeMutation.isPending
                        ? 'Saving...'
                        : 'Complete Revision'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Navigation Controls */}
        <div className={styles.modalFooter}>
          {activeTab === 'summary' && (
            <div className="flex justify-between w-full">
              <button
                type="button"
                className={`${styles.navActionBtn} ${styles.secondaryBtn}`}
                onClick={onClose}
              >
                Close
              </button>
              <button
                type="button"
                className={`${styles.navActionBtn} ${styles.primaryBtn}`}
                onClick={() => setActiveTab('points')}
                data-testid="btn-next-to-points"
              >
                Key Points & Traps
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeTab === 'points' && (
            <div className="flex justify-between w-full">
              <button
                type="button"
                className={`${styles.navActionBtn} ${styles.secondaryBtn}`}
                onClick={() => setActiveTab('summary')}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Summary
              </button>
              <button
                type="button"
                className={`${styles.navActionBtn} ${styles.primaryBtn}`}
                onClick={() => setActiveTab('quiz')}
                data-testid="btn-start-quiz"
              >
                Start 5-Question Quiz
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeTab === 'quiz' && (
            <div className="flex justify-between w-full">
              <button
                type="button"
                className={`${styles.navActionBtn} ${styles.secondaryBtn}`}
                onClick={() => setActiveTab('points')}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                className={`${styles.navActionBtn} ${styles.primaryBtn}`}
                onClick={handleNextQuiz}
                disabled={selectedAnswers[currentQuizIndex] === undefined}
                data-testid="btn-next-question"
              >
                {currentQuizIndex < quizQuestions.length - 1
                  ? 'Next Question'
                  : 'View Scorecard'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeTab === 'scorecard' && (
            <div className="flex justify-end w-full">
              <button
                type="button"
                className={`${styles.navActionBtn} ${styles.secondaryBtn}`}
                onClick={onClose}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
