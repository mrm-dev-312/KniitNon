'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';

export interface HierarchyNode {
  id: string;
  title: string;
  content: string;
  type: 'topic' | 'subtopic' | 'detail';
  parentId?: string;
  children?: HierarchyNode[];
  level?: number;
  collapsed?: boolean;
  // Infinite tree expansion properties
  isExpandable?: boolean;
  isExpanded?: boolean;
  isLoading?: boolean;
  expansionCount?: number;
}

// Extended D3 hierarchy node with collapse state
interface ExtendedHierarchyNode extends d3.HierarchyPointNode<HierarchyNode> {
  _children?: d3.HierarchyPointNode<HierarchyNode>[];
}

interface CollapsibleTreeProps {
  data: HierarchyNode[];
  width: number;
  height: number;
  onNodeClick: (node: HierarchyNode) => void;
  onNodeToggle?: (node: HierarchyNode) => void;
  error?: string | null;
}

export default function CollapsibleTree({ 
  data, 
  width, 
  height, 
  onNodeClick,
  onNodeToggle 
}: CollapsibleTreeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [treeData, setTreeData] = useState<d3.HierarchyPointNode<HierarchyNode> | null>(null);

  // Convert flat data to hierarchical structure
  const buildHierarchy = useCallback((nodes: HierarchyNode[]): HierarchyNode => {
    // Create a map for quick lookup
    const nodeMap = new Map<string, HierarchyNode>();
    nodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [] });
    });

    // Find root nodes and build hierarchy
    const root: HierarchyNode = {
      id: 'root',
      title: 'Research Root',
      content: 'Root of research hierarchy',
      type: 'topic',
      children: []
    };

    nodes.forEach(node => {
      const nodeWithChildren = nodeMap.get(node.id)!;
      
      if (!node.parentId) {
        // This is a root level node
        root.children!.push(nodeWithChildren);
      } else {
        // Find parent and add as child
        const parent = nodeMap.get(node.parentId);
        if (parent) {
          parent.children!.push(nodeWithChildren);
        } else {
          // Parent not found, add to root
          root.children!.push(nodeWithChildren);
        }
      }
    });

    return root;
  }, []);

  // Update tree when data changes
  useEffect(() => {
    if (!data || data.length === 0) return;

    const hierarchyRoot = buildHierarchy(data);
    const root = d3.hierarchy(hierarchyRoot);
    
    // Create tree layout
    const treeLayout = d3.tree<HierarchyNode>()
      .size([height - 100, width - 200])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);

    const tree = treeLayout(root);
    setTreeData(tree);
  }, [data, width, height, buildHierarchy]);

  // Render the tree
  useEffect(() => {
    if (!treeData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g")
      .attr("transform", `translate(100, 50)`);

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Draw links
    const links = g.selectAll('.link')
      .data(treeData.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', '#999')
      .attr('stroke-width', 2)
      .attr('d', d3.linkHorizontal<d3.HierarchyLink<HierarchyNode>, d3.HierarchyPointNode<HierarchyNode>>()
        .x(d => d.y)
        .y(d => d.x)
      );

    // Draw nodes
    const nodes = g.selectAll('.node')
      .data(treeData.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.y}, ${d.x})`)
      .style('cursor', 'pointer');

    // Add circles for nodes
    nodes.append('circle')
      .attr('r', d => {
        // Larger radius for expandable nodes
        if (d.data.isExpandable && !d.data.isExpanded) {
          switch (d.data.type) {
            case 'topic': return 14;
            case 'subtopic': return 12;
            case 'detail': return 10;
            default: return 8;
          }
        }
        
        // Standard sizes
        switch (d.data.type) {
          case 'topic': return 12;
          case 'subtopic': return 10;
          case 'detail': return 8;
          default: return 6;
        }
      })
      .attr('fill', d => {
        // Loading state
        if (d.data.isLoading) return '#fbbf24'; // amber
        
        // Different colors based on expansion state
        if (d.data.isExpandable && !d.data.isExpanded) {
          // Expandable but not expanded - use brighter colors
          switch (d.data.type) {
            case 'topic': return '#60a5fa';
            case 'subtopic': return '#34d399';
            case 'detail': return '#a78bfa';
            default: return '#9ca3af';
          }
        }
        
        // Standard colors
        switch (d.data.type) {
          case 'topic': return '#3b82f6';
          case 'subtopic': return '#10b981';
          case 'detail': return '#8b5cf6';
          default: return '#6b7280';
        }
      })
      .attr('stroke', d => {
        // Special stroke for loading or expandable states
        if (d.data.isLoading) return '#f59e0b';
        if (d.data.isExpandable && !d.data.isExpanded) return '#1f2937';
        return '#fff';
      })
      .attr('stroke-width', d => {
        if (d.data.isLoading) return 3;
        if (d.data.isExpandable && !d.data.isExpanded) return 2;
        return 2;
      })
      .attr('stroke-dasharray', d => {
        // Dashed border for expandable nodes
        if (d.data.isExpandable && !d.data.isExpanded) return '4,2';
        return null;
      });

    // Add expansion indicators with loading animation
    nodes.append('text')
      .attr('class', d => d.data.isLoading ? 'expansion-indicator loading-spin' : 'expansion-indicator')
      .attr('dy', '-15px')
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', '#374151')
      .text(d => {
        if (d.data.isLoading) return '⟳';
        if (d.data.isExpandable && !d.data.isExpanded) return '+';
        if (d.data.isExpanded) return '−';
        return '';
      })
      .style('opacity', d => {
        return (d.data.isExpandable || d.data.isLoading) ? 1 : 0;
      });

    // Add labels
    nodes.append('text')
      .attr('dy', '.35em')
      .attr('x', d => d.children ? -15 : 15)
      .style('text-anchor', d => d.children ? 'end' : 'start')
      .style('font-size', '12px')
      .style('font-family', 'Arial, sans-serif')
      .style('fill', '#333')
      .text(d => d.data.title)
      .each(function(d) {
        // Wrap long text
        const text = d3.select(this);
        const words = d.data.title.split(/\s+/);
        if (words.length > 3) {
          text.text(words.slice(0, 3).join(' ') + '...');
        }
      });

    // Add click handlers
    nodes.on('click', (event, d) => {
      event.stopPropagation();
      
      const node = d as ExtendedHierarchyNode;
      
      if (node.children || node._children) {
        // Toggle node collapse/expand
        if (node.children) {
          node._children = node.children;
          node.children = undefined;
        } else {
          node.children = node._children;
          node._children = undefined;
        }
        onNodeToggle?.(node.data);
        // Re-render the tree
        const treeLayout = d3.tree<HierarchyNode>()
          .size([height - 100, width - 200])
          .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);
        setTreeData(treeLayout(d3.hierarchy(buildHierarchy(data))));
      }
      
      onNodeClick(node.data);
    });

    // Add expand/collapse indicators
    nodes.filter(d => d.children || (d as any)._children)
      .append('text')
      .attr('x', 0)
      .attr('y', 0)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .style('fill', 'white')
      .style('pointer-events', 'none')
      .text(d => d.children ? '-' : '+');

  }, [treeData, onNodeClick, onNodeToggle, data, height, width, buildHierarchy]);

  return (
    <div className="w-full h-full overflow-hidden bg-white rounded-lg border relative">
      {/* Add styles for loading animation */}
      <style>{`
        .loading-spin {
          transform-origin: center;
          animation: spin-animation 1s linear infinite;
        }
        
        @keyframes spin-animation {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full h-full"
      >
      </svg>
      <div className="absolute top-4 left-4 text-sm text-gray-600 bg-white/80 px-2 py-1 rounded">
        Collapsible Tree View - Click nodes to expand/collapse
      </div>
      
  {/* (Backup component) error display removed */}
    </div>
  );
}
