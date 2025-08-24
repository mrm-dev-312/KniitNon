'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';

export interface SunburstNode {
  id: string;
  title: string;
  content: string;
  type: 'topic' | 'subtopic' | 'detail';
  parentId?: string;
  value?: number;
  children?: SunburstNode[];
}

interface ZoomableSunburstProps {
  data: SunburstNode[];
  width: number;
  height: number;
  onNodeClick: (node: SunburstNode) => void;
}

export default function ZoomableSunburst({ 
  data, 
  width, 
  height, 
  onNodeClick 
}: ZoomableSunburstProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [sunburstData, setSunburstData] = useState<d3.HierarchyRectangularNode<SunburstNode> | null>(null);
  const [focusedNode, setFocusedNode] = useState<d3.HierarchyRectangularNode<SunburstNode> | null>(null);

  const radius = Math.min(width, height) / 2;

  // Convert flat data to hierarchical structure
  const buildHierarchy = useCallback((nodes: SunburstNode[]): SunburstNode => {
    const nodeMap = new Map<string, SunburstNode>();
    nodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [] });
    });

    const root: SunburstNode = {
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

  // Update sunburst when data changes
  useEffect(() => {
    if (!data || data.length === 0) return;

    const hierarchyRoot = buildHierarchy(data);
    const root = d3.hierarchy(hierarchyRoot)
      .sum(d => d.value || 1)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Create partition layout
    const partition = d3.partition<SunburstNode>()
      .size([2 * Math.PI, radius]);

    const partitioned = partition(root);
    setSunburstData(partitioned);
    setFocusedNode(partitioned);
  }, [data, radius, buildHierarchy]);

  // Arc generator
  const arc = d3.arc<d3.HierarchyRectangularNode<SunburstNode>>()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .innerRadius(d => Math.max(0, d.y0))
    .outerRadius(d => Math.max(0, d.y1));

  // Zoom to specific node
  const zoomToNode = useCallback((targetNode: d3.HierarchyRectangularNode<SunburstNode>) => {
    if (!svgRef.current || !sunburstData) return;

    setFocusedNode(targetNode);

    const svg = d3.select(svgRef.current);
    const g = svg.select('g');

    // Calculate new arc based on focused node
    const newArc = d3.arc<d3.HierarchyRectangularNode<SunburstNode>>()
      .startAngle(d => Math.max(0, Math.min(2 * Math.PI, (d.x0 - targetNode.x0) / (targetNode.x1 - targetNode.x0) * 2 * Math.PI)))
      .endAngle(d => Math.max(0, Math.min(2 * Math.PI, (d.x1 - targetNode.x0) / (targetNode.x1 - targetNode.x0) * 2 * Math.PI)))
      .innerRadius(d => Math.max(0, d.y0 - targetNode.y0))
      .outerRadius(d => Math.max(0, d.y1 - targetNode.y0));

    g.selectAll('path')
      .transition()
      .duration(750)
      .attrTween('d', (d: any) => {
        const startPath = arc(d);
        const endPath = newArc(d);
        if (!startPath || !endPath) return () => '';
        const interpolate = d3.interpolate(startPath, endPath);
        return (t: number) => interpolate(t) || '';
      });

    // Update text positions
    g.selectAll('text')
      .transition()
      .duration(750)
      .attr('transform', (d: any) => {
        const angle = (newArc.startAngle()(d) + newArc.endAngle()(d)) / 2;
        const radius = (newArc.innerRadius()(d) + newArc.outerRadius()(d)) / 2;
        return `translate(${Math.cos(angle - Math.PI / 2) * radius}, ${Math.sin(angle - Math.PI / 2) * radius})`;
      })
      .style('opacity', (d: any) => {
        const arcSize = newArc.endAngle()(d) - newArc.startAngle()(d);
        return arcSize > 0.1 ? 1 : 0;
      });
  }, [sunburstData, arc]);

  // Render the sunburst
  useEffect(() => {
    if (!sunburstData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Color scale
    const colorScale = d3.scaleOrdinal<string>()
      .domain(['topic', 'subtopic', 'detail'])
      .range(['#3b82f6', '#10b981', '#8b5cf6']);

    // Create paths
    const paths = g.selectAll('path')
      .data(sunburstData.descendants().slice(1)) // Skip root
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', d => {
        const depth = d.depth;
        const baseColor = colorScale(d.data.type);
        return d3.color(baseColor)?.darker(depth * 0.3)?.toString() || baseColor;
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 0.8);
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 1);
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        zoomToNode(d);
        onNodeClick(d.data);
      });

    // Add text labels
    const texts = g.selectAll('text')
      .data(sunburstData.descendants().slice(1).filter(d => (d.x1 - d.x0) > 0.1)) // Only show text for larger arcs
      .enter()
      .append('text')
      .attr('transform', d => {
        const angle = (d.x0 + d.x1) / 2 * 180 / Math.PI;
        const radius = (d.y0 + d.y1) / 2;
        return `rotate(${angle - 90}) translate(${radius},0) ${angle > 90 ? 'rotate(180)' : ''}`;
      })
      .attr('text-anchor', d => {
        const angle = (d.x0 + d.x1) / 2 * 180 / Math.PI;
        return angle > 90 ? 'end' : 'start';
      })
      .attr('dominant-baseline', 'middle')
      .style('font-size', d => `${Math.min((d.y1 - d.y0) / 4, 12)}px`)
      .style('font-family', 'Arial, sans-serif')
      .style('fill', '#fff')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .text(d => {
        const arcLength = (d.x1 - d.x0) * (d.y0 + d.y1) / 2;
        const maxLength = Math.floor(arcLength / 8);
        return d.data.title.length > maxLength 
          ? d.data.title.substring(0, maxLength) + '...'
          : d.data.title;
      });

    // Add center circle for returning to root
    const centerButton = g.append('circle')
      .attr('r', 30)
      .attr('fill', '#3b82f6')
      .attr('stroke', '#fff')
      .attr('stroke-width', 3)
      .style('cursor', 'pointer')
      .on('click', () => {
        if (focusedNode && focusedNode !== sunburstData) {
          zoomToNode(sunburstData);
        }
      });

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '16px')
      .style('fill', '#fff')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .text('⌂');

  }, [sunburstData, width, height, arc, focusedNode, onNodeClick, zoomToNode]);

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
        Sunburst - Click segments to zoom, center ⌂ to reset
      </div>
    </div>
  );
}
