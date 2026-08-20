import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studyRoomApi } from '@/api/studyRoom.api';
import { QK } from '@/constants/queryKeys';
import { CreateStudyRoomDTO } from '@/types/api.types';

export const useActiveStudyRooms = () => {
  return useQuery({
    queryKey: QK.studyRooms,
    queryFn: studyRoomApi.getActiveRooms,
    refetchInterval: 10000, // Poll active rooms every 10s
  });
};

export const useStudyRoom = (code: string) => {
  return useQuery({
    queryKey: QK.studyRoom(code),
    queryFn: () => studyRoomApi.getRoom(code),
    enabled: Boolean(code),
    refetchInterval: 5000, // Poll room details & timer every 5s
  });
};

export const useStudyRoomMessages = (code: string) => {
  return useQuery({
    queryKey: QK.studyRoomMessages(code),
    queryFn: () => studyRoomApi.getMessages(code),
    enabled: Boolean(code),
    refetchInterval: 3000, // Live chat polling every 3s
  });
};

export const useCreateStudyRoom = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStudyRoomDTO) => studyRoomApi.createRoom(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.studyRooms });
    },
  });
};

export const useJoinStudyRoom = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => studyRoomApi.joinRoom(code),
    onSuccess: (room) => {
      qc.invalidateQueries({ queryKey: QK.studyRooms });
      qc.invalidateQueries({ queryKey: QK.studyRoom(room.roomCode) });
    },
  });
};

export const useLeaveStudyRoom = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => studyRoomApi.leaveRoom(code),
    onSuccess: (_, code) => {
      qc.invalidateQueries({ queryKey: QK.studyRooms });
      qc.invalidateQueries({ queryKey: QK.studyRoom(code) });
    },
  });
};

export const useEndStudyRoom = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => studyRoomApi.endRoom(code),
    onSuccess: (_, code) => {
      qc.invalidateQueries({ queryKey: QK.studyRooms });
      qc.invalidateQueries({ queryKey: QK.studyRoom(code) });
    },
  });
};

export const useSendStudyRoomMessage = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ code, message, isAi }: { code: string; message: string; isAi?: boolean }) =>
      studyRoomApi.sendMessage(code, message, isAi),
    onSuccess: (_, { code }) => {
      qc.invalidateQueries({ queryKey: QK.studyRoomMessages(code) });
    },
  });
};
