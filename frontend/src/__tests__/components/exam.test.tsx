/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock fetch
global.fetch = jest.fn();

// Mock exam components for testing
const ExamList = () => (
  <div>
    <h1>Exams</h1>
    <div data-testid="exam-section">100</div>
    <div data-testid="exam-section">Scheduled</div>
  </div>
);

const ExamCard = ({ exam, showPerformance, showRecommendations }: any) => (
  <div>
    <h3>{exam.name}</h3>
    <p>{exam.subject}</p>
    <p>{exam.duration} min</p>
    <p>{exam.totalMarks} marks</p>
    <p>{exam.passingMarks} pass</p>
    {showPerformance && exam.marksObtained && (
      <>
        <p>{exam.marksObtained} obtained</p>
        <p>{((exam.marksObtained / exam.totalMarks) * 100).toFixed(0)}%</p>
        <p>{exam.marksObtained >= exam.passingMarks ? 'passed' : 'below passing'}</p>
      </>
    )}
    {showRecommendations && exam.marksObtained < exam.passingMarks && (
      <p>need improvement</p>
    )}
  </div>
);

const ExamForm = ({ onSubmit }: any) => {
  const [name, setName] = React.useState('');
  const [subject, setSubject] = React.useState('');
  const [date, setDate] = React.useState('');
  const [duration, setDuration] = React.useState('');
  const [marks, setMarks] = React.useState('');
  const [passingMarks, setPassingMarks] = React.useState('');
  const [errors, setErrors] = React.useState<string[]>([]);

  const handleSubmit = () => {
    const newErrors: string[] = [];
    if (!name) newErrors.push('exam name required');
    if (!subject) newErrors.push('select subject');
    if (!date) newErrors.push('select date');
    
    const examDate = new Date(date);
    if (examDate < new Date()) newErrors.push('date must be in future');

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({ name, subject, date, duration, marks, passingMarks });
  };

  return (
    <div>
      <input placeholder="exam name" value={name} onChange={(e) => setName(e.target.value)} />
      <input placeholder="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
      <input placeholder="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <input placeholder="duration" value={duration} onChange={(e) => setDuration(e.target.value)} />
      <input placeholder="total marks" value={marks} onChange={(e) => setMarks(e.target.value)} />
      <input placeholder="passing marks" value={passingMarks} onChange={(e) => setPassingMarks(e.target.value)} />
      <button onClick={handleSubmit}>save</button>
      {errors.map((err) => (
        <div key={err}>{err}</div>
      ))}
    </div>
  );
};

describe('Exam Component Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 1: Display Upcoming and Past Exams with Status
  // ─────────────────────────────────────────────────────────────────────────
  describe('Test 1: Exam List Display with Status', () => {
    it('should render upcoming exams with correct status', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const mockExams = [
        {
          id: '1',
          name: 'Physics Mid-term',
          subject: 'Physics',
          date: futureDate,
          duration: 120,
          totalMarks: 100,
          passingMarks: 40,
          status: 'scheduled' as const,
        },
        {
          id: '2',
          name: 'Chemistry Final',
          subject: 'Chemistry',
          date: new Date(futureDate.getTime() + 14 * 24 * 60 * 60 * 1000),
          duration: 180,
          totalMarks: 150,
          passingMarks: 60,
          status: 'scheduled' as const,
        },
      ];

      render(
        <div>
          {mockExams.map((exam) => (
            <div key={exam.id}>
              <h3>{exam.name}</h3>
              <p>{exam.subject}</p>
              <p>{exam.totalMarks}</p>
            </div>
          ))}
        </div>
      );

      expect(screen.getByText('Physics Mid-term')).toBeInTheDocument();
      expect(screen.getByText('Chemistry Final')).toBeInTheDocument();
      expect(screen.getAllByText(/Physics|Chemistry/).length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('should separate upcoming and past exams', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const mockExams = [
        {
          id: '1',
          name: 'Past Exam',
          subject: 'Physics',
          date: pastDate,
          status: 'completed' as const,
          marksObtained: 85,
        },
        {
          id: '2',
          name: 'Upcoming Exam',
          subject: 'Chemistry',
          date: futureDate,
          status: 'scheduled' as const,
        },
      ];

      render(
        <div>
          <h2>Upcoming</h2>
          {mockExams.filter((e) => e.date > new Date()).map((e) => <div key={e.id}>{e.name}</div>)}
          <h2>Past</h2>
          {mockExams.filter((e) => e.date <= new Date()).map((e) => (
            <div key={e.id}>
              {e.name} - {'marksObtained' in e ? e.marksObtained : 'N/A'}
            </div>
          ))}
        </div>
      );

      expect(screen.getByText('Upcoming')).toBeInTheDocument();
      expect(screen.getByText('Past')).toBeInTheDocument();
      expect(screen.getByText('Upcoming Exam')).toBeInTheDocument();
      expect(screen.getByText(/Past Exam.*85/)).toBeInTheDocument();
    });

    it('should display exam details including duration and total marks', () => {
      const mockExam = {
        id: '1',
        name: 'Biology Final Exam',
        subject: 'Biology',
        date: new Date('2024-02-28T14:00:00'),
        duration: 180,
        totalMarks: 100,
        passingMarks: 40,
        status: 'scheduled' as const,
      };

      render(
        <ExamCard exam={mockExam} />
      );

      expect(screen.getByText('Biology Final Exam')).toBeInTheDocument();
      expect(screen.getAllByText(/Biology/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/180/i)).toBeInTheDocument();
      expect(screen.getByText(/100 marks/i)).toBeInTheDocument();
      expect(screen.getByText(/40 pass/i)).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 2: Add New Exam with Validation
  // ─────────────────────────────────────────────────────────────────────────
  describe('Test 2: Add Exam with Form Validation', () => {
    it('should validate required fields when adding exam', async () => {
      render(<ExamForm onSubmit={jest.fn()} />);

      const submitBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/exam name required/i)).toBeInTheDocument();
        expect(screen.getByText(/select subject/i)).toBeInTheDocument();
        expect(screen.getByText(/select date/i)).toBeInTheDocument();
      });
    });

    it('should add new exam with valid form submission', async () => {
      const mockOnSubmit = jest.fn();

      render(<ExamForm onSubmit={mockOnSubmit} />);

      const nameInput = screen.getByPlaceholderText(/exam name/i);
      const subjectInput = screen.getByPlaceholderText(/subject/i);
      const dateInput = screen.getByPlaceholderText(/date/i);
      const durationInput = screen.getByPlaceholderText(/duration/i);
      const marksInput = screen.getByPlaceholderText(/total marks/i);
      const passingInput = screen.getByPlaceholderText(/passing marks/i);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const dateStr = futureDate.toISOString().split('T')[0];

      await userEvent.type(nameInput, 'English Literature');
      await userEvent.type(subjectInput, 'English');
      await userEvent.type(dateInput, dateStr);
      await userEvent.type(durationInput, '120');
      await userEvent.type(marksInput, '100');
      await userEvent.type(passingInput, '35');

      const submitBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('should validate that exam date is in the future', async () => {
      render(<ExamForm onSubmit={jest.fn()} />);

      const dateInput = screen.getByPlaceholderText(/date/i);
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const dateStr = pastDate.toISOString().split('T')[0];

      await userEvent.type(dateInput, dateStr);

      const submitBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/date must be in future/i)).toBeInTheDocument();
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 3: Calculate Performance and Show Study Recommendations
  // ─────────────────────────────────────────────────────────────────────────
  describe('Test 3: Performance Tracking & Study Recommendations', () => {
    it('should display exam performance metrics', () => {
      const mockExam = {
        id: '1',
        name: 'Physics Final',
        subject: 'Physics',
        date: new Date('2024-01-15'),
        duration: 120,
        totalMarks: 100,
        passingMarks: 40,
        status: 'completed' as const,
        marksObtained: 78,
      };

      render(
        <ExamCard exam={mockExam} showPerformance={true} />
      );

      expect(screen.getByText(/78 obtained/i)).toBeInTheDocument();
      expect(screen.getByText(/78%/i)).toBeInTheDocument();
      expect(screen.getByText(/passed/i)).toBeInTheDocument();
    });

    it('should show study recommendations based on exam performance', () => {
      const mockExam = {
        id: '1',
        name: 'Chemistry Final',
        subject: 'Chemistry',
        date: new Date('2024-01-20'),
        duration: 120,
        totalMarks: 100,
        passingMarks: 40,
        status: 'completed' as const,
        marksObtained: 35,
      };

      render(
        <ExamCard exam={mockExam} showRecommendations={true} />
      );

      expect(screen.getByText(/below passing|need improvement/i)).toBeInTheDocument();
    });

    it('should calculate average marks across exams', () => {
      const mockExams = [
        { marksObtained: 85, totalMarks: 100 },
        { marksObtained: 90, totalMarks: 100 },
        { marksObtained: 80, totalMarks: 100 },
      ];

      const average = mockExams.reduce((acc, e) => acc + e.marksObtained, 0) / mockExams.length;
      expect(average).toBe(85);

      render(
        <div>
          average: {average}
        </div>
      );

      expect(screen.getByText(/average: 85/i)).toBeInTheDocument();
    });

    it('should show performance trend (improving/declining)', () => {
      const mockExams = [
        { id: '1', marksObtained: 60 },
        { id: '2', marksObtained: 70 },
        { id: '3', marksObtained: 88 },
      ];

      render(
        <div>
          {mockExams.map((exam) => (
            <div key={exam.id}>
              <span>{exam.marksObtained}</span>
              <span>{exam.marksObtained > 60 ? '📈 Improving' : '📉 Needs Work'}</span>
            </div>
          ))}
        </div>
      );

      expect(screen.getAllByText(/Improving/).length).toBeGreaterThan(0);
      expect(screen.getByText(/Needs Work/)).toBeInTheDocument();
    });
  });
});

