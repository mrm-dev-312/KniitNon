'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { useDrag } from 'react-dnd';
import { useOutlineStore } from '@/lib/stores/outline-store';
import { ItemTypes } from '@/components/providers/DragDropProvider';
import { debounce } from '@/lib/performance';

export interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  content: string;
  type: 'topic' | 'subtopic' | 'detail';
  source?: string;
  connections?: string[];
  url?: string;
  imageUrl?: string;
  tags?: string[];
  isImported?: boolean;
  importedAt?: string;
  level?: number; // For hierarchical layout
  weight?: number; // For importance-based sizing
}

export interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  id: string;
  strength?: number; // For connection strength
}

interface D3VisualizationProps {
  nodes: D3Node[];
  links: D3Link[];
  width: number;
  height: number;
  onNodeClick: (node: D3Node) => void;
  onNodeDoubleClick: (node: D3Node) => void;
  onNodeDrillDown?: (node: D3Node) => void;
  selectedNodeIds: string[];
  enablePerformanceMode?: boolean; // For large datasets
  maxVisibleNodes?: number; // Limit for performance
}

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  LARGE_GRAPH: 100,
  VERY_LARGE_GRAPH: 500,
  USE_CANVAS: 1000,
  DEBOUNCE_DELAY: 16, // ~60fps
};

// Simple performance monitor
class VisualizationPerformanceMonitor {
  private timers: Map<string, number> = new Map();

  startTiming(name: string) {
    this.timers.set(name, performance.now());
  }

  endTiming(name: string) {
    const startTime = this.timers.get(name);
    if (startTime) {
      const duration = performance.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        console.log(`D3 Performance: ${name} took ${duration.toFixed(2)}ms`);
      }
      this.timers.delete(name);
    }
  }
}

const perfMonitor = new VisualizationPerformanceMonitor();

const OptimizedD3Visualization: React.FC<D3VisualizationProps> = ({
  nodes,
  links,
  width,
  height,
  onNodeClick,
  onNodeDoubleClick,
  onNodeDrillDown,
  selectedNodeIds,
  enablePerformanceMode = false,
  maxVisibleNodes = 500,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationRef = useRef<d3.Simulation<D3Node, D3Link> | null>(null);
  const quadtreeRef = useRef<d3.Quadtree<D3Node> | null>(null);
  
  const [transform, setTransform] = useState(d3.zoomIdentity);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [renderMode, setRenderMode] = useState<'svg' | 'canvas'>('svg');

  // Determine render mode based on node count
  const shouldUseCanvas = useMemo(() => {
    return enablePerformanceMode || nodes.length > PERFORMANCE_THRESHOLDS.USE_CANVAS;
  }, [enablePerformanceMode, nodes.length]);

  // Filter nodes for performance
  const visibleNodes = useMemo(() => {
    perfMonitor.startTiming('filter-nodes');
    
    if (!enablePerformanceMode || nodes.length <= maxVisibleNodes) {
      perfMonitor.endTiming('filter-nodes');
      return nodes;
    }

    // Keep most important nodes (by connections, selection, etc.)
    const sortedNodes = [...nodes].sort((a, b) => {
      const aScore = (a.connections?.length || 0) + (selectedNodeIds.includes(a.id) ? 100 : 0);
      const bScore = (b.connections?.length || 0) + (selectedNodeIds.includes(b.id) ? 100 : 0);
      return bScore - aScore;
    });

    perfMonitor.endTiming('filter-nodes');
    return sortedNodes.slice(0, maxVisibleNodes);
  }, [nodes, selectedNodeIds, enablePerformanceMode, maxVisibleNodes]);

  // Filter links based on visible nodes
  const visibleLinks = useMemo(() => {
    perfMonitor.startTiming('filter-links');
    
    const nodeIds = new Set(visibleNodes.map(n => n.id));
    const filtered = links.filter(link => {
      const source = link.source as D3Node;
      const target = link.target as D3Node;
      const sourceId = typeof source === 'string' ? source : source?.id;
      const targetId = typeof target === 'string' ? target : target?.id;
      return sourceId && targetId && nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    perfMonitor.endTiming('filter-links');
    return filtered;
  }, [links, visibleNodes]);

  // Optimized force simulation
  const createSimulation = useCallback(() => {
    perfMonitor.startTiming('create-simulation');

    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    // Adaptive alpha and velocity decay for large graphs
    const isLargeGraph = visibleNodes.length > PERFORMANCE_THRESHOLDS.LARGE_GRAPH;
    const isVeryLargeGraph = visibleNodes.length > PERFORMANCE_THRESHOLDS.VERY_LARGE_GRAPH;

    const simulation = d3.forceSimulation<D3Node>(visibleNodes)
      .alpha(isLargeGraph ? 0.1 : 0.3)
      .alphaDecay(isLargeGraph ? 0.05 : 0.0228)
      .velocityDecay(isLargeGraph ? 0.8 : 0.4)
      .force('link', d3.forceLink<D3Node, D3Link>(visibleLinks)
        .id(d => d.id)
        .distance(isLargeGraph ? 30 : 50)
        .strength(isLargeGraph ? 0.1 : 0.3)
      )
      .force('charge', d3.forceManyBody()
        .strength(isLargeGraph ? -30 : -100)
        .distanceMax(isLargeGraph ? 200 : 400)
      )
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide()
        .radius((d: any) => getNodeRadius(d as D3Node) + 2)
        .strength(0.7)
      );

    if (visibleNodes.some(n => n.level !== undefined)) {
      simulation.force('y', d3.forceY()
        .y((d: any) => ((d as D3Node).level || 0) * (height / 5))
        .strength(0.3)
      );
    }

    simulationRef.current = simulation;
    
    perfMonitor.endTiming('create-simulation');
    return simulation;
  }, [visibleNodes, visibleLinks, width, height]);

  // Optimized node radius calculation
  const getNodeRadius = useCallback((node: D3Node) => {
    const baseRadius = 8;
    const connectionBonus = Math.min((node.connections?.length || 0) * 2, 12);
    const typeMultiplier = node.type === 'topic' ? 1.5 : node.type === 'subtopic' ? 1.2 : 1;
    const selectedBonus = selectedNodeIds.includes(node.id) ? 4 : 0;
    
    return baseRadius + connectionBonus * typeMultiplier + selectedBonus;
  }, [selectedNodeIds]);

  // Optimized color scheme
  const getNodeColor = useCallback((node: D3Node) => {
    if (selectedNodeIds.includes(node.id)) return '#3b82f6';
    
    const colors = {
      topic: '#10b981',
      subtopic: '#f59e0b',
      detail: '#8b5cf6',
    };
    
    return colors[node.type] || '#6b7280';
  }, [selectedNodeIds]);

  // Debounced render function for performance
  const debouncedRender = useMemo(
    () => debounce(() => {
      if (shouldUseCanvas && canvasRef.current) {
        renderCanvas();
      } else {
        renderSVG();
      }
    }, PERFORMANCE_THRESHOLDS.DEBOUNCE_DELAY),
    [shouldUseCanvas, visibleNodes, visibleLinks, transform]
  );

  // Canvas rendering for large graphs
  const renderCanvas = useCallback(() => {
    perfMonitor.startTiming('render-canvas');
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    context.clearRect(0, 0, width, height);

    // Apply transform
    context.save();
    context.translate(transform.x, transform.y);
    context.scale(transform.k, transform.k);

    // Draw links
    context.strokeStyle = 'rgba(156, 163, 175, 0.4)';
    context.lineWidth = 1 / transform.k; // Adjust for zoom
    
    visibleLinks.forEach(link => {
      const source = link.source as D3Node;
      const target = link.target as D3Node;
      
      if (source.x !== undefined && source.y !== undefined && 
          target.x !== undefined && target.y !== undefined) {
        context.beginPath();
        context.moveTo(source.x, source.y);
        context.lineTo(target.x, target.y);
        context.stroke();
      }
    });

    // Draw nodes
    visibleNodes.forEach(node => {
      if (node.x === undefined || node.y === undefined) return;

      const radius = getNodeRadius(node) / transform.k; // Adjust for zoom
      const color = getNodeColor(node);

      // Node circle
      context.fillStyle = color;
      context.beginPath();
      context.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      context.fill();

      // Node border for selected
      if (selectedNodeIds.includes(node.id)) {
        context.strokeStyle = '#1e40af';
        context.lineWidth = 2 / transform.k;
        context.stroke();
      }

      // Node text (only for larger nodes or when zoomed in)
      if (radius > 6 || transform.k > 1.5) {
        context.fillStyle = '#ffffff';
        context.font = `${Math.max(10, 12 / transform.k)}px sans-serif`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        const maxLength = Math.floor(radius / 2);
        const text = node.title.length > maxLength ? 
          node.title.substring(0, maxLength) + '...' : 
          node.title;
        
        context.fillText(text, node.x, node.y);
      }
    });

    context.restore();
    perfMonitor.endTiming('render-canvas');
  }, [visibleNodes, visibleLinks, width, height, transform, getNodeRadius, getNodeColor, selectedNodeIds]);

  // SVG rendering for smaller graphs
  const renderSVG = useCallback(() => {
    perfMonitor.startTiming('render-svg');
    
    const svg = d3.select(svgRef.current);
    if (!svg.node()) return;

    // Update links
    const linkSelection = svg.select('.links')
      .selectAll<SVGLineElement, D3Link>('line')
      .data(visibleLinks, d => d.id);

    linkSelection.exit().remove();

    const linkEnter = linkSelection.enter()
      .append('line')
      .attr('stroke', '#9ca3af')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', 1);

    const linkMerged = linkEnter.merge(linkSelection);

    // Update nodes
    const nodeSelection = svg.select('.nodes')
      .selectAll<SVGGElement, D3Node>('g')
      .data(visibleNodes, d => d.id);

    nodeSelection.exit().remove();

    const nodeEnter = nodeSelection.enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer');

    // Add circles
    nodeEnter.append('circle');

    // Add text
    nodeEnter.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-size', '10px')
      .style('fill', 'white')
      .style('pointer-events', 'none');

    const nodeMerged = nodeEnter.merge(nodeSelection);

    // Update circle attributes
    nodeMerged.select('circle')
      .attr('r', getNodeRadius)
      .attr('fill', getNodeColor)
      .attr('stroke', d => selectedNodeIds.includes(d.id) ? '#1e40af' : 'none')
      .attr('stroke-width', 2);

    // Update text
    nodeMerged.select('text')
      .text(d => {
        const radius = getNodeRadius(d);
        const maxLength = Math.floor(radius / 2);
        return d.title.length > maxLength ? 
          d.title.substring(0, maxLength) + '...' : 
          d.title;
      });

    // Apply positions during simulation
    if (simulationRef.current) {
      simulationRef.current.on('tick', () => {
        linkMerged
          .attr('x1', d => (d.source as D3Node).x || 0)
          .attr('y1', d => (d.source as D3Node).y || 0)
          .attr('x2', d => (d.target as D3Node).x || 0)
          .attr('y2', d => (d.target as D3Node).y || 0);

        nodeMerged
          .attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
      });
    }

    // Add interaction handlers
    nodeMerged
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick(d);
      })
      .on('dblclick', (event, d) => {
        event.stopPropagation();
        onNodeDoubleClick(d);
      })
      .call(d3.drag<SVGGElement, D3Node>()
        .on('start', (event, d) => {
          if (!event.active && simulationRef.current) {
            simulationRef.current.alphaTarget(0.3).restart();
          }
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active && simulationRef.current) {
            simulationRef.current.alphaTarget(0);
          }
          d.fx = null;
          d.fy = null;
        })
      );

    perfMonitor.endTiming('render-svg');
  }, [visibleNodes, visibleLinks, getNodeRadius, getNodeColor, selectedNodeIds, onNodeClick, onNodeDoubleClick]);

  // Initialize quadtree for efficient collision detection
  const updateQuadtree = useCallback(() => {
    perfMonitor.startTiming('update-quadtree');
    
    quadtreeRef.current = d3.quadtree<D3Node>()
      .x(d => d.x || 0)
      .y(d => d.y || 0)
      .addAll(visibleNodes.filter(n => n.x !== undefined && n.y !== undefined));
    
    perfMonitor.endTiming('update-quadtree');
  }, [visibleNodes]);

  // Setup zoom behavior
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const canvas = d3.select(canvasRef.current);

    if (shouldUseCanvas) {
      const canvasZoom = d3.zoom<HTMLCanvasElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          const newTransform = event.transform;
          setTransform(newTransform);
          debouncedRender();
        });

      (canvas as any).call(canvasZoom);
    } else {
      const svgZoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          const newTransform = event.transform;
          setTransform(newTransform);
          svg.select('.main-group').attr('transform', newTransform);
        });

      (svg as any).call(svgZoom);
    }

    return () => {
      if (shouldUseCanvas) {
        canvas.on('.zoom', null);
      } else {
        svg.on('.zoom', null);
      }
    };
  }, [shouldUseCanvas, debouncedRender]);

  // Initialize and update simulation
  useEffect(() => {
    perfMonitor.startTiming('full-update');
    
    setIsSimulationRunning(true);
    setRenderMode(shouldUseCanvas ? 'canvas' : 'svg');

    const simulation = createSimulation();

    simulation.on('tick', () => {
      updateQuadtree();
      debouncedRender();
    });

    simulation.on('end', () => {
      setIsSimulationRunning(false);
      updateQuadtree();
      debouncedRender();
    });

    // Cleanup
    return () => {
      simulation.stop();
      simulation.on('tick', null);
      simulation.on('end', null);
    };
  }, [createSimulation, updateQuadtree, debouncedRender, shouldUseCanvas]);

  // Performance stats for development
  const performanceStats = useMemo(() => {
    if (process.env.NODE_ENV !== 'development') return null;

    return {
      totalNodes: nodes.length,
      visibleNodes: visibleNodes.length,
      totalLinks: links.length,
      visibleLinks: visibleLinks.length,
      renderMode,
      isSimulationRunning,
    };
  }, [nodes.length, visibleNodes.length, links.length, visibleLinks.length, renderMode, isSimulationRunning]);

  return (
    <div className="relative w-full h-full">
      {/* Performance mode indicator */}
      {enablePerformanceMode && (
        <div className="absolute top-2 right-2 z-10 bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
          Performance Mode: {renderMode.toUpperCase()}
        </div>
      )}

      {/* Development performance stats */}
      {process.env.NODE_ENV === 'development' && performanceStats && (
        <div className="absolute top-2 left-2 z-10 bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-mono">
          Nodes: {performanceStats.visibleNodes}/{performanceStats.totalNodes} | 
          Links: {performanceStats.visibleLinks}/{performanceStats.totalLinks} | 
          Mode: {performanceStats.renderMode} |
          {performanceStats.isSimulationRunning && ' Running'}
        </div>
      )}

      {/* Canvas for high-performance rendering */}
      {shouldUseCanvas && (
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="absolute inset-0"
          style={{ width: '100%', height: '100%' }}
        />
      )}

      {/* SVG for normal rendering */}
      {!shouldUseCanvas && (
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="w-full h-full"
          style={{ background: 'transparent' }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#9ca3af"
              />
            </marker>
          </defs>
          <g className="main-group">
            <g className="links"></g>
            <g className="nodes"></g>
          </g>
        </svg>
      )}

      {/* Loading indicator for simulation */}
      {isSimulationRunning && (
        <div className="absolute bottom-2 right-2 z-10 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs flex items-center gap-1">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
          Simulating...
        </div>
      )}
    </div>
  );
};

export default OptimizedD3Visualization;
