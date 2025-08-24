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

  const ref = useRef<HTMLDivElement>(null);
  drag(ref);

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
      } ${
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
            variant={isConnecting && connectingFromId === node.id ? "default" : "secondary"}
            className="h-6 w-6 p-0 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              onConnectStart?.(node.id);
            }}
            title={isConnecting ? "Click another node to connect" : "Draw thread to another node"}
          >
            <GitBranch className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-6 w-6 p-0 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              if (typeof window !== 'undefined' && window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('mindmap-drill-deeper', { detail: { nodeId: node.id } }));
              }
            }}
            title="Drill deeper"
          >
            <Plus className="h-3 w-3" />
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
        strokeDasharray="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      
      {/* Thread connection points */}
      <circle
        cx={sourceX}
        cy={sourceY}
        r="3"
        fill={connection.color}
        className="transition-all duration-200"
        opacity="0.7"
      />
      <circle
        cx={targetX}
        cy={targetY}
        r="3"
        fill={connection.color}
        className="transition-all duration-200"
        opacity="0.7"
      />
      
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

  // Calculate organic mind map layout positions
  const calculateMindMapLayout = useCallback((nodes: typeof initialNodes, containerWidth: number, containerHeight: number) => {
    if (nodes.length === 0) return [];

    const positions: { x: number; y: number }[] = [];
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;

    // Separate nodes by type to create hierarchy
    const topicNodes = nodes.filter(n => n.type === 'topic');
    const subtopicNodes = nodes.filter(n => n.type === 'subtopic');
    const detailNodes = nodes.filter(n => n.type === 'detail');

    let currentIndex = 0;

    // Place topic nodes (main concepts) in the center area
    topicNodes.forEach((_, index) => {
      if (index === 0) {
        // First topic at center
        positions[currentIndex] = { x: centerX - 80, y: centerY - 50 };
      } else {
        // Other topics in a circle around center
        const angle = (index - 1) * (Math.PI * 2) / Math.max(topicNodes.length - 1, 1);
        const radius = 200;
        positions[currentIndex] = {
          x: centerX + Math.cos(angle) * radius - 80,
          y: centerY + Math.sin(angle) * radius - 50
        };
      }
      currentIndex++;
    });

    // Place subtopic nodes in rings around topics
    subtopicNodes.forEach((_, index) => {
      const angle = index * (Math.PI * 2) / Math.max(subtopicNodes.length, 1);
      const radius = 300 + (index % 2) * 80; // Varied distance for visual interest
      positions[currentIndex] = {
        x: centerX + Math.cos(angle) * radius - 80,
        y: centerY + Math.sin(angle) * radius - 50
      };
      currentIndex++;
    });

    // Place detail nodes in outer ring with more spacing
    detailNodes.forEach((_, index) => {
      const angle = index * (Math.PI * 2) / Math.max(detailNodes.length, 1);
      const radius = 450 + (index % 3) * 60; // Even more varied spacing
      positions[currentIndex] = {
        x: centerX + Math.cos(angle) * radius - 80,
        y: centerY + Math.sin(angle) * radius - 50
      };
      currentIndex++;
    });

    return positions;
  }, []);

  // Initialize mind map nodes from input nodes
  useEffect(() => {
    const existingNodeIds = new Set(mindMapNodes.map(n => n.id));
    const newNodes: MindMapNode[] = [];
    
    // Calculate positions for new nodes
    const positions = calculateMindMapLayout(initialNodes, width || 1200, height || 800);
    
    initialNodes.forEach((node, index) => {
      if (!existingNodeIds.has(node.id)) {
        const position = positions[index] || { x: 100, y: 100 };
        
        // Ensure positions are within basic bounds but allow free placement
        const clampedX = Math.max(10, Math.min(position.x, (width || 1200) - 50));
        const clampedY = Math.max(10, Math.min(position.y, (height || 800) - 50));
        
        newNodes.push({
          id: node.id,
          title: node.title,
          content: node.content,
          type: node.type,
          source: node.source,
          x: clampedX,
          y: clampedY,
          isPinned: false,
          connections: node.connections || [],
          color: undefined
        });
      }
    });

    if (newNodes.length > 0) {
      setMindMapNodes(prev => [...prev, ...newNodes]);
    }
  }, [initialNodes, mindMapNodes, calculateMindMapLayout, width, height]);

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
        // Generate a variety of thread colors
        const threadColors = ['#8B4513', '#CD853F', '#D2691E', '#A0522D', '#F4A460', '#DEB887'];
        const randomColor = threadColors[Math.floor(Math.random() * threadColors.length)];
        
        const newConnection: Connection = {
          id: `thread-${connectingFromId}-${nodeId}-${Date.now()}`,
          sourceId: connectingFromId,
          targetId: nodeId,
          type: 'curve',
          color: randomColor,
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
    const positions = calculateMindMapLayout(
      mindMapNodes.map(n => ({ 
        id: n.id, 
        title: n.title, 
        content: n.content, 
        type: n.type, 
        source: n.source 
      })), 
      width || 1200, 
      height || 800
    );
    
    setMindMapNodes(prev => prev.map((node, index) => {
      const position = positions[index] || { x: 100, y: 100 };
      const clampedX = Math.max(10, Math.min(position.x, (width || 1200) - 50));
      const clampedY = Math.max(10, Math.min(position.y, (height || 800) - 50));
      
      return {
        ...node,
        x: clampedX,
        y: clampedY,
        isPinned: false
      };
    }));
    setConnections([]);
    setSelectedConnectionId(null);
  }, [calculateMindMapLayout, width, height, mindMapNodes]);

  const cancelConnection = useCallback(() => {
    setIsConnecting(false);
    setConnectingFromId(null);
  }, []);

  // Make the entire board a drop zone for free movement
  const boardRef = useRef<HTMLDivElement>(null);
  const [{ isOverBoard }, dropBoard] = useDrop({
    accept: 'MINDMAP_NODE',
    drop: (item: { id: string; x: number; y: number }, monitor) => {
      const offset = monitor.getSourceClientOffset();
      if (offset && boardRef.current) {
        // Calculate position relative to the board container
        const boardRect = boardRef.current.getBoundingClientRect();
        const newX = Math.max(10, offset.x - boardRect.left - 80); // Center the card
        const newY = Math.max(10, offset.y - boardRect.top - 40);
        handlePositionChange(item.id, newX, newY);
      }
    },
    collect: (monitor) => ({
      isOverBoard: monitor.isOver(),
    }),
  });

  // Connect the drop functionality to our ref
  dropBoard(boardRef);

  useEffect(() => {
    function handleDrillDeeper(e: CustomEvent) {
      const parentId = e.detail.nodeId;
      const parentNode = mindMapNodes.find(n => n.id === parentId);
      if (!parentNode) return;
      // Create a new child node
      const newId = `node-${Date.now()}`;
      const childType: 'topic' | 'subtopic' | 'detail' = parentNode.type === 'topic' ? 'subtopic' : 'detail';
      const offsetX = 120 + Math.random() * 40;
      const offsetY = 80 + Math.random() * 40;
      const newNode: MindMapNode = {
        id: newId,
        title: `${parentNode.title} (Drilled)`,
        content: `Drilled deeper from ${parentNode.title}`,
        type: childType,
        source: undefined,
        x: parentNode.x + offsetX,
        y: parentNode.y + offsetY,
        isPinned: false,
        connections: [],
        color: undefined
      };
      setMindMapNodes(prev => [...prev, newNode]);
      // Create a thread connection
      const threadColors = ['#8B4513', '#CD853F', '#D2691E', '#A0522D', '#F4A460', '#DEB887'];
      const randomColor = threadColors[Math.floor(Math.random() * threadColors.length)];
      const newConnection: Connection = {
        id: `thread-${parentId}-${newId}-${Date.now()}`,
        sourceId: parentId,
        targetId: newId,
        type: 'curve',
        color: randomColor,
        thickness: 2,
        label: 'Drilled'
      };
      setConnections(prev => [...prev, newConnection]);
    }
    window.addEventListener('mindmap-drill-deeper', handleDrillDeeper as EventListener);
    return () => {
      window.removeEventListener('mindmap-drill-deeper', handleDrillDeeper as EventListener);
    };
  }, [mindMapNodes]);

  return (
    <div 
      ref={boardRef}
      className={`mind-map-board relative w-full h-full overflow-hidden bg-gray-50 border rounded-lg ${
        isOverBoard ? 'bg-gray-100' : ''
      }`}
    >
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-2 bg-white rounded-lg border p-2 shadow-lg">
        <Button
          size="sm"
          variant={mode === 'move' ? 'default' : 'outline'}
          onClick={() => {
            setMode('move');
            setIsConnecting(false);
            setConnectingFromId(null);
          }}
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
          <GitBranch className="h-4 w-4" />
          Thread
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
            Delete Thread
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
          <p className="font-medium text-blue-900">Thread Mode Active</p>
          <p className="text-blue-700">Click the thread icon (🌿) on a node, then click another node to draw a connecting thread.</p>
        </div>
      )}

      {mode === 'move' && (
        <div className="absolute top-20 left-4 z-50 bg-green-100 border border-green-300 rounded-lg p-3 text-sm">
          <p className="font-medium text-green-900">Move Mode Active</p>
          <p className="text-green-700">Drag any card anywhere on the screen. Once dropped, it will stay in that exact position.</p>
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
              Drag cards anywhere on the screen, pin them in place, and draw threads to visualize relationships.
            </p>
            <div className="text-sm text-gray-500">
              <p><strong>Move Mode:</strong> Drag cards anywhere and they&apos;ll stay exactly where you drop them</p>
              <p><strong>Thread Mode:</strong> Click the thread icon (🌿) on cards to draw connecting threads</p>
              <p><strong>Pin:</strong> Pin cards to prevent accidental movement</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats overlay */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg border p-2 text-xs text-gray-600">
        <div className="flex items-center gap-4">
          <span>{mindMapNodes.length} cards</span>
          <span>{connections.length} threads</span>
          <span>{mindMapNodes.filter(n => n.isPinned).length} pinned</span>
        </div>
      </div>
    </div>
  );
};

export default MindMapBulletinBoard;
