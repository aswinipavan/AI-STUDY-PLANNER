/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatInput from '@/components/chat/ChatInput';

// Mock useUploadMaterial
jest.mock('@/hooks/useMaterials', () => ({
  useUploadMaterial: () => ({
    mutateAsync: jest.fn().mockResolvedValue({ id: '123', title: 'Calculus.pdf' }),
  }),
}));

beforeAll(() => {
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((contextId: string) => {
    if (contextId === '2d') {
      return {
        clearRect: jest.fn(),
        fillText: jest.fn(),
        getImageData: jest.fn(() => ({
          data: new Uint8ClampedArray(800 * 400 * 4),
        })),
        beginPath: jest.fn(),
        rect: jest.fn(),
        stroke: jest.fn(),
      } as any;
    }
    return null;
  });
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('ChatInput Component', () => {
  it('renders textarea with animated placeholder and send button', () => {
    const handleSend = jest.fn();
    const handleChange = jest.fn();
    const handleAttach = jest.fn();

    render(
      <ChatInput
        value=""
        onChange={handleChange}
        onSend={handleSend}
        isThinking={false}
        attachedMaterial={null}
        onAttachMaterial={handleAttach}
      />
    );

    const textarea = screen.getByLabelText('Chat input message');
    expect(textarea).toBeInTheDocument();
    expect(screen.getByLabelText('Attach PDF, notes, or image')).toBeInTheDocument();
    expect(screen.getByLabelText('Send message')).toBeInTheDocument();
  });

  it('triggers onSend when clicking send with text', () => {
    const handleSend = jest.fn();
    const handleChange = jest.fn();
    const handleAttach = jest.fn();

    render(
      <ChatInput
        value="Explain binary search"
        onChange={handleChange}
        onSend={handleSend}
        isThinking={false}
        attachedMaterial={null}
        onAttachMaterial={handleAttach}
      />
    );

    const sendBtn = screen.getByLabelText('Send message');
    expect(sendBtn).not.toBeDisabled();
    fireEvent.click(sendBtn);
    expect(handleSend).toHaveBeenCalled();
  });

  it('renders attached material card and quick actions', () => {
    const handleSend = jest.fn();
    const handleChange = jest.fn();
    const handleAttach = jest.fn();

    const sampleMaterial = {
      id: 'mat-1',
      title: 'Physics Mechanics Notes',
      fileName: 'mechanics.pdf',
      fileType: 'application/pdf',
      fileSizeBytes: 1024 * 1024 * 2,
      processingStatus: 'READY' as const,
    };

    render(
      <ChatInput
        value=""
        onChange={handleChange}
        onSend={handleSend}
        isThinking={false}
        attachedMaterial={sampleMaterial}
        onAttachMaterial={handleAttach}
      />
    );

    expect(screen.getByText('Physics Mechanics Notes')).toBeInTheDocument();
    expect(screen.getByText('✨ Summarize')).toBeInTheDocument();
    expect(screen.getByText('📝 Generate MCQs')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove attached document')).toBeInTheDocument();
  });
});
