import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AuthButton } from '../AuthButton';

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

const mockPush = jest.fn();
const mockSignOut = jest.fn();

beforeEach(() => {
  // Create portal root for Radix UI dropdown
  if (!document.getElementById('portals')) {
    const portalRoot = document.createElement('div');
    portalRoot.setAttribute('id', 'portals');
    document.body.appendChild(portalRoot);
  }
  
  jest.clearAllMocks();
  (useRouter as jest.Mock).mockReturnValue({
    push: mockPush,
  });
  const { signOut } = require('next-auth/react');
  signOut.mockImplementation(mockSignOut);
});

describe('AuthButton', () => {
  describe('Loading State', () => {
    it('should display loading button when session is loading', () => {
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
      });

      render(<AuthButton />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Unauthenticated State', () => {
    beforeEach(() => {
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });
    });

    it('should display sign in and sign up buttons when not authenticated', () => {
      render(<AuthButton />);
      
      expect(screen.getByText('Sign In')).toBeInTheDocument();
      expect(screen.getByText('Sign Up')).toBeInTheDocument();
    });

    it('should navigate to sign in page when sign in button is clicked', () => {
      render(<AuthButton />);
      
      const signInButton = screen.getByText('Sign In');
      fireEvent.click(signInButton);
      
      expect(mockPush).toHaveBeenCalledWith('/auth/signin');
    });

    it('should navigate to sign up page when sign up button is clicked', () => {
      render(<AuthButton />);
      
      const signUpButton = screen.getByText('Sign Up');
      fireEvent.click(signUpButton);
      
      expect(mockPush).toHaveBeenCalledWith('/auth/signup');
    });
  });

  describe('Authenticated State', () => {
    const mockUser = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      twoFactorEnabled: false,
    };

    beforeEach(() => {
      (useSession as jest.Mock).mockReturnValue({
        data: {
          user: mockUser,
        },
        status: 'authenticated',
      });
    });

    it('should display user name in dropdown trigger', () => {
      render(<AuthButton />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should display user email when user has no name', () => {
      (useSession as jest.Mock).mockReturnValue({
        data: {
          user: { ...mockUser, name: undefined },
        },
        status: 'authenticated',
      });

      render(<AuthButton />);
      
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    });

    it('should display "User" when user has no name or email', () => {
      (useSession as jest.Mock).mockReturnValue({
        data: {
          user: { ...mockUser, name: undefined, email: undefined },
        },
        status: 'authenticated',
      });

      render(<AuthButton />);
      
      expect(screen.getByText('User')).toBeInTheDocument();
    });

    it('should show 2FA badge when two factor is enabled', () => {
      (useSession as jest.Mock).mockReturnValue({
        data: {
          user: { ...mockUser, twoFactorEnabled: true },
        },
        status: 'authenticated',
      });

      render(<AuthButton />);
      
      expect(screen.getByText('2FA')).toBeInTheDocument();
    });

    it('should not show 2FA badge when two factor is disabled', () => {
      render(<AuthButton />);
      
      expect(screen.queryByText('2FA')).not.toBeInTheDocument();
    });

    it('should open dropdown menu when trigger is clicked', async () => {
      const user = userEvent.setup();
      render(<AuthButton />);
      
      const trigger = screen.getByRole('button', { name: /john doe/i });
      await user.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByText('Signed in as')).toBeInTheDocument();
        expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
        expect(screen.getByText('Profile Settings')).toBeInTheDocument();
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Sign Out')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should navigate to profile when Profile Settings is clicked', async () => {
      const user = userEvent.setup();
      render(<AuthButton />);
      
      const trigger = screen.getByRole('button', { name: /john doe/i });
      await user.click(trigger);
      
      await waitFor(() => {
        const profileItem = screen.getByText('Profile Settings');
        fireEvent.click(profileItem);
        
        expect(mockPush).toHaveBeenCalledWith('/profile');
      });
    });

    it('should navigate to dashboard when Dashboard is clicked', async () => {
      const user = userEvent.setup();
      render(<AuthButton />);
      
      const trigger = screen.getByRole('button', { name: /john doe/i });
      await user.click(trigger);
      
      await waitFor(() => {
        const dashboardItem = screen.getByText('Dashboard');
        fireEvent.click(dashboardItem);
        
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should show security option when 2FA is enabled', async () => {
      (useSession as jest.Mock).mockReturnValue({
        data: {
          user: { ...mockUser, twoFactorEnabled: true },
        },
        status: 'authenticated',
      });

      const user = userEvent.setup();
      render(<AuthButton />);
      
      const trigger = screen.getByRole('button', { name: /john doe/i });
      await user.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByText('Security')).toBeInTheDocument();
      });
    });

    it('should not show security option when 2FA is disabled', async () => {
      render(<AuthButton />);
      
      const trigger = screen.getByText('John Doe');
      fireEvent.click(trigger);
      
      await waitFor(() => {
        expect(screen.queryByText('Security')).not.toBeInTheDocument();
      });
    });

    it('should call signOut when Sign Out is clicked', async () => {
      const user = userEvent.setup();
      render(<AuthButton />);
      
      const trigger = screen.getByRole('button', { name: /john doe/i });
      await user.click(trigger);
      
      await waitFor(() => {
        const signOutItem = screen.getByText('Sign Out');
        fireEvent.click(signOutItem);
        
        expect(mockSignOut).toHaveBeenCalled();
      });
    });
  });
});
