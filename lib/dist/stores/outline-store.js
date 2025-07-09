'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useOutlineStore = void 0;
const zustand_1 = require("zustand");
exports.useOutlineStore = (0, zustand_1.create)((set, get) => ({
    // Initial state
    nodes: [],
    selectedNodeIds: [],
    detailLevel: 'medium',
    isLoading: false,
    error: null,
    outlineContent: null,
    // Actions
    addNode: (node) => set((state) => {
        const newOrder = Math.max(0, ...state.nodes.map(n => n.order)) + 1;
        return {
            nodes: [...state.nodes, { ...node, order: newOrder }]
        };
    }),
    addNodes: (nodes) => set((state) => {
        const maxOrder = Math.max(0, ...state.nodes.map(n => n.order));
        const newNodes = nodes.map((node, index) => ({
            ...node,
            order: maxOrder + index + 1
        }));
        return {
            nodes: [...state.nodes, ...newNodes]
        };
    }),
    removeNode: (nodeId) => set((state) => ({
        nodes: state.nodes.filter(node => node.id !== nodeId),
        selectedNodeIds: state.selectedNodeIds.filter(id => id !== nodeId)
    })),
    clearNodes: () => set(() => ({
        nodes: [],
        selectedNodeIds: [],
        outlineContent: null
    })),
    reorderNodes: (startIndex, endIndex) => set((state) => {
        const result = Array.from(state.nodes);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        // Update order values
        const reorderedNodes = result.map((node, index) => ({
            ...node,
            order: index
        }));
        return { nodes: reorderedNodes };
    }),
    toggleNodeSelection: (nodeId) => set((state) => ({
        selectedNodeIds: state.selectedNodeIds.includes(nodeId)
            ? state.selectedNodeIds.filter(id => id !== nodeId)
            : [...state.selectedNodeIds, nodeId]
    })),
    setSelectedNodes: (nodeIds) => set(() => ({ selectedNodeIds: nodeIds })),
    clearSelection: () => set(() => ({ selectedNodeIds: [] })),
    setDetailLevel: (level) => set(() => ({ detailLevel: level })),
    fetchOutlineContent: async (nodeIds) => {
        const state = get();
        const idsToFetch = nodeIds || state.selectedNodeIds;
        if (idsToFetch.length === 0) {
            set({ outlineContent: null, error: null });
            return;
        }
        set({ isLoading: true, error: null });
        try {
            const response = await fetch('/api/research/outline', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    nodeIds: idsToFetch,
                    detailLevel: state.detailLevel,
                }),
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch outline: ${response.statusText}`);
            }
            const outlineContent = await response.json();
            set({ outlineContent, isLoading: false });
        }
        catch (error) {
            console.error('Error fetching outline content:', error);
            set({
                error: error instanceof Error ? error.message : 'Failed to fetch outline content',
                isLoading: false
            });
        }
    },
    setLoading: (loading) => set(() => ({ isLoading: loading })),
    setError: (error) => set(() => ({ error })),
}));
