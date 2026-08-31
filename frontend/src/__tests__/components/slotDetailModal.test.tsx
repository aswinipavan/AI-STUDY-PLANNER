import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SlotDetailModal } from '@/components/timetable/SlotDetailModal';
import { TimetableSlot } from '@/types/api.types';

describe('SlotDetailModal Component', () => {
  const mockSlot: TimetableSlot = {
    id: 'slot-123',
    subject: {
      id: 'sub-1',
      name: 'Discrete Maths',
      color: '#00e5c0',
      icon: 'book',
      targetHours: 10,
      studentId: 'stud-1',
    },
    date: '2026-08-27',
    startTime: '18:00:00',
    endTime: '19:00:00',
    durationMinutes: 60,
    topic: 'Matrices - Determinant calculation',
    chapter: 'Matrices',
    materialTitle: 'Applied Mathematics Assignment.pdf',
    materialId: 'mat-1',
    whatToStudy: [
      '• Key definitions & terminology: determinant, 2x2, 3x3, rules',
      '• Chapter subtopics: Matrix representation, Determinant calculation',
      '• Core focus: Matrix fundamentals and determinants.',
      '• Work through practical examples and solved problems from Applied Mathematics Assignment.pdf',
    ],
    selectionReason: 'Progressive curriculum sequence from uploaded material: Applied Mathematics Assignment.pdf',
    examDeadline: '2026-09-10',
    examName: 'Final Exam',
    daysUntilExam: 14,
    difficulty: 'HARD',
    difficultyScore: 85,
    isCompleted: false,
    status: 'pending',
  };

  it('renders slot details correctly with topic, source material, chapter, and what to study', () => {
    const handleToggle = jest.fn();
    const handleClose = jest.fn();

    render(
      <SlotDetailModal
        slot={mockSlot}
        isOpen={true}
        onClose={handleClose}
        onToggleStatus={handleToggle}
      />
    );

    // Subject and date
    expect(screen.getByText('Discrete Maths')).toBeInTheDocument();
    expect(screen.getByText(/Thursday, August 27, 2026/i)).toBeInTheDocument();

    // Time range and duration
    expect(screen.getByText(/6:00 PM – 7:00 PM/i)).toBeInTheDocument();
    expect(screen.getByText('60m')).toBeInTheDocument();

    // Topic and Chapter
    expect(screen.getByTestId('modal-topic-title')).toHaveTextContent('Matrices - Determinant calculation');
    expect(screen.getByTestId('modal-chapter-name')).toHaveTextContent('Matrices');

    // Source Material & Difficulty
    expect(screen.getByTestId('modal-source-material')).toHaveTextContent('Applied Mathematics Assignment.pdf');
    expect(screen.getByTestId('modal-difficulty')).toHaveTextContent('HARD · 85/100');

    // What to Study bullets
    const studyList = screen.getByTestId('modal-what-to-study-list');
    expect(studyList).toHaveTextContent(/Key definitions & terminology/i);
    expect(studyList).toHaveTextContent(/Matrix representation, Determinant calculation/i);

    // Exam Relevance
    expect(screen.getByTestId('modal-exam-deadline')).toHaveTextContent(/Final Exam on Thursday, September 10, 2026/i);
    expect(screen.getByTestId('modal-exam-deadline')).toHaveTextContent(/14 days away/i);
  });

  it('handles completion toggle when clicking Mark Complete button', () => {
    const handleToggle = jest.fn();
    const handleClose = jest.fn();

    render(
      <SlotDetailModal
        slot={mockSlot}
        isOpen={true}
        onClose={handleClose}
        onToggleStatus={handleToggle}
      />
    );

    const toggleBtn = screen.getByTestId('modal-toggle-status-btn');
    expect(toggleBtn).toHaveTextContent('Mark Complete');
    fireEvent.click(toggleBtn);
    expect(handleToggle).toHaveBeenCalledWith('slot-123', 'completed');
  });

  it('renders catch-up required status for catch-up slot', () => {
    const catchUpSlot: TimetableSlot = {
      ...mockSlot,
      isCatchUp: true,
      notes: 'Rescheduled from 2026-08-27 (missed session caught up)',
      selectionReason: '🔴 Overdue Catch-up: Missed session from 2026-08-27 carried forward.',
    };

    render(
      <SlotDetailModal
        slot={catchUpSlot}
        isOpen={true}
        onClose={jest.fn()}
        onToggleStatus={jest.fn()}
      />
    );

    expect(screen.getByTestId('modal-status-badge')).toHaveTextContent('Catch-up Required');
    expect(screen.getByTestId('modal-selection-reason')).toHaveTextContent(/Overdue Catch-up/i);
  });

  it('renders future locked banner and disables completion toggle for future session', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2);
    const futureIso = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')}`;

    const futureSlot: TimetableSlot = {
      ...mockSlot,
      id: 'future-slot-1',
      date: futureIso,
      status: 'pending',
    };

    const handleToggle = jest.fn();

    render(
      <SlotDetailModal
        slot={futureSlot}
        isOpen={true}
        onClose={jest.fn()}
        onToggleStatus={handleToggle}
      />
    );

    expect(screen.getByTestId('modal-future-locked-banner')).toBeInTheDocument();
    expect(screen.getByText(/Future Session \(Locked\)/i)).toBeInTheDocument();
    expect(screen.getByText(/It will become available to complete on that day/i)).toBeInTheDocument();

    const toggleBtn = screen.getByTestId('modal-toggle-status-btn');
    expect(toggleBtn).toBeDisabled();
    expect(toggleBtn).toHaveTextContent(/Locked \(Future\)/i);

    fireEvent.click(toggleBtn);
    expect(handleToggle).not.toHaveBeenCalled();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <SlotDetailModal
        slot={mockSlot}
        isOpen={false}
        onClose={jest.fn()}
        onToggleStatus={jest.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
