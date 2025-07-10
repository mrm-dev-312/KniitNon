'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useDrop, useDrag } from 'react-dnd';
import { FixedSizeList as List } from 'react-window';
import { useOutlineStore, OutlineNode } from '@/lib/stores/outline-store';
import { ItemTypes } from '@/components/providers/DragDropProvider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Trash2, Download, GripVertical, ExternalLink, ChevronDown } from 'lucide-react';
import { convertToMarkdown, convertToText, downloadFile, generateFilename } from '@/lib/export-utils';
import { useInView } from 'react-intersection-observer';
import { performanceMonitor } from '@/lib/performance';
import { useFocusTrap, useKeyboardNavigation, ariaAttributes, announceToScreenReader, generateId, KEYS } from '@/lib/accessibility';

// Performance monitoring instance
const perfMonitor = performanceMonitor;

interface VirtualizedItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    nodes: OutlineNode[];
    onReorder: (dragIndex: number, hoverIndex: number) => void;
    onRemove: (nodeId: string) => void;
  };
}

interface DraggableOutlineItemProps {
  node: OutlineNode;
  index: number;
  onReorder: (dragIndex: number, hoverIndex: number) => void;
  onRemove: (nodeId: string) => void;
  style?: React.CSSProperties;
}

const DraggableOutlineItem: React.FC<DraggableOutlineItemProps> = ({
  node,
  index,
  onReorder,
  onRemove,
  style,
}) => {
  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: ItemTypes.OUTLINE_ITEM,
    item: { id: node.id, index },
    collect: (monitor: any) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.OUTLINE_ITEM,
    hover: (draggedItem: { id: string; index: number }) => {
      if (draggedItem.index !== index) {
        onReorder(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
    collect: (monitor: any) => ({
      isOver: monitor.isOver(),
    }),
  });

  // Combine drop ref with intersection observer
  const ref = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<HTMLDivElement>(null);
  drop(ref);
  drag(dragRef);

  // Use intersection observer for performance
  const { ref: inViewRef, inView } = useInView({
    threshold: 0,
    rootMargin: '50px',
  });

  // Combine refs
  const combineRefs = useCallback((element: HTMLDivElement | null) => {
    if (ref.current !== element) {
      (ref as any).current = element;
    }
    inViewRef(element);
  }, [inViewRef]);

  // Only render expensive content when in view
  const renderContent = useMemo(() => {
    if (!inView) {
      return (
        <div className="h-24 flex items-center justify-center bg-muted/20 rounded border">
          <span className="text-xs text-muted-foreground">Loading...</span>
        </div>
      );
    }

    return (
      <div
        className={`group p-3 bg-background border rounded-lg shadow-sm hover:shadow-md transition-all duration-200 ${
          isDragging ? 'opacity-50 rotate-1' : ''
        } ${isOver ? 'border-primary/50 bg-primary/5' : ''}`}
      >
        <div className="flex items-start gap-3">
          <div
            ref={dragRef}
            className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex items-center gap-1">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: `hsl(${(node.id.charCodeAt(0) * 137.5) % 360}, 70%, 50%)` }}
                />
                <span className="text-xs font-mono text-muted-foreground">
                  #{node.id.slice(-4)}
                </span>
              </div>
              
              {node.metadata?.confidence !== undefined && (
                <div className="flex items-center gap-1">
                  <div 
                    className="w-12 h-1 bg-muted rounded-full overflow-hidden"
                    title={`Confidence: ${(node.metadata.confidence * 100).toFixed(0)}%`}
                  >
                    <div 
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${node.metadata.confidence * 100}%` }}
                    />
                  </div>
                </div>
              )}
              
              {node.metadata?.relationships && node.metadata.relationships.length > 0 && (
                <div className="flex items-center gap-1">
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {node.metadata.relationships.length} connections
                  </span>
                </div>
              )}
            </div>
            
            <h4 className="font-medium text-sm mb-1 line-clamp-2">{node.title}</h4>
            
            {node.content && (
              <p className="text-xs text-muted-foreground line-clamp-3">{node.content}</p>
            )}
            
            {node.metadata?.source && (
              <div className="mt-2 text-xs text-muted-foreground">
                Source: {node.metadata.source}
              </div>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(node.id)}
            className="text-destructive hover:text-destructive h-6 w-6 p-0"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }, [inView, node, isDragging, isOver, onRemove, dragPreview]);

  return (
    <div ref={combineRefs} style={style} className="px-2 py-1">
      {renderContent}
    </div>
  );
};

// Virtualized item component for react-window
const VirtualizedItem: React.FC<VirtualizedItemProps> = ({ index, style, data }) => {
  const { nodes, onReorder, onRemove } = data;
  const node = nodes[index];

  if (!node) return null;

  return (
    <DraggableOutlineItem
      key={node.id}
      node={node}
      index={index}
      onReorder={onReorder}
      onRemove={onRemove}
      style={style}
    />
  );
};

const OutlineBuilder: React.FC = () => {
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [selectedNodeIndex, setSelectedNodeIndex] = useState(0);
  
  const {
    nodes,
    selectedNodeIds,
    isLoading,
    error,
    outlineContent,
    removeNode,
    clearNodes,
    reorderNodes,
    addNode,
    fetchOutlineContent,
  } = useOutlineStore();

  // Accessibility IDs
  const outlineId = generateId('outline');
  const descriptionId = generateId('outline-description');
  const statusId = generateId('outline-status');
  
  // Focus management for keyboard navigation
  const listRef = React.useRef<HTMLDivElement>(null);
  const nodeRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());
  
  // Keyboard navigation for outline items
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (nodes.length === 0) return;
    
    switch (e.key) {
      case KEYS.ARROW_DOWN:
        e.preventDefault();
        setSelectedNodeIndex(prev => Math.min(prev + 1, nodes.length - 1));
        break;
      case KEYS.ARROW_UP:
        e.preventDefault();
        setSelectedNodeIndex(prev => Math.max(prev - 1, 0));
        break;
      case KEYS.HOME:
        e.preventDefault();
        setSelectedNodeIndex(0);
        break;
      case KEYS.END:
        e.preventDefault();
        setSelectedNodeIndex(nodes.length - 1);
        break;
      case KEYS.ENTER:
      case KEYS.SPACE:
        e.preventDefault();
        // Focus the selected node for further interaction
        const selectedNode = nodes[selectedNodeIndex];
        if (selectedNode) {
          const nodeElement = nodeRefs.current.get(selectedNode.id);
          nodeElement?.focus();
        }
        break;
      case KEYS.ESCAPE:
        e.preventDefault();
        // Return focus to the outline container
        listRef.current?.focus();
        break;
    }
  }, [nodes, selectedNodeIndex]);

  // Update selected node when nodes change
  useEffect(() => {
    if (selectedNodeIndex >= nodes.length) {
      setSelectedNodeIndex(Math.max(0, nodes.length - 1));
    }
  }, [nodes.length, selectedNodeIndex]);

  // Performance monitoring
  useEffect(() => {
    perfMonitor.startTiming('outline-render', { nodeCount: nodes.length });
    return () => {
      perfMonitor.endTiming('outline-render');
    };
  }, [nodes]);

  // Sort nodes for consistent ordering
  const sortedNodes = useMemo(() => {
    perfMonitor.startTiming('nodes-sort');
    const sorted = nodes.sort((a, b) => a.order - b.order);
    perfMonitor.endTiming('nodes-sort');
    return sorted;
  }, [nodes]);

  // Drop zone for accepting nodes from visualization
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.NODE,
    drop: (item: { id: string; title: string; content?: string; type?: string }) => {
      perfMonitor.startTiming('add-node-drop');
      addNode({
        id: item.id,
        title: item.title,
        content: item.content || '',
        type: (item.type as 'topic' | 'subtopic' | 'detail') || 'topic',
        metadata: {},
      });
      perfMonitor.endTiming('add-node-drop');
    },
    collect: (monitor: any) => ({
      isOver: monitor.isOver(),
    }),
  });

  // Combine drop ref with container ref
  const dropRef = React.useRef<HTMLDivElement>(null);
  drop(dropRef);

  const handleReorder = useCallback((dragIndex: number, hoverIndex: number) => {
    perfMonitor.startTiming('reorder-nodes');
    reorderNodes(dragIndex, hoverIndex);
    perfMonitor.endTiming('reorder-nodes');
  }, [reorderNodes]);

  const confirmClearOutline = useCallback(() => {
    perfMonitor.startTiming('clear-outline');
    clearNodes();
    setShowClearDialog(false);
    perfMonitor.endTiming('clear-outline');
  }, [clearNodes]);

  const handleExport = useCallback((format: 'markdown' | 'txt') => {
    perfMonitor.startTiming('export-outline', { format, nodeCount: nodes.length });
    
    let content: string;
    let filename: string;
    let mimeType: string;
    
    if (format === 'markdown') {
      content = convertToMarkdown(nodes, undefined, { 
        format: 'markdown', 
        includeContent: true, 
        includeMetadata: true 
      });
      filename = generateFilename('outline', 'md');
      mimeType = 'text/markdown';
    } else {
      content = convertToText(nodes, undefined, { 
        format: 'txt', 
        includeContent: true, 
        includeMetadata: false 
      });
      filename = generateFilename('outline', 'txt');
      mimeType = 'text/plain';
    }
    
    downloadFile(content, filename, mimeType);
    perfMonitor.endTiming('export-outline');
  }, [nodes]);

  // Fetch outline content when nodes change
  useEffect(() => {
    if (nodes.length > 0) {
      perfMonitor.startTiming('fetch-outline-content');
      fetchOutlineContent(nodes.map(n => n.id));
      perfMonitor.endTiming('fetch-outline-content');
    }
  }, [nodes, fetchOutlineContent]);

  // Calculate list height based on container
  const containerHeight = 400; // Fixed height for virtualization
  const itemHeight = 120; // Estimated height per item
  const listHeight = Math.min(sortedNodes.length * itemHeight, containerHeight);

  // Data for virtualized list
  const listData = useMemo(() => ({
    nodes: sortedNodes,
    onReorder: handleReorder,
    onRemove: removeNode,
  }), [sortedNodes, handleReorder, removeNode]);

  return (
    <div ref={dropRef} className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 id={outlineId} className="text-xl font-semibold">Outline Builder</h2>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={nodes.length === 0}
                aria-label={`Export outline with ${nodes.length} nodes`}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Export Format</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleExport('markdown')}
                onKeyDown={(e) => {
                  if (e.key === KEYS.ENTER || e.key === KEYS.SPACE) {
                    e.preventDefault();
                    handleExport('markdown');
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Markdown (.md)
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleExport('txt')}
                onKeyDown={(e) => {
                  if (e.key === KEYS.ENTER || e.key === KEYS.SPACE) {
                    e.preventDefault();
                    handleExport('txt');
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Plain Text (.txt)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowClearDialog(true)}
            disabled={nodes.length === 0}
            aria-label={`Clear all ${nodes.length} nodes from outline`}
          >
            Clear All
          </Button>
        </div>
      </div>

      <div 
        className={`flex-1 border-2 border-dashed rounded-lg p-4 transition-colors ${
          isOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        }`}
        {...ariaAttributes.region('Research outline workspace', outlineId)}
        aria-describedby={descriptionId}
      >
        <div id={descriptionId} className="sr-only">
          {nodes.length === 0 
            ? "Empty outline. Drop research nodes from the visualization to build your outline." 
            : `Outline containing ${nodes.length} research nodes. Use keyboard navigation to interact with items.`
          }
        </div>
        
        <div id={statusId} className="sr-only" aria-live="polite" aria-atomic="true">
          {isLoading && "Loading outline content..."}
          {error && `Error: ${error}`}
          {!isLoading && !error && nodes.length === 0 && "Outline is empty. Drop nodes to get started."}
          {!isLoading && !error && nodes.length > 0 && `Outline contains ${nodes.length} nodes.`}
        </div>
        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Loading outline...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-32 text-destructive">
            <span className="text-sm">Error: {error}</span>
          </div>
        )}

        {!isLoading && !error && nodes.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <p className="text-sm mb-2">Drop research nodes here to build your outline</p>
            <p className="text-xs">Drag nodes from the visualization to organize them</p>
          </div>
        )}

        {!isLoading && !error && nodes.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {nodes.length} node{nodes.length !== 1 ? 's' : ''} in outline
              </span>
              {/* Performance metrics display for development */}
              {process.env.NODE_ENV === 'development' && (
                <span className="text-xs text-muted-foreground">
                  Virtualized ({Math.min(10, nodes.length)} visible)
                </span>
              )}
            </div>
            
            <div className="text-xs text-muted-foreground mb-2">
              <span className="sr-only">Keyboard navigation: </span>
              Use arrow keys to navigate, Enter to interact, Escape to return to list
            </div>
            
            {/* Virtualized list for performance */}
            {sortedNodes.length > 10 ? (
              <div
                ref={listRef}
                onKeyDown={handleKeyDown}
                {...ariaAttributes.listbox(
                  sortedNodes[selectedNodeIndex]?.id,
                  outlineId
                )}
                className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <List
                  height={listHeight}
                  width="100%"
                  itemCount={sortedNodes.length}
                itemSize={itemHeight}
                itemData={listData}
                overscanCount={5}
                className="outline-builder-list"
              >
                {VirtualizedItem}
              </List>
              </div>
            ) : (
              // Render normally for small lists
              <div 
                ref={listRef}
                onKeyDown={handleKeyDown}
                {...ariaAttributes.listbox(
                  sortedNodes[selectedNodeIndex]?.id,
                  outlineId
                )}
                className="space-y-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {sortedNodes.map((node, index) => (
                  <DraggableOutlineItem
                    key={node.id}
                    node={node}
                    index={index}
                    onReorder={handleReorder}
                    onRemove={removeNode}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {outlineContent && (
          <div className="mt-6 p-4 border rounded-lg bg-muted/50">
            <h3 className="font-semibold mb-2">Generated Content</h3>
            <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
              {typeof outlineContent === 'string' ? (
                <pre className="whitespace-pre-wrap">{outlineContent}</pre>
              ) : (
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(outlineContent, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Clear Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Outline</DialogTitle>
            <DialogDescription>
              Are you sure you want to clear all nodes from your outline? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmClearOutline}>
              Clear Outline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OutlineBuilder;
