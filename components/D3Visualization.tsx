'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { useDrag } from 'react-dnd';
import { useOutlineStore } from '@/lib/stores/outline-store';
import { ItemTypes } from '@/components/providers/DragDropProvider';

export interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  content: string;
  type: 'topic' | 'subtopic' | 'detail' | 'micro-detail';
  source?: string;
  connections?: string[];
  url?: string;
  imageUrl?: string;
  tags?: string[];
  isImported?: boolean;
  importedAt?: string;
  depth?: number;
  parentId?: string;
  lens?: string;
  taxonomy?: {
    level: number;
    parent: string;
    branch: string;
  };
}

export interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  id: string;
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
}

const D3Visualization: React.FC<D3VisualizationProps> = ({
  nodes,
  links,
  width,
  height,
  onNodeClick,
  onNodeDoubleClick,
  onNodeDrillDown,
  selectedNodeIds,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<D3Node, D3Link> | null>(null);
  const [colorScheme, setColorScheme] = useState<'analogous' | 'triadic' | 'monochromatic' | 'heatmap' | 'complementary' | 'tetradic'>('analogous');

  // Color schemes based on color theory for taxonomic hierarchy
  const getColorSchemes = () => {
    return {
      // Analogous color scheme - harmonious progression
      analogous: {
        0: { base: '#ef4444', selected: '#dc2626' }, // Red (Root level)
        1: { base: '#f97316', selected: '#ea580c' }, // Orange
        2: { base: '#f59e0b', selected: '#d97706' }, // Amber
        3: { base: '#84cc16', selected: '#65a30d' }, // Lime
        4: { base: '#22c55e', selected: '#16a34a' }, // Green
        5: { base: '#06b6d4', selected: '#0891b2' }, // Cyan
        6: { base: '#3b82f6', selected: '#2563eb' }, // Blue
        7: { base: '#8b5cf6', selected: '#7c3aed' }, // Violet
        default: { base: '#6b7280', selected: '#4b5563' }
      },
      // Triadic color scheme - high contrast, visually striking
      triadic: {
        0: { base: '#ef4444', selected: '#dc2626' }, // Red
        1: { base: '#3b82f6', selected: '#2563eb' }, // Blue  
        2: { base: '#f59e0b', selected: '#d97706' }, // Yellow
        3: { base: '#22c55e', selected: '#16a34a' }, // Green
        4: { base: '#8b5cf6', selected: '#7c3aed' }, // Purple
        5: { base: '#f97316', selected: '#ea580c' }, // Orange
        6: { base: '#06b6d4', selected: '#0891b2' }, // Cyan
        7: { base: '#84cc16', selected: '#65a30d' }, // Lime
        default: { base: '#6b7280', selected: '#4b5563' }
      },
      // Monochromatic blue scheme - professional, calming
      monochromatic: {
        0: { base: '#1e3a8a', selected: '#1e40af' }, // Navy blue
        1: { base: '#1d4ed8', selected: '#2563eb' }, // Blue
        2: { base: '#2563eb', selected: '#3b82f6' }, // Medium blue
        3: { base: '#3b82f6', selected: '#60a5fa' }, // Light blue
        4: { base: '#60a5fa', selected: '#93c5fd' }, // Lighter blue
        5: { base: '#93c5fd', selected: '#bfdbfe' }, // Very light blue
        6: { base: '#dbeafe', selected: '#eff6ff' }, // Pale blue
        7: { base: '#eff6ff', selected: '#f8fafc' }, // Almost white
        default: { base: '#6b7280', selected: '#4b5563' }
      },
      // Heat map scheme - intensity-based progression
      heatmap: {
        0: { base: '#7f1d1d', selected: '#991b1b' }, // Dark red (most intense)
        1: { base: '#dc2626', selected: '#ef4444' }, // Red
        2: { base: '#f97316', selected: '#fb923c' }, // Orange
        3: { base: '#f59e0b', selected: '#fbbf24' }, // Amber
        4: { base: '#eab308', selected: '#facc15' }, // Yellow
        5: { base: '#84cc16', selected: '#a3e635' }, // Lime
        6: { base: '#22c55e', selected: '#4ade80' }, // Green
        7: { base: '#10b981', selected: '#34d399' }, // Emerald (least intense)
        default: { base: '#6b7280', selected: '#4b5563' }
      },
      // Complementary scheme - opposite colors for high contrast
      complementary: {
        0: { base: '#dc2626', selected: '#ef4444' }, // Red
        1: { base: '#059669', selected: '#10b981' }, // Emerald (complement)
        2: { base: '#2563eb', selected: '#3b82f6' }, // Blue
        3: { base: '#f59e0b', selected: '#fbbf24' }, // Amber (complement)
        4: { base: '#7c3aed', selected: '#8b5cf6' }, // Violet
        5: { base: '#84cc16', selected: '#a3e635' }, // Lime (complement)
        6: { base: '#e11d48', selected: '#f43f5e' }, // Rose
        7: { base: '#06b6d4', selected: '#0891b2' }, // Cyan (complement)
        default: { base: '#6b7280', selected: '#4b5563' }
      },
      // Tetradic scheme - four equally spaced colors on color wheel
      tetradic: {
        0: { base: '#dc2626', selected: '#ef4444' }, // Red
        1: { base: '#f59e0b', selected: '#fbbf24' }, // Amber (90 degrees)
        2: { base: '#059669', selected: '#10b981' }, // Emerald (180 degrees)
        3: { base: '#2563eb', selected: '#3b82f6' }, // Blue (270 degrees)
        4: { base: '#7c3aed', selected: '#8b5cf6' }, // Violet (back to start)
        5: { base: '#84cc16', selected: '#a3e635' }, // Lime
        6: { base: '#06b6d4', selected: '#0891b2' }, // Cyan
        7: { base: '#e11d48', selected: '#f43f5e' }, // Rose
        default: { base: '#6b7280', selected: '#4b5563' }
      }
    };
  };

  const getNodeColor = (type: string, isSelected: boolean, depth: number = 0) => {
    const schemes = getColorSchemes();
    const scheme = schemes[colorScheme];
    const colorInfo = scheme[depth as keyof typeof scheme] || scheme.default;
    return isSelected ? colorInfo.selected : colorInfo.base;
  };

  const getNodeRadius = (type: string, depth: number = 0) => {
    // Create a visually appealing hierarchical size system
    // Higher levels (lower depth numbers) get larger sizes
    const hierarchicalSizes = {
      0: 45,  // Root level - largest (equivalent to your "100x" scaled down)
      1: 35,  // Second level (equivalent to your "70x" scaled down)  
      2: 25,  // Third level (equivalent to your "50x" scaled down)
      3: 20,  // Fourth level (equivalent to your "45x" scaled down)
      4: 16,  // Fifth level 
      5: 14,  // Sixth level
      6: 12,  // Seventh level
      7: 10,  // Eighth level
    };
    
    // Use hierarchical sizing based on depth, fallback to smaller sizes for very deep nodes
    const size = hierarchicalSizes[depth as keyof typeof hierarchicalSizes] || Math.max(8, 12 - (depth - 7));
    
    return size;
  };

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create force simulation with stable parameters to prevent spinning
    const simulation = d3.forceSimulation<D3Node>(nodes)
      .force('link', d3.forceLink<D3Node, D3Link>(links)
        .id(d => d.id)
        .distance((link) => {
          // Hierarchical link distance based on node sizes and depth
          const sourceDepth = (link.source as D3Node).depth || 0;
          const targetDepth = (link.target as D3Node).depth || 0;
          const depthDiff = Math.abs(sourceDepth - targetDepth);
          
          // Larger nodes need more space - adjust distance based on node size
          const sourceRadius = getNodeRadius((link.source as D3Node).type, sourceDepth);
          const targetRadius = getNodeRadius((link.target as D3Node).type, targetDepth);
          const avgRadius = (sourceRadius + targetRadius) / 2;
          
          // Base distance scales with node size + additional spacing
          const baseDistance = avgRadius * 3 + 60;
          
          // Parent-child relationships are closer, siblings are further apart
          return depthDiff === 1 ? baseDistance : baseDistance * 1.8;
        })
        .strength(0.8)  // Stronger link strength for stability
      )
      .force('charge', d3.forceManyBody()
        .strength((node) => {
          // Repulsion based on node size and depth to prevent overlap
          const depth = (node as D3Node).depth || 0;
          const radius = getNodeRadius((node as D3Node).type, depth);
          
          // Larger nodes have stronger repulsion to maintain hierarchy
          const baseStrength = -150; // Reduced from -300 to prevent excessive spinning
          const sizeMultiplier = radius / 20; // Scale with node size
          const depthMultiplier = 1 + (depth * 0.2); // Gentler depth scaling
          
          return baseStrength * sizeMultiplier * depthMultiplier;
        })
        .distanceMax(300) // Reduced max distance to contain forces
      )
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide()
        .radius(d => {
          const depth = (d as D3Node).depth || 0;
          const radius = getNodeRadius((d as D3Node).type, depth);
          return radius + 10; // Smaller buffer for tighter but stable layout
        })
        .strength(0.9) // Strong but not excessive collision avoidance
      )
      // Gentle radial force to organize by hierarchy without excessive movement
      .force('radial', d3.forceRadial(
        (node) => {
          const depth = (node as D3Node).depth || 0;
          // Smaller radial distances to keep nodes closer and prevent spinning
          return 60 + (depth * 50); // Reduced from 80 + 120 to prevent excessive spreading
        },
        width / 2,
        height / 2
      ).strength(0.2)) // Reduced strength to prevent spinning
      // Gentle centering forces
      .force('x', d3.forceX(width / 2).strength(0.05)) // Much gentler
      .force('y', d3.forceY(height / 2).strength(0.05))
      // Slower simulation for stability
      .alphaDecay(0.01) // Faster decay to settle quickly and prevent endless spinning
      .alphaMin(0.001) // Lower minimum to ensure it actually stops
      .velocityDecay(0.3); // Add velocity decay to dampen movement

    simulationRef.current = simulation;

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create container for zoomable content
    const container = svg.append('g');

    // Create links
    const linkElements = container
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6);

    // Create node groups
    const nodeGroups = container
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer');

    // Add circles to nodes with hierarchical sizing
    const circles = nodeGroups
      .append('circle')
      .attr('r', d => getNodeRadius(d.type, d.depth || 0))
      .attr('fill', d => getNodeColor(d.type, selectedNodeIds.includes(d.id), d.depth || 0))
      .attr('stroke', '#ffffff')
      .attr('stroke-width', d => {
        // Larger nodes get thicker strokes for better definition
        const depth = d.depth || 0;
        const radius = getNodeRadius(d.type, depth);
        return radius > 30 ? 3 : 2;
      })
      .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))');

    // Add labels to nodes with hierarchical font sizing
    const labels = nodeGroups
      .append('text')
      .text(d => {
        const depth = d.depth || 0;
        const radius = getNodeRadius(d.type, depth);
        // Longer text for larger nodes, shorter for smaller ones
        const maxLength = radius > 35 ? 25 : radius > 25 ? 18 : 12;
        return d.title.length > maxLength ? d.title.substring(0, maxLength) + '...' : d.title;
      })
      .attr('text-anchor', 'middle')
      .attr('dy', d => {
        const depth = d.depth || 0;
        const radius = getNodeRadius(d.type, depth);
        return radius + 18; // Scale label distance with node size
      })
      .attr('font-size', d => {
        const depth = d.depth || 0;
        const radius = getNodeRadius(d.type, depth);
        // Font size scales with node size for visual hierarchy
        return Math.max(10, Math.min(16, radius * 0.35)) + 'px';
      })
      .attr('font-weight', d => {
        const depth = d.depth || 0;
        // Higher levels get bolder text
        return depth <= 1 ? 'bold' : depth <= 2 ? '600' : 'normal';
      })
      .attr('fill', '#374151')
      .style('pointer-events', 'none');

    // Add type and depth indicators with hierarchical sizing
    nodeGroups
      .append('text')
      .text(d => {
        const depth = d.depth || 0;
        return depth > 0 ? depth.toString() : d.type.charAt(0).toUpperCase();
      })
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', d => {
        const depth = d.depth || 0;
        const radius = getNodeRadius(d.type, depth);
        // Scale indicator text with node size
        return Math.max(8, Math.min(14, radius * 0.3)) + 'px';
      })
      .attr('font-weight', 'bold')
      .attr('fill', '#ffffff')
      .style('pointer-events', 'none');

    // Add selection indicators
    const selectionRings = nodeGroups
      .append('circle')
      .attr('r', d => {
        const depth = d.depth || 0;
        return getNodeRadius(d.type, depth) + 5;
      })
      .attr('fill', 'none')
      .attr('stroke', '#2563eb')
      .attr('stroke-width', 3)
      .attr('opacity', d => selectedNodeIds.includes(d.id) ? 1 : 0);

    // Add drag behavior
    const dragBehavior = d3.drag<SVGGElement, D3Node>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeGroups.call(dragBehavior);

    // Add click handlers
    nodeGroups
      .on('click', (event, d) => {
        event.stopPropagation();
        
        // Check for Shift+click for drill-down
        if (event.shiftKey && onNodeDrillDown) {
          onNodeDrillDown(d);
        } else {
          onNodeClick(d);
        }
      })
      .on('dblclick', (event, d) => {
        event.stopPropagation();
        onNodeDoubleClick(d);
      })
      .on('contextmenu', (event, d) => {
        // Right-click for drill-down
        event.preventDefault();
        if (onNodeDrillDown) {
          onNodeDrillDown(d);
        }
      });

    // Add hover effects
    nodeGroups
      .on('mouseenter', function(event, d) {
        d3.select(this).select('circle')
          .transition()
          .duration(200)
          .attr('r', getNodeRadius(d.type, d.depth || 0) + 3);
        
        // Show tooltip
        const tooltip = d3.select('body')
          .append('div')
          .attr('class', 'tooltip')
          .style('position', 'absolute')
          .style('background', 'rgba(0,0,0,0.8)')
          .style('color', 'white')
          .style('padding', '8px')
          .style('border-radius', '4px')
          .style('font-size', '12px')
          .style('pointer-events', 'none')
          .style('z-index', '1000')
          .style('opacity', 0);

        tooltip.html(`
          <strong>${d.title}</strong><br/>
          Type: ${d.type}<br/>
          ${d.source ? `Source: ${d.source}<br/>` : ''}
          ${d.content.substring(0, 100)}...
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .transition()
        .duration(200)
        .style('opacity', 1);
      })
      .on('mouseleave', function(event, d) {
        d3.select(this).select('circle')
          .transition()
          .duration(200)
          .attr('r', getNodeRadius(d.type, d.depth || 0));
        
        d3.selectAll('.tooltip').remove();
      });

    // Update positions on simulation tick
    simulation.on('tick', () => {
      linkElements
        .attr('x1', d => (d.source as D3Node).x!)
        .attr('y1', d => (d.source as D3Node).y!)
        .attr('x2', d => (d.target as D3Node).x!)
        .attr('y2', d => (d.target as D3Node).y!);

      nodeGroups
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Update colors when selection or color scheme changes
    circles.attr('fill', d => getNodeColor(d.type, selectedNodeIds.includes(d.id), d.depth || 0));
    selectionRings.attr('opacity', d => selectedNodeIds.includes(d.id) ? 1 : 0);

    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
      d3.selectAll('.tooltip').remove();
    };
  }, [nodes, links, width, height, selectedNodeIds, onNodeClick, onNodeDoubleClick, onNodeDrillDown, colorScheme]);

  return (
    <div className="relative">
      {/* Color Scheme Selector */}
      <div className="absolute top-2 right-2 z-10 bg-white/90 backdrop-blur-sm rounded px-2 py-1 shadow-sm">
        <label className="text-xs font-medium text-gray-700 mr-2">Color Scheme:</label>
        <select
          value={colorScheme}
          onChange={(e) => setColorScheme(e.target.value as typeof colorScheme)}
          className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
        >
          <option value="analogous">Analogous (Harmonious)</option>
          <option value="triadic">Triadic (High Contrast)</option>
          <option value="complementary">Complementary (Opposite)</option>
          <option value="tetradic">Tetradic (Four Color)</option>
          <option value="monochromatic">Monochromatic (Professional)</option>
          <option value="heatmap">Heat Map (Intensity)</option>
        </select>
      </div>
      
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ border: '1px solid #e5e7eb', borderRadius: '8px' }}
      />
    </div>
  );
};

export default D3Visualization;
