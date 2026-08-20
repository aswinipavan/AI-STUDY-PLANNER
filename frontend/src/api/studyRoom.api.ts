import { apiClient } from '@/lib/apiClient';
import { StudyRoom, StudyRoomMessage, CreateStudyRoomDTO } from '@/types/api.types';

export const studyRoomApi = {
  createRoom: async (data: CreateStudyRoomDTO): Promise<StudyRoom> => {
    const response = await apiClient.post('/api/study-rooms', data);
    return response.data.data ?? response.data;
  },

  getRoom: async (code: string): Promise<StudyRoom> => {
    const response = await apiClient.get(`/api/study-rooms/${encodeURIComponent(code)}`);
    return response.data.data ?? response.data;
  },

  joinRoom: async (code: string): Promise<StudyRoom> => {
    const response = await apiClient.post(`/api/study-rooms/${encodeURIComponent(code)}/join`);
    return response.data.data ?? response.data;
  },

  leaveRoom: async (code: string): Promise<void> => {
    await apiClient.post(`/api/study-rooms/${encodeURIComponent(code)}/leave`);
  },

  endRoom: async (code: string): Promise<void> => {
    await apiClient.post(`/api/study-rooms/${encodeURIComponent(code)}/end`);
  },

  sendMessage: async (code: string, message: string, isAi = false): Promise<StudyRoomMessage> => {
    const response = await apiClient.post(`/api/study-rooms/${encodeURIComponent(code)}/messages`, {
      message,
      isAi,
    });
    return response.data.data ?? response.data;
  },

  getMessages: async (code: string): Promise<StudyRoomMessage[]> => {
    const response = await apiClient.get(`/api/study-rooms/${encodeURIComponent(code)}/messages`);
    return response.data.data ?? response.data;
  },

  getActiveRooms: async (): Promise<StudyRoom[]> => {
    const response = await apiClient.get('/api/study-rooms/active');
    return response.data.data ?? response.data;
  },
};
