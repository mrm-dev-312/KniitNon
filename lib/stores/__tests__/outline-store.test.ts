import { renderHook, act } from '@testing-library/react';
import { useOutlineStore } from '@/lib/stores/outline-store';

// Mock fetch
global.fetch = jest.fn();

describe('useOutlineStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useOutlineStore());
    
    expect(result.current.nodes).toEqual([]);
    expect(result.current.selectedNodeIds).toEqual([]);
    expect(result.current.conflicts).toBeNull();
    expect(result.current.summary).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('adds a node correctly', () => {
    const { result } = renderHook(() => useOutlineStore());
    
    act(() => {
      result.current.addNode({
        id: '1',
        title: 'Test Node',
        content: 'Test content',
        type: 'topic',
        parentId: undefined,
      });
    });

    expect(result.current.nodes).toHaveLength(1);
    expect(result.current.nodes[0]).toEqual({
      id: '1',
      title: 'Test Node',
      content: 'Test content',
      type: 'topic',
      order: 1,
      parentId: undefined,
    });
  });

  it('adds multiple nodes correctly', () => {
    const { result } = renderHook(() => useOutlineStore());
    
    const newNodes = [
      { id: '1', title: 'Node 1', type: 'topic' as const, parentId: undefined },
      { id: '2', title: 'Node 2', type: 'subtopic' as const, parentId: '1' },
    ];

    act(() => {
      result.current.addNodes(newNodes);
    });

    expect(result.current.nodes).toHaveLength(2);
    expect(result.current.nodes[0].order).toBe(1);
    expect(result.current.nodes[1].order).toBe(2);
  });

  it('removes a node correctly', () => {
    const { result } = renderHook(() => useOutlineStore());
    
    act(() => {
      result.current.addNode({
        id: '1',
        title: 'Test Node',
        type: 'topic',
        parentId: undefined,
      });
    });

    act(() => {
      result.current.removeNode('1');
    });

    expect(result.current.nodes).toHaveLength(0);
  });

  it('clears all nodes', () => {
    const { result } = renderHook(() => useOutlineStore());
    
    act(() => {
      result.current.addNode({
        id: '1',
        title: 'Test Node',
        type: 'topic',
        parentId: undefined,
      });
    });

    act(() => {
      result.current.clearNodes();
    });

    expect(result.current.nodes).toHaveLength(0);
    expect(result.current.selectedNodeIds).toEqual([]);
    expect(result.current.outlineContent).toBeNull();
  });

  it('toggles node selection', () => {
    const { result } = renderHook(() => useOutlineStore());
    
    act(() => {
      result.current.toggleNodeSelection('1');
    });

    expect(result.current.selectedNodeIds).toContain('1');

    act(() => {
      result.current.toggleNodeSelection('1');
    });

    expect(result.current.selectedNodeIds).not.toContain('1');
  });

  it('sets selected nodes', () => {
    const { result } = renderHook(() => useOutlineStore());
    
    act(() => {
      result.current.setSelectedNodes(['1', '2', '3']);
    });

    expect(result.current.selectedNodeIds).toEqual(['1', '2', '3']);
  });

  it('clears selection', () => {
    const { result } = renderHook(() => useOutlineStore());
    
    act(() => {
      result.current.setSelectedNodes(['1', '2', '3']);
    });

    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedNodeIds).toEqual([]);
  });

  it('sets nodes for project loading', () => {
    const { result } = renderHook(() => useOutlineStore());
    
    const nodes = [
      { id: '1', title: 'Node 1', type: 'topic', order: 1 },
      { id: '2', title: 'Node 2', type: 'subtopic', order: 2 },
    ];

    act(() => {
      result.current.setNodes(nodes);
    });

    expect(result.current.nodes).toEqual(nodes);
  });

  it('sets conflicts', () => {
    const { result } = renderHook(() => useOutlineStore());
    
    const conflicts = [
      { id: '1', type: 'methodological', severity: 'high' },
    ];

    act(() => {
      result.current.setConflicts(conflicts);
    });

    expect(result.current.conflicts).toEqual(conflicts);
  });

  it('sets summary', () => {
    const { result } = renderHook(() => useOutlineStore());
    
    const summary = {
      id: '1',
      summary: 'Test summary',
      keyInsights: ['insight 1', 'insight 2'],
    };

    act(() => {
      result.current.setSummary(summary);
    });

    expect(result.current.summary).toEqual(summary);
  });

  it('loads project data', () => {
    const { result } = renderHook(() => useOutlineStore());
    
    const projectData = {
      nodes: [
        { id: '1', title: 'Loaded Node', type: 'topic', order: 1 },
      ],
      conflicts: [
        { id: '1', type: 'empirical', severity: 'medium' },
      ],
      summary: {
        id: '1',
        summary: 'Project summary',
        keyInsights: ['insight'],
      },
    };

    act(() => {
      result.current.loadProject(projectData);
    });

    expect(result.current.nodes).toEqual(projectData.nodes);
    expect(result.current.conflicts).toEqual(projectData.conflicts);
    expect(result.current.summary).toEqual(projectData.summary);
    expect(result.current.selectedNodeIds).toEqual([]);
    expect(result.current.outlineContent).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('reorders nodes correctly', () => {
    const { result } = renderHook(() => useOutlineStore());
    
    act(() => {
      result.current.addNodes([
        { id: '1', title: 'Node 1', type: 'topic' },
        { id: '2', title: 'Node 2', type: 'topic' },
        { id: '3', title: 'Node 3', type: 'topic' },
      ]);
    });

    act(() => {
      result.current.reorderNodes(0, 2); // Move first node to third position
    });

    expect(result.current.nodes[0].title).toBe('Node 2');
    expect(result.current.nodes[1].title).toBe('Node 3');
    expect(result.current.nodes[2].title).toBe('Node 1');
    
    // Check that orders are updated
    expect(result.current.nodes[0].order).toBe(0);
    expect(result.current.nodes[1].order).toBe(1);
    expect(result.current.nodes[2].order).toBe(2);
  });

  it('fetches outline content successfully', async () => {
    const { result } = renderHook(() => useOutlineStore());
    
    const mockResponse = {
      outline: 'Generated outline content',
      nodes: ['1', '2'],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    await act(async () => {
      await result.current.fetchOutlineContent(['1', '2']);
    });

    expect(result.current.outlineContent).toEqual(mockResponse);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles fetch outline content error', async () => {
    const { result } = renderHook(() => useOutlineStore());
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
    });

    await act(async () => {
      await result.current.fetchOutlineContent(['1', '2']);
    });

    expect(result.current.outlineContent).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('Failed to fetch outline: Internal Server Error');
  });
});
