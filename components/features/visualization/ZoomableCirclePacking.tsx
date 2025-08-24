'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';

export interface CirclePackNode {
  id: string;
  title: string;
  content: string;
  type: 'topic' | 'subtopic' | 'detail';
  parentId?: string;
  value?: number; // Size of the circle
  children?: CirclePackNode[];
}

interface ZoomableCirclePackingProps {
  data: CirclePackNode[];
  width: number;
  height: number;
  onNodeClick: (node: CirclePackNode) => void;
}

export default function ZoomableCirclePacking({ 
  data, 
  width, 
  height, 
  onNodeClick 
}: ZoomableCirclePackingProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [packedData, setPackedData] = useState<d3.HierarchyCircularNode<CirclePackNode> | null>(null);

  // Convert flat data to hierarchical structure
  const buildHierarchy = useCallback((nodes: CirclePackNode[]): CirclePackNode => {
    const nodeMap = new Map<string, CirclePackNode>();
    nodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [] });
    });

    const root: CirclePackNode = {
      id: 'root',
      title: 'Research Root',
      content: 'Root of research hierarchy',
      type: 'topic',
      value: 1,
      children: []
    };

    nodes.forEach(node => {
      const nodeWithChildren = nodeMap.get(node.id)!;
      
      if (!node.parentId) {
        root.children!.push(nodeWithChildren);
      } else {
        const parent = nodeMap.get(node.parentId);
        if (parent) {
          parent.children!.push(nodeWithChildren);
        } else {
          root.children!.push(nodeWithChildren);
        }
      }
    });

    return root;
  }, []);

  // Update packing when data changes
  useEffect(() => {
    if (!data || data.length === 0) return;

    const hierarchyRoot = buildHierarchy(data);
    const root = d3.hierarchy(hierarchyRoot)
      .sum(d => d.value || 1)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Create pack layout
    const pack = d3.pack<CirclePackNode>()
      .size([width - 20, height - 20])
      .padding(3);

    const packed = pack(root);
    setPackedData(packed);
  }, [data, width, height, buildHierarchy]);

  // Render the circles
  useEffect(() => {
    if (!packedData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g")
      .attr("transform", `translate(10, 10)`);

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        g.attr('transform', `translate(10, 10) ${event.transform}`);
      });

    svg.call(zoom);

    // Color scale
    const colorScale = d3.scaleOrdinal<string>()
      .domain(['topic', 'subtopic', 'detail'])
      .range(['#3b82f6', '#10b981', '#8b5cf6']);

    // Draw circles
    const circles = g.selectAll('circle')
      .data(packedData.descendants().slice(1)) // Skip root
      .enter()
      .append('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', d => d.r)
      .attr('fill', d => {
        if (d.children) {
          return colorScale(d.data.type);
        } else {
          return d3.color(colorScale(d.data.type))?.brighter(0.5)?.toString() || colorScale(d.data.type);
        }
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('opacity', 0.8)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 1)
          .attr('stroke-width', 3);
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 0.8)
          .attr('stroke-width', 2);
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        
        // Zoom to clicked circle
        const [x, y, k] = [d.x, d.y, height / (d.r * 2 + 20)];
        svg.transition()
          .duration(750)
          .call(zoom.transform, d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(k)
            .translate(-x, -y)
          );
        
        onNodeClick(d.data);
      });

    // Add labels for larger circles
    const labels = g.selectAll('text')
      .data(packedData.descendants().slice(1).filter(d => d.r > 20))
      .enter()
      .append('text')
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', d => `${Math.min(d.r / 3, 14)}px`)
      .style('font-family', 'Arial, sans-serif')
      .style('fill', '#fff')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .text(d => {
        const maxLength = Math.floor(d.r / 4);
        return d.data.title.length > maxLength 
          ? d.data.title.substring(0, maxLength) + '...'
          : d.data.title;
      });

    // Add reset zoom button
    const resetButton = svg.append('g')
      .attr('transform', 'translate(20, 20)')
      .style('cursor', 'pointer')
      .on('click', () => {
        svg.transition()
          .duration(750)
          .call(zoom.transform, d3.zoomIdentity);
      });

    resetButton.append('circle')
      .attr('r', 20)
      .attr('fill', '#3b82f6')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    resetButton.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '12px')
      .style('fill', '#fff')
      .style('font-weight', 'bold')
      .text('⌂');

  }, [packedData, width, height, onNodeClick]);

  return (
    <div className="w-full h-full overflow-hidden bg-white rounded-lg border relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full h-full"
      >
      </svg>
      <div className="absolute top-4 right-4 text-sm text-gray-600 bg-white/80 px-2 py-1 rounded">
        Circle Packing - Click to zoom, ⌂ to reset
      </div>
    </div>
  );
}
