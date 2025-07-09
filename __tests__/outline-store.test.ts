import { renderHook, act } from '@testing-library/react';
import { useOutlineStore, OutlineNode } from '@/lib/stores/outline-store';

// Mock fetch globally
global.fetch = jest.fn();

describe('Outline Store', () => {
  beforeEach(() => {
    // Reset the store before each test
    act(() => {
      useOutlineStore.getState().clearNodes();
      useOutlineStore.getState().clearSelection();
      useOutlineStore.getState().setDetailLevel('medium');
      useOutlineStore.getState().setError(null);
      useOutlineStore.getState().setLoading(false);
    });
    
    // Reset fetch mock
    (fetch as jest.Mock).mockClear();
  });

  describe('Node Management', () => {
    it('should add a single node', () => {
      const { result } = renderHook(() => useOutlineStore());
      
      const testNode: Omit<OutlineNode, 'order'> = {
        id: 'test-1',
        title: 'Test Node',
        content: 'Test content',
        type: 'topic'
      };

      act(() => {
        result.current.addNode(testNode);
      });

      expect(result.current.nodes).toHaveLength(1);
      expect(result.current.nodes[0]).toEqual({
        ...testNode,
        order: 1
      });
    });

    it('should add multiple nodes with correct ordering', () => {
      const { result } = renderHook(() => useOutlineStore());
      
      const testNodes: Omit<OutlineNode, 'order'>[] = [
        { id: 'test-1', title: 'Node 1', type: 'topic' },
        { id: 'test-2', title: 'Node 2', type: 'subtopic' },
        { id: 'test-3', title: 'Node 3', type: 'detail' }
      ];

      act(() => {
        result.current.addNodes(testNodes);
      });

      expect(result.current.nodes).toHaveLength(3);
      expect(result.current.nodes[0].order).toBe(1);
      expect(result.current.nodes[1].order).toBe(2);
      expect(result.current.nodes[2].order).toBe(3);
    });

    it('should maintain correct order when adding nodes to existing list', () => {
      const { result } = renderHook(() => useOutlineStore());
      
      // Add first node
      act(() => {
        result.current.addNode({ id: 'existing', title: 'Existing', type: 'topic' });
      });

      // Add multiple nodes
      const newNodes: Omit<OutlineNode, 'order'>[] = [
        { id: 'new-1', title: 'New 1', type: 'subtopic' },
        { id: 'new-2', title: 'New 2', type: 'detail' }
      ];

      act(() => {
        result.current.addNodes(newNodes);
      });

      expect(result.current.nodes).toHaveLength(3);
      expect(result.current.nodes[0].order).toBe(1); // existing
      expect(result.current.nodes[1].order).toBe(2); // new-1
      expect(result.current.nodes[2].order).toBe(3); // new-2
    });

    it('should remove a node by ID', () => {
      const { result } = renderHook(() => useOutlineStore());
      
      // Add test nodes
      act(() => {
        result.current.addNodes([
          { id: 'keep-1', title: 'Keep 1', type: 'topic' },
          { id: 'remove', title: 'Remove', type: 'subtopic' },
          { id: 'keep-2', title: 'Keep 2', type: 'detail' }
        ]);
      });

      expect(result.current.nodes).toHaveLength(3);

      act(() => {
        result.current.removeNode('remove');
      });

      expect(result.current.nodes).toHaveLength(2);
      expect(result.current.nodes.find(n => n.id === 'remove')).toBeUndefined();
      expect(result.current.nodes.find(n => n.id === 'keep-1')).toBeDefined();
      expect(result.current.nodes.find(n => n.id === 'keep-2')).toBeDefined();
    });

    it('should clear all nodes', () => {
      const { result } = renderHook(() => useOutlineStore());
      
      // Add test nodes
      act(() => {
        result.current.addNodes([
          { id: 'test-1', title: 'Test 1', type: 'topic' },
          { id: 'test-2', title: 'Test 2', type: 'subtopic' }
        ]);
        result.current.setSelectedNodes(['test-1']);
      });

      expect(result.current.nodes).toHaveLength(2);
      expect(result.current.selectedNodeIds).toHaveLength(1);

      act(() => {
        result.current.clearNodes();
      });

      expect(result.current.nodes).toHaveLength(0);
      expect(result.current.selectedNodeIds).toHaveLength(0);
      expect(result.current.outlineContent).toBeNull();
    });

    it('should reorder nodes correctly', () => {
      const { result } = renderHook(() => useOutlineStore());
      
      // Add test nodes
      act(() => {
        result.current.addNodes([
          { id: 'node-0', title: 'Node 0', type: 'topic' },
          { id: 'node-1', title: 'Node 1', type: 'subtopic' },
          { id: 'node-2', title: 'Node 2', type: 'detail' }
        ]);
      });

      // Move node from index 0 to index 2
      act(() => {
        result.current.reorderNodes(0, 2);
      });

      // Check the new order
      expect(result.current.nodes[0].id).toBe('node-1');
      expect(result.current.nodes[1].id).toBe('node-2');
      expect(result.current.nodes[2].id).toBe('node-0');

      // Check that order values are updated
      expect(result.current.nodes[0].order).toBe(0);
      expect(result.current.nodes[1].order).toBe(1);
      expect(result.current.nodes[2].order).toBe(2);
    });
  });

  describe('Node Selection', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useOutlineStore());
      
      // Add test nodes for selection tests
      act(() => {
        result.current.addNodes([
          { id: 'select-1', title: 'Select 1', type: 'topic' },
          { id: 'select-2', title: 'Select 2', type: 'subtopic' },
          { id: 'select-3', title: 'Select 3', type: 'detail' }
        ]);
      });
    });

    it('should toggle node selection', () => {
      const { result } = renderHook(() => useOutlineStore());

      // Select a node
      act(() => {
        result.current.toggleNodeSelection('select-1');
      });

      expect(result.current.selectedNodeIds).toContain('select-1');

      // Deselect the same node
      act(() => {
        result.current.toggleNodeSelection('select-1');
      });

      expect(result.current.selectedNodeIds).not.toContain('select-1');
    });

    it('should allow multiple node selection', () => {
      const { result } = renderHook(() => useOutlineStore());

      act(() => {
        result.current.toggleNodeSelection('select-1');
        result.current.toggleNodeSelection('select-2');
      });

      expect(result.current.selectedNodeIds).toHaveLength(2);
      expect(result.current.selectedNodeIds).toContain('select-1');
      expect(result.current.selectedNodeIds).toContain('select-2');
    });

    it('should set selected nodes directly', () => {
      const { result } = renderHook(() => useOutlineStore());

      act(() => {
        result.current.setSelectedNodes(['select-1', 'select-3']);
      });

      expect(result.current.selectedNodeIds).toEqual(['select-1', 'select-3']);
    });

    it('should clear selection', () => {
      const { result } = renderHook(() => useOutlineStore());

      // First select some nodes
      act(() => {
        result.current.setSelectedNodes(['select-1', 'select-2']);
      });

      expect(result.current.selectedNodeIds).toHaveLength(2);

      // Clear selection
      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedNodeIds).toHaveLength(0);
    });

    it('should remove node from selection when node is removed', () => {
      const { result } = renderHook(() => useOutlineStore());

      // Select a node
      act(() => {
        result.current.setSelectedNodes(['select-1', 'select-2']);
      });

      expect(result.current.selectedNodeIds).toContain('select-1');

      // Remove the selected node
      act(() => {
        result.current.removeNode('select-1');
      });

      expect(result.current.selectedNodeIds).not.toContain('select-1');
      expect(result.current.selectedNodeIds).toContain('select-2');
    });
  });

  describe('Detail Level Management', () => {
    it('should set detail level', () => {
      const { result } = renderHook(() => useOutlineStore());

      expect(result.current.detailLevel).toBe('medium');

      act(() => {
        result.current.setDetailLevel('high');
      });

      expect(result.current.detailLevel).toBe('high');

      act(() => {
        result.current.setDetailLevel('low');
      });

      expect(result.current.detailLevel).toBe('low');
    });
  });

  describe('Outline Content Fetching', () => {
    it('should fetch outline content successfully', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          title: 'Test Outline',
          sections: [{ id: '1', title: 'Section 1' }]
        })
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useOutlineStore());

      // Select some nodes first
      act(() => {
        result.current.addNodes([
          { id: 'test-1', title: 'Test 1', type: 'topic' },
          { id: 'test-2', title: 'Test 2', type: 'subtopic' }
        ]);
        result.current.setSelectedNodes(['test-1', 'test-2']);
      });

      await act(async () => {
        await result.current.fetchOutlineContent();
      });

      expect(fetch).toHaveBeenCalledWith('/api/research/outline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeIds: ['test-1', 'test-2'],
          detailLevel: 'medium',
        }),
      });

      expect(result.current.outlineContent).toEqual({
        title: 'Test Outline',
        sections: [{ id: '1', title: 'Section 1' }]
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch errors', async () => {
      const mockResponse = {
        ok: false,
        statusText: 'Internal Server Error'
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useOutlineStore());

      // Select some nodes first
      act(() => {
        result.current.setSelectedNodes(['test-1']);
      });

      await act(async () => {
        await result.current.fetchOutlineContent();
      });

      expect(result.current.error).toBe('Failed to fetch outline: Internal Server Error');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.outlineContent).toBeNull();
    });

    it('should clear outline content when no nodes selected', async () => {
      const { result } = renderHook(() => useOutlineStore());

      await act(async () => {
        await result.current.fetchOutlineContent();
      });

      expect(result.current.outlineContent).toBeNull();
      expect(result.current.error).toBeNull();
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should use provided nodeIds when specified', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ title: 'Custom Outline' })
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useOutlineStore());

      await act(async () => {
        await result.current.fetchOutlineContent(['custom-1', 'custom-2']);
      });

      expect(fetch).toHaveBeenCalledWith('/api/research/outline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeIds: ['custom-1', 'custom-2'],
          detailLevel: 'medium',
        }),
      });
    });
  });

  describe('Loading and Error States', () => {
    it('should manage loading state', () => {
      const { result } = renderHook(() => useOutlineStore());

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should manage error state', () => {
      const { result } = renderHook(() => useOutlineStore());

      expect(result.current.error).toBeNull();

      act(() => {
        result.current.setError('Test error message');
      });

      expect(result.current.error).toBe('Test error message');

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });
});
