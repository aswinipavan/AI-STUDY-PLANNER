import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MessageBubble from '@/components/chat/MessageBubble';
import { ChatMessage } from '@/types/api.types';

// Mock zustand authStore
jest.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: {
      id: 'test-user-id',
      name: 'Aswin Student',
      fullName: 'Aswin Student',
      photoUrl: '',
    },
  }),
}));

describe('MessageBubble with KaTeX Math & Code Blocks', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  it('renders user message cleanly', () => {
    const userMsg: ChatMessage = {
      id: 'msg-1',
      sessionId: 'session-1',
      role: 'user',
      content: 'Can you explain the quadratic formula?',
      timestamp: new Date().toISOString(),
    };

    render(<MessageBubble message={userMsg} />);
    expect(screen.getByText('Can you explain the quadratic formula?')).toBeInTheDocument();
  });

  it('renders assistant message with math equation and code block content', () => {
    const botMsg: ChatMessage = {
      id: 'msg-2',
      sessionId: 'session-1',
      role: 'assistant',
      content: 'Here is the formula: $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$\n\n```python\ndef solve_quad(a, b, c):\n    return (-b + (b**2 - 4*a*c)**0.5) / (2*a)\n```',
      timestamp: new Date().toISOString(),
    };

    render(<MessageBubble message={botMsg} />);
    
    // Check markdown content rendered
    expect(screen.getByTestId('markdown-content')).toBeInTheDocument();
    expect(screen.getByText(/solve_quad/)).toBeInTheDocument();
  });
});
