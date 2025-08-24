/**
 * Test utilities for handling NextResponse objects in Jest tests
 */
import { NextResponse } from 'next/server';
import { jest } from '@jest/globals';

/**
 * Centralized mock session data for tests
 */
export const mockSession = {
  user: {
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
};

/**
 * Mock useSession hook for consistent auth testing
 */
export const mockUseSession = (authenticated = true, loading = false) => ({
  data: authenticated ? mockSession : null,
  status: loading ? 'loading' : authenticated ? 'authenticated' : 'unauthenticated',
  update: jest.fn(),
});

/**
 * Extract JSON data from a NextResponse object
 * NextResponse.json() returns a Response with a string body in tests
 */
export async function extractJsonFromNextResponse(response: NextResponse): Promise<any> {
  // Check if it's a NextResponse
  if (response.constructor.name === 'NextResponse') {
    // For NextResponse in test environment, body is typically a string
    if (response.body) {
      // Try different approaches to read the body
      if (typeof response.body === 'string') {
        return JSON.parse(response.body);
      }
      
      // If it's a buffer or Uint8Array
      if (response.body instanceof Uint8Array) {
        const text = new TextDecoder().decode(response.body);
        return JSON.parse(text);
      }
      
      // If it has a getReader method (ReadableStream)
      if (response.body.getReader) {
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        
        let done = false;
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            chunks.push(value);
          }
        }
        
        // Combine all chunks
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }
        
        // Decode and parse
        const text = new TextDecoder().decode(combined);
        return JSON.parse(text);
      }
      
      // Fallback - try to convert to string
      const text = response.body.toString();
      return JSON.parse(text);
    }
  }
  
  // Fallback for regular Response objects
  return await response.json();
}

/**
 * Helper to create properly formatted mock NextRequest objects
 */
export function createMockNextRequest(body: any, method = 'POST'): any {
  return {
    json: jest.fn(() => Promise.resolve(body)) as any,
    method,
    headers: new Headers(),
    url: 'http://localhost:3000/test',
  };
}

// Add a simple test to prevent "no tests" error
describe('Test Utils', () => {
  it('should export utility functions', () => {
    expect(typeof extractJsonFromNextResponse).toBe('function');
    expect(typeof createMockNextRequest).toBe('function');
  });
});
