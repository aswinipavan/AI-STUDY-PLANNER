import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SlotDetailModal } from '@/components/timetable/SlotDetailModal';
import { TimetableSlot, StudyEvidenceResponse } from '@/types/api.types';
import { evidenceApi } from '@/api/evidence.api';

jest.mock('@/api/evidence.api', () => ({
  evidenceApi: {
    uploadEvidence: jest.fn(),
    getLatestEvidence: jest.fn(),
    approveCompletion: jest.fn(),
  },
}));

describe('SlotDetailModal Evidence Verification Workflow', () => {
  const todayStr = new Date().toISOString().split('T')[0];

  const mockSlot: TimetableSlot = {
    id: 'slot-456',
    subject: {
      id: 'sub-2',
      name: 'Computer Networks',
      color: '#3b82f6',
      icon: 'network',
      targetHours: 8,
      studentId: 'stud-1',
    },
    date: todayStr,
    startTime: '17:00:00',
    endTime: '18:00:00',
    durationMinutes: 60,
    topic: 'TCP Handshake & Congestion Control',
    chapter: 'Transport Layer',
    materialTitle: 'Networks_Chapter3.pdf',
    materialId: 'mat-2',
    whatToStudy: [
      '• 3-way handshake SYN, SYN-ACK, ACK sequence',
      '• TCP Tahoe vs Reno congestion window dynamics',
    ],
    selectionReason: 'Critical networking core concept for upcoming midterms.',
    isCompleted: false,
    status: 'pending',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (evidenceApi.getLatestEvidence as jest.Mock).mockResolvedValue(null);
  });

  it('renders upload dropzone for an uncompleted session on today', async () => {
    render(
      <SlotDetailModal
        slot={mockSlot}
        isOpen={true}
        onClose={jest.fn()}
        onToggleStatus={jest.fn()}
      />
    );

    expect(screen.getByText('Study Proof & AI Verification')).toBeInTheDocument();
    expect(screen.getByTestId('modal-evidence-dropzone')).toBeInTheDocument();
    expect(screen.getByText('Upload Study Proof / Notes')).toBeInTheDocument();
    expect(screen.getByTestId('modal-toggle-status-btn')).toHaveTextContent('Submit Study Proof');
  });

  it('shows analyzing state during upload and renders APPROVED verification card with score and matched topics', async () => {
    const mockApprovedEvidence: StudyEvidenceResponse = {
      id: 'ev-1',
      slotId: 'slot-456',
      fileName: 'tcp_handshake_notes.pdf',
      fileUrl: 'http://storage/tcp.pdf',
      verificationStatus: 'APPROVED',
      score: 88,
      summary: 'Demonstrated complete 3-way handshake packet sequence and congestion window graphs.',
      matchedTopics: ['3-way handshake', 'Congestion Control', 'TCP Tahoe/Reno'],
      missingTopics: [],
      feedback: 'Excellent detailed worked examples and state diagrams.',
      confidence: 94,
      isUsedForCompletion: false,
    };

    (evidenceApi.uploadEvidence as jest.Mock).mockResolvedValue(mockApprovedEvidence);

    render(
      <SlotDetailModal
        slot={mockSlot}
        isOpen={true}
        onClose={jest.fn()}
        onToggleStatus={jest.fn()}
      />
    );

    const fileInput = screen.getByTestId('modal-evidence-file-input');
    const fakeFile = new File(['Dummy proof notes content for TCP'], 'tcp_handshake_notes.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(fileInput, { target: { files: [fakeFile] } });

    await waitFor(() => {
      expect(evidenceApi.uploadEvidence).toHaveBeenCalledWith('slot-456', fakeFile);
    });

    // Verification Result Card Assertions
    expect(await screen.findByTestId('evidence-verification-card')).toBeInTheDocument();
    expect(screen.getByTestId('verification-status-approved')).toHaveTextContent('APPROVED');
    expect(screen.getByTestId('verification-score-pill')).toHaveTextContent('88/100');
    expect(screen.getByTestId('verification-score-pill')).toHaveTextContent('94% confidence');
    expect(screen.getByTestId('verification-summary')).toHaveTextContent(/Demonstrated complete 3-way handshake/i);
    expect(screen.getByTestId('verification-matched-topics')).toHaveTextContent('3-way handshake');
    expect(screen.getByTestId('verification-feedback')).toHaveTextContent(/Excellent detailed worked examples/i);

    // Approve & Complete button is enabled
    expect(screen.getByTestId('modal-approve-and-complete-btn')).toBeInTheDocument();
    expect(screen.getByTestId('modal-toggle-status-btn')).toHaveTextContent('Approve & Complete');
  });

  it('triggers approveCompletion and notifies parent when clicking Approve & Complete Session', async () => {
    const mockApprovedEvidence: StudyEvidenceResponse = {
      id: 'ev-1',
      slotId: 'slot-456',
      fileName: 'tcp_notes.pdf',
      fileUrl: 'http://storage/tcp.pdf',
      verificationStatus: 'APPROVED',
      score: 90,
      summary: 'Verified mastery of transport layer.',
      matchedTopics: ['TCP Handshake'],
      missingTopics: [],
      feedback: 'Good work.',
      confidence: 95,
      isUsedForCompletion: false,
    };

    (evidenceApi.uploadEvidence as jest.Mock).mockResolvedValue(mockApprovedEvidence);
    (evidenceApi.approveCompletion as jest.Mock).mockResolvedValue({ ...mockSlot, isCompleted: true, status: 'completed' });

    const handleToggle = jest.fn();

    render(
      <SlotDetailModal
        slot={mockSlot}
        isOpen={true}
        onClose={jest.fn()}
        onToggleStatus={handleToggle}
      />
    );

    const fileInput = screen.getByTestId('modal-evidence-file-input');
    const fakeFile = new File(['content'], 'tcp_notes.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [fakeFile] } });

    const approveBtn = await screen.findByTestId('modal-approve-and-complete-btn');
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(evidenceApi.approveCompletion).toHaveBeenCalledWith('slot-456', 'ev-1');
      expect(handleToggle).toHaveBeenCalledWith('slot-456', 'completed');
    });
  });

  it('renders NEEDS MORE WORK status with missing topics and re-upload button when score is insufficient', async () => {
    const mockNeedsWorkEvidence: StudyEvidenceResponse = {
      id: 'ev-2',
      slotId: 'slot-456',
      fileName: 'incomplete_notes.txt',
      fileUrl: 'http://storage/incomplete.txt',
      verificationStatus: 'NEEDS_MORE_WORK',
      score: 48,
      summary: 'Evidence only mentions definitions without worked handshake stages.',
      matchedTopics: ['Basic TCP Definition'],
      missingTopics: ['3-way handshake', 'Congestion window graph'],
      feedback: 'Please include detailed packet sequence diagrams.',
      confidence: 82,
      isUsedForCompletion: false,
    };

    (evidenceApi.uploadEvidence as jest.Mock).mockResolvedValue(mockNeedsWorkEvidence);

    render(
      <SlotDetailModal
        slot={mockSlot}
        isOpen={true}
        onClose={jest.fn()}
        onToggleStatus={jest.fn()}
      />
    );

    const fileInput = screen.getByTestId('modal-evidence-file-input');
    const fakeFile = new File(['brief note'], 'incomplete_notes.txt', { type: 'text/plain' });
    fireEvent.change(fileInput, { target: { files: [fakeFile] } });

    expect(await screen.findByTestId('verification-status-needs-work')).toHaveTextContent('NEEDS MORE WORK');
    expect(screen.getByTestId('verification-score-pill')).toHaveTextContent('48/100');
    expect(screen.getByTestId('verification-missing-topics')).toHaveTextContent('3-way handshake');
    expect(screen.getByTestId('modal-reupload-evidence-btn')).toHaveTextContent('Submit New Proof');

    // Clicking Submit New Proof resets to dropzone
    fireEvent.click(screen.getByTestId('modal-reupload-evidence-btn'));
    expect(screen.getByTestId('modal-evidence-dropzone')).toBeInTheDocument();
  });

  it('renders verified completed card when session is already completed', () => {
    const completedSlot: TimetableSlot = {
      ...mockSlot,
      isCompleted: true,
      status: 'completed',
      hasEvidence: true,
      evidenceStatus: 'APPROVED',
      evidenceScore: 92,
    };

    render(
      <SlotDetailModal
        slot={completedSlot}
        isOpen={true}
        onClose={jest.fn()}
        onToggleStatus={jest.fn()}
      />
    );

    expect(screen.getByTestId('modal-verified-completed')).toBeInTheDocument();
    expect(screen.getByText(/Verified & Completed/i)).toBeInTheDocument();
    expect(screen.getByText(/Verified Score: 92\/100/i)).toBeInTheDocument();
    expect(screen.getByTestId('modal-toggle-status-btn')).toHaveTextContent('Mark Incomplete');
  });

  it('renders locked notice when session is in the future', () => {
    const futureSlot: TimetableSlot = {
      ...mockSlot,
      date: '2099-12-31',
    };

    render(
      <SlotDetailModal
        slot={futureSlot}
        isOpen={true}
        onClose={jest.fn()}
        onToggleStatus={jest.fn()}
      />
    );

    expect(screen.getByTestId('modal-evidence-locked')).toBeInTheDocument();
    expect(screen.getByText(/Proof submission will unlock on the scheduled study date/i)).toBeInTheDocument();
    expect(screen.getByTestId('modal-toggle-status-btn')).toHaveTextContent('Locked (Future)');
    expect(screen.getByTestId('modal-toggle-status-btn')).toBeDisabled();
  });
});
