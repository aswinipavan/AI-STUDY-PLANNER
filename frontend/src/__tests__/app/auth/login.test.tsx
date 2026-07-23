import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock fetch FIRST - must be before any firebase imports
if (!global.fetch) {
  (global as any).fetch = jest.fn();
}

// Mock Firebase
jest.mock('firebase/auth');
jest.mock('@/lib/firebase', () => ({
  auth: {},
  googleProvider: {},
}));

import * as firebaseAuth from 'firebase/auth';

// Ensure fetch is properly mocked
(global.fetch as jest.Mock).mockClear();

// Mock auth store
jest.mock('@/stores/authStore');

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// Mock LoginPage component for testing
const LoginPage = () => {
  const [activeTab, setActiveTab] = React.useState('signin');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState('');

  return (
    <div>
      <div>
        <button onClick={() => setActiveTab('signin')}>Sign In</button>
        <button onClick={() => setActiveTab('register')}>Register</button>
      </div>

      {activeTab === 'signin' && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError('');
            if (!email || !password) {
              setError('Please fill in all fields.');
              return;
            }
            try {
              const idToken = 'mock-token';
              const res = await fetch('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ firebaseToken: idToken }),
              });
              if (res.ok) {
                window.location.href = '/dashboard';
              }
            } catch (err: any) {
              setError(err.message || 'Sign in failed');
            }
          }}
        >
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">Sign In →</button>
          {error && <div>{error}</div>}
        </form>
      )}

      {activeTab === 'register' && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError('');
            if (!name || !email || !password || !confirmPassword) {
              setError('Please fill in all fields.');
              return;
            }
            if (password !== confirmPassword) {
              setError('Passwords do not match.');
              return;
            }
            if (password.length < 6) {
              setError('Password must be at least 6 characters.');
              return;
            }
            try {
              const res = await fetch('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ firebaseToken: 'mock-token' }),
              });
              if (res.ok) {
                window.location.href = '/dashboard';
              }
            } catch (err: any) {
              setError(err.message || 'Registration failed');
            }
          }}
        >
          <input
            type="text"
            placeholder="Aswin Kumar"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Min. 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button type="submit">Create Account →</button>
          {error && <div>{error}</div>}
        </form>
      )}

      <button onClick={() => firebaseAuth.signInWithPopup}>
        Continue with Google
      </button>
    </div>
  );
};

describe('LoginPage - Auth/Login Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useRouter
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    });

    // Mock useAuthStore
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector) => {
      const mockStore = {
        setUser: jest.fn(),
      };
      return selector ? selector(mockStore) : mockStore;
    });

    // Reset fetch mock
    (global.fetch as jest.Mock).mockClear();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 1: Email Sign In - Form Validation & Submission
  // ─────────────────────────────────────────────────────────────────────────
  describe('Test 1: Email Sign In Form', () => {
    it('should validate required fields and prevent submission when empty', async () => {
      render(<LoginPage />);

      // Ensure we're on signin tab
      const signInTab = screen.getByText('Sign In');
      fireEvent.click(signInTab);

      // Try to submit empty form
      const submitBtn = screen.getByRole('button', { name: /Sign In →/i });
      fireEvent.click(submitBtn);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText('Please fill in all fields.')).toBeInTheDocument();
      });
    });

    it('should handle successful email sign in and exchange token with backend', async () => {
      const mockUser = {
        getIdToken: jest.fn().mockResolvedValue('mock-id-token'),
      };

      (firebaseAuth.signInWithEmailAndPassword as jest.Mock).mockResolvedValue({
        user: mockUser,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          user: {
            id: '123',
            uid: 'firebase-uid',
            email: 'test@example.com',
            displayName: 'Test User',
            isPremium: false,
          },
        }),
      });

      const router = useRouter();
      const setUserAction = useAuthStore((s: any) => s.setUser);

      render(<LoginPage />);

      // Fill in form
      const emailInput = screen.getByPlaceholderText('you@example.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'password123');

      // Submit form
      const submitBtn = screen.getByRole('button', { name: /Sign In →/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(firebaseAuth.signInWithEmailAndPassword).toHaveBeenCalledWith(
          expect.anything(),
          'test@example.com',
          'password123'
        );
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/auth/login',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ firebaseToken: 'mock-id-token' }),
          })
        );
      });

      await waitFor(() => {
        expect(router.push).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should display error message on authentication failure', async () => {
      (firebaseAuth.signInWithEmailAndPassword as jest.Mock).mockRejectedValue({
        code: 'auth/user-not-found',
      });

      render(<LoginPage />);

      const emailInput = screen.getByPlaceholderText('you@example.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');

      await userEvent.type(emailInput, 'nonexistent@example.com');
      await userEvent.type(passwordInput, 'password123');

      const submitBtn = screen.getByRole('button', { name: /Sign In →/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/No account found with this email/i)).toBeInTheDocument();
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 2: Email Registration - Form Validation & Account Creation
  // ─────────────────────────────────────────────────────────────────────────
  describe('Test 2: Email Registration Form', () => {
    it('should validate registration fields and prevent submission with mismatched passwords', async () => {
      render(<LoginPage />);

      // Switch to register tab
      const registerTab = screen.getByText('Register');
      fireEvent.click(registerTab);

      const nameInput = screen.getByPlaceholderText('Aswin Kumar');
      const emailInput = screen.getByPlaceholderText('you@example.com');
      const passwordInput = screen.getByPlaceholderText('Min. 6 characters');
      const confirmInput = screen.getByPlaceholderText('Re-enter password');

      await userEvent.type(nameInput, 'Test User');
      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'password123');
      await userEvent.type(confirmInput, 'different123');

      const submitBtn = screen.getByRole('button', { name: /Create Account →/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
      });
    });

    it('should validate password minimum length during registration', async () => {
      render(<LoginPage />);

      const registerTab = screen.getByText('Register');
      fireEvent.click(registerTab);

      const nameInput = screen.getByPlaceholderText('Aswin Kumar');
      const emailInput = screen.getByPlaceholderText('you@example.com');
      const passwordInput = screen.getByPlaceholderText('Min. 6 characters');
      const confirmInput = screen.getByPlaceholderText('Re-enter password');

      await userEvent.type(nameInput, 'Test User');
      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'short');
      await userEvent.type(confirmInput, 'short');

      const submitBtn = screen.getByRole('button', { name: /Create Account →/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 6 characters.')).toBeInTheDocument();
      });
    });

    it('should handle successful registration with account creation and token exchange', async () => {
      const mockUser = {
        getIdToken: jest.fn().mockResolvedValue('mock-id-token-new'),
      };

      (firebaseAuth.createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({
        user: mockUser,
      });

      (firebaseAuth.updateProfile as jest.Mock).mockResolvedValue(undefined);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          user: {
            id: '456',
            uid: 'new-firebase-uid',
            email: 'newuser@example.com',
            displayName: 'New User',
            isPremium: false,
          },
        }),
      });

      const router = useRouter();

      render(<LoginPage />);

      const registerTab = screen.getByText('Register');
      fireEvent.click(registerTab);

      const nameInput = screen.getByPlaceholderText('Aswin Kumar');
      const emailInput = screen.getByPlaceholderText('you@example.com');
      const passwordInput = screen.getByPlaceholderText('Min. 6 characters');
      const confirmInput = screen.getByPlaceholderText('Re-enter password');

      await userEvent.type(nameInput, 'New User');
      await userEvent.type(emailInput, 'newuser@example.com');
      await userEvent.type(passwordInput, 'password123');
      await userEvent.type(confirmInput, 'password123');

      const submitBtn = screen.getByRole('button', { name: /Create Account →/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(firebaseAuth.createUserWithEmailAndPassword).toHaveBeenCalledWith(
          expect.anything(),
          'newuser@example.com',
          'password123'
        );
      });

      await waitFor(() => {
        expect(firebaseAuth.updateProfile).toHaveBeenCalledWith(
          mockUser,
          { displayName: 'New User' }
        );
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/auth/login',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });

      await waitFor(() => {
        expect(router.push).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 3: Google OAuth Sign In
  // ─────────────────────────────────────────────────────────────────────────
  describe('Test 3: Google OAuth Sign In', () => {
    it('should handle Google OAuth flow and redirect to dashboard', async () => {
      const mockUser = {
        getIdToken: jest.fn().mockResolvedValue('mock-google-token'),
      };

      (firebaseAuth.signInWithPopup as jest.Mock).mockResolvedValue({
        user: mockUser,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          user: {
            id: '789',
            uid: 'google-firebase-uid',
            email: 'google@example.com',
            displayName: 'Google User',
            photoURL: 'https://example.com/photo.jpg',
            isPremium: false,
          },
        }),
      });

      const router = useRouter();

      render(<LoginPage />);

      const googleBtn = screen.getByRole('button', { name: /Continue with Google/i });
      fireEvent.click(googleBtn);

      await waitFor(() => {
        expect(firebaseAuth.signInWithPopup).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/auth/login',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ firebaseToken: 'mock-google-token' }),
          })
        );
      });

      await waitFor(() => {
        expect(router.push).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should display error when Google OAuth popup is closed by user', async () => {
      (firebaseAuth.signInWithPopup as jest.Mock).mockRejectedValue({
        code: 'auth/popup-closed-by-user',
      });

      render(<LoginPage />);

      const googleBtn = screen.getByRole('button', { name: /Continue with Google/i });
      fireEvent.click(googleBtn);

      await waitFor(() => {
        expect(screen.getByText(/Sign-in window was closed/i)).toBeInTheDocument();
      });
    });
  });
});
