/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PlaceholdersAndVanishInput } from '@/components/ui/placeholders-and-vanish-input';
import PlaceholdersAndVanishInputDemo from '@/components/placeholders-and-vanish-input-demo';

beforeAll(() => {
  // Mock HTMLCanvasElement.prototype.getContext to prevent JSDOM errors
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((contextId: string) => {
    if (contextId === '2d') {
      return {
        clearRect: jest.fn(),
        fillText: jest.fn(),
        getImageData: jest.fn(() => ({
          data: new Uint8ClampedArray(800 * 800 * 4),
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

describe('PlaceholdersAndVanishInput Component', () => {
  const placeholders = [
    'Ask anything about your subjects...',
    'Explain quantum mechanics...',
    'Generate study plan...',
  ];

  it('renders input, submit button, and rotating placeholder', () => {
    render(
      <PlaceholdersAndVanishInput
        placeholders={placeholders}
        id="test-input"
      />
    );
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByLabelText('Submit query')).toBeInTheDocument();
    expect(screen.getByText('Ask anything about your subjects...')).toBeInTheDocument();
  });

  it('calls onChange and onSubmit callbacks', () => {
    const handleChange = jest.fn();
    const handleSubmit = jest.fn();
    render(
      <PlaceholdersAndVanishInput
        placeholders={placeholders}
        onChange={handleChange}
        onSubmit={handleSubmit}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'How to revise calculus?' } });
    expect(handleChange).toHaveBeenCalled();

    const form = input.closest('form');
    if (form) {
      fireEvent.submit(form);
      expect(handleSubmit).toHaveBeenCalled();
    }
  });

  it('renders PlaceholdersAndVanishInputDemo without crashing', () => {
    render(<PlaceholdersAndVanishInputDemo />);
    expect(screen.getByText(/Ask StudyPlanner AI Anything/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});
