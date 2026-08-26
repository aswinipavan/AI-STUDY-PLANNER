/**
 * The backend nests a `SubjectResponse` (`subjectName`) inside every timetable slot,
 * but the frontend `Subject` type — and therefore every render site — reads `name`.
 * Because the declared type claimed `name` already existed, `tsc` stayed silent and
 * the dashboard plus the timetable grid rendered their placeholder for every slot.
 * These tests pin the normalization to the API boundary.
 */
import { timetableApi } from '@/api/timetable.api';
import { apiClient } from '@/lib/apiClient';
import { AppError } from '@/utils/errorHandler';

jest.mock('@/lib/apiClient', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const mockedClient = apiClient as jest.Mocked<typeof apiClient>;

/** A slot exactly as the backend serialises it. */
const backendSlot = {
  id: 'slot-1',
  subject: {
    id: 'subj-1',
    subjectName: 'Operating Systems',
    subjectCode: 'CS301',
    credits: 4,
    difficultyLevel: 4,
    nextExamDate: '2026-09-01',
    daysUntilExam: 8,
  },
  dayOfWeek: 0,
  date: '2026-08-24',
  startTime: '17:00',
  endTime: '18:00',
  topic: 'Deadlock Detection and Recovery',
  status: 'pending',
};

beforeEach(() => jest.clearAllMocks());

describe('timetableApi nested-subject normalization', () => {
  it('exposes the real subject as `name` on getActive', async () => {
    mockedClient.get.mockResolvedValue({
      data: { data: { id: 'tt-1', studentId: 'stu-1', slots: [backendSlot] } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const timetable = await timetableApi.getActive();

    expect(timetable!.slots[0].subject?.name).toBe('Operating Systems');
    // The real extracted material topic must survive untouched.
    expect(timetable!.slots[0].topic).toBe('Deadlock Detection and Recovery');
  });

  it('maps the exam date so the slot keeps its urgency signals', async () => {
    mockedClient.get.mockResolvedValue({
      data: { data: { id: 'tt-1', studentId: 'stu-1', slots: [backendSlot] } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const subject = (await timetableApi.getActive())!.slots[0].subject!;
    expect(subject.examDate).toBe('2026-09-01');
    expect(subject.daysUntilExam).toBe(8);
  });

  it('normalizes the timetable returned by adapt()', async () => {
    mockedClient.post.mockResolvedValue({
      data: {
        data: {
          adapted: true,
          changes: ['Rescheduled 2 missed sessions.'],
          timetable: { id: 'tt-2', studentId: 'stu-1', slots: [backendSlot] },
        },
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await timetableApi.adapt('NEW_MATERIAL');

    expect(result.adapted).toBe(true);
    expect(result.timetable!.slots[0].subject?.name).toBe('Operating Systems');
    // The "why it changed" explanation is rendered verbatim — never rewrite it.
    expect(result.changes).toEqual(['Rescheduled 2 missed sessions.']);
  });

  it('leaves a slot without a subject alone instead of throwing', async () => {
    mockedClient.get.mockResolvedValue({
      data: { data: { id: 'tt-1', studentId: 'stu-1', slots: [{ ...backendSlot, subject: undefined }] } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const timetable = await timetableApi.getActive();
    expect(timetable!.slots[0].subject).toBeUndefined();
  });

  it('returns null (empty state) when there is no active timetable — a 404', async () => {
    mockedClient.get.mockRejectedValue(new AppError('Not found', 'SERVER', 404));
    await expect(timetableApi.getActive()).resolves.toBeNull();
  });
});
