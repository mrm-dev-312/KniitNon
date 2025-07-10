import { NextRequest, NextResponse } from 'next/server';
import { withPagination, PaginationParams } from '@/lib/api-pagination';

// Force dynamic rendering for this route since it uses request.headers
export const dynamic = 'force-dynamic';
// Mock data for research nodes
const mockResearchNodes = Array.from({ length: 250 }, (_, i) => ({
  id: `node-${i + 1}`,
  title: `Research Node ${i + 1}`,
  content: `This is the content for research node ${i + 1}. It contains important information about the research topic.`,
  type: ['topic', 'subtopic', 'detail'][i % 3] as 'topic' | 'subtopic' | 'detail',
  source: `Source ${Math.floor(i / 10) + 1}`,
  confidence: Math.random(),
  createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
  tags: [`tag-${i % 10}`, `category-${i % 5}`],
  connections: Array.from({ length: Math.floor(Math.random() * 5) }, (_, j) => `node-${j + 1}`),
  metadata: {
    wordCount: Math.floor(Math.random() * 1000) + 100,
    readingTime: Math.floor(Math.random() * 10) + 1,
    difficulty: ['beginner', 'intermediate', 'advanced'][i % 3],
  },
}));

// Handler function for paginated research nodes
async function handleGetResearchNodes(
  request: NextRequest,
  params: PaginationParams
): Promise<{ data: any[]; total: number }> {
  // Simulate database query delay
  await new Promise(resolve => setTimeout(resolve, 100));

  let filteredNodes = [...mockResearchNodes];

  // Apply search filter
  if (params.search) {
    const searchLower = params.search.toLowerCase();
    filteredNodes = filteredNodes.filter(node => 
      node.title.toLowerCase().includes(searchLower) ||
      node.content.toLowerCase().includes(searchLower) ||
      node.source.toLowerCase().includes(searchLower)
    );
  }

  // Apply filters
  if (params.filters) {
    Object.entries(params.filters).forEach(([key, value]) => {
      filteredNodes = filteredNodes.filter(node => {
        const nodeValue = (node as any)[key];
        if (typeof nodeValue === 'string') {
          return nodeValue.toLowerCase().includes(value.toLowerCase());
        }
        return nodeValue === value;
      });
    });
  }

  // Apply sorting
  if (params.sort) {
    filteredNodes.sort((a, b) => {
      const aValue = (a as any)[params.sort!];
      const bValue = (b as any)[params.sort!];
      
      if (aValue < bValue) return params.order === 'asc' ? -1 : 1;
      if (aValue > bValue) return params.order === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const total = filteredNodes.length;

  // Apply pagination
  const offset = (params.page! - 1) * params.limit!;
  const paginatedNodes = filteredNodes.slice(offset, offset + params.limit!);

  return { data: paginatedNodes, total };
}

// Configure pagination settings
const paginationConfig = {
  defaultLimit: 20,
  maxLimit: 100,
  allowedSortFields: ['id', 'title', 'type', 'source', 'createdAt', 'updatedAt', 'confidence'],
};

// Export the paginated handler
export const GET = withPagination(handleGetResearchNodes, paginationConfig);

// Example additional endpoints for different filters
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle bulk operations or filtered queries
    if (body.action === 'bulk_get') {
      const { nodeIds, includeMeta = false } = body;
      
      const nodes = mockResearchNodes.filter(node => nodeIds.includes(node.id));
      
      const response = {
        data: nodes,
        meta: includeMeta ? {
          total: nodes.length,
          requested: nodeIds.length,
          found: nodes.length,
          missing: nodeIds.filter((id: string) => !nodes.find(n => n.id === id)),
        } : undefined,
      };
      
      return NextResponse.json(response);
    }
    
    // Handle advanced filtering
    if (body.action === 'advanced_filter') {
      const { 
        filters = {},
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20,
        includeConnections = false,
      } = body;
      
      let filteredNodes = [...mockResearchNodes];
      
      // Apply complex filters
      if (filters.type) {
        filteredNodes = filteredNodes.filter(node => 
          Array.isArray(filters.type) ? filters.type.includes(node.type) : node.type === filters.type
        );
      }
      
      if (filters.confidenceRange) {
        const [min, max] = filters.confidenceRange;
        filteredNodes = filteredNodes.filter(node => 
          node.confidence >= min && node.confidence <= max
        );
      }
      
      if (filters.tags) {
        filteredNodes = filteredNodes.filter(node =>
          filters.tags.some((tag: string) => node.tags.includes(tag))
        );
      }
      
      if (filters.dateRange) {
        const [startDate, endDate] = filters.dateRange;
        filteredNodes = filteredNodes.filter(node => {
          const nodeDate = new Date(node.createdAt);
          return nodeDate >= new Date(startDate) && nodeDate <= new Date(endDate);
        });
      }
      
      // Apply search
      if (search) {
        const searchLower = search.toLowerCase();
        filteredNodes = filteredNodes.filter(node => 
          node.title.toLowerCase().includes(searchLower) ||
          node.content.toLowerCase().includes(searchLower) ||
          node.source.toLowerCase().includes(searchLower) ||
          node.tags.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }
      
      // Apply sorting
      filteredNodes.sort((a, b) => {
        const aValue = (a as any)[sortBy];
        const bValue = (b as any)[sortBy];
        
        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
      
      const total = filteredNodes.length;
      const offset = (page - 1) * limit;
      const paginatedNodes = filteredNodes.slice(offset, offset + limit);
      
      // Include connection details if requested
      const nodesWithConnections = includeConnections 
        ? paginatedNodes.map(node => ({
            ...node,
            connectionDetails: node.connections.map(connId => {
              const connectedNode = mockResearchNodes.find(n => n.id === connId);
              return connectedNode ? {
                id: connectedNode.id,
                title: connectedNode.title,
                type: connectedNode.type,
              } : { id: connId, title: 'Unknown', type: 'unknown' };
            })
          }))
        : paginatedNodes;
      
      const response = {
        data: nodesWithConnections,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
          filters: filters,
          search,
          sortBy,
          sortOrder,
        },
      };
      
      return NextResponse.json(response);
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in research nodes POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
