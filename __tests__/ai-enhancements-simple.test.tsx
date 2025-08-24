/**
 * Tests for AI Enhancement Components
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import AdvancedAIAssistant from '@/components/features/ai/AdvancedAIAssistant';
import OutlineBuilder from '@/components/features/outline/OutlineBuilder';
import StrategicNodeGenerator from '@/components/features/ai/StrategicNodeGenerator';

// Mock fetch for API calls with basic resolved Response
global.fetch = jest.fn(() => Promise.resolve(new Response())) as any;

const mockNodes = [
  {
    id: 'test-node-1',
    title: 'Artificial Intelligence',
    content: 'AI is a branch of computer science',
    type: 'topic' as const,
    connections: [],
    depth: 0,
    x: 100,
    y: 100
  },
  {
    id: 'test-node-2',
    title: 'Machine Learning',
    content: 'ML is a subset of AI',
    type: 'subtopic' as const,
    connections: ['test-node-1'],
    depth: 1,
    x: 200,
    y: 200
  }
];

describe('AI Enhancement Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AdvancedAIAssistant', () => {
    it('should render without crashing', () => {
      render(
        <AdvancedAIAssistant
          nodes={mockNodes}
          currentContext="test context"
          researchFocus="artificial intelligence"
          onSuggestionImplement={jest.fn()}
        />
      );
      
      // Basic render test - component should mount without errors
      expect(true).toBe(true);
    });
  });

  // Removed HierarchicalOutlineBuilder tests (component not present in codebase)

  describe('StrategicNodeGenerator', () => {
    it('should render without crashing', () => {
      render(
        <StrategicNodeGenerator
          onNodesGenerated={jest.fn()}
          onNodeAdopt={jest.fn()}
        />
      );
      
      // Basic render test - component should mount without errors
      expect(true).toBe(true);
    });
  });
});
