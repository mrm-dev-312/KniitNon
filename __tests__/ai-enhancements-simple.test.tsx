/**
 * Tests for AI Enhancement Components
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdvancedAIAssistant from '@/components/AdvancedAIAssistant';
import HierarchicalOutlineBuilder from '@/components/HierarchicalOutlineBuilder';
import StrategicNodeGenerator from '@/components/StrategicNodeGenerator';

// Mock fetch for API calls
global.fetch = jest.fn();

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

  describe('HierarchicalOutlineBuilder', () => {
    it('should render without crashing', () => {
      render(
        <HierarchicalOutlineBuilder
          onStructureChange={jest.fn()}
          onNodeAssociation={jest.fn()}
          availableNodes={mockNodes.map(node => ({ id: node.id, title: node.title, type: node.type }))}
          maxDepth={4}
        />
      );
      
      // Basic render test - component should mount without errors
      expect(true).toBe(true);
    });
  });

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
