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
  type: 'topic' | 'subtopic' | 'detail';
  source?: string;
  connections?: string[];
  url?: string;
  imageUrl?: string;
  tags?: string[];
  isImported?: boolean;
  importedAt?: string;
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

  const getNodeColor = (type: string, isSelected: boolean) => {
    const colors = {
      topic: isSelected ? '#2563eb' : '#3b82f6',
      subtopic: isSelected ? '#059669' : '#10b981',
      detail: isSelected ? '#7c3aed' : '#8b5cf6',
    };
    return colors[type as keyof typeof colors] || '#6b7280';
  };

  const getNodeRadius = (type: string) => {
    const sizes = {
      topic: 25,
      subtopic: 20,
      detail: 15,
    };
    return sizes[type as keyof typeof sizes] || 15;
  };

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create force simulation
    const simulation = d3.forceSimulation<D3Node>(nodes)
      .force('link', d3.forceLink<D3Node, D3Link>(links)
        .id(d => d.id)
        .distance(100)
        .strength(0.5)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => getNodeRadius((d as D3Node).type) + 5))
      .alphaDecay(0.02);

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

    // Add circles to nodes
    const circles = nodeGroups
      .append('circle')
      .attr('r', d => getNodeRadius(d.type))
      .attr('fill', d => getNodeColor(d.type, selectedNodeIds.includes(d.id)))
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))');

    // Add labels to nodes
    const labels = nodeGroups
      .append('text')
      .text(d => d.title.length > 15 ? d.title.substring(0, 15) + '...' : d.title)
      .attr('text-anchor', 'middle')
      .attr('dy', d => getNodeRadius(d.type) + 15)
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', '#374151')
      .style('pointer-events', 'none');

    // Add type indicators
    nodeGroups
      .append('text')
      .text(d => d.type.charAt(0).toUpperCase())
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', '#ffffff')
      .style('pointer-events', 'none');

    // Add selection indicators
    const selectionRings = nodeGroups
      .append('circle')
      .attr('r', d => getNodeRadius(d.type) + 5)
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
          .attr('r', getNodeRadius(d.type) + 3);
        
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
          .attr('r', getNodeRadius(d.type));
        
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

    // Update colors when selection changes
    circles.attr('fill', d => getNodeColor(d.type, selectedNodeIds.includes(d.id)));
    selectionRings.attr('opacity', d => selectedNodeIds.includes(d.id) ? 1 : 0);

    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
      d3.selectAll('.tooltip').remove();
    };
  }, [nodes, links, width, height, selectedNodeIds, onNodeClick, onNodeDoubleClick, onNodeDrillDown]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ border: '1px solid #e5e7eb', borderRadius: '8px' }}
    />
  );
};

export default D3Visualization;
