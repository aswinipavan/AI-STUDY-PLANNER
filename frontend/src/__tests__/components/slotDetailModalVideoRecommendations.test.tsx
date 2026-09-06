import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SlotDetailModal } from '@/components/timetable/SlotDetailModal';
import { TimetableSlot, VideoRecommendation } from '@/types/api.types';
import { videoRecommendationsApi } from '@/api/videoRecommendations.api';
import { evidenceApi } from '@/api/evidence.api';

jest.mock('@/api/evidence.api', () => ({
  evidenceApi: {
    uploadEvidence: jest.fn(),
    getLatestEvidence: jest.fn().mockResolvedValue(null),
    approveCompletion: jest.fn(),
  },
}));

jest.mock('@/api/videoRecommendations.api', () => ({
  videoRecommendationsApi: {
    getVideoRecommendations: jest.fn(),
    refreshVideoRecommendations: jest.fn(),
  },
}));

describe('SlotDetailModal Video Recommendations', () => {
  const todayStr = new Date().toISOString().split('T')[0];

  const mockSlot: TimetableSlot = {
    id: 'slot-vid-1',
    subject: {
      id: 'sub-math',
      name: 'Engineering Mathematics',
      studentId: 'stud-1',
    },
    date: todayStr,
    startTime: '10:00:00',
    endTime: '11:00:00',
    durationMinutes: 60,
    topic: 'Fourier Series Sine Expansion',
    chapter: 'Fourier Analysis',
    whatToStudy: ['• Dirichlet conditions', '• Sine harmonic coefficients'],
    isCompleted: false,
    status: 'pending',
  };

  const mockVideo1: VideoRecommendation = {
    videoId: 'vid-101',
    title: 'Fourier Sine Series - Complete Worked Example',
    channelTitle: 'MIT OpenCourseWare',
    thumbnailUrl: 'https://i.ytimg.com/vi/vid-101/hqdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=vid-101',
    matchScore: 94,
    matchVerdict: 'EXCELLENT MATCH',
    matchReason: 'Direct topic match in title & syllabus alignment',
    duration: '15 mins',
  };

  const mockVideo2: VideoRecommendation = {
    videoId: 'vid-102',
    title: 'Fourier Series Explained Simply',
    channelTitle: '3Blue1Brown',
    thumbnailUrl: 'https://i.ytimg.com/vi/vid-102/hqdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=vid-102',
    matchScore: 82,
    matchVerdict: 'GOOD MATCH',
    matchReason: 'Foundational topic breakdown',
    duration: '22 mins',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (evidenceApi.getLatestEvidence as jest.Mock).mockResolvedValue(null);
  });

  it('renders video recommendation cards with score badge and external link', async () => {
    (videoRecommendationsApi.getVideoRecommendations as jest.Mock).mockResolvedValue({
      slotId: 'slot-vid-1',
      topic: 'Fourier Series Sine Expansion',
      recommendations: [mockVideo1, mockVideo2],
      isCached: false,
    });

    render(
      <SlotDetailModal
        slot={mockSlot}
        isOpen={true}
        onClose={jest.fn()}
        onToggleStatus={jest.fn()}
      />
    );

    // Section header check
    expect(screen.getByText('Recommended Study Videos')).toBeInTheDocument();

    // Wait for video cards to render
    await waitFor(() => {
      expect(screen.getByText('Fourier Sine Series - Complete Worked Example')).toBeInTheDocument();
      expect(screen.getByText('Fourier Series Explained Simply')).toBeInTheDocument();
    });

    expect(screen.getByText('MIT OpenCourseWare')).toBeInTheDocument();
    expect(screen.getByText('94% Match · High Signal')).toBeInTheDocument();
    expect(screen.getByText('82% Match')).toBeInTheDocument();

    // Verify safe external link attributes
    const cardLink = screen.getByTestId('video-card-vid-101');
    expect(cardLink).toHaveAttribute('href', 'https://www.youtube.com/watch?v=vid-101');
    expect(cardLink).toHaveAttribute('target', '_blank');
    expect(cardLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('triggers refresh recommendations when clicking refresh button', async () => {
    (videoRecommendationsApi.getVideoRecommendations as jest.Mock).mockResolvedValue({
      slotId: 'slot-vid-1',
      recommendations: [mockVideo1],
      isCached: true,
    });

    (videoRecommendationsApi.refreshVideoRecommendations as jest.Mock).mockResolvedValue({
      slotId: 'slot-vid-1',
      recommendations: [mockVideo1, mockVideo2],
      isCached: false,
    });

    render(
      <SlotDetailModal
        slot={mockSlot}
        isOpen={true}
        onClose={jest.fn()}
        onToggleStatus={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Fourier Sine Series - Complete Worked Example')).toBeInTheDocument();
    });

    const refreshBtn = screen.getByTestId('refresh-video-recommendations-btn');
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(videoRecommendationsApi.refreshVideoRecommendations).toHaveBeenCalledWith('slot-vid-1');
      expect(screen.getByText('Fourier Series Explained Simply')).toBeInTheDocument();
    });
  });

  it('renders graceful error message when API call fails', async () => {
    (videoRecommendationsApi.getVideoRecommendations as jest.Mock).mockRejectedValue(
      new Error('Network error loading YouTube recommendations')
    );

    render(
      <SlotDetailModal
        slot={mockSlot}
        isOpen={true}
        onClose={jest.fn()}
        onToggleStatus={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('video-error-banner')).toBeInTheDocument();
      expect(screen.getByText(/Network error loading YouTube recommendations/i)).toBeInTheDocument();
    });
  });

  it('renders graceful empty state when no recommendations are returned', async () => {
    (videoRecommendationsApi.getVideoRecommendations as jest.Mock).mockResolvedValue({
      slotId: 'slot-vid-1',
      recommendations: [],
      warningMessage: 'No videos found for this topic.',
      isCached: false,
    });

    render(
      <SlotDetailModal
        slot={mockSlot}
        isOpen={true}
        onClose={jest.fn()}
        onToggleStatus={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('video-empty-state')).toBeInTheDocument();
      expect(screen.getByText('No videos found for this topic.')).toBeInTheDocument();
    });
  });
});
