'use client';

import React, { useState, useCallback } from 'react';
import { useOutlineStore, OutlineNode } from '@/lib/stores/outline-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  X, 
  FileText,
  CornerDownRight,
  CornerUpLeft,
  Target,
  Brain
} from 'lucide-react';

interface NodeHierarchyBuilderProps {
  onStructureUpdate?: (hierarchy: any) => void;
}

const NodeHierarchyBuilder: React.FC<NodeHierarchyBuilderProps> = ({
  onStructureUpdate
}) => {
  const { nodes, addNode, updateNode, removeNode } = useOutlineStore();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  // Build hierarchy from flat node list
  const buildHierarchy = useCallback((nodeList: OutlineNode[]) => {
    const nodeMap = new Map<string, OutlineNode & { children: OutlineNode[] }>();
    const rootNodes: (OutlineNode & { children: OutlineNode[] })[] = [];

    // Create enhanced nodes with children arrays
    nodeList.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [] });
    });

    // Sort by order and build parent-child relationships
    const sortedNodes = [...nodeList].sort((a, b) => a.order - b.order);
    
    sortedNodes.forEach(node => {
      const enhancedNode = nodeMap.get(node.id)!;
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children.push(enhancedNode);
      } else {
        rootNodes.push(enhancedNode);
      }
    });

    return rootNodes;
  }, []);

  const hierarchy = buildHierarchy(nodes);

  // Calculate depth for each node
  const getNodeDepth = useCallback((nodeId: string): number => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !node.parentId) return 0;
    return getNodeDepth(node.parentId) + 1;
  }, [nodes]);

  // Indent node (make it a child of the previous node at the same level)
  const indentNode = useCallback((nodeId: string) => {
    const nodeIndex = nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex <= 0) return;

    const currentDepth = getNodeDepth(nodeId);
    
    // Find the previous node at the same level or shallower
    let newParentId: string | undefined;
    for (let i = nodeIndex - 1; i >= 0; i--) {
      const potentialParent = nodes[i];
      const potentialParentDepth = getNodeDepth(potentialParent.id);
      
      if (potentialParentDepth < currentDepth) {
        newParentId = potentialParent.id;
        break;
      } else if (potentialParentDepth === currentDepth && !potentialParent.parentId) {
        newParentId = potentialParent.id;
        break;
      }
    }

    if (newParentId) {
      updateNode(nodeId, { parentId: newParentId });
    }
  }, [nodes, getNodeDepth, updateNode]);

  // Outdent node (move it up one level in hierarchy)
  const outdentNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !node.parentId) return;

    const parent = nodes.find(n => n.id === node.parentId);
    const newParentId = parent?.parentId;

    updateNode(nodeId, { parentId: newParentId });
  }, [nodes, updateNode]);

  // Add new node
  const addNewNode = useCallback((parentId?: string) => {
    const newNode: Omit<OutlineNode, 'order'> = {
      id: `node-${Date.now()}`,
      title: 'New Node',
      content: '',
      type: 'topic',
      parentId
    };
    
    addNode(newNode);
    setEditingNode(newNode.id);
    setEditTitle(newNode.title);
    setEditContent(newNode.content || '');
  }, [addNode]);

  // Delete node and its children
  const deleteNode = useCallback((nodeId: string) => {
    const getDescendants = (id: string): string[] => {
      const children = nodes.filter(n => n.parentId === id);
      const descendants = [id];
      children.forEach(child => {
        descendants.push(...getDescendants(child.id));
      });
      return descendants;
    };

    const toDelete = getDescendants(nodeId);
    toDelete.forEach(id => removeNode(id));
  }, [nodes, removeNode]);

  // Save edited node
  const saveEdit = useCallback(() => {
    if (!editingNode) return;

    updateNode(editingNode, {
      title: editTitle,
      content: editContent
    });
    
    setEditingNode(null);
    setEditTitle('');
    setEditContent('');
  }, [editingNode, editTitle, editContent, updateNode]);

  // Cancel edit
  const cancelEdit = useCallback(() => {
    setEditingNode(null);
    setEditTitle('');
    setEditContent('');
  }, []);

  // Start editing
  const startEdit = useCallback((node: OutlineNode) => {
    setEditingNode(node.id);
    setEditTitle(node.title);
    setEditContent(node.content || '');
  }, []);

  // Toggle expansion
  const toggleExpanded = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  // Render individual node
  const renderNode = useCallback((node: OutlineNode & { children: OutlineNode[] }, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const isEditing = editingNode === node.id;
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id} className="w-full">
        <Card 
          className={`mb-2 ${depth > 0 ? 'ml-6 border-l-4 border-l-blue-200' : ''}`}
          style={{ marginLeft: depth * 24 }}
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                {hasChildren && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(node.id)}
                    className="h-6 w-6 p-0"
                  >
                    {isExpanded ? 
                      <ChevronDown className="h-3 w-3" /> : 
                      <ChevronRight className="h-3 w-3" />
                    }
                  </Button>
                )}
                
                {!hasChildren && <div className="w-6" />}

                <Badge variant="outline" className="text-xs">
                  {node.type}
                </Badge>

                {isEditing ? (
                  <div className="flex-1 space-y-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Node title"
                      className="text-sm"
                    />
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder="Node content"
                      rows={2}
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEdit}>
                        <Save className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1">
                    <div className="font-medium text-sm">{node.title}</div>
                    {node.content && (
                      <div className="text-xs text-gray-600 mt-1">{node.content}</div>
                    )}
                  </div>
                )}
              </div>

              {!isEditing && (
                <div className="flex items-center gap-1">
                  {/* Hierarchy controls */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => indentNode(node.id)}
                    title="Indent (make child)"
                    disabled={depth >= 3}
                    className="h-6 w-6 p-0"
                  >
                    <CornerDownRight className="h-3 w-3" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => outdentNode(node.id)}
                    title="Outdent (move up level)"
                    disabled={depth === 0}
                    className="h-6 w-6 p-0"
                  >
                    <CornerUpLeft className="h-3 w-3" />
                  </Button>

                  {/* Edit/Delete controls */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEdit(node)}
                    title="Edit"
                    className="h-6 w-6 p-0"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addNewNode(node.id)}
                    title="Add child"
                    className="h-6 w-6 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteNode(node.id)}
                    title="Delete"
                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Render children */}
        {hasChildren && isExpanded && (
          <div className="ml-4">
            {node.children.map(child => renderNode(child as OutlineNode & { children: OutlineNode[] }, depth + 1))}
          </div>
        )}
      </div>
    );
  }, [
    expandedNodes, editingNode, editTitle, editContent,
    toggleExpanded, indentNode, outdentNode,
    startEdit, saveEdit, cancelEdit, addNewNode, deleteNode
  ]);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="text-lg font-semibold">Node Hierarchy</h3>
          <p className="text-sm text-gray-600">
            Organize your research nodes into a hierarchical structure
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => addNewNode()} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Topic
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {hierarchy.length > 0 ? (
          <div className="space-y-2">
            {hierarchy.map(node => renderNode(node, 0))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No nodes to organize</p>
            <p className="text-sm">Add some research nodes to get started</p>
            <Button onClick={() => addNewNode()} className="mt-3" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add First Topic
            </Button>
          </div>
        )}
      </div>

      {/* Hierarchy Stats */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Total Nodes: {nodes.length}</span>
          <span>Root Topics: {hierarchy.length}</span>
          <span>Max Depth: {Math.max(...nodes.map(n => getNodeDepth(n.id)), 0)}</span>
        </div>
      </div>
    </div>
  );
};

export default NodeHierarchyBuilder;
