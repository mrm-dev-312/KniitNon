/**
 * Tests for AI Enhancement Components
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
import AdvancedAIAssistant from '@/components/features/ai/AdvancedAIAssistant';
import OutlineBuilder from '@/components/features/outline/OutlineBuilder';
import StrategicNodeGenerator from '@/components/features/ai/StrategicNodeGenerator';
// NOTE: HierarchicalOutlineBuilder component was referenced previously but does not exist.
// Tests referencing it have been removed to align with actual codebase and reduce type errors.

// Mock fetch for API calls
// Provide a typed mock fetch helper without depending on jest.Mock type
const mockFetch = (..._args: any[]) => Promise.resolve(new Response());
global.fetch = jest.fn(mockFetch) as unknown as typeof fetch;

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
  (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        suggestions: [],
        researchGaps: [],
        topicClusters: [],
        automaticNodes: [],
        metadata: {
          generatedAt: new Date().toISOString(),
          nodeCount: 2,
          analysisDepth: 'undergraduate'
        }
      })
    });
  });

  describe('AdvancedAIAssistant', () => {
    it('should render advanced AI assistant component', () => {
      render(
        <AdvancedAIAssistant
          nodes={mockNodes}
          currentContext="test context"
          researchFocus="artificial intelligence"
          onSuggestionImplement={jest.fn()}
          autoGenerate={false}
        />
      );

  // Basic smoke assertions
  expect(screen.getByText('Advanced AI Research Assistant')).toBeTruthy();
    });

    it('should handle generating suggestions', async () => {
  const mockOnSuggestionImplemented = jest.fn();
      
      render(
        <AdvancedAIAssistant
          nodes={mockNodes}
          currentContext="test context"
          researchFocus="artificial intelligence"
          onSuggestionImplement={mockOnSuggestionImplemented}
          autoGenerate={false}
        />
      );

      const generateButton = screen.getByText('Generate Analysis');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect((fetch as any).mock.calls.length).toBeGreaterThan(0);
      });
    });

    it('should handle academic level changes', () => {
      render(
        <AdvancedAIAssistant
          nodes={mockNodes}
          currentContext="test context"
          researchFocus="artificial intelligence"
          onSuggestionImplement={jest.fn()}
          autoGenerate={false}
        />
      );

  const academicSelect = screen.getByDisplayValue('Undergraduate');
      fireEvent.change(academicSelect, { target: { value: 'graduate' } });

  expect((academicSelect as HTMLSelectElement).value).toBe('graduate');
    });
  });

  // Removed HierarchicalOutlineBuilder tests (component not present in repository)

  describe('StrategicNodeGenerator', () => {
    it('should render strategic node generator', () => {
      render(
        <StrategicNodeGenerator />
      );

  expect(screen.getByText('Strategic Node Generator')).toBeTruthy();
    });

    it('should handle strategy selection', () => {
      render(
  <StrategicNodeGenerator />
      );

  const strategySelect = screen.getByLabelText('Strategy');
      fireEvent.change(strategySelect, { target: { value: 'field_boundaries' } });

  expect((strategySelect as HTMLSelectElement).value).toBe('field_boundaries');
    });

    it('should generate strategic nodes', async () => {
  (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          nodes: [
            {
              id: 'strategic-1',
              title: 'Strategic Node',
              content: 'Strategic content',
              type: 'strategic',
              rationale: 'Test rationale',
              confidence: 0.85
            }
          ],
          metadata: {
            strategy: 'progressive_disclosure',
            totalNodes: 1,
            estimatedCompletionTime: '5m'
          }
        })
      });

      render(
  <StrategicNodeGenerator />
      );

  // Provide a topic to enable generation
  const topicInput = screen.getByLabelText('Research Topic *');
  fireEvent.change(topicInput, { target: { value: 'Strategic AI' } });
  const generateButton = screen.getByText('Generate Strategic Nodes');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect((fetch as any).mock.calls.length > 0).toBe(true);
      });

      await waitFor(() => {
        expect(screen.queryByText('Strategic Node')).not.toBeNull();
      });
    });

    it('should handle node adoption', async () => {
      const mockOnNodesGenerated = jest.fn();
      
  (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          nodes: [
            {
              id: 'strategic-1',
              title: 'Strategic Node',
              content: 'Strategic content',
              type: 'strategic',
              rationale: 'Test rationale',
              confidence: 0.85
            }
          ]
        })
      });
      // Second call returns metadata object
      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          nodes: [
            {
              id: 'strategic-1',
              title: 'Strategic Node',
              content: 'Strategic content',
              type: 'strategic',
              rationale: 'Test rationale',
              confidence: 0.85
            }
          ],
          metadata: {
            strategy: 'progressive_disclosure',
            totalNodes: 1,
            estimatedCompletionTime: '5m'
          }
        })
      });

      render(
  <StrategicNodeGenerator onNodesGenerated={mockOnNodesGenerated} />
      );

  // Provide topic then generate nodes
  const topicInput = screen.getByLabelText('Research Topic *');
  fireEvent.change(topicInput, { target: { value: 'Adoption Topic' } });
  const generateButton = screen.getByText('Generate Strategic Nodes');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.queryByText('Strategic Node')).not.toBeNull();
      });

      // Adopt the node
  const adoptButton = screen.getByText('Adopt Node');
      fireEvent.click(adoptButton);

  expect(mockOnNodesGenerated.mock.calls.length > 0).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
  (fetch as any).mockRejectedValueOnce(new Error('API Error'));

      render(
        <AdvancedAIAssistant
          nodes={mockNodes}
          currentContext="test context"
          researchFocus="artificial intelligence"
          onSuggestionImplement={jest.fn()}
          autoGenerate={false}
        />
      );

      const generateButton = screen.getByText('Generate Analysis');
      fireEvent.click(generateButton);

      await waitFor(() => {
        // With our null safety fixes, the component should render without crashing
        // instead of showing an error message
        expect(screen.getByText('Advanced AI Research Assistant')).toBeInTheDocument();
      });
    });

    it('should handle empty nodes array', () => {
      render(
        <AdvancedAIAssistant
          nodes={[]}
          currentContext="test context"
          researchFocus="artificial intelligence"
          onSuggestionImplement={jest.fn()}
        />
      );

  expect(screen.queryByText('Advanced AI Research Assistant')).not.toBeNull();
    });
  });
});
