import { apiClient } from '@/lib/apiClient';
import { StudyEvidenceResponse, TimetableSlot } from '@/types/api.types';
import { mapSubjectFromBackend } from '@/api/subjects.api';

function normalizeSlot(slot: TimetableSlot): TimetableSlot {
  if (!slot?.subject) return slot;
  return { ...slot, subject: mapSubjectFromBackend(slot.subject) };
}

export const evidenceApi = {
  /**
   * Upload study proof file (PDF, PNG, JPG, etc.) for a slot and run AI verification.
   */
  uploadEvidence: async (slotId: string, file: File): Promise<StudyEvidenceResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(`/api/timetable/slots/${slotId}/evidence`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return response.data.data;
    }
    return response.data;
  },

  /**
   * Fetch the latest submitted study proof evidence for a slot.
   */
  getLatestEvidence: async (slotId: string): Promise<StudyEvidenceResponse | null> => {
    try {
      const response = await apiClient.get(`/api/timetable/slots/${slotId}/evidence`);
      if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        return response.data.data ?? null;
      }
      return response.data ?? null;
    } catch {
      return null;
    }
  },

  /**
   * Approve and complete a study session using a verified evidence ID.
   */
  approveCompletion: async (slotId: string, evidenceId: string): Promise<TimetableSlot> => {
    const response = await apiClient.post(`/api/timetable/slots/${slotId}/approve-completion`, {
      evidenceId,
    });
    const data = (response.data && typeof response.data === 'object' && 'data' in response.data)
      ? response.data.data
      : response.data;
    return normalizeSlot(data);
  },
};
