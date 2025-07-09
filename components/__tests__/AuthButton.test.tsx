import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { AuthButton } from '@/components/AuthButton';

// Mock next-auth at the module level
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;

describe('AuthButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows sign in button when user is not authenticated', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    });

    render(<AuthButton />);

    expect(screen.getByText('Sign In')).toBeTruthy();
  });

  it('shows user information when authenticated', () => {
    const mockSession = {
      user: {
        name: 'John Doe',
        email: 'john@example.com',
        image: 'https://example.com/avatar.jpg',
      },
      expires: '2024-12-31',
    };

    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    });

    render(<AuthButton />);

    expect(screen.getByText('Welcome, John Doe')).toBeTruthy();
    expect(screen.getByText('Sign Out')).toBeTruthy();
  });

  it('shows loading state when session is loading', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
      update: jest.fn(),
    });

    render(<AuthButton />);

    expect(screen.getByText('Loading...')).toBeTruthy();
  });

  it('opens dialog when sign in button is clicked', async () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    });

    render(<AuthButton />);

    const signInButton = screen.getByText('Sign In');
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(screen.getByText('Sign in to your account')).toBeTruthy();
    });
  });

  it('calls signOut when sign out button is clicked', async () => {
    const mockSession = {
      user: {
        name: 'John Doe',
        email: 'john@example.com',
        image: 'https://example.com/avatar.jpg',
      },
      expires: '2024-12-31',
    };

    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    });

    mockSignOut.mockResolvedValue({ url: 'http://localhost:3000' });

    render(<AuthButton />);

    const signOutButton = screen.getByText('Sign Out');
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  it('handles missing user name gracefully', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          email: 'john@example.com',
          // Missing name
        },
        expires: '2024-12-31',
      },
      status: 'authenticated',
      update: jest.fn(),
    });

    render(<AuthButton />);

    expect(screen.getByText('Welcome, john@example.com')).toBeTruthy();
  });

  it('shows Google and GitHub sign in options in dialog', async () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    });

    render(<AuthButton />);

    const signInButton = screen.getByText('Sign In');
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(screen.getByText('Continue with Google')).toBeTruthy();
      expect(screen.getByText('Continue with GitHub')).toBeTruthy();
    });
  });

  it('calls signIn with Google when Google button is clicked', async () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    });

    mockSignIn.mockResolvedValue({ error: null, status: 200, ok: true, url: null });

    render(<AuthButton />);

    const signInButton = screen.getByText('Sign In');
    fireEvent.click(signInButton);

    await waitFor(() => {
      const googleButton = screen.getByText('Continue with Google');
      fireEvent.click(googleButton);
    });

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('google', { callbackUrl: '/' });
    });
  });
});
