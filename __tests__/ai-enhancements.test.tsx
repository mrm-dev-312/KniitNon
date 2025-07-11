/**
 * Tests for AI Enhancement Components
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    (fetch as jest.Mock).mockResolvedValue({
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
        />
      );

      expect(screen.getByText('Advanced AI Research Assistant')).toBeInTheDocument();
      expect(screen.getByText('Smart Suggestions')).toBeInTheDocument();
      expect(screen.getByText('Research Gaps')).toBeInTheDocument();
      expect(screen.getByText('Topic Clusters')).toBeInTheDocument();
    });

    it('should handle generating suggestions', async () => {
      const mockOnSuggestionImplemented = jest.fn();
      
      render(
        <AdvancedAIAssistant
          nodes={mockNodes}
          currentContext="test context"
          researchFocus="artificial intelligence"
          onSuggestionImplemented={mockOnSuggestionImplemented}
          onNodesGenerated={jest.fn()}
        />
      );

      const generateButton = screen.getByText('Generate Analysis');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/ai/advanced-suggestions', expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('artificial intelligence')
        }));
      });
    });

    it('should handle academic level changes', () => {
      render(
        <AdvancedAIAssistant
          nodes={mockNodes}
          currentContext="test context"
          researchFocus="artificial intelligence"
          onSuggestionImplemented={jest.fn()}
          onNodesGenerated={jest.fn()}
        />
      );

      const academicSelect = screen.getByDisplayValue('undergraduate');
      fireEvent.change(academicSelect, { target: { value: 'graduate' } });

      expect(academicSelect).toHaveValue('graduate');
    });
  });

  describe('HierarchicalOutlineBuilder', () => {
    it('should render outline builder with nodes', () => {
      render(
        <HierarchicalOutlineBuilder
          nodes={mockNodes}
          onNodesChange={jest.fn()}
          onStructureUpdate={jest.fn()}
        />
      );

      expect(screen.getByText('Hierarchical Outline Builder')).toBeInTheDocument();
      expect(screen.getByText('Artificial Intelligence')).toBeInTheDocument();
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    });

    it('should handle adding new outline level', () => {
      const mockOnNodesChange = jest.fn();
      
      render(
        <HierarchicalOutlineBuilder
          nodes={mockNodes}
          onNodesChange={mockOnNodesChange}
          onStructureUpdate={jest.fn()}
        />
      );

      const addButton = screen.getByText('Add Topic');
      fireEvent.click(addButton);

      // Should have called onNodesChange with new node
      expect(mockOnNodesChange).toHaveBeenCalled();
    });

    it('should generate AI structure suggestions', async () => {
      render(
        <HierarchicalOutlineBuilder
          nodes={mockNodes}
          onNodesChange={jest.fn()}
          onStructureUpdate={jest.fn()}
        />
      );

      const aiStructureButton = screen.getByText('AI Structure');
      fireEvent.click(aiStructureButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/ai/advanced-suggestions', expect.any(Object));
      });
    });
  });

  describe('StrategicNodeGenerator', () => {
    it('should render strategic node generator', () => {
      render(
        <StrategicNodeGenerator
          currentNodes={mockNodes}
          researchFocus="artificial intelligence"
          onNodesGenerated={jest.fn()}
        />
      );

      expect(screen.getByText('Strategic Node Generator')).toBeInTheDocument();
      expect(screen.getByText('Strategy')).toBeInTheDocument();
    });

    it('should handle strategy selection', () => {
      render(
        <StrategicNodeGenerator
          currentNodes={mockNodes}
          researchFocus="artificial intelligence"
          onNodesGenerated={jest.fn()}
        />
      );

      const strategySelect = screen.getByLabelText('Strategy');
      fireEvent.change(strategySelect, { target: { value: 'field_boundaries' } });

      expect(strategySelect).toHaveValue('field_boundaries');
    });

    it('should generate strategic nodes', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
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
            totalNodes: 1
          }
        })
      });

      render(
        <StrategicNodeGenerator
          currentNodes={mockNodes}
          researchFocus="artificial intelligence"
          onNodesGenerated={jest.fn()}
        />
      );

      const generateButton = screen.getByText('Generate Strategic Nodes');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/ai/strategic-nodes', expect.objectContaining({
          method: 'POST'
        }));
      });

      await waitFor(() => {
        expect(screen.getByText('Strategic Node')).toBeInTheDocument();
      });
    });

    it('should handle node adoption', async () => {
      const mockOnNodesGenerated = jest.fn();
      
      (fetch as jest.Mock).mockResolvedValueOnce({
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

      render(
        <StrategicNodeGenerator
          currentNodes={mockNodes}
          researchFocus="artificial intelligence"
          onNodesGenerated={mockOnNodesGenerated}
        />
      );

      // Generate nodes first
      const generateButton = screen.getByText('Generate Strategic Nodes');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Strategic Node')).toBeInTheDocument();
      });

      // Adopt the node
      const adoptButton = screen.getByText('Adopt');
      fireEvent.click(adoptButton);

      expect(mockOnNodesGenerated).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'strategic-1',
          title: 'Strategic Node'
        })
      ]);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

      render(
        <AdvancedAIAssistant
          nodes={mockNodes}
          currentContext="test context"
          researchFocus="artificial intelligence"
          onSuggestionImplemented={jest.fn()}
          onNodesGenerated={jest.fn()}
        />
      );

      const generateButton = screen.getByText('Generate Analysis');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('should handle empty nodes array', () => {
      render(
        <AdvancedAIAssistant
          nodes={[]}
          currentContext="test context"
          researchFocus="artificial intelligence"
          onSuggestionImplemented={jest.fn()}
          onNodesGenerated={jest.fn()}
        />
      );

      expect(screen.getByText('Advanced AI Research Assistant')).toBeInTheDocument();
    });
  });
});
