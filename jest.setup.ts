import '@testing-library/jest-dom';

// This file is imported by jest.config.js to set up Jest environment
// It includes Jest DOM matchers like toBeInTheDocument()

// Mock Next.js
jest.mock('next/router', () => require('next-router-mock'));
jest.mock('next/navigation', () => require('next-router-mock'));

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

// Global fetch mock setup
global.fetch = jest.fn();
