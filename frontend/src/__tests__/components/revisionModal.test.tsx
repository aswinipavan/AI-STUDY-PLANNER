import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RevisionModal } from '@/components/timetable/RevisionModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as useRevisionModule from '@/hooks/useRevision';

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

jest.mock('@/lib/firebase', () => ({
  auth: {},
  googleProvider: {},
}));

jest.mock('@/hooks/useRevision');

const mockRevisionData = {
  id: 'rev-uuid-1',
  slotId: 'slot-uuid-1',
  topic: 'Virtual Memory & Paging',
  chapter: 'Chapter 8',
  subjectName: 'Operating Systems',
  summary: 'Virtual memory allows programs to address more memory than is physically installed.',
  keyConcepts: ['Paging', 'Page Table', 'Demand Paging', 'TLB'],
  importantFormulas: [
    {
      name: 'Effective Access Time',
      formula: 'EAT = (1-p)m + p(s)',
      explanation: 'Calculates overall memory access latency with page fault probability p.',
    },
  ],
  quizQuestions: [
    {
      id: 1,
      question: 'What is the purpose of the Translation Lookaside Buffer (TLB)?',
      options: [
        'To cache page table translations and speed up memory access',
        'To store the entire hard disk cache',
        'To manage CPU instruction pipelining',
        'None of the above',
      ],
      correctOptionIndex: 0,
      explanation: 'The TLB caches recent virtual-to-physical address translations.',
    },
    {
      id: 2,
      question: 'What happens when a referenced page is not in physical RAM?',
      options: [
        'A page fault interrupt is generated',
        'The CPU halts permanently',
        'The process is immediately terminated',
        'Virtual memory is disabled',
      ],
      correctOptionIndex: 0,
      explanation: 'The operating system handles the page fault by swapping the required page into RAM.',
    },
  ],
  weakAreas: [
    'Confusing internal fragmentation with external fragmentation.',
    'Overlooking the overhead of two-level page tables.',
  ],
  quickRevisionPoints: [
    'Paging eliminates external fragmentation.',
    'TLB miss incurs an extra memory access to read the page table.',
  ],
  score: 0,
  isCompleted: false,
};

describe('RevisionModal Component Tests', () => {
  let queryClient: QueryClient;
  const mockMutate = jest.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    jest.clearAllMocks();

    (useRevisionModule.useSlotRevision as jest.Mock).mockReturnValue({
      data: mockRevisionData,
      isLoading: false,
      error: null,
    });

    (useRevisionModule.useCompleteRevision as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
  });

  const renderModal = (isOpen = true, onClose = jest.fn()) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <RevisionModal
          isOpen={isOpen}
          onClose={onClose}
          slotId="slot-uuid-1"
          topic="Virtual Memory & Paging"
          subjectName="Operating Systems"
        />
      </QueryClientProvider>
    );
  };

  test('does not render when isOpen is false', () => {
    renderModal(false);
    expect(screen.queryByTestId('revision-modal')).not.toBeInTheDocument();
  });

  test('renders concise summary, key concepts, and formulas in Summary tab', () => {
    renderModal(true);

    expect(screen.getByTestId('revision-modal')).toBeInTheDocument();
    expect(screen.getByText('AI Revision Mode')).toBeInTheDocument();
    expect(screen.getByTestId('revision-summary')).toHaveTextContent(
      'Virtual memory allows programs to address more memory'
    );
    expect(screen.getByText('Paging')).toBeInTheDocument();
    expect(screen.getByText('Effective Access Time')).toBeInTheDocument();
  });

  test('switches to Key Points & Traps tab and displays checklist and weak areas', () => {
    renderModal(true);

    fireEvent.click(screen.getByTestId('tab-points'));

    expect(screen.getByText('Quick Revision Checklist')).toBeInTheDocument();
    expect(
      screen.getByText('Paging eliminates external fragmentation.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Weak Areas & Common Pitfalls to Avoid')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Confusing internal fragmentation/i)
    ).toBeInTheDocument();
  });

  test('interactive 5-question quiz allows answering and displays instant explanation', async () => {
    renderModal(true);

    fireEvent.click(screen.getByTestId('tab-quiz'));

    expect(screen.getByTestId('quiz-card')).toBeInTheDocument();
    expect(
      screen.getByText('What is the purpose of the Translation Lookaside Buffer (TLB)?')
    ).toBeInTheDocument();

    // Select correct option 0
    fireEvent.click(screen.getByTestId('option-btn-0'));

    expect(screen.getByTestId('quiz-explanation')).toBeInTheDocument();
    expect(
      screen.getByText(/The TLB caches recent virtual-to-physical address translations/i)
    ).toBeInTheDocument();

    // Move to next question
    fireEvent.click(screen.getByTestId('btn-next-question'));

    expect(
      screen.getByText('What happens when a referenced page is not in physical RAM?')
    ).toBeInTheDocument();

    // Answer second question
    fireEvent.click(screen.getByTestId('option-btn-0'));

    // Move to scorecard
    fireEvent.click(screen.getByTestId('btn-next-question'));

    expect(screen.getByTestId('revision-scorecard')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  test('clicking Complete Revision invokes completeRevision mutation with calculated score', () => {
    renderModal(true);

    fireEvent.click(screen.getByTestId('tab-quiz'));
    fireEvent.click(screen.getByTestId('option-btn-0')); // Q1 correct
    fireEvent.click(screen.getByTestId('btn-next-question'));
    fireEvent.click(screen.getByTestId('option-btn-0')); // Q2 correct
    fireEvent.click(screen.getByTestId('btn-next-question')); // to scorecard

    fireEvent.click(screen.getByTestId('btn-finish-revision'));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        slotId: 'slot-uuid-1',
        payload: { score: 100 },
      }),
      expect.any(Object)
    );
  });

  test('calls onClose when close button is clicked', () => {
    const handleClose = jest.fn();
    renderModal(true, handleClose);

    fireEvent.click(screen.getByTestId('btn-close-revision'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
