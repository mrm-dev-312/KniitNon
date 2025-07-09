'use client';

import React, { useState, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { useOutlineStore } from '@/lib/stores/outline-store';
import { ItemTypes } from '@/components/providers/DragDropProvider';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Plus, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface VisualizationNode {
  id: string;
  title: string;
  content: string;
  type: 'topic' | 'subtopic' | 'detail';
  x: number;
  y: number;
  connections: string[];
  source?: string;
}

interface DraggableNodeProps {
  node: VisualizationNode;
  isSelected: boolean;
  onToggleSelection: (nodeId: string) => void;
}

const DraggableNode: React.FC<DraggableNodeProps> = ({ 
  node, 
  isSelected, 
  onToggleSelection 
}) => {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.NODE,
    item: {
      id: node.id,
      title: node.title,
      content: node.content,
      type: node.type,
    },
    collect: (monitor: any) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const ref = React.useRef<HTMLDivElement>(null);
  drag(ref);

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'topic': return 'bg-blue-500 border-blue-600';
      case 'subtopic': return 'bg-green-500 border-green-600';
      case 'detail': return 'bg-purple-500 border-purple-600';
      default: return 'bg-gray-500 border-gray-600';
    }
  };

  const nodeSize = node.type === 'topic' ? 'w-32 h-20' : node.type === 'subtopic' ? 'w-28 h-16' : 'w-24 h-12';

  return (
    <div
      ref={ref}
      className={`absolute cursor-move transition-all duration-200 ${
        isDragging ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
      } ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}`}
      style={{ 
        left: node.x, 
        top: node.y,
        transform: isDragging ? 'rotate(5deg)' : 'rotate(0deg)'
      }}
    >
      <div className={`${nodeSize} ${getNodeColor(node.type)} text-white rounded-lg border-2 p-2 shadow-lg hover:shadow-xl transition-shadow`}>
        <div className="flex items-start justify-between h-full">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium mb-1 line-clamp-2">
              {node.title}
            </div>
            {node.type !== 'detail' && (
              <div className="text-xs opacity-80 line-clamp-1">
                {node.content.substring(0, 30)}...
              </div>
            )}
          </div>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelection(node.id)}
            className="ml-2 data-[state=checked]:bg-white data-[state=checked]:text-black"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          />
        </div>
      </div>
      
      {/* Connection lines would be rendered here in a full D3.js implementation */}
      {node.connections.length > 0 && (
        <div className="absolute -top-1 -right-1 bg-yellow-400 text-black text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
          {node.connections.length}
        </div>
      )}
    </div>
  );
};

const VisualizationCanvas: React.FC = () => {
  const { selectedNodeIds, toggleNodeSelection, addNodes } = useOutlineStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [nodes, setNodes] = useState<VisualizationNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Sample nodes for demonstration
  const sampleNodes: VisualizationNode[] = [
    {
      id: 'node-1',
      title: 'Climate Change',
      content: 'Overview of global climate change impacts and causes',
      type: 'topic',
      x: 100,
      y: 100,
      connections: ['node-2', 'node-3'],
      source: 'NASA Climate'
    },
    {
      id: 'node-2',
      title: 'Carbon Emissions',
      content: 'Analysis of CO2 and greenhouse gas emissions from various sources',
      type: 'subtopic',
      x: 300,
      y: 80,
      connections: ['node-1', 'node-4'],
      source: 'EPA Reports'
    },
    {
      id: 'node-3',
      title: 'Sea Level Rise',
      content: 'Documentation of rising sea levels and coastal impacts',
      type: 'subtopic',
      x: 250,
      y: 200,
      connections: ['node-1'],
      source: 'NOAA Data'
    },
    {
      id: 'node-4',
      title: 'Industrial Sources',
      content: 'Manufacturing and industrial carbon footprint data',
      type: 'detail',
      x: 450,
      y: 120,
      connections: ['node-2'],
      source: 'Industry Reports'
    },
    {
      id: 'node-5',
      title: 'Renewable Energy',
      content: 'Solar, wind, and alternative energy solutions and adoption rates',
      type: 'topic',
      x: 120,
      y: 300,
      connections: ['node-6'],
      source: 'IEA Database'
    },
    {
      id: 'node-6',
      title: 'Solar Technology',
      content: 'Photovoltaic cell efficiency and installation trends',
      type: 'subtopic',
      x: 320,
      y: 350,
      connections: ['node-5'],
      source: 'Solar Industry Association'
    }
  ];

  useEffect(() => {
    setNodes(sampleNodes);
  }, []);

  const fetchNodes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/research/nodes');
      if (response.ok) {
        const data = await response.json();
        // Transform API data to visualization nodes
        const transformedNodes = data.map((node: any, index: number) => ({
          id: node.id || `api-node-${index}`,
          title: node.title || 'Untitled',
          content: node.content || '',
          type: node.type || 'topic',
          x: Math.random() * 400 + 50,
          y: Math.random() * 300 + 50,
          connections: node.connections || [],
          source: node.source
        }));
        setNodes(transformedNodes);
      }
    } catch (error) {
      console.error('Failed to fetch nodes:', error);
      // Fall back to sample nodes
      setNodes(sampleNodes);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredNodes = nodes.filter(node =>
    node.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    node.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddSelectedToOutline = () => {
    const selectedNodes = nodes.filter(node => selectedNodeIds.includes(node.id));
    if (selectedNodes.length > 0) {
      addNodes(selectedNodes.map(node => ({
        id: node.id,
        title: node.title,
        content: node.content,
        type: node.type,
        metadata: {
          source: node.source,
          relationships: node.connections
        }
      })));
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search research nodes..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={fetchNodes}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        
        <Button
          size="sm"
          onClick={handleAddSelectedToOutline}
          disabled={selectedNodeIds.length === 0}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Selected ({selectedNodeIds.length})
        </Button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative border-2 border-dashed border-muted-foreground/25 rounded-lg bg-muted/10 overflow-hidden">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {filteredNodes.map((node) => (
              <DraggableNode
                key={node.id}
                node={node}
                isSelected={selectedNodeIds.includes(node.id)}
                onToggleSelection={toggleNodeSelection}
              />
            ))}
            
            {filteredNodes.length === 0 && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center text-center">
                <div>
                  <p className="text-muted-foreground mb-2">No nodes found</p>
                  <Button variant="outline" onClick={fetchNodes}>
                    Load Research Data
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Instructions */}
        <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm p-3 rounded-lg border text-sm">
          <p className="font-medium mb-1">How to use:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Check boxes to select nodes</li>
            <li>• Drag nodes to the outline builder</li>
            <li>• Use search to filter nodes</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VisualizationCanvas;
