import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MaterialDetailModal from '@/components/materials/MaterialDetailModal';
import MaterialCard from '@/components/materials/MaterialCard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StudyMaterial } from '@/types/api.types';

// Mock Firebase & APIs
jest.mock('@/lib/firebase', () => ({
  auth: {},
  googleProvider: {},
}));

jest.mock('@/api/materials.api', () => ({
  materialsApi: {
    reprocess: jest.fn().mockResolvedValue({ success: true }),
    deleteMaterial: jest.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock Next.js image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt || 'mock image'} />
  ),
}));

// Mock useDeleteMaterial
jest.mock('@/hooks/useMaterials', () => ({
  useDeleteMaterial: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
}));

const mockMaterial: StudyMaterial = {
  id: 'mat-101',
  title: 'Applied_Mathematics_Assignment_Handwritten_Style.pdf',
  fileUrl: 'https://example.com/math.pdf',
  fileType: 'pdf',
  subjectName: 'Applied Mathematics',
  aiCategorizedSubject: 'Applied Maths',
  processingStatus: 'COMPLETED',
  overallDifficulty: 'MEDIUM',
  difficultyScore: 61,
  difficultyReason: 'Contains advanced Fourier transform applications and harmonic vibration equations.',
  aiSummary: '**Applied Mathematics (UBA06) – Assessment Tool 3**\n\n- **Rotating shaft vibration:** Harmonic analysis of displacement readings gives mean 1.55 mm.\n- **Cooling fin:** $T(x) = 254.65\\sin x + 9.43\\sin 3x$.\n- **Wind speed:** Dominant harmonic analysis with $A_0 = 3.1842$.',
  extractedTopics: JSON.stringify([
    { name: 'Harmonic Analysis of Rotating Shaft', chapter: 'Fourier Series' },
    { name: 'Half-Range Sine Series for Cooling Fin', chapter: 'Boundary Value Problems' },
    { name: 'Wind Speed Turbine Harmonic Modeling', chapter: 'Applications of Fourier' },
  ]),
  extractedChapters: JSON.stringify([
    { name: 'Fourier Series', topics: ['Harmonic Analysis'] },
  ]),
  extractedKeywords: JSON.stringify(['Fourier Series', 'Harmonics', 'Cooling Fin', 'Vibration Analysis']),
  uploadedAt: '2026-09-07T12:00:00Z',
};

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

describe('MaterialDetailModal Component', () => {
  it('does not render when isOpen is false', () => {
    render(
      <MaterialDetailModal
        isOpen={false}
        onClose={jest.fn()}
        material={mockMaterial}
      />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders modal with title, subject, and AI summary when isOpen is true', () => {
    render(
      <MaterialDetailModal
        isOpen={true}
        onClose={jest.fn()}
        material={mockMaterial}
        initialTab="summary"
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Applied Mathematics Assignment Handwritten Style.pdf')).toBeInTheDocument();
    expect(screen.getAllByText(/Applied Mathematics/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/MEDIUM • 61\/100/i)).toBeInTheDocument();
    expect(screen.getByText(/Rotating shaft vibration/i)).toBeInTheDocument();
  });

  it('switches between tabs (Summary, Topics, Concepts, Complexity)', () => {
    render(
      <MaterialDetailModal
        isOpen={true}
        onClose={jest.fn()}
        material={mockMaterial}
        initialTab="summary"
      />
    );

    // Switch to Topics tab
    const topicsTabBtn = screen.getByRole('tab', { name: /key topics/i });
    fireEvent.click(topicsTabBtn);

    expect(screen.getByText('Harmonic Analysis of Rotating Shaft')).toBeInTheDocument();
    expect(screen.getByText('Chapter: Fourier Series')).toBeInTheDocument();

    // Switch to Concepts tab
    const conceptsTabBtn = screen.getByRole('tab', { name: /concepts/i });
    fireEvent.click(conceptsTabBtn);

    expect(screen.getByText('Vibration Analysis')).toBeInTheDocument();

    // Switch to Complexity tab
    const complexityTabBtn = screen.getByRole('tab', { name: /complexity/i });
    fireEvent.click(complexityTabBtn);

    expect(screen.getByText(/Contains advanced Fourier transform applications/i)).toBeInTheDocument();
  });

  it('toggles size presets (Standard, Wide, Fullscreen)', () => {
    render(
      <MaterialDetailModal
        isOpen={true}
        onClose={jest.fn()}
        material={mockMaterial}
      />
    );

    const wideBtn = screen.getByRole('button', { name: /wide/i });
    fireEvent.click(wideBtn);

    const standardBtn = screen.getByRole('button', { name: /standard/i });
    fireEvent.click(standardBtn);

    const maxBtn = screen.getByTitle(/maximize fullscreen/i);
    fireEvent.click(maxBtn);

    expect(screen.getByTitle(/restore size/i)).toBeInTheDocument();
  });

  it('calls onClose when close button or Escape key is pressed', () => {
    const handleClose = jest.fn();
    render(
      <MaterialDetailModal
        isOpen={true}
        onClose={handleClose}
        material={mockMaterial}
      />
    );

    const closeBtn = screen.getByRole('button', { name: /close modal/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});

describe('MaterialCard Modal Integration', () => {
  it('opens MaterialDetailModal on clicking Summary button in MaterialCard', async () => {
    const qc = createTestQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MaterialCard material={mockMaterial} />
      </QueryClientProvider>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const summaryBtn = screen.getByRole('button', { name: /summary/i });
    fireEvent.click(summaryBtn);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Curriculum Breakdown/i)).toBeInTheDocument();
    });
  });

  it('opens MaterialDetailModal on clicking Topics button in MaterialCard', async () => {
    const qc = createTestQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MaterialCard material={mockMaterial} />
      </QueryClientProvider>
    );

    const topicsBtn = screen.getByRole('button', { name: /topics \(3\)/i });
    fireEvent.click(topicsBtn);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Harmonic Analysis of Rotating Shaft')).toBeInTheDocument();
    });
  });
});
