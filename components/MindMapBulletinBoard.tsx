'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Pin, 
  Link2, 
  Move, 
  Trash2, 
  Plus,
  RotateCcw,
  MousePointer,
  GitBranch,
  PinIcon,
  PinOff,
  X
} from 'lucide-react';

interface MindMapNode {
  id: string;
  title: string;
  content: string;
  type: 'topic' | 'subtopic' | 'detail';
  source?: string;
  x: number;
  y: number;
  isPinned: boolean;
  connections: string[];
  color?: string;
}

interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'line' | 'curve' | 'arrow';
  color: string;
  thickness: number;
  label?: string;
}

interface MindMapBulletinBoardProps {
  nodes: Array<{
    id: string;
    title: string;
    content: string;
    type: 'topic' | 'subtopic' | 'detail';
    source?: string;
    connections?: string[];
  }>;
  selectedNodeIds: string[];
  onNodeClick: (nodeId: string) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
  width: number;
  height: number;
}

interface DraggableMindMapNodeProps {
  node: MindMapNode;
  isSelected: boolean;
  onNodeClick: (nodeId: string) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
  onPositionChange: (nodeId: string, x: number, y: number) => void;
  onPinToggle: (nodeId: string) => void;
  onConnectStart?: (nodeId: string) => void;
  isConnecting: boolean;
  connectingFromId?: string;
}

const DraggableMindMapNode: React.FC<DraggableMindMapNodeProps> = ({
  node,
  isSelected,
  onNodeClick,
  onNodeDoubleClick,
  onPositionChange,
  onPinToggle,
  onConnectStart,
  isConnecting,
  connectingFromId
}) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'MINDMAP_NODE',
    item: { id: node.id, x: node.x, y: node.y },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: !node.isPinned,
  });

  const [{ isOver }, drop] = useDrop({
    accept: 'MINDMAP_NODE',
    drop: (item: { id: string; x: number; y: number }, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset();
      if (delta) {
        const newX = Math.max(0, Math.min(item.x + delta.x, window.innerWidth - 200));
        const newY = Math.max(0, Math.min(item.y + delta.y, window.innerHeight - 100));
        onPositionChange(item.id, newX, newY);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const ref = useRef<HTMLDivElement>(null);
  drag(drop(ref));

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'topic': return 'bg-blue-500 border-blue-600 text-white';
      case 'subtopic': return 'bg-green-500 border-green-600 text-white';
      case 'detail': return 'bg-purple-500 border-purple-600 text-white';
      default: return 'bg-gray-500 border-gray-600 text-white';
    }
  };

  const getNodeSize = (type: string) => {
    switch (type) {
      case 'topic': return 'w-40 h-24 text-sm';
      case 'subtopic': return 'w-36 h-20 text-sm';
      case 'detail': return 'w-32 h-16 text-xs';
      default: return 'w-32 h-16 text-xs';
    }
  };

  return (
    <div
      ref={ref}
      className={`absolute cursor-move transition-all duration-200 ${
        isDragging ? 'opacity-50 scale-95 rotate-3' : 'opacity-100 scale-100'
      } ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''} ${
        node.isPinned ? 'ring-2 ring-red-400' : ''
      } ${isOver ? 'ring-2 ring-yellow-400' : ''} ${
        isConnecting && connectingFromId === node.id ? 'ring-2 ring-blue-400 animate-pulse' : ''
      }`}
      style={{ 
        left: node.x, 
        top: node.y,
        zIndex: isSelected ? 100 : isDragging ? 99 : 10
      }}
      onClick={(e) => {
        e.stopPropagation();
        onNodeClick(node.id);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onNodeDoubleClick?.(node.id);
      }}
    >
      <div className={`${getNodeSize(node.type)} ${getNodeColor(node.type)} rounded-lg border-2 p-2 shadow-lg hover:shadow-xl transition-shadow relative group`}>
        {/* Pin indicator and controls */}
        <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant={node.isPinned ? "destructive" : "secondary"}
            className="h-6 w-6 p-0 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              onPinToggle(node.id);
            }}
            title={node.isPinned ? "Unpin node" : "Pin node"}
          >
            {node.isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
          </Button>
          
          <Button
            size="sm"
            variant="secondary"
            className="h-6 w-6 p-0 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              onConnectStart?.(node.id);
            }}
            title="Connect to another node"
          >
            <Link2 className="h-3 w-3" />
          </Button>
        </div>

        {/* Node content */}
        <div className="flex flex-col h-full justify-between">
          <div className="flex-1 min-w-0">
            <div className="font-medium mb-1 line-clamp-2 leading-tight">
              {node.title}
            </div>
            {node.type !== 'detail' && (
              <div className="text-xs opacity-80 line-clamp-2 leading-tight">
                {node.content.substring(0, 50)}...
              </div>
            )}
          </div>
          
          {/* Node metadata */}
          <div className="flex items-center justify-between mt-1">
            <Badge 
              variant="secondary" 
              className="text-xs py-0 px-1 bg-white/20 text-white border-white/30"
            >
              {node.type}
            </Badge>
            {node.connections.length > 0 && (
              <div className="flex items-center text-xs text-white/80">
                <GitBranch className="h-3 w-3 mr-1" />
                {node.connections.length}
              </div>
            )}
          </div>
        </div>

        {/* Connection points */}
        <div className="absolute -inset-1 pointer-events-none">
          <div className="w-2 h-2 bg-white rounded-full absolute top-1/2 -left-1 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-2 h-2 bg-white rounded-full absolute top-1/2 -right-1 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-2 h-2 bg-white rounded-full absolute left-1/2 -top-1 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-2 h-2 bg-white rounded-full absolute left-1/2 -bottom-1 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
      </div>
    </div>
  );
};

const ConnectionLine: React.FC<{
  connection: Connection;
  sourceNode: MindMapNode;
  targetNode: MindMapNode;
  onConnectionClick?: (connectionId: string) => void;
  isSelected?: boolean;
}> = ({ connection, sourceNode, targetNode, onConnectionClick, isSelected }) => {
  const sourceX = sourceNode.x + 80; // Center of source node
  const sourceY = sourceNode.y + 40;
  const targetX = targetNode.x + 80; // Center of target node
  const targetY = targetNode.y + 40;

  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  // Calculate curve for better visual appeal
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const curvature = Math.min(distance * 0.2, 50);

  const path = `M ${sourceX} ${sourceY} Q ${midX + (dy / distance) * curvature} ${midY - (dx / distance) * curvature} ${targetX} ${targetY}`;

  return (
    <g>
      <path
        d={path}
        stroke={connection.color}
        strokeWidth={connection.thickness}
        fill="none"
        className={`transition-all duration-200 cursor-pointer ${
          isSelected ? 'stroke-blue-500' : 'hover:stroke-blue-400'
        }`}
        onClick={() => onConnectionClick?.(connection.id)}
        strokeDasharray={connection.type === 'arrow' ? undefined : '5,5'}
      />
      
      {/* Arrowhead for arrow type connections */}
      {connection.type === 'arrow' && (
        <polygon
          points={`${targetX-8},${targetY-4} ${targetX},${targetY} ${targetX-8},${targetY+4}`}
          fill={connection.color}
          className="transition-all duration-200"
        />
      )}
      
      {/* Connection label */}
      {connection.label && (
        <text
          x={midX}
          y={midY - 10}
          textAnchor="middle"
          className="text-xs fill-gray-600 pointer-events-none"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          {connection.label}
        </text>
      )}
    </g>
  );
};

const MindMapBulletinBoard: React.FC<MindMapBulletinBoardProps> = ({
  nodes: initialNodes,
  selectedNodeIds,
  onNodeClick,
  onNodeDoubleClick,
  width,
  height
}) => {
  const [mindMapNodes, setMindMapNodes] = useState<MindMapNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [mode, setMode] = useState<'move' | 'connect'>('move');

  // Initialize mind map nodes from input nodes
  useEffect(() => {
    const existingNodeIds = new Set(mindMapNodes.map(n => n.id));
    const newNodes: MindMapNode[] = [];
    
    initialNodes.forEach((node, index) => {
      if (!existingNodeIds.has(node.id)) {
        newNodes.push({
          id: node.id,
          title: node.title,
          content: node.content,
          type: node.type,
          source: node.source,
          x: 100 + (index % 4) * 200,
          y: 100 + Math.floor(index / 4) * 150,
          isPinned: false,
          connections: node.connections || [],
          color: undefined
        });
      }
    });

    if (newNodes.length > 0) {
      setMindMapNodes(prev => [...prev, ...newNodes]);
    }
  }, [initialNodes, mindMapNodes]);

  const handlePositionChange = useCallback((nodeId: string, x: number, y: number) => {
    setMindMapNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, x, y } : node
    ));
  }, []);

  const handlePinToggle = useCallback((nodeId: string) => {
    setMindMapNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, isPinned: !node.isPinned } : node
    ));
  }, []);

  const handleConnectStart = useCallback((nodeId: string) => {
    if (isConnecting && connectingFromId) {
      // Complete connection
      if (connectingFromId !== nodeId) {
        const newConnection: Connection = {
          id: `conn-${connectingFromId}-${nodeId}-${Date.now()}`,
          sourceId: connectingFromId,
          targetId: nodeId,
          type: 'curve',
          color: '#3b82f6',
          thickness: 2,
          label: undefined
        };
        setConnections(prev => [...prev, newConnection]);
      }
      setIsConnecting(false);
      setConnectingFromId(null);
    } else {
      // Start connection
      setIsConnecting(true);
      setConnectingFromId(nodeId);
    }
  }, [isConnecting, connectingFromId]);

  const handleConnectionClick = useCallback((connectionId: string) => {
    setSelectedConnectionId(connectionId);
  }, []);

  const deleteSelectedConnection = useCallback(() => {
    if (selectedConnectionId) {
      setConnections(prev => prev.filter(conn => conn.id !== selectedConnectionId));
      setSelectedConnectionId(null);
    }
  }, [selectedConnectionId]);

  const resetLayout = useCallback(() => {
    setMindMapNodes(prev => prev.map((node, index) => ({
      ...node,
      x: 100 + (index % 4) * 200,
      y: 100 + Math.floor(index / 4) * 150,
      isPinned: false
    })));
    setConnections([]);
    setSelectedConnectionId(null);
  }, []);

  const cancelConnection = useCallback(() => {
    setIsConnecting(false);
    setConnectingFromId(null);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-50 border rounded-lg">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-2 bg-white rounded-lg border p-2 shadow-lg">
        <Button
          size="sm"
          variant={mode === 'move' ? 'default' : 'outline'}
          onClick={() => setMode('move')}
          className="flex items-center gap-1"
        >
          <Move className="h-4 w-4" />
          Move
        </Button>
        
        <Button
          size="sm"
          variant={mode === 'connect' ? 'default' : 'outline'}
          onClick={() => setMode('connect')}
          className="flex items-center gap-1"
        >
          <Link2 className="h-4 w-4" />
          Connect
        </Button>

        {isConnecting && (
          <Button
            size="sm"
            variant="destructive"
            onClick={cancelConnection}
            className="flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
        )}

        {selectedConnectionId && (
          <Button
            size="sm"
            variant="destructive"
            onClick={deleteSelectedConnection}
            className="flex items-center gap-1"
          >
            <Trash2 className="h-4 w-4" />
            Delete Connection
          </Button>
        )}
        
        <Button
          size="sm"
          variant="outline"
          onClick={resetLayout}
          className="flex items-center gap-1"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>

      {/* Instructions */}
      {isConnecting && (
        <div className="absolute top-20 left-4 z-50 bg-blue-100 border border-blue-300 rounded-lg p-3 text-sm">
          <p className="font-medium text-blue-900">Connection Mode Active</p>
          <p className="text-blue-700">Click a node to start, then click another node to connect them.</p>
        </div>
      )}

      {/* SVG for connections */}
      <svg 
        className="absolute inset-0 pointer-events-none" 
        style={{ width: '100%', height: '100%' }}
      >
        {connections.map(connection => {
          const sourceNode = mindMapNodes.find(n => n.id === connection.sourceId);
          const targetNode = mindMapNodes.find(n => n.id === connection.targetId);
          
          if (sourceNode && targetNode) {
            return (
              <ConnectionLine
                key={connection.id}
                connection={connection}
                sourceNode={sourceNode}
                targetNode={targetNode}
                onConnectionClick={handleConnectionClick}
                isSelected={selectedConnectionId === connection.id}
              />
            );
          }
          return null;
        })}
      </svg>

      {/* Mind map nodes */}
      {mindMapNodes.map(node => (
        <DraggableMindMapNode
          key={node.id}
          node={node}
          isSelected={selectedNodeIds.includes(node.id)}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onPositionChange={handlePositionChange}
          onPinToggle={handlePinToggle}
          onConnectStart={mode === 'connect' ? handleConnectStart : undefined}
          isConnecting={isConnecting}
          connectingFromId={connectingFromId || undefined}
        />
      ))}

      {/* Empty state */}
      {mindMapNodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-center">
          <div className="bg-white rounded-lg border p-8 shadow-lg max-w-md">
            <div className="text-gray-400 mb-4">
              <MousePointer className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Mind Map Bulletin Board</h3>
            <p className="text-gray-600 mb-4">
              Create visual connections between your research nodes. 
              Drag nodes around, pin them in place, and draw connections to visualize relationships.
            </p>
            <div className="text-sm text-gray-500">
              <p><strong>Move Mode:</strong> Drag nodes to reposition them</p>
              <p><strong>Connect Mode:</strong> Click nodes to draw connections</p>
              <p><strong>Pin:</strong> Pin nodes to keep them in place</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats overlay */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg border p-2 text-xs text-gray-600">
        <div className="flex items-center gap-4">
          <span>{mindMapNodes.length} nodes</span>
          <span>{connections.length} connections</span>
          <span>{mindMapNodes.filter(n => n.isPinned).length} pinned</span>
        </div>
      </div>
    </div>
  );
};

export default MindMapBulletinBoard;
