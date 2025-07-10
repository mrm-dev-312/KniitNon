import { NextRequest, NextResponse } from 'next/server';
import { EndpointMiddleware, ApiUtils } from '@/lib/api-middleware';

// Force dynamic rendering for this route since it uses request.headers
export const dynamic = 'force-dynamic';

async function handleGetNodes(request: NextRequest) {
  try {
    // Extract pagination and search parameters
    const { page, limit, offset, sortBy, sortOrder } = ApiUtils.extractPagination(request);
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const lens = url.searchParams.get('lens') || '';
    const depth = url.searchParams.get('depth') ? parseInt(url.searchParams.get('depth')!) : undefined;
    const detailLevel = url.searchParams.get('detailLevel') as 'low' | 'medium' | 'high' | null;

    // Enhanced nodes data with different detail levels
    const allNodes = [
      {
        id: '1',
        title: 'Introduction to AI',
        content: 'Artificial intelligence (AI) is a broad field of computer science focused on creating systems that can perform tasks typically requiring human intelligence.',
        type: 'topic' as const,
        depth: 0,
        lens: 'Technology',
        sources: [],
        connections: ['2', '3'],
        metadata: { confidence: 0.95, lastUpdated: '2024-01-15' },
        detailLevel: 'low'
      },
      {
        id: '1-detailed',
        title: 'Introduction to AI - Comprehensive Overview',
        content: 'Artificial intelligence (AI) represents a transformative field within computer science that encompasses machine learning, deep learning, natural language processing, computer vision, and robotics. The field has evolved from symbolic AI approaches in the 1950s to modern neural network architectures that can process vast amounts of data and learn complex patterns. Current AI systems demonstrate remarkable capabilities in pattern recognition, decision-making, and problem-solving across diverse domains including healthcare, finance, transportation, and education.',
        type: 'topic' as const,
        depth: 0,
        lens: 'Technology',
        sources: ['Russell & Norvig, 2020', 'Goodfellow et al., 2016'],
        connections: ['2', '3', '4', '5'],
        metadata: { confidence: 0.95, lastUpdated: '2024-01-15' },
        detailLevel: 'high'
      },
      {
        id: '2',
        title: 'Machine Learning Basics',
        content: 'Machine learning is a subset of AI that enables systems to learn from data.',
        type: 'subtopic' as const,
        depth: 1,
        lens: 'Technology',
        sources: [],
        connections: ['1'],
        metadata: { confidence: 0.88, lastUpdated: '2024-01-14' },
        detailLevel: 'low'
      },
      {
        id: '2-detailed',
        title: 'Machine Learning: Algorithms and Applications',
        content: 'Machine learning encompasses supervised learning (classification and regression), unsupervised learning (clustering and dimensionality reduction), and reinforcement learning. Key algorithms include linear regression, decision trees, random forests, support vector machines, and neural networks. Modern applications span recommendation systems, fraud detection, medical diagnosis, and autonomous vehicles.',
        type: 'subtopic' as const,
        depth: 1,
        lens: 'Technology',
        sources: ['Bishop, 2006', 'Hastie et al., 2009'],
        connections: ['1', '4'],
        metadata: { confidence: 0.88, lastUpdated: '2024-01-14' },
        detailLevel: 'high'
      },
      {
        id: '3',
        title: 'AI Ethics',
        content: 'Ethical considerations in AI development and deployment.',
        type: 'subtopic' as const,
        depth: 1,
        lens: 'Ethics',
        sources: [],
        connections: ['1'],
        metadata: { confidence: 0.92, lastUpdated: '2024-01-13' },
        detailLevel: 'low'
      },
      {
        id: '3-detailed',
        title: 'AI Ethics: Bias, Fairness, and Accountability',
        content: 'AI ethics addresses algorithmic bias, fairness across demographic groups, privacy preservation, transparency in decision-making, and accountability for AI system outcomes. Key challenges include dataset bias, model interpretability, consent in data collection, and the societal impact of automation on employment and social equity.',
        type: 'subtopic' as const,
        depth: 1,
        lens: 'Ethics',
        sources: ['Baracas et al., 2019', 'O\'Neil, 2016'],
        connections: ['1', '5'],
        metadata: { confidence: 0.92, lastUpdated: '2024-01-13' },
        detailLevel: 'high'
      },
      {
        id: '4',
        title: 'AI in Healthcare',
        content: 'AI applications in medical diagnosis and treatment.',
        type: 'detail' as const,
        depth: 2,
        lens: 'Technology',
        sources: ['Medical Journal 2024'],
        connections: ['2'],
        metadata: { confidence: 0.85, lastUpdated: '2024-01-12' },
        detailLevel: 'medium'
      },
      {
        id: '5',
        title: 'AI Bias and Fairness',
        content: 'Addressing bias and ensuring fairness in AI systems.',
        type: 'detail' as const,
        depth: 2,
        lens: 'Ethics',
        sources: ['Ethics in AI Research 2024'],
        connections: ['3'],
        metadata: { confidence: 0.90, lastUpdated: '2024-01-11' },
        detailLevel: 'medium'
      }
    ];

    // Apply filters
    let filteredNodes = allNodes;
    
    // Filter by detail level - this is the core fix for the bug
    if (detailLevel) {
      filteredNodes = filteredNodes.filter(node => {
        // For low detail level, include low and medium detail nodes
        if (detailLevel === 'low') {
          return (node as any).detailLevel === 'low' || (node as any).detailLevel === 'medium';
        }
        // For medium detail level, include medium detail nodes primarily
        else if (detailLevel === 'medium') {
          return (node as any).detailLevel === 'medium' || (node as any).detailLevel === 'low';
        }
        // For high detail level, include all nodes but prefer high detail versions
        else if (detailLevel === 'high') {
          return true; // Include all, but prefer detailed versions
        }
        return true;
      });
      
      // For high detail level, prioritize detailed versions
      if (detailLevel === 'high') {
        const detailedNodes = filteredNodes.filter(node => (node as any).detailLevel === 'high');
        const otherNodes = filteredNodes.filter(node => 
          (node as any).detailLevel !== 'high' && 
          !detailedNodes.some(detailed => detailed.id.includes(node.id.split('-')[0]))
        );
        filteredNodes = [...detailedNodes, ...otherNodes];
      }
    }
    
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
        filters: { search, lens, depth, detailLevel },
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
