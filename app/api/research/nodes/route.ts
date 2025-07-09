import { NextRequest, NextResponse } from 'next/server';
import { EndpointMiddleware, ApiUtils } from '@/lib/api-middleware';

async function handleGetNodes(request: NextRequest) {
  try {
    // Extract pagination and search parameters
    const { page, limit, offset, sortBy, sortOrder } = ApiUtils.extractPagination(request);
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const lens = url.searchParams.get('lens') || '';
    const depth = url.searchParams.get('depth') ? parseInt(url.searchParams.get('depth')!) : undefined;

    // Placeholder nodes data (would come from database)
    const allNodes = [
      {
        id: '1',
        title: 'Node 1: Introduction to AI',
        content: 'Artificial intelligence (AI) is a broad field...',
        type: 'topic' as const,
        depth: 0,
        lens: 'Technology',
        sources: [],
        connections: ['2', '3'],
        metadata: { confidence: 0.95, lastUpdated: '2024-01-15' }
      },
      {
        id: '2',
        title: 'Node 2: Machine Learning Basics',
        content: 'Machine learning is a subset of AI...',
        type: 'subtopic' as const,
        depth: 1,
        lens: 'Technology',
        sources: [],
        connections: ['1'],
        metadata: { confidence: 0.88, lastUpdated: '2024-01-14' }
      },
      {
        id: '3',
        title: 'Node 3: Ethical Considerations of AI',
        content: 'As AI becomes more prevalent, ethical concerns arise...',
        type: 'subtopic' as const,
        depth: 1,
        lens: 'Ethics',
        sources: [],
        connections: ['1'],
        metadata: { confidence: 0.92, lastUpdated: '2024-01-13' }
      },
      {
        id: '4',
        title: 'Node 4: AI in Healthcare',
        content: 'AI applications in healthcare are transforming medical practice...',
        type: 'detail' as const,
        depth: 2,
        lens: 'Technology',
        sources: ['Medical Journal 2024'],
        connections: ['2'],
        metadata: { confidence: 0.85, lastUpdated: '2024-01-12' }
      },
      {
        id: '5',
        title: 'Node 5: AI Bias and Fairness',
        content: 'One of the major ethical concerns in AI is bias...',
        type: 'detail' as const,
        depth: 2,
        lens: 'Ethics',
        sources: ['Ethics in AI Research 2024'],
        connections: ['3'],
        metadata: { confidence: 0.90, lastUpdated: '2024-01-11' }
      }
    ];

    // Apply filters
    let filteredNodes = allNodes;
    
    if (search) {
      filteredNodes = filteredNodes.filter(node => 
        node.title.toLowerCase().includes(search.toLowerCase()) ||
        node.content.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (lens) {
      filteredNodes = filteredNodes.filter(node => 
        node.lens.toLowerCase() === lens.toLowerCase()
      );
    }
    
    if (depth !== undefined) {
      filteredNodes = filteredNodes.filter(node => node.depth === depth);
    }

    // Apply sorting
    if (sortBy) {
      filteredNodes.sort((a, b) => {
        let aVal: any = a[sortBy as keyof typeof a];
        let bVal: any = b[sortBy as keyof typeof b];
        
        if (sortBy === 'metadata.confidence') {
          aVal = a.metadata?.confidence || 0;
          bVal = b.metadata?.confidence || 0;
        }
        
        if (typeof aVal === 'string') {
          return sortOrder === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
        }
        
        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      });
    }

    // Apply pagination
    const total = filteredNodes.length;
    const paginatedNodes = filteredNodes.slice(offset, offset + limit);
    
    const paginationMetadata = ApiUtils.createPaginationMetadata(page, limit, total);

    return ApiUtils.createResponse(paginatedNodes, {
      message: `Retrieved ${paginatedNodes.length} nodes`,
      metadata: {
        ...paginationMetadata,
        filters: { search, lens, depth },
        totalAvailable: allNodes.length,
        performance: {
          queryTime: Math.random() * 10 + 2,
          cacheHit: Math.random() > 0.5
        }
      }
    });
  } catch (error) {
    console.error('Nodes fetch error:', error);
    return ApiUtils.createErrorResponse(
      'Failed to fetch nodes',
      { 
        status: 500,
        message: 'An error occurred while fetching research nodes',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    );
  }
}

// Apply middleware with query parameter validation
export const GET = EndpointMiddleware.research.nodes(handleGetNodes);
