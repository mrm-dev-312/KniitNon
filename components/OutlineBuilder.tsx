'use client';

import React, { useEffect } from 'react';
import { useDrop, useDrag } from 'react-dnd';
import { useOutlineStore, OutlineNode } from '@/lib/stores/outline-store';
import { ItemTypes } from '@/components/providers/DragDropProvider';
import { Button } from '@/components/ui/button';
import { Trash2, Download, GripVertical, ExternalLink } from 'lucide-react';

interface DraggableOutlineItemProps {
  node: OutlineNode;
  index: number;
  onReorder: (dragIndex: number, hoverIndex: number) => void;
  onRemove: (nodeId: string) => void;
}

const DraggableOutlineItem: React.FC<DraggableOutlineItemProps> = ({
  node,
  index,
  onReorder,
  onRemove,
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

  const ref = React.useRef<HTMLDivElement>(null);
  drag(drop(ref));

  const dragRef = React.useRef<HTMLDivElement>(null);
  drag(dragRef);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'topic': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'subtopic': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'detail': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  return (
    <div
      ref={ref}
      className={`p-3 border rounded-lg bg-card transition-all duration-200 ${
        isDragging ? 'opacity-50' : 'opacity-100'
      } ${isOver ? 'ring-2 ring-primary' : ''}`}
    >
      <div className="flex items-start gap-2">
        <div
          ref={dragRef}
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(node.type)}`}>
              {node.type}
            </span>
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
};

const OutlineBuilder: React.FC = () => {
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

  // Drop zone for accepting nodes from visualization
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.NODE,
    drop: (item: { id: string; title: string; type?: string; content?: string }) => {
      // Check if node already exists
      if (!nodes.find(node => node.id === item.id)) {
        addNode({
          id: item.id,
          title: item.title,
          type: (item.type as OutlineNode['type']) || 'topic',
          content: item.content,
        });
      }
    },
    collect: (monitor: any) => ({
      isOver: monitor.isOver(),
    }),
  });

  const dropRef = React.useRef<HTMLDivElement>(null);
  drop(dropRef);

  const handleReorder = (dragIndex: number, hoverIndex: number) => {
    reorderNodes(dragIndex, hoverIndex);
  };

  const handleExport = () => {
    if (!outlineContent) return;
    
    // Simple markdown export
    const markdown = nodes.map(node => {
      const level = node.type === 'topic' ? '# ' : node.type === 'subtopic' ? '## ' : '### ';
      let content = `${level}${node.title}\n\n`;
      if (node.content) {
        content += `${node.content}\n\n`;
      }
      return content;
    }).join('');

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'outline.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Fetch outline content when nodes change
  useEffect(() => {
    if (nodes.length > 0) {
      fetchOutlineContent(nodes.map(n => n.id));
    }
  }, [nodes, fetchOutlineContent]);

  return (
    <div ref={dropRef} className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Outline Builder</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={nodes.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearNodes}
            disabled={nodes.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 mb-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {nodes.length === 0 && !isLoading ? (
          <div
            className={`h-32 border-2 border-dashed rounded-lg flex items-center justify-center text-center p-4 transition-colors ${
              isOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
          >
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Drag nodes here to build your outline
              </p>
              <p className="text-xs text-muted-foreground">
                Or select nodes in the visualization and they'll appear here
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {nodes
              .sort((a, b) => a.order - b.order)
              .map((node, index) => (
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
    </div>
  );
};

export default OutlineBuilder;
