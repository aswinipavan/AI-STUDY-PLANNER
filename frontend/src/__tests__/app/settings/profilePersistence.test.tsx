/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth.api';
import SettingsPage from '@/app/(dashboard)/settings/page';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  })),
  usePathname: jest.fn(() => '/settings'),
}));

// Mock Firebase
jest.mock('firebase/auth', () => ({
  sendPasswordResetEmail: jest.fn(),
  signOut: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/firebase', () => ({
  auth: {},
}));

// Mock authApi
jest.mock('@/api/auth.api', () => ({
  authApi: {
    getMe: jest.fn(),
    updateMe: jest.fn(),
    updateNotifications: jest.fn(),
    uploadAvatar: jest.fn(),
    deleteAccount: jest.fn(),
  },
}));

describe('Profile Persistence - Settings Page Tests', () => {
  let queryClient: QueryClient;

  const mockStudent = {
    id: '11111111-2222-3333-4444-555555555555',
    firebaseUid: 'google-uid-12345',
    name: 'Aswin Kumar',
    fullName: 'Aswin Kumar',
    email: 'aswin@example.com',
    collegeName: 'Indian Institute of Technology',
    semester: 5,
    department: 'Computer Science',
    phoneNumber: '+91 9876543210',
    availableHoursPerDay: 3,
    preferredStudyTime: 'EVENING',
    photoUrl: 'https://example.com/avatar.jpg',
    profilePictureUrl: 'https://example.com/avatar.jpg',
    isPremium: false,
    createdAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    (authApi.getMe as jest.Mock).mockResolvedValue(mockStudent);
    (authApi.updateMe as jest.Mock).mockImplementation(async (payload) => ({
      ...mockStudent,
      ...payload,
    }));

    useAuthStore.setState({
      user: mockStudent as any,
      isAuthenticated: true,
      isPremium: false,
    });
  });

  test('Renders all profile fields pre-populated from user store and backend query', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SettingsPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Aswin Kumar')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Indian Institute of Technology')).toBeInTheDocument();
      expect(screen.getByDisplayValue('+91 9876543210')).toBeInTheDocument();
    });

    const semesterSelect = screen.getByTestId('settings-semester-select') as HTMLSelectElement;
    expect(semesterSelect.value).toBe('5');

    const departmentSelect = screen.getByTestId('settings-department-select') as HTMLSelectElement;
    expect(departmentSelect.value).toBe('Computer Science');
  });

  test('Submitting form calls authApi.updateMe with all editable fields including phoneNumber and integer semester', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SettingsPage />
      </QueryClientProvider>
    );

    const nameInput = await screen.findByDisplayValue('Aswin Kumar');
    const collegeInput = screen.getByDisplayValue('Indian Institute of Technology');
    const phoneInput = screen.getByDisplayValue('+91 9876543210');
    const semesterSelect = screen.getByTestId('settings-semester-select');
    const departmentSelect = screen.getByTestId('settings-department-select');

    fireEvent.change(nameInput, { target: { value: 'Aswin Kumar Updated' } });
    fireEvent.change(collegeInput, { target: { value: 'Stanford University' } });
    fireEvent.change(semesterSelect, { target: { value: '6' } });
    fireEvent.change(departmentSelect, { target: { value: 'Information Technology' } });
    fireEvent.change(phoneInput, { target: { value: '+91 9999988888' } });

    const saveButton = screen.getByRole('button', { name: /save profile/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(authApi.updateMe).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Aswin Kumar Updated',
          collegeName: 'Stanford University',
          semester: 6,
          department: 'Information Technology',
          phoneNumber: '+91 9999988888',
        })
      );
    });
  });

  test('authStore normalizes both name/fullName and photoUrl/profilePictureUrl', () => {
    const rawStudent = {
      id: 'test-id',
      firebaseUid: 'test-fb-uid',
      fullName: 'Dr. Jane Doe',
      email: 'jane@example.com',
      profilePictureUrl: 'https://example.com/jane.png',
      phoneNumber: '+1 555-1234',
      collegeName: 'Oxford',
      semester: 4,
      department: 'Physics',
    } as any;

    useAuthStore.getState().setUser(rawStudent);
    const user = useAuthStore.getState().user;

    expect(user?.name).toBe('Dr. Jane Doe');
    expect(user?.fullName).toBe('Dr. Jane Doe');
    expect(user?.photoUrl).toBe('https://example.com/jane.png');
    expect(user?.profilePictureUrl).toBe('https://example.com/jane.png');
    expect(user?.phoneNumber).toBe('+1 555-1234');
    expect(user?.collegeName).toBe('Oxford');
    expect(user?.semester).toBe(4);
  });
});
