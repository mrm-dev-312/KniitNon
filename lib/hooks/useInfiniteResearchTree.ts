import { useState, useCallback } from 'react';
import { useOutlineStore } from '@/lib/stores/outline-store';
import { InfiniteResearchTree, ResearchNode, ExpansionRequest } from '@/lib/utils/infinite-research-tree';
import { useChatContext } from '@/lib/contexts/ChatContext';

interface UseInfiniteTreeOptions {
  maxRootNodes?: number;
  autoSaveToStore?: boolean;
}

interface TreeState {
  trees: ResearchNode[];
  expandingNodeId: string | null;
  error: string | null;
}

export function useInfiniteResearchTree(options: UseInfiniteTreeOptions = {}) {
  const { maxRootNodes = 5, autoSaveToStore = true } = options;
  const { addNode, nodes: storeNodes, clearNodes } = useOutlineStore();
  const { messages } = useChatContext();
  
  const [treeState, setTreeState] = useState<TreeState>({
    trees: [],
    expandingNodeId: null,
    error: null
  });

  /**
   * Initialize tree from existing store nodes or create new root
   */
  const initializeTree = useCallback((rootTitle?: string, rootContent?: string) => {
    if (rootTitle) {
      // Create new root node
      const rootNode = InfiniteResearchTree.createRootNode(rootTitle, rootContent);
      setTreeState(prev => ({
        ...prev,
        trees: [...prev.trees, rootNode].slice(0, maxRootNodes),
        error: null
      }));
      
      if (autoSaveToStore) {
        const flatNode = InfiniteResearchTree.flattenTree([rootNode])[0];
        addNode(flatNode);
      }
    } else {
      // Reconstruct from store nodes
      const reconstructed = InfiniteResearchTree.reconstructTree(storeNodes);
      setTreeState(prev => ({
        ...prev,
        trees: reconstructed,
        error: null
      }));
    }
  }, [maxRootNodes, autoSaveToStore, addNode, storeNodes]);

  /**
   * Expand a node by generating child nodes
   */
  const expandNode = useCallback(async (nodeId: string) => {
    setTreeState(prev => ({
      ...prev,
      expandingNodeId: nodeId,
      error: null
    }));

    try {
      // Find the node to expand
      const findNode = (nodes: ResearchNode[], id: string): ResearchNode | null => {
        for (const node of nodes) {
          if (node.id === id) return node;
          if (node.children) {
            const found = findNode(node.children, id);
            if (found) return found;
          }
        }
        return null;
      };

      let nodeToExpand = findNode(treeState.trees, nodeId);
      
      // If not found in tree state, try to find in outline store and convert to research node
      if (!nodeToExpand) {
        const storeNode = storeNodes.find(n => n.id === nodeId);
        if (storeNode) {
          // Convert outline node to research node and add to tree state
          nodeToExpand = InfiniteResearchTree.convertOutlineToResearch(storeNode);
          
          // Add this node as a new tree root
          setTreeState(prev => ({
            ...prev,
            trees: [...prev.trees, nodeToExpand!].slice(0, maxRootNodes)
          }));
        } else {
          throw new Error('Node not found in tree state or outline store');
        }
      }

      // Build path from root to this node
      const buildPath = (trees: ResearchNode[], targetId: string): ResearchNode[] => {
        const path: ResearchNode[] = [];
        
        const findPath = (nodes: ResearchNode[]): boolean => {
          for (const node of nodes) {
            path.push(node);
            
            if (node.id === targetId) {
              return true;
            }
            
            if (node.children && findPath(node.children)) {
              return true;
            }
            
            path.pop();
          }
          return false;
        };

        findPath(trees);
        return path;
      };

      // Ensure nodeToExpand is not null before proceeding
      if (!nodeToExpand) {
        throw new Error('Failed to locate or convert node');
      }

      const nodePath = buildPath(treeState.trees, nodeId);
      const conversationContext = messages.map(m => `${m.role}: ${m.content}`);

      // Determine max levels based on expansion count
      const isInitialExpansion = nodeToExpand.expansionCount === 0;
      const maxLevels = isInitialExpansion ? 3 : 2;

      // Create expansion request
      const expansionRequest: ExpansionRequest = {
        nodeId,
        nodePath,
        conversationContext,
        maxLevels
      };

      // Expand the node
      const result = await InfiniteResearchTree.expandNode(expansionRequest);

      if (!result.success) {
        throw new Error(result.error || 'Failed to expand node');
      }

      // Update the tree state
      setTreeState(prev => {
        const updateNode = (nodes: ResearchNode[]): ResearchNode[] => {
          return nodes.map(node => {
            if (node.id === nodeId) {
              return {
                ...node,
                children: result.nodes,
                isExpanded: true,
                isLoading: false,
                expansionCount: node.expansionCount + 1
              };
            }
            
            if (node.children) {
              return {
                ...node,
                children: updateNode(node.children)
              };
            }
            
            return node;
          });
        };

        return {
          ...prev,
          trees: updateNode(prev.trees),
          expandingNodeId: null,
          error: null
        };
      });

      // Save to store if enabled
      if (autoSaveToStore) {
        const flatNodes = InfiniteResearchTree.flattenTree(result.nodes);
        flatNodes.forEach(node => addNode(node));
      }

    } catch (error) {
      console.error('Node expansion failed:', error);
      setTreeState(prev => ({
        ...prev,
        expandingNodeId: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [treeState.trees, messages, autoSaveToStore, addNode, maxRootNodes, storeNodes]);

  /**
   * Collapse a node (hide its children)
   */
  const collapseNode = useCallback((nodeId: string) => {
    setTreeState(prev => {
      const updateNode = (nodes: ResearchNode[]): ResearchNode[] => {
        return nodes.map(node => {
          if (node.id === nodeId) {
            return {
              ...node,
              isExpanded: false
            };
          }
          
          if (node.children) {
            return {
              ...node,
              children: updateNode(node.children)
            };
          }
          
          return node;
        });
      };

      return {
        ...prev,
        trees: updateNode(prev.trees)
      };
    });
  }, []);

  /**
   * Add a new root node (for comparison research)
   */
  const addRootNode = useCallback((title: string, content?: string) => {
    if (treeState.trees.length >= maxRootNodes) {
      setTreeState(prev => ({
        ...prev,
        error: `Maximum of ${maxRootNodes} root nodes allowed`
      }));
      return;
    }

    initializeTree(title, content);
  }, [treeState.trees.length, maxRootNodes, initializeTree]);

  /**
   * Remove a root node
   */
  const removeRootNode = useCallback((nodeId: string) => {
    setTreeState(prev => ({
      ...prev,
      trees: prev.trees.filter(tree => tree.id !== nodeId),
      error: null
    }));
  }, []);

  /**
   * Clear all trees
   */
  const clearAllTrees = useCallback(() => {
    setTreeState({
      trees: [],
      expandingNodeId: null,
      error: null
    });
    
    if (autoSaveToStore) {
      clearNodes();
    }
  }, [autoSaveToStore, clearNodes]);

  /**
   * Get flattened nodes for visualization
   */
  const getFlattenedNodes = useCallback(() => {
    return InfiniteResearchTree.flattenTree(treeState.trees);
  }, [treeState.trees]);

  /**
   * Check if a node is currently expanding
   */
  const isNodeExpanding = useCallback((nodeId: string) => {
    return treeState.expandingNodeId === nodeId;
  }, [treeState.expandingNodeId]);

  return {
    // State
    trees: treeState.trees,
    error: treeState.error,
    isExpanding: !!treeState.expandingNodeId,
    
    // Actions
    initializeTree,
    expandNode,
    collapseNode,
    addRootNode,
    removeRootNode,
    clearAllTrees,
    
    // Utilities
    getFlattenedNodes,
    isNodeExpanding,
  };
}
