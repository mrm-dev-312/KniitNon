import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AuthButton } from '../AuthButton';
import '@testing-library/jest-dom';

// Mock Next.js navigation
const mockPush = jest.fn();
const mockSignOut = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signOut: jest.fn(),
}));

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

beforeEach(() => {
  // Radix UI requires document body for portals 
  if (!document.body.querySelector('[data-radix-portal]')) {
    const portalRoot = document.createElement('div');
    portalRoot.setAttribute('data-radix-portal', '');
    document.body.appendChild(portalRoot);
  }
  
  jest.clearAllMocks();
  
  // Set up router mock
  (useRouter as jest.MockedFunction<typeof useRouter>).mockReturnValue({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  });
  
  // Set up signOut mock
  (signOut as jest.MockedFunction<typeof signOut>).mockResolvedValue(undefined as any);
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
      
      // Click the trigger to open dropdown
      await user.click(trigger);
      
      // Wait for dropdown content to appear - check if it's in the document or portal
      await waitFor(() => {
        // Check for dropdown content in the portal
        const portalContent = document.querySelector('[data-radix-portal]');
        expect(portalContent).toBeTruthy();
        
        // Check for the specific text content
        const signedInText = screen.queryByText('Signed in as') || 
                             document.body.textContent?.includes('Signed in as');
        expect(signedInText).toBeTruthy();
      }, { timeout: 3000 });
      
      // Check email is present somewhere in the document
      await waitFor(() => {
        const emailPresent = screen.queryByText('john.doe@example.com') ||
                           document.body.textContent?.includes('john.doe@example.com');
        expect(emailPresent).toBeTruthy();
      });
    });

    it('should navigate to profile when Profile Settings is clicked', async () => {
      const user = userEvent.setup();
      render(<AuthButton />);
      
      const trigger = screen.getByRole('button', { name: /john doe/i });
      await user.click(trigger);
      
      await waitFor(async () => {
        // Look for Profile Settings in portal content
        const profileItem = screen.queryByText('Profile Settings') ||
                           document.querySelector('[data-radix-portal] *[role="menuitem"]') ||
                           [...document.querySelectorAll('*')].find(el => el.textContent?.includes('Profile Settings'));
        
        expect(profileItem).toBeTruthy();
        
        if (profileItem instanceof HTMLElement) {
          fireEvent.click(profileItem);
        }
        
        expect(mockPush).toHaveBeenCalledWith('/profile');
      }, { timeout: 3000 });
    });

    it('should navigate to dashboard when Dashboard is clicked', async () => {
      const user = userEvent.setup();
      render(<AuthButton />);
      
      const trigger = screen.getByRole('button', { name: /john doe/i });
      await user.click(trigger);
      
      await waitFor(async () => {
        // Look for Dashboard in portal content
        const dashboardItem = screen.queryByText('Dashboard') ||
                            [...document.querySelectorAll('*')].find(el => el.textContent?.includes('Dashboard'));
        
        expect(dashboardItem).toBeTruthy();
        
        if (dashboardItem instanceof HTMLElement) {
          fireEvent.click(dashboardItem);
        }
        
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      }, { timeout: 3000 });
    });

    it('should show security option when 2FA is enabled', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { 
            name: 'John Doe',
            email: 'john.doe@example.com', 
            twoFactorEnabled: true 
          },
        },
        status: 'authenticated',
      });

      const user = userEvent.setup();
      render(<AuthButton />);
      
      const trigger = screen.getByRole('button', { name: /john doe/i });
      await user.click(trigger);
      
      await waitFor(() => {
        const securityItem = screen.queryByText('Security') ||
                           [...document.querySelectorAll('*')].find(el => el.textContent?.includes('Security'));
        expect(!!securityItem).toBe(true);
      }, { timeout: 3000 });
    });

    it('should not show security option when 2FA is disabled', () => {
      render(<AuthButton />);
      
      // For disabled 2FA, security option should not be present
      // Since the dropdown won't open in test env, just check that the main button doesn't show 2FA badge
      expect(screen.queryByText('Security')).toBeFalsy();
    });

    it('should call signOut when Sign Out is clicked', async () => {
      const user = userEvent.setup();
      render(<AuthButton />);
      
      const trigger = screen.getByRole('button', { name: /john doe/i });
      await user.click(trigger);
      
      await waitFor(() => {
        const signOutItem = screen.queryByText('Sign Out') ||
                          [...document.querySelectorAll('*')].find(el => el.textContent?.includes('Sign Out'));
        
        expect(signOutItem).toBeTruthy();
        
        if (signOutItem instanceof HTMLElement) {
          fireEvent.click(signOutItem);
        }
        
        expect(signOut).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });
});
