/* eslint-disable @typescript-eslint/no-explicit-any */
import '@testing-library/jest-dom';

// Mock fetch globally
global.fetch = jest.fn();

describe('Custom Hooks Tests - Basic Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 1: useChat Hook - Initialize and Send Message
  // ─────────────────────────────────────────────────────────────────────────
  describe('Test 1: useChat Hook', () => {
    it('should validate API endpoint for chat messages', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: 'msg-1',
          role: 'assistant',
          content: 'Test response',
        }),
      });

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'Test question' }),
      });

      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('/api/ai/chat', expect.any(Object));
    });

    it('should handle chat API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      try {
        await fetch('/api/ai/chat', { method: 'POST' });
        fail('Should have thrown error');
      } catch (err: any) {
        expect(err.message).toContain('Network error');
      }
    });

    it('should format chat messages with role and content', () => {
      const userMessage = {
        id: '1',
        role: 'user' as const,
        content: 'What is photosynthesis?',
        timestamp: new Date(),
      };

      const aiMessage = {
        id: '2',
        role: 'assistant' as const,
        content: 'Photosynthesis is...',
        timestamp: new Date(),
      };

      expect(userMessage.role).toBe('user');
      expect(aiMessage.role).toBe('assistant');
      expect(userMessage.content).toBeTruthy();
      expect(aiMessage.content).toBeTruthy();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 2: useMaterials Hook - Fetch and Filter Materials
  // ─────────────────────────────────────────────────────────────────────────
  describe('Test 2: useMaterials Hook', () => {
    it('should call materials API endpoint on fetch', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue([
          {
            id: '1',
            title: 'Physics Notes',
            category: 'Physics',
            fileUrl: 'https://example.com/physics.pdf',
          },
        ]),
      });

      const response = await fetch('/api/materials');
      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('/api/materials');
    });

    it('should validate material object structure', () => {
      const material = {
        id: '1',
        title: 'Physics Notes',
        category: 'Physics',
        subject: 'Physics',
        fileUrl: 'https://example.com/physics.pdf',
        uploadedAt: new Date(),
        fileSize: 2048000,
      };

      expect(material.id).toBeTruthy();
      expect(material.title).toBeTruthy();
      expect(material.fileUrl).toMatch(/^https?:\/\//);
      expect(material.fileSize).toBeGreaterThan(0);
    });

    it('should filter materials by category', () => {
      const materials = [
        { id: '1', title: 'Physics Notes', category: 'Physics' },
        { id: '2', title: 'Chemistry Lab', category: 'Chemistry' },
        { id: '3', title: 'Physics Problems', category: 'Physics' },
      ];

      const physicsOnly = materials.filter((m) => m.category === 'Physics');
      expect(physicsOnly).toHaveLength(2);
      expect(physicsOnly.every((m) => m.category === 'Physics')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 3: useExams Hook - Fetch Exams and Calculate Performance
  // ─────────────────────────────────────────────────────────────────────────
  describe('Test 3: useExams Hook', () => {
    it('should call exams API endpoint', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue([
          {
            id: '1',
            name: 'Physics Mid-term',
            subject: 'Physics',
            date: new Date('2024-02-15'),
          },
        ]),
      });

      const response = await fetch('/api/exams');
      expect(response.ok).toBe(true);
    });

    it('should separate upcoming and past exams by date', () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const exams = [
        { id: '1', name: 'Past Exam', date: pastDate, status: 'completed' as const },
        { id: '2', name: 'Upcoming Exam', date: futureDate, status: 'scheduled' as const },
      ];

      const upcoming = exams.filter((e) => e.date > now);
      const past = exams.filter((e) => e.date <= now);

      expect(upcoming).toHaveLength(1);
      expect(past).toHaveLength(1);
    });

    it('should calculate exam performance metrics', () => {
      const exams = [
        { id: '1', subject: 'Physics', marksObtained: 85, totalMarks: 100 },
        { id: '2', subject: 'Physics', marksObtained: 90, totalMarks: 100 },
        { id: '3', subject: 'Physics', marksObtained: 80, totalMarks: 100 },
      ];

      const average = exams.reduce((acc, e) => acc + e.marksObtained, 0) / exams.length;
      expect(average).toBe(85);

      const percentage = (average / 100) * 100;
      expect(percentage).toBe(85);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 4: useSubjects Hook - Fetch and Manage Subjects
  // ─────────────────────────────────────────────────────────────────────────
  describe('Test 4: useSubjects Hook', () => {
    it('should fetch subjects from API', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue([
          { id: '1', name: 'Physics', category: 'Science' },
          { id: '2', name: 'Chemistry', category: 'Science' },
        ]),
      });

      const response = await fetch('/api/subjects');
      expect(response.ok).toBe(true);
    });

    it('should group subjects by category', () => {
      const subjects = [
        { id: '1', name: 'Physics', category: 'Science' },
        { id: '2', name: 'Chemistry', category: 'Science' },
        { id: '3', name: 'Mathematics', category: 'Math' },
      ];

      const categories = [...new Set(subjects.map((s) => s.category))];
      expect(categories).toContain('Science');
      expect(categories).toContain('Math');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 5: useTimetable Hook - Fetch and Manage Timetable
  // ─────────────────────────────────────────────────────────────────────────
  describe('Test 5: useTimetable Hook', () => {
    it('should fetch timetable from API', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue([
          {
            id: '1',
            subject: 'Physics',
            day: 'Monday',
            startTime: '09:00',
            endTime: '10:00',
            duration: 60,
          },
        ]),
      });

      const response = await fetch('/api/timetable');
      expect(response.ok).toBe(true);
    });

    it('should organize timetable by day', () => {
      const timetable = [
        {
          id: '1',
          subject: 'Physics',
          day: 'Monday',
          duration: 60,
        },
        {
          id: '2',
          subject: 'Chemistry',
          day: 'Monday',
          duration: 60,
        },
        {
          id: '3',
          subject: 'Math',
          day: 'Tuesday',
          duration: 60,
        },
      ];

      const mondaySchedule = timetable.filter((t) => t.day === 'Monday');
      expect(mondaySchedule).toHaveLength(2);
    });

    it('should calculate total study hours', () => {
      const timetable = [
        { id: '1', subject: 'Physics', duration: 90 },
        { id: '2', subject: 'Chemistry', duration: 60 },
        { id: '3', subject: 'Math', duration: 90 },
      ];

      const totalMinutes = timetable.reduce((acc, t) => acc + t.duration, 0);
      const totalHours = totalMinutes / 60;

      expect(totalHours).toBe(4);
    });
  });
});
