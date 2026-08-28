import { apiClient } from '@/lib/apiClient';
import { AppError } from '@/utils/errorHandler';
import { mapSubjectFromBackend } from '@/api/subjects.api';
import {
  AdaptationResult,
  AdaptationTrigger,
  GenerateTimetableDTO,
  SubjectReadiness,
  Timetable,
  TimetableSlot,
} from '@/types/api.types';

/**
 * Normalise the subject nested inside a slot.
 *
 * The backend serialises it as a `SubjectResponse` (`subjectName`), but the whole
 * frontend reads `subject.name`. Without this the property was simply `undefined`,
 * so both the dashboard and the timetable grid silently rendered their placeholder
 * ("Study Session" / "Study") for every single slot instead of the real subject.
 * Normalising here — the same boundary where `subjectsApi` already maps — keeps
 * every consumer correct rather than repeating the fix at each render site.
 */
function normalizeSlot(slot: TimetableSlot): TimetableSlot {
  if (!slot?.subject) return slot;
  return { ...slot, subject: mapSubjectFromBackend(slot.subject) };
}

function normalizeTimetable<T extends Timetable | null>(timetable: T): T {
  if (!timetable?.slots) return timetable;
  return { ...timetable, slots: timetable.slots.map(normalizeSlot) };
}

export const timetableApi = {
  generate: async (payload: GenerateTimetableDTO): Promise<Timetable> => {
    const response = await apiClient.post('/api/timetable/generate', payload);
    return normalizeTimetable(response.data.data ?? response.data);
  },

  addCustom: async (block: Partial<TimetableSlot>): Promise<Timetable> => {
    const response = await apiClient.post('/api/timetable/custom', block);
    return normalizeTimetable(response.data.data ?? response.data);
  },

  getActive: async (): Promise<Timetable | null> => {
    try {
      const response = await apiClient.get('/api/timetable/active');
      // Backend returns ApiResponse wrapper: {success, message, data}
      return normalizeTimetable(response.data.data ?? response.data);
    } catch (err) {
      // A 404 here is a valid "no active timetable yet" empty state, not an error.
      if (err instanceof AppError && err.statusCode === 404) return null;
      throw err;
    }
  },

  markSlotComplete: async (id: string): Promise<TimetableSlot> => {
    const response = await apiClient.patch(`/api/timetable/slots/${id}/complete`);
    return response.data.data ?? response.data;
  },

  // Wrapper for frontend status - maps to backend's boolean isCompleted
  updateSlotStatus: async (id: string, _status: TimetableSlot['status']): Promise<TimetableSlot> => {
    // Backend only supports toggle, so we check current state
    // If setting to 'completed' and not already complete, toggle
    // If setting to 'pending' or 'skipped' and currently complete, toggle
    // Otherwise, this is a no-op on backend (frontend optimistic update handles UI)
    const response = await apiClient.patch(`/api/timetable/slots/${id}/complete`);
    return response.data.data ?? response.data;
  },

  /**
   * Re-plans the remaining horizon from the student's current signals — material
   * topics, marks, exam dates, and which sessions were actually completed or
   * missed. Returns the new timetable *and* the reasons it changed.
   */
  adapt: async (trigger: AdaptationTrigger = 'MANUAL'): Promise<AdaptationResult> => {
    const response = await apiClient.post(
      `/api/timetable/adapt?trigger=${encodeURIComponent(trigger)}`
    );
    const result: AdaptationResult = response.data.data ?? response.data;
    return result?.timetable
      ? { ...result, timetable: normalizeTimetable(result.timetable) }
      : result;
  },

  /** Read-only per-subject coverage / readiness / priority signals. */
  getInsights: async (): Promise<SubjectReadiness[]> => {
    const response = await apiClient.get('/api/timetable/insights');
    return response.data.data ?? response.data ?? [];
  },
};
