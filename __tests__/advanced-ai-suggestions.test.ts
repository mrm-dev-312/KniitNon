import { NextRequest } from 'next/server';
import { POST } from '@/app/api/ai/advanced-suggestions/route';
import { extractJsonFromNextResponse } from './test-utils';

// Ensure Jest types are available
declare global {
  namespace jest {
    interface Matchers<R> {
      toBe(expected: any): R;
      toHaveProperty(property: string): R;
    }
  }
}

// Mock the AI clients
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                suggestions: [
                  {
                    id: 'test-suggestion-1',
                    type: 'node_expansion',
                    title: 'Test Suggestion',
                    description: 'A test suggestion for enhancement',
                    priority: 'high',
                    rationale: 'Test rationale',
                    implementationSteps: ['Step 1', 'Step 2']
                  }
                ],
                gaps: [
                  {
                    id: 'test-gap-1',
                    title: 'Test Gap',
                    description: 'A test research gap',
                    importance: 'high',
                    suggestedApproach: 'Test approach',
                    relatedNodes: [],
                    potentialSources: ['Source 1']
                  }
                ]
              })
            }
          }],
          usage: { total_tokens: 100 }
        })
      }
    }
  }))
}));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockImplementation(() => ({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            suggestions: [
              {
                id: 'gemini-suggestion-1',
                type: 'research_gap',
                title: 'Gemini Test Suggestion',
                description: 'A test suggestion from Gemini',
                priority: 'medium',
                rationale: 'Gemini test rationale',
                implementationSteps: ['Gemini Step 1']
              }
            ]
          })
        }
      })
    }))
  }))
}));

// Helper function to create mock NextRequest
const createMockRequest = (body: any): NextRequest => {
  return {
    json: jest.fn().mockResolvedValue(body),
    method: 'POST',
    url: 'http://localhost:3000/api/ai/advanced-suggestions'
  } as unknown as NextRequest;
};

describe('/api/ai/advanced-suggestions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate advanced suggestions successfully', async () => {
    const mockRequest = createMockRequest({
      nodes: [
        {
          id: 'test-node-1',
          title: 'Test Node',
          content: 'Test content',
          type: 'topic',
          connections: [],
          depth: 0
        }
      ],
      currentContext: 'test context',
      researchFocus: 'artificial intelligence',
      academicLevel: 'undergraduate',
      suggestionTypes: ['node_expansion', 'research_gap'],
      maxSuggestions: 5
    });

    const response = await POST(mockRequest);
    
    expect(response.status).toBe(200);
    
    // Use utility to extract JSON from NextResponse
    const data = await extractJsonFromNextResponse(response);
    expect(data).toHaveProperty('suggestions');
    expect(data).toHaveProperty('researchGaps');
    expect(data).toHaveProperty('topicClusters');
    expect(data).toHaveProperty('automaticNodes');
    expect(data).toHaveProperty('metadata');
    expect(data.metadata).toHaveProperty('generatedAt');
    expect(data.metadata).toHaveProperty('nodeCount');
  });

  it('should return 400 for missing nodes', async () => {
    const mockRequest = createMockRequest({
      currentContext: 'test context'
    });

    const response = await POST(mockRequest);
    const data = await extractJsonFromNextResponse(response);

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
    expect(data.error).toBe('No nodes provided for analysis');
  });

  it('should handle empty nodes array', async () => {
    const mockRequest = createMockRequest({
      nodes: [],
      currentContext: 'test context'
    });

    const response = await POST(mockRequest);
    const data = await extractJsonFromNextResponse(response);

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });

  it('should handle different academic levels', async () => {
    const mockRequest = createMockRequest({
      nodes: [
        {
          id: 'test-node-1',
          title: 'Test Node',
          content: 'Test content',
          type: 'topic'
        }
      ],
      academicLevel: 'graduate'
    });

    const response = await POST(mockRequest);
    const data = await extractJsonFromNextResponse(response);

    expect(response.status).toBe(200);
    expect(data.metadata.analysisDepth).toBe('graduate');
  });

  it('should handle AI API errors gracefully', async () => {
    // Mock AI failure
    const openai = require('openai');
    openai.OpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockRejectedValue(new Error('AI API Error'))
        }
      }
    }));

    const mockRequest = createMockRequest({
      nodes: [
        {
          id: 'test-node-1',
          title: 'Test Node',
          content: 'Test content',
          type: 'topic'
        }
      ]
    });

    const response = await POST(mockRequest);
    const data = await extractJsonFromNextResponse(response);

    expect(response.status).toBe(200); // Should fallback gracefully
    expect(data).toHaveProperty('suggestions');
    expect(Array.isArray(data.suggestions)).toBe(true);
  });
});
