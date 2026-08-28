import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

describe('AI Tutor Message Rendering & Visual Polish', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  it('renders user message cleanly without bot action bar', () => {
    const userMsg: ChatMessage = {
      id: 'msg-1',
      sessionId: 'session-1',
      role: 'user',
      content: 'Explain binary search trees',
      timestamp: new Date().toISOString(),
    };

    render(<MessageBubble message={userMsg} />);
    expect(screen.getByText('Explain binary search trees')).toBeInTheDocument();
    expect(screen.queryByTitle('Copy response')).not.toBeInTheDocument();
  });

  it('renders assistant message with full response copy button and markdown content', () => {
    const botMsg: ChatMessage = {
      id: 'msg-2',
      sessionId: 'session-1',
      role: 'assistant',
      content: '## Binary Search Trees\n\nA binary search tree maintains sorted ordering.\n\n### Worked Example\nRoot is 10, left is 5, right is 15.',
      timestamp: new Date().toISOString(),
    };

    render(<MessageBubble message={botMsg} />);
    
    // Markdown content should be present
    expect(screen.getByTestId('markdown-content')).toBeInTheDocument();
    expect(screen.getByText(/Binary Search Trees/)).toBeInTheDocument();

    // Copy full response button
    const copyBtn = screen.getByTitle('Copy response');
    expect(copyBtn).toBeInTheDocument();
    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(botMsg.content);
  });

  it('detects material grounding and displays grounding badge', () => {
    const groundedMsg: ChatMessage = {
      id: 'msg-3',
      sessionId: 'session-1',
      role: 'assistant',
      content: 'From your uploaded notes on Unit 2, here is the explanation of Graph Traversals.',
      timestamp: new Date().toISOString(),
    };

    render(<MessageBubble message={groundedMsg} />);
    
    expect(screen.getByTestId('grounding-badge')).toBeInTheDocument();
    expect(screen.getByText('Grounded in your study notes')).toBeInTheDocument();
  });
});
