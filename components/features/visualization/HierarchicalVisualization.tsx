'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useOutlineStore, OutlineNode } from '@/lib/stores/outline-store';
import { useInfiniteResearchTree } from '@/lib/hooks/useInfiniteResearchTree';
import { ResearchNode } from '@/lib/utils/infinite-research-tree';
import CollapsibleTree, { HierarchyNode } from './CollapsibleTree';
import ZoomableCirclePacking, { CirclePackNode } from './ZoomableCirclePacking';
import ZoomableSunburst, { SunburstNode } from './ZoomableSunburst';

type VisualizationType = 'tree' | 'circle' | 'sunburst';

interface HierarchicalVisualizationProps {
  className?: string;
}

export default function HierarchicalVisualization({ className = '' }: HierarchicalVisualizationProps) {
  const { nodes } = useOutlineStore();
  const { 
    trees, 
    expandNode, 
    collapseNode, 
    isNodeExpanding, 
    error: treeError,
    initializeTree
  } = useInfiniteResearchTree({ autoSaveToStore: true });
  
  const [visualizationType, setVisualizationType] = useState<VisualizationType>('tree');
  const [selectedNode, setSelectedNode] = useState<OutlineNode | null>(null);

  // Handle adding a new research root
  const handleAddResearchRoot = useCallback(() => {
    const rootTitle = prompt('Enter a research topic or question:');
    if (rootTitle && rootTitle.trim()) {
      initializeTree(
        rootTitle.trim(), 
        `Research topic: ${rootTitle.trim()}. Click to expand and explore this topic in depth.`
      );
    }
  }, [initializeTree]);

  // NOTE: Removed auto-initialization to ensure nodes are only created on explicit user action
  // Trees are only created via:
  // 1. User clicks "Add Research Root" button
  // 2. User clicks expandable nodes to expand them
  // 3. Chat messages that generate nodes via existing chat-to-nodes system

  // Convert outline store nodes to the format needed by each visualization
  const convertToTreeNodes = useCallback((storeNodes: OutlineNode[]): HierarchyNode[] => {
    // Helper function to find a research node by ID across all trees
    const findResearchNode = (nodeId: string): ResearchNode | null => {
      const searchInTree = (nodes: ResearchNode[]): ResearchNode | null => {
        for (const node of nodes) {
          if (node.id === nodeId) return node;
          if (node.children) {
            const found = searchInTree(node.children);
            if (found) return found;
          }
        }
        return null;
      };

      for (const tree of trees) {
        const found = searchInTree([tree]);
        if (found) return found;
      }
      return null;
    };

    return storeNodes.map(node => {
      // Check if this node exists in the infinite tree system
      const treeNode = findResearchNode(node.id);

      return {
        id: node.id,
        title: node.title,
        content: node.content || '',
        type: node.type as 'topic' | 'subtopic' | 'detail',
        parentId: node.parentId,
        children: [],
        // Enhanced properties for infinite tree - use tree data if available
        level: treeNode?.level || 0,
        isExpandable: treeNode?.isExpandable !== false,
        isExpanded: treeNode?.isExpanded || false,
        isLoading: isNodeExpanding(node.id),
        expansionCount: treeNode?.expansionCount || 0
      };
    });
  }, [trees, isNodeExpanding]);

  const convertToCirclePackNodes = useCallback((storeNodes: OutlineNode[]): CirclePackNode[] => {
    return storeNodes.map(node => ({
      id: node.id,
      title: node.title,
      content: node.content || '',
      type: node.type as 'topic' | 'subtopic' | 'detail',
      parentId: node.parentId,
      value: Math.max((node.content?.length || 0) + 10, 20), // Size based on content length
      children: []
    }));
  }, []);

  const convertToSunburstNodes = useCallback((storeNodes: OutlineNode[]): SunburstNode[] => {
    return storeNodes.map(node => ({
      id: node.id,
      title: node.title,
      content: node.content || '',
      type: node.type as 'topic' | 'subtopic' | 'detail',
      parentId: node.parentId,
      value: Math.max((node.content?.length || 0) + 10, 20), // Size based on content length
      children: []
    }));
  }, []);

  // Memoize converted data
  const treeData = useMemo(() => convertToTreeNodes(nodes), [nodes, convertToTreeNodes]);
  const circleData = useMemo(() => convertToCirclePackNodes(nodes), [nodes, convertToCirclePackNodes]);
  const sunburstData = useMemo(() => convertToSunburstNodes(nodes), [nodes, convertToSunburstNodes]);

  const handleNodeClick = useCallback(async (node: HierarchyNode | CirclePackNode | SunburstNode) => {
    // Find the original node in the store
    const originalNode = nodes.find(n => n.id === node.id);
    if (!originalNode) return;

    setSelectedNode(originalNode);

    // Type guard to check if this is a HierarchyNode with expansion properties
    const isExpandableHierarchyNode = (n: any): n is HierarchyNode => {
      return 'isExpandable' in n && 'isExpanded' in n && 'isLoading' in n;
    };

    // Check if this node can be expanded for infinite research
    if (isExpandableHierarchyNode(node) && 
        node.isExpandable && 
        !node.isExpanded && 
        !node.isLoading) {
      try {
        // Trigger expansion using the infinite tree hook
        await expandNode(node.id);
        
        // Note: The tree state will be updated automatically and the visualization
        // will re-render with the new expanded nodes
      } catch (error) {
        console.error('Failed to expand node:', error);
        // Could show a toast notification here
      }
    }
  }, [nodes, expandNode]);

  const renderVisualization = () => {
    const width = 800;
    const height = 600;

    switch (visualizationType) {
      case 'tree':
        return (
          <CollapsibleTree
            data={treeData}
            width={width}
            height={height}
            onNodeClick={handleNodeClick}
            error={treeError}
          />
        );
      case 'circle':
        return (
          <ZoomableCirclePacking
            data={circleData}
            width={width}
            height={height}
            onNodeClick={handleNodeClick}
          />
        );
      case 'sunburst':
        return (
          <ZoomableSunburst
            data={sunburstData}
            width={width}
            height={height}
            onNodeClick={handleNodeClick}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={`flex flex-col space-y-4 ${className}`}>
      {/* Visualization Type Selector */}
      <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800">Research Visualization</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setVisualizationType('tree')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              visualizationType === 'tree'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Collapsible Tree
          </button>
          <button
            onClick={() => setVisualizationType('circle')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              visualizationType === 'circle'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Circle Packing
          </button>
          <button
            onClick={() => setVisualizationType('sunburst')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              visualizationType === 'sunburst'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Sunburst
          </button>
        </div>
      </div>

      {/* Infinite Tree Controls */}
      {visualizationType === 'tree' && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-purple-900">
              🌟 Infinite Research Tree
            </h3>
            <div className="text-xs text-purple-600">
              {trees.length} research tree{trees.length !== 1 ? 's' : ''} active
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleAddResearchRoot}
              className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 transition-colors"
            >
              + Add Research Root
            </button>
            
            {trees.length > 0 && (
              <div className="text-xs text-purple-700">
                Click any expandable node (marked with +) to generate deeper research branches
              </div>
            )}
            
            {treeError && (
              <div className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                {treeError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Data Status */}
      <div className="bg-blue-50 p-3 rounded-lg">
        <p className="text-sm text-blue-800">
          <span className="font-medium">Nodes in visualization:</span> {nodes.length}
          {nodes.length === 0 && (
            <span className="ml-2 text-blue-600">
              Start a chat conversation to generate research nodes that will appear here.
            </span>
          )}
        </p>
      </div>

      {/* Visualization Container */}
      <div className="flex-1 min-h-[600px] bg-white rounded-lg border shadow-sm">
        {nodes.length > 0 ? (
          renderVisualization()
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-6xl mb-4">🌳</div>
              <h3 className="text-xl font-medium mb-2">No Research Nodes Yet</h3>
              <p className="text-sm">
                Use the AI chat to generate research topics and ideas.<br />
                They will automatically appear in the visualization above.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Selected Node Details */}
      {selectedNode && (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-lg font-semibold text-gray-800">Selected Node</h4>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2">
            <p><span className="font-medium">Title:</span> {selectedNode.title}</p>
            <p><span className="font-medium">Type:</span> {selectedNode.type}</p>
            <p><span className="font-medium">Content:</span> {selectedNode.content}</p>
            {selectedNode.parentId && (
              <p><span className="font-medium">Parent ID:</span> {selectedNode.parentId}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
