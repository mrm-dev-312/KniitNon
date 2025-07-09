'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDrag } from 'react-dnd';
import { useOutlineStore } from '@/lib/stores/outline-store';
import { ItemTypes } from '@/components/providers/DragDropProvider';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Plus, RefreshCw, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import D3Visualization, { D3Node, D3Link } from './D3Visualization';
import ImportNodeDialog from './ImportNodeDialog';
import SummaryDialog from './SummaryDialog';
import ConflictHighlightDialog from './ConflictHighlightDialog';

interface VisualizationNode {
  id: string;
  title: string;
  content: string;
  type: 'topic' | 'subtopic' | 'detail';
  connections: string[];
  source?: string;
  url?: string;
  imageUrl?: string;
  tags?: string[];
  isImported?: boolean;
  importedAt?: string;
}

interface DraggableNodeProps {
  node: D3Node;
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
        left: (node.x || 0) - 64, 
        top: (node.y || 0) - 32,
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
    </div>
  );
};

const VisualizationCanvas: React.FC = () => {
  const { selectedNodeIds, toggleNodeSelection, addNodes } = useOutlineStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [nodes, setNodes] = useState<VisualizationNode[]>([]);
  const [d3Nodes, setD3Nodes] = useState<D3Node[]>([]);
  const [d3Links, setD3Links] = useState<D3Link[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'d3' | 'traditional'>('d3');
  const [selectedNodeDetails, setSelectedNodeDetails] = useState<D3Node | null>(null);
  const [showChatDataNotification, setShowChatDataNotification] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Sample nodes for demonstration
  const sampleNodes: VisualizationNode[] = [
    {
      id: 'node-1',
      title: 'Climate Change',
      content: 'Overview of global climate change impacts and causes. This comprehensive topic covers the fundamental science behind climate change, including greenhouse gas emissions, temperature rise patterns, and environmental impacts.',
      type: 'topic',
      connections: ['node-2', 'node-3'],
      source: 'NASA Climate'
    },
    {
      id: 'node-2',
      title: 'Carbon Emissions',
      content: 'Analysis of CO2 and greenhouse gas emissions from various sources including industry, transportation, and agriculture. Detailed breakdown of emission sources and reduction strategies.',
      type: 'subtopic',
      connections: ['node-1', 'node-4', 'node-5'],
      source: 'EPA Reports'
    },
    {
      id: 'node-3',
      title: 'Sea Level Rise',
      content: 'Documentation of rising sea levels and coastal impacts due to thermal expansion and ice sheet melting. Regional variations and future projections.',
      type: 'subtopic',
      connections: ['node-1', 'node-6'],
      source: 'NOAA Data'
    },
    {
      id: 'node-4',
      title: 'Industrial Sources',
      content: 'Manufacturing and industrial carbon footprint data, including steel, cement, and chemical production emissions.',
      type: 'detail',
      connections: ['node-2'],
      source: 'Industry Reports'
    },
    {
      id: 'node-5',
      title: 'Transportation',
      content: 'Vehicle emissions from cars, trucks, aviation, and shipping. Analysis of electric vehicle adoption impacts.',
      type: 'detail',
      connections: ['node-2'],
      source: 'Transport Studies'
    },
    {
      id: 'node-6',
      title: 'Coastal Erosion',
      content: 'Beach and cliff erosion patterns caused by rising sea levels and increased storm intensity.',
      type: 'detail',
      connections: ['node-3'],
      source: 'Coastal Research'
    },
    {
      id: 'node-7',
      title: 'Renewable Energy',
      content: 'Solar, wind, and hydroelectric power as solutions to reduce carbon emissions and combat climate change.',
      type: 'topic',
      connections: ['node-8', 'node-9'],
      source: 'Energy Research'
    },
    {
      id: 'node-8',
      title: 'Solar Power',
      content: 'Photovoltaic technology advances and solar installation trends worldwide.',
      type: 'subtopic',
      connections: ['node-7'],
      source: 'Solar Industry'
    },
    {
      id: 'node-9',
      title: 'Wind Energy',
      content: 'Onshore and offshore wind farm development and efficiency improvements.',
      type: 'subtopic',
      connections: ['node-7'],
      source: 'Wind Power Association'
    }
  ];

  // Update dimensions on container resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ 
          width: Math.max(800, rect.width - 40), 
          height: Math.max(600, rect.height - 100) 
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Convert nodes to D3 format and create links
  useEffect(() => {
    const d3NodesData: D3Node[] = nodes.map(node => ({
      id: node.id,
      title: node.title,
      content: node.content,
      type: node.type,
      source: node.source,
    }));

    const d3LinksData: D3Link[] = [];
    nodes.forEach(node => {
      node.connections.forEach(connectionId => {
        if (nodes.find(n => n.id === connectionId)) {
          d3LinksData.push({
            source: node.id,
            target: connectionId,
            id: `${node.id}-${connectionId}`
          });
        }
      });
    });

    setD3Nodes(d3NodesData);
    setD3Links(d3LinksData);
  }, [nodes]);

  const fetchNodes = async () => {
    console.log('=== VisualizationCanvas fetchNodes called ===');
    setIsLoading(true);
    try {
      // First check if there's generated research data from chat
      const storedData = localStorage.getItem('generated-research-data');
      console.log('Checking for stored research data:', !!storedData);
      console.log('Raw localStorage data:', storedData);
      
      if (storedData) {
        const generatedData = JSON.parse(storedData);
        
        // Check if data is too old (older than 30 minutes) and clear it
        const loadedAt = generatedData.loadedAt;
        const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
        
        if (loadedAt && loadedAt < thirtyMinutesAgo) {
          console.log('🧹 Clearing old localStorage data (older than 30 minutes)');
          localStorage.removeItem('generated-research-data');
          // Fall through to API fetch below
        } else {
          console.log('Parsed generated data structure:', {
            hasNodes: !!generatedData.nodes,
            isArray: Array.isArray(generatedData.nodes),
            nodeCount: generatedData.nodes?.length || 0,
            loadedAt: loadedAt ? new Date(loadedAt).toLocaleTimeString() : 'unknown',
            sampleNode: generatedData.nodes?.[0]
          });
          
          if (generatedData.nodes && Array.isArray(generatedData.nodes)) {
            console.log('✅ Using generated research data from chat - nodes count:', generatedData.nodes.length);
            
            // Transform the generated nodes to match our interface
            const transformedNodes: VisualizationNode[] = generatedData.nodes.map((node: any, index: number) => {
              const connectionType = typeof node.connections;
              const transformedConnections = connectionType === 'string' 
                ? node.connections.split(' ').filter(Boolean)
                : (node.connections || []);
              
              console.log(`Node ${index + 1} transformation:`, {
                id: node.id,
                title: node.title?.substring(0, 30) + '...',
                connectionType,
                originalConnections: node.connections,
                transformedConnections
              });
              
              return {
                id: node.id,
                title: node.title,
                content: node.content,
                type: node.type,
                connections: transformedConnections,
                source: node.source
              };
            });
            
            console.log('✅ Setting transformed nodes:', transformedNodes.length);
            setNodes(transformedNodes);
            setShowChatDataNotification(true);
            // Hide notification after 5 seconds
            setTimeout(() => setShowChatDataNotification(false), 5000);
            
            // Don't immediately clear the localStorage - let it persist for this session
            // We'll add a timestamp and clear it after a reasonable time period
            const dataWithTimestamp = { ...generatedData, loadedAt: Date.now() };
            localStorage.setItem('generated-research-data', JSON.stringify(dataWithTimestamp));
            console.log('✅ localStorage data persisted with timestamp for session');
            setIsLoading(false);
            
            // Force update the search term to trigger re-render if needed
            setSearchTerm('');
            return;
          } else {
            console.log('❌ Generated data does not have valid nodes array:', {
              hasNodes: !!generatedData.nodes,
              nodesType: typeof generatedData.nodes,
              isArray: Array.isArray(generatedData.nodes)
            });
          }
        }
      } else {
        console.log('❌ No stored research data found in localStorage');
      }

      // Try to fetch from API (only if no localStorage data was found)
      console.log('🔄 No localStorage data found, attempting to fetch from /api/research/nodes...');
      const response = await fetch('/api/research/nodes');
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API response received:', data);
        const transformedNodes = data.map((node: any, index: number) => ({
          id: node.id || `api-node-${index}`,
          title: node.title || 'Untitled',
          content: node.content || '',
          type: node.type || 'topic',
          connections: node.children || node.connections || [], // API uses 'children', generated data uses 'connections'
          source: node.source || `${node.lens} (API)`
        }));
        console.log('✅ Using API data, transformed nodes count:', transformedNodes.length);
        setNodes(transformedNodes);
      } else {
        console.log('❌ API not available, status:', response.status);
        throw new Error('API not available');
      }
    } catch (error) {
      console.log('❌ Error occurred, using sample data:', error instanceof Error ? error.message : String(error));
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('✅ Using sample data, node count:', sampleNodes.length);
      setNodes(sampleNodes);
    } finally {
      console.log('=== fetchNodes completed ===');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
  }, []);

  const filteredNodes = nodes.filter(node =>
    node.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    node.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (node.source && node.source.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredD3Nodes = d3Nodes.filter(node =>
    node.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    node.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (node.source && node.source.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredD3Links = d3Links.filter(link => {
    const sourceId = typeof link.source === 'string' ? link.source : (link.source as D3Node).id;
    const targetId = typeof link.target === 'string' ? link.target : (link.target as D3Node).id;
    return filteredD3Nodes.some(n => n.id === sourceId) && filteredD3Nodes.some(n => n.id === targetId);
  });

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

  const handleNodeClick = useCallback((node: D3Node) => {
    toggleNodeSelection(node.id);
  }, [toggleNodeSelection]);

  const handleNodeDoubleClick = useCallback((node: D3Node) => {
    setSelectedNodeDetails(node);
  }, []);

  const handleDrillDown = async (node: D3Node) => {
    setIsLoading(true);
    try {
      // Calculate current depth for this node
      const currentDepth = (node as any).depth || 0;
      
      const response = await fetch('/api/research/drill-down', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeId: node.id,
          title: node.title,
          content: node.content,
          type: node.type,
          lens: (node as any).lens || 'Other',
          depth: currentDepth,
          parentId: (node as any).parentId
        }),
      });

      if (response.ok) {
        const drillData = await response.json();
        if (drillData.drillDownNodes && Array.isArray(drillData.drillDownNodes)) {
          if (drillData.drillDownNodes.length === 0) {
            // No more subtopics available - show user feedback
            console.log(`No more subtopics available for: ${node.title}`);
            // Could add a toast notification here in the future
            return;
          }
          
          console.log(`Generated ${drillData.drillDownNodes.length} drill-down nodes for: ${node.title} (depth: ${currentDepth + 1})`);
          
          // Add the new nodes to existing nodes instead of replacing
          setNodes(prevNodes => {
            // Remove any existing drill-down nodes for this parent to avoid duplicates
            const filteredNodes = prevNodes.filter(n => (n as any).parentId !== node.id);
            return [...filteredNodes, ...drillData.drillDownNodes];
          });
        } else {
          console.log(`No more specific subtopics can be generated for: ${node.title}`);
        }
      } else {
        console.error('Failed to generate drill-down nodes');
      }
    } catch (error) {
      console.error('Error generating drill-down nodes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetZoom = () => {
    // This would trigger a reset in the D3 visualization
    // For now, we'll just refresh the component
    setViewMode(viewMode === 'd3' ? 'traditional' : 'd3');
    setTimeout(() => setViewMode(viewMode), 100);
  };

  const handleSearchGenerate = async () => {
    if (!searchTerm.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/research/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: searchTerm,
          perspective: 'general'
        }),
      });

      if (response.ok) {
        const searchData = await response.json();
        if (searchData.nodes && Array.isArray(searchData.nodes)) {
          console.log(`Generated ${searchData.nodes.length} research nodes for: ${searchTerm}`);
          setNodes(searchData.nodes);
          // Clear search term after successful generation
          setSearchTerm('');
        }
      } else {
        console.error('Failed to generate research nodes from search');
      }
    } catch (error) {
      console.error('Error generating research nodes from search:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchGenerate();
    }
  };

  const { nodes: outlineNodes, addNodes: addToOutline } = useOutlineStore();
  
  // Add handler for successful imports
  const handleImportSuccess = useCallback((importedNode: any) => {
    const newNode: VisualizationNode = {
      id: importedNode.id,
      title: importedNode.title,
      content: importedNode.content,
      type: importedNode.type,
      connections: importedNode.connections || [],
      source: importedNode.source,
    };
    
    // Add to nodes state
    setNodes(prevNodes => [...prevNodes, newNode]);
    
    // Convert to D3 node and add to D3 nodes
    const newD3Node: D3Node = {
      id: importedNode.id,
      title: importedNode.title,
      content: importedNode.content,
      type: importedNode.type,
      source: importedNode.source,
      connections: importedNode.connections || [],
      x: Math.random() * 400 + 200, // Random initial position
      y: Math.random() * 300 + 150,
      isImported: true,
      importedAt: importedNode.importedAt,
      tags: importedNode.tags,
      url: importedNode.url,
      imageUrl: importedNode.imageUrl,
    };
    
    setD3Nodes(prevNodes => [...prevNodes, newD3Node]);
    
    // Add connections if parent node exists
    if (importedNode.connections && importedNode.connections.length > 0) {
      const newLinks: D3Link[] = importedNode.connections.map((targetId: string) => ({
        source: importedNode.id,
        target: targetId,
        type: 'parent-child',
      }));
      setD3Links(prevLinks => [...prevLinks, ...newLinks]);
    }
  }, []);

  return (
    <div ref={containerRef} className="h-full flex flex-col">
      {/* Chat Data Notification */}
      {showChatDataNotification && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-800 font-medium">
              Research nodes generated from your chat conversation!
            </span>
            <span className="text-green-600 text-sm">
              ({nodes.length} nodes created)
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowChatDataNotification(false)}
            className="text-green-700 hover:text-green-900"
          >
            ✕
          </Button>
        </div>
      )}
      
      {/* Controls */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search or generate research nodes..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              className="pl-10 pr-24"
            />
            {searchTerm.trim() && (
              <Button
                size="sm"
                onClick={handleSearchGenerate}
                disabled={isLoading}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8"
              >
                {isLoading ? 'Generating...' : 'Generate'}
              </Button>
            )}
          </div>
        </div>
        
        <Button
          variant={viewMode === 'd3' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('d3')}
        >
          D3 Graph
        </Button>

        <Button
          variant={viewMode === 'traditional' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('traditional')}
        >
          Traditional
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={resetZoom}
          disabled={isLoading}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={fetchNodes}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        
        <ImportNodeDialog onImportSuccess={handleImportSuccess} />
        
        <SummaryDialog 
          selectedNodeIds={selectedNodeIds}
          selectedNodes={nodes.filter(node => selectedNodeIds.includes(node.id))}
        />
        
        <ConflictHighlightDialog 
          selectedNodeIds={selectedNodeIds}
          selectedNodes={nodes.filter(node => selectedNodeIds.includes(node.id))}
        />
        
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
        ) : viewMode === 'd3' ? (
          <>
            <D3Visualization
              nodes={filteredD3Nodes}
              links={filteredD3Links}
              width={dimensions.width}
              height={dimensions.height}
              onNodeClick={handleNodeClick}
              onNodeDoubleClick={handleNodeDoubleClick}
              onNodeDrillDown={handleDrillDown}
              selectedNodeIds={selectedNodeIds}
            />
            {filteredD3Nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-center bg-background/50">
                <div>
                  <p className="text-muted-foreground mb-2">No nodes found</p>
                  <Button variant="outline" onClick={fetchNodes}>
                    Load Research Data
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {filteredNodes.map((node) => (
              <DraggableNode
                key={node.id}
                node={{
                  id: node.id,
                  title: node.title,
                  content: node.content,
                  type: node.type,
                  source: node.source,
                  x: Math.random() * (dimensions.width - 200) + 100,
                  y: Math.random() * (dimensions.height - 200) + 100,
                }}
                isSelected={selectedNodeIds.includes(node.id)}
                onToggleSelection={toggleNodeSelection}
              />
            ))}
            
            {filteredNodes.length === 0 && (
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
            <li>• {viewMode === 'd3' ? 'Click nodes to select, double-click for details' : 'Check boxes to select nodes'}</li>
            <li>• {viewMode === 'd3' ? 'Shift+click or right-click topics/subtopics to drill deeper' : 'Drag nodes to the outline builder'}</li>
            <li>• Type a topic and press Enter or click Generate to create research nodes</li>
            <li>• Use search to filter existing nodes</li>
            <li>• {viewMode === 'd3' ? 'Zoom and pan the graph as needed' : 'Switch to D3 view for interactive graph'}</li>
          </ul>
        </div>
      </div>

      {/* Node Details Modal */}
      {selectedNodeDetails && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedNodeDetails(null)}>
          <div className="bg-background p-6 rounded-lg border max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">{selectedNodeDetails.title}</h3>
            <p className="text-sm text-muted-foreground mb-2">Type: {selectedNodeDetails.type}</p>
            {selectedNodeDetails.source && (
              <p className="text-sm text-muted-foreground mb-2">Source: {selectedNodeDetails.source}</p>
            )}
            <p className="text-sm mb-4">{selectedNodeDetails.content}</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedNodeDetails(null)}>
                Close
              </Button>
              <ImportNodeDialog 
                onImportSuccess={handleImportSuccess}
                parentNodeId={selectedNodeDetails.id}
                trigger={
                  <Button variant="outline" size="sm">
                    Import Child
                  </Button>
                }
              />
              <Button 
                variant="outline"
                onClick={() => {
                  handleDrillDown(selectedNodeDetails);
                  setSelectedNodeDetails(null);
                }}
              >
                Drill Deeper
              </Button>
              <Button 
                onClick={() => {
                  handleNodeClick(selectedNodeDetails);
                  setSelectedNodeDetails(null);
                }}
              >
                {selectedNodeIds.includes(selectedNodeDetails.id) ? 'Deselect' : 'Select'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualizationCanvas;
