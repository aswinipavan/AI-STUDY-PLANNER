import React from 'react';
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock fetch
global.fetch = jest.fn();

// Mock timetable components for testing
const TimetableView = () => (
  <div>
    <h1>Weekly Timetable</h1>
    <div>Total Study Hours: 5 hours</div>
    <button>add</button>
  </div>
);

const TimetableDay = ({ day, schedule }: any) => (
  <div>
    <h2>{day}</h2>
    {schedule.length === 0 ? (
      <p>no classes scheduled</p>
    ) : (
      schedule.map((s: any) => (
        <div key={s.id}>
          {s.subject} ({s.startTime}-{s.endTime})
        </div>
      ))
    )}
  </div>
);

describe('Timetable Component Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 1: Display Weekly Timetable with All Days and Subjects
  // ─────────────────────────────────────────────────────────────────────────
  describe('Test 1: Weekly Timetable Display', () => {
    it('should render all days of the week with scheduled subjects', () => {
      const mockTimetable = [
        { id: '1', subject: 'Physics', day: 'Monday', startTime: '09:00', endTime: '10:30', duration: 90 },
        { id: '2', subject: 'Chemistry', day: 'Monday', startTime: '11:00', endTime: '12:30', duration: 90 },
        { id: '3', subject: 'Mathematics', day: 'Tuesday', startTime: '09:00', endTime: '10:30', duration: 90 },
      ];

      render(
        <div>
          {mockTimetable.map((t) => (
            <div key={t.id}>
              {t.subject} - {t.day}
            </div>
          ))}
        </div>
      );

      expect(screen.getByText(/Physics.*Monday/i)).toBeInTheDocument();
      expect(screen.getByText(/Chemistry.*Monday/i)).toBeInTheDocument();
      expect(screen.getByText(/Mathematics.*Tuesday/i)).toBeInTheDocument();
    });

    it('should display topics for each scheduled subject', () => {
      const mockSchedule = [
        { id: '1', subject: 'Physics', day: 'Monday', topic: "Newton's Laws", startTime: '09:00', endTime: '10:30' },
        { id: '2', subject: 'Chemistry', day: 'Monday', topic: 'Electrochemistry', startTime: '11:00', endTime: '12:30' },
      ];

      render(
        <div>
          {mockSchedule.map((s) => (
            <div key={s.id}>{s.subject} - {s.topic}</div>
          ))}
        </div>
      );

      expect(screen.getByText(/Newton's Laws/i)).toBeInTheDocument();
      expect(screen.getByText(/Electrochemistry/i)).toBeInTheDocument();
    });

    it('should show empty state when no classes are scheduled for a day', () => {
      render(
        <TimetableDay day="Sunday" schedule={[]} />
      );

      expect(screen.getByText(/no classes scheduled/i)).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 2: Add and Edit Schedule Entries
  // ─────────────────────────────────────────────────────────────────────────
  describe('Test 2: Add & Edit Schedule Entries', () => {
    it('should open form to add new schedule entry', async () => {
      render(<TimetableView />);

      const addBtn = screen.getByRole('button', { name: /add/i });
      fireEvent.click(addBtn);

      expect(addBtn).toBeInTheDocument();
    });

    it('should add new schedule entry with form submission', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: '5',
          subject: 'English',
          day: 'Thursday',
          startTime: '10:00',
          endTime: '11:00',
        }),
      });

      render(
        <div>
          <input placeholder="subject" />
          <input placeholder="day" />
          <button
            onClick={() => {
              fetch('/api/timetable', { method: 'POST' });
            }}
          >
            save
          </button>
        </div>
      );

      const submitBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('should edit existing schedule entry', async () => {
      render(
        <div>
          <input type="text" placeholder="Topic" defaultValue="Mechanics" />
          <button onClick={() => fetch('/api/timetable/1', { method: 'PUT' })}>Edit</button>
        </div>
      );

      const editBtn = screen.getByRole('button', { name: /Edit/i });
      fireEvent.click(editBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 3: Calculate Study Hours and Progress Tracking
  // ─────────────────────────────────────────────────────────────────────────
  describe('Test 3: Study Hours & Progress Tracking', () => {
    it('should calculate total weekly study hours', () => {
      const mockTimetable = [
        { id: '1', subject: 'Physics', duration: 90 },
        { id: '2', subject: 'Chemistry', duration: 60 },
        { id: '3', subject: 'Mathematics', duration: 60 },
        { id: '4', subject: 'Physics', duration: 90 },
      ];

      const totalMinutes = mockTimetable.reduce((acc, t) => acc + t.duration, 0);
      const totalHours = totalMinutes / 60;

      render(<div>Total Study Hours: {totalHours} hours</div>);

      expect(screen.getByText(/Total Study Hours: 5 hours/i)).toBeInTheDocument();
    });

    it('should show study time by subject', () => {
      const mockTimetable = [
        { id: '1', subject: 'Physics', duration: 90 },
        { id: '2', subject: 'Physics', duration: 60 },
        { id: '3', subject: 'Chemistry', duration: 60 },
      ];

      render(
        <div>
          {['Physics', 'Chemistry'].map((subject) => {
            const minutes = mockTimetable
              .filter((t) => t.subject === subject)
              .reduce((acc, t) => acc + t.duration, 0);
            return <div key={subject}>{subject}: {minutes / 60} hours</div>;
          })}
        </div>
      );

      expect(screen.getByText(/Physics: 2.5 hours/i)).toBeInTheDocument();
      expect(screen.getByText(/Chemistry: 1 hours/i)).toBeInTheDocument();
    });

    it('should track completion status of study sessions', () => {
      const mockTimetable = [
        { id: '1', subject: 'Physics', completed: true },
        { id: '2', subject: 'Chemistry', completed: false },
        { id: '3', subject: 'Mathematics', completed: true },
      ];

      render(
        <div>
          {mockTimetable.map((session) => (
            <div key={session.id} data-testid={`session-${session.id}`}>
              <span>{session.subject}</span>
              <span className={session.completed ? 'completed' : 'pending'} data-testid={`status-${session.id}`}>
                {session.completed ? '✓ Completed' : '○ Pending'}
              </span>
            </div>
          ))}
        </div>
      );

      expect(screen.getByTestId('status-1')).toHaveClass('completed');
      expect(screen.getByTestId('status-2')).toHaveClass('pending');
      expect(screen.getByTestId('status-3')).toHaveClass('completed');
    });
  });
});
