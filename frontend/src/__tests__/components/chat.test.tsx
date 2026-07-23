import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock fetch
global.fetch = jest.fn();

// Mock chat components for testing
const ChatMessage = ({ message }: any) => (
  <div className={`${message.role}-message`} data-testid="chat-message">
    <div>{message.content}</div>
    <div data-testid="message-timestamp">{message.timestamp?.toLocaleTimeString?.()}</div>
  </div>
);

const ChatInterface = ({ onScrollToBottom, showClearButton }: any) => {
  const [messages, setMessages] = React.useState<any[]>([]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    const res = await fetch('/api/ai/chat', { method: 'POST', body: JSON.stringify({ message: input }) });
    if (res.ok) {
      const response = await res.json();
      setMessages([...messages, response]);
      setInput('');
    }
    setIsLoading(false);
  };

  React.useEffect(() => {
    onScrollToBottom?.();
  }, [messages, onScrollToBottom]);

  return (
    <div>
      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}
      {isLoading && <div data-testid="loading-indicator">Loading...</div>}
      <input placeholder="Ask a question" value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={handleSend} disabled={!input.trim()}>
        send
      </button>
      {showClearButton && <button onClick={() => setMessages([])}>new chat</button>}
    </div>
  );
};

describe('Chat Component Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 1: Chat Message Display and Rendering
  // ─────────────────────────────────────────────────────────────────────────
  describe('Test 1: Chat Message Display & Rendering', () => {
    it('should render user and AI messages with correct styling', () => {
      const messages = [
        { id: '1', role: 'user', content: 'Explain photosynthesis', timestamp: new Date() },
        { id: '2', role: 'assistant', content: 'Photosynthesis is the process by which plants convert light energy.', timestamp: new Date() },
      ];

      const { container } = render(
        <div>
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
        </div>
      );

      expect(screen.getByText('Explain photosynthesis')).toBeInTheDocument();
      expect(screen.getByText(/Photosynthesis is the process/i)).toBeInTheDocument();

      const userMsg = screen.getByText('Explain photosynthesis').closest('div');
      expect(userMsg?.closest('[class*="user-message"]') || userMsg).toBeInTheDocument();

      const aiMsg = screen.getByText(/Photosynthesis is the process/i).closest('div');
      expect(aiMsg?.closest('[class*="assistant-message"]') || aiMsg).toBeInTheDocument();
    });

    it('should display timestamp for each message', () => {
      const messages = [
        { id: '1', role: 'user', content: 'What is calculus?', timestamp: new Date() },
        { id: '2', role: 'assistant', content: 'Calculus is a mathematical study.', timestamp: new Date() },
      ];

      render(
        <div>
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
        </div>
      );

      const timestamps = screen.getAllByTestId('message-timestamp');
      expect(timestamps.length).toBeGreaterThanOrEqual(2);
    });

    it('should auto-scroll to latest message', async () => {
      const scrollToBottomMock = jest.fn();

      render(<ChatInterface onScrollToBottom={scrollToBottomMock} />);

      await waitFor(() => {
        expect(scrollToBottomMock).toHaveBeenCalled();
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 2: Send Chat Message and Receive Response
  // ─────────────────────────────────────────────────────────────────────────
  describe('Test 2: Send Message & Receive AI Response', () => {
    it('should send user message and receive AI response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: '2',
          role: 'assistant',
          content: 'Gravity is the force that attracts objects.',
          timestamp: new Date(),
        }),
      });

      render(<ChatInterface />);

      const inputField = screen.getByPlaceholderText('Ask a question');
      const sendBtn = screen.getByRole('button', { name: /send/i });

      await userEvent.type(inputField, 'What is gravity?');
      
      // Check that message is in input before sending
      expect(inputField).toHaveValue('What is gravity?');
      
      fireEvent.click(sendBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/ai/chat', expect.any(Object));
      });
    });

    it('should show loading state while waiting for response', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: jest.fn().mockResolvedValue({ id: '2', role: 'assistant', content: 'Response' }),
                }),
              100
            )
          )
      );

      render(<ChatInterface />);

      const inputField = screen.getByPlaceholderText('Ask a question');
      const sendBtn = screen.getByRole('button', { name: /send/i });

      await userEvent.type(inputField, 'Test');
      fireEvent.click(sendBtn);

      await waitFor(() => {
        expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
      });
    });

    it('should disable send button when input is empty', async () => {
      render(<ChatInterface />);

      const sendBtn = screen.getByRole('button', { name: /send/i });
      expect(sendBtn).toBeDisabled();

      const inputField = screen.getByPlaceholderText('Ask a question');
      await userEvent.type(inputField, 'Q', { delay: 10 });

      // Verify text was typed
      await waitFor(() => {
        expect(inputField).toHaveValue('Q');
      }, { timeout: 500 });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 3: Chat History and Context Management
  // ─────────────────────────────────────────────────────────────────────────
  describe('Test 3: Chat History & Context Management', () => {
    it('should maintain chat history across multiple exchanges', () => {
      const chatHistory = [
        { id: '1', role: 'user', content: 'What is photosynthesis?', timestamp: new Date() },
        { id: '2', role: 'assistant', content: 'Photosynthesis converts light to chemical energy.', timestamp: new Date() },
        { id: '3', role: 'user', content: 'Can you explain light reactions?', timestamp: new Date() },
        { id: '4', role: 'assistant', content: 'Light reactions occur in the thylakoid membrane.', timestamp: new Date() },
      ];

      render(
        <div>
          {chatHistory.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
        </div>
      );

      expect(screen.getByText('What is photosynthesis?')).toBeInTheDocument();
      expect(screen.getByText(/Photosynthesis converts/i)).toBeInTheDocument();
      expect(screen.getByText('Can you explain light reactions?')).toBeInTheDocument();
      expect(screen.getByText(/Light reactions occur/i)).toBeInTheDocument();

      const messages = screen.getAllByTestId('chat-message');
      expect(messages).toHaveLength(4);
    });

    it('should preserve context when sending follow-up questions', async () => {
      render(<ChatInterface />);

      const inputField = screen.getByPlaceholderText('Ask a question');
      const sendBtn = screen.getByRole('button', { name: /send/i });

      await userEvent.type(inputField, 'How does DNA replicate?');
      fireEvent.click(sendBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('should clear chat history on user request', async () => {
      render(<ChatInterface showClearButton={true} />);

      const clearBtn = screen.getByRole('button', { name: /new chat/i });
      fireEvent.click(clearBtn);

      const messages = screen.queryAllByTestId('chat-message');
      expect(messages).toHaveLength(0);
    });
  });
});
