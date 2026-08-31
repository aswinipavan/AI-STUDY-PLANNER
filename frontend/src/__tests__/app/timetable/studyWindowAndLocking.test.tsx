import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TimetablePage from '@/app/(dashboard)/timetable/page';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { useAuthStore } from '@/stores/authStore';
import { timetableApi } from '@/api/timetable.api';
import { authApi } from '@/api/auth.api';
import { calcStudyPeriod, WINDOW_START_LABELS } from '@/utils/studyPeriodUtils';
import { isFutureSlot, formatFutureAvailability, dayKey } from '@/utils/dateHelpers';

import { StudentProfile } from '@/types/api.types';

// Mocks
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
}));

jest.mock('@/api/timetable.api', () => ({
  timetableApi: {
    getActive: jest.fn(),
    updateSlotStatus: jest.fn(),
    adapt: jest.fn(),
  },
}));

jest.mock('@/api/auth.api', () => ({
  authApi: {
    getMe: jest.fn(),
    updateMe: jest.fn(),
  },
}));

jest.mock('@/hooks/useSoundPreference', () => ({
  useSoundPreference: () => ({
    play: jest.fn(),
  }),
}));

jest.mock('@/lib/confetti', () => ({
  fireCelebrationConfetti: jest.fn(),
}));

describe('Timetable Study Window Synchronization & Future Session Locking', () => {
  let queryClient: QueryClient;

  const today = new Date();
  const todayIso = dayKey(today);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = dayKey(tomorrow);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayIso = dayKey(yesterday);

  const mockUser: StudentProfile = {
    id: 'user-1',
    firebaseUid: 'mock-uid-1',
    name: 'Aswini Pavan',
    fullName: 'Aswini Pavan',
    email: 'aswini@example.com',
    preferredStudyTime: 'EVENING',
    availableHoursPerDay: 1,
    isPremium: false,
    createdAt: '2026-08-31T00:00:00Z',
  };

  const mockSlots = [
    {
      id: 'slot-today',
      subject: { id: 'sub-1', name: 'Applied Mathematics', color: '#00e5c0' },
      date: todayIso,
      dayOfWeek: 0,
      startTime: '17:00:00',
      endTime: '18:00:00',
      durationMinutes: 60,
      topic: 'Vector Calculus',
      status: 'pending' as const,
      isCompleted: false,
    },
    {
      id: 'slot-future',
      subject: { id: 'sub-2', name: 'Computer Networks', color: '#3b82f6' },
      date: tomorrowIso,
      dayOfWeek: 1,
      startTime: '17:00:00',
      endTime: '18:00:00',
      durationMinutes: 60,
      topic: 'TCP Handshake & Congestion',
      status: 'pending' as const,
      isCompleted: false,
    },
    {
      id: 'slot-past',
      subject: { id: 'sub-3', name: 'Database Systems', color: '#ec4899' },
      date: yesterdayIso,
      dayOfWeek: 6,
      startTime: '17:00:00',
      endTime: '18:00:00',
      durationMinutes: 60,
      topic: 'Indexing & B-Trees',
      status: 'pending' as const,
      isCompleted: false,
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    useAuthStore.setState({
      user: mockUser,
      isAuthenticated: true,
      isPremium: false,
    });
    (authApi.getMe as jest.Mock).mockResolvedValue(mockUser);
    (timetableApi.getActive as jest.Mock).mockResolvedValue({
      id: 'tt-1',
      weekStartDate: todayIso,
      isActive: true,
      slots: mockSlots,
    });
    (timetableApi.updateSlotStatus as jest.Mock).mockResolvedValue({
      id: 'slot-today',
      status: 'completed',
      isCompleted: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <TimetablePage />
        </ToastProvider>
      </QueryClientProvider>
    );

  describe('Issue 1: Dynamic Daily Study Window Calculation', () => {
    it('calculates study window correctly for 1h, 2h, 3h, 4h at 5:00 PM (EVENING)', () => {
      expect(calcStudyPeriod('EVENING', 1).label).toBe('5:00 PM – 6:00 PM');
      expect(calcStudyPeriod('EVENING', 2).label).toBe('5:00 PM – 7:00 PM');
      expect(calcStudyPeriod('EVENING', 3).label).toBe('5:00 PM – 8:00 PM');
      expect(calcStudyPeriod('EVENING', 4).label).toBe('5:00 PM – 9:00 PM');
    });

    it('calculates study window correctly for MORNING (6:00 AM) and AFTERNOON (12:00 PM)', () => {
      expect(calcStudyPeriod('MORNING', 2).label).toBe('6:00 AM – 8:00 AM');
      expect(calcStudyPeriod('AFTERNOON', 3).label).toBe('12:00 PM – 3:00 PM');
    });

    it('renders timetable study window banner dynamically based on student profile', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('study-window-banner')).toBeInTheDocument();
      });

      // 1 hour / day at EVENING (5:00 PM)
      expect(screen.getByTestId('study-window-range')).toHaveTextContent('5:00 PM – 6:00 PM');
      expect(screen.getByTestId('study-window-meta')).toHaveTextContent('5:00 PM start, 1h/day');
    });

    it('immediately updates timetable study window banner when student profile updates to 2h/day', async () => {
      const updatedUser: StudentProfile = {
        ...mockUser,
        preferredStudyTime: 'EVENING',
        availableHoursPerDay: 2,
      };

      (authApi.getMe as jest.Mock).mockResolvedValue(updatedUser);
      useAuthStore.setState({ user: updatedUser });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('study-window-range')).toHaveTextContent('5:00 PM – 7:00 PM');
      });
      expect(screen.getByTestId('study-window-meta')).toHaveTextContent('5:00 PM start, 2h/day');
    });
  });

  describe('Issue 2: Future Session Locking', () => {
    it('correctly categorizes past, today, and future dates', () => {
      expect(isFutureSlot(todayIso, today)).toBe(false);
      expect(isFutureSlot(yesterdayIso, today)).toBe(false);
      expect(isFutureSlot(tomorrowIso, today)).toBe(true);
      expect(formatFutureAvailability(tomorrowIso, today)).toBe('Available tomorrow');
    });

    it('renders lock indicator on future slot and disables quick toggle', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('slot-card-slot-future')).toBeInTheDocument();
      });

      // Future slot has lock badge
      expect(screen.getByTestId('future-badge-slot-future')).toBeInTheDocument();
      expect(screen.getByTestId('future-badge-slot-future')).toHaveTextContent(/Locked · Available tomorrow/i);

      // Future slot quick-toggle button is disabled
      const futureToggle = screen.getByTestId('quick-toggle-slot-future');
      expect(futureToggle).toBeDisabled();

      // Clicking future toggle does not call API
      fireEvent.click(futureToggle);
      expect(timetableApi.updateSlotStatus).not.toHaveBeenCalled();
    });

    it('allows completing today and past sessions', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('slot-card-slot-today')).toBeInTheDocument();
      });

      const todayToggle = screen.getByTestId('quick-toggle-slot-today');
      expect(todayToggle).not.toBeDisabled();

      fireEvent.click(todayToggle);
      await waitFor(() => {
        expect(timetableApi.updateSlotStatus).toHaveBeenCalledWith('slot-today', 'completed');
      });
    });
  });
});
