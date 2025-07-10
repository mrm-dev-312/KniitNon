import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Force dynamic rendering for this route since it uses request.headers
export const dynamic = 'force-dynamic';
// Validation schema for summary requests
const SummaryRequestSchema = z.object({
  nodeIds: z.array(z.string()).min(1).max(20),
  summaryType: z.enum(['overview', 'detailed', 'comparative', 'thematic']).default('overview'),
  includeConnections: z.boolean().default(true),
  focusAreas: z.array(z.string()).optional(),
  maxLength: z.number().min(50).max(2000).default(500),
});

type SummaryRequest = z.infer<typeof SummaryRequestSchema>;

interface NodeData {
  id: string;
  title: string;
  content: string;
  type: string;
  source?: string;
  connections: string[];
}

// Sample node data - in a real app, this would come from database
const getSampleNodeData = (nodeIds: string[]): NodeData[] => {
  const allNodes: NodeData[] = [
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
  ];
  
  return allNodes.filter(node => nodeIds.includes(node.id));
};

const generateSummary = async (nodes: NodeData[], summaryType: string, includeConnections: boolean, maxLength: number): Promise<string> => {
  try {
    // Prepare the content for summarization
    const nodeContents = nodes.map(node => `**${node.title}** (${node.type}): ${node.content}`).join('\n\n');
    
    const connectionInfo = includeConnections ? 
      `\n\nNode Connections: ${nodes.map(node => `${node.title} connects to: ${node.connections.join(', ')}`).join('; ')}` : '';
    
    // System prompt based on summary type
    const systemPrompts = {
      overview: "You are a research assistant specializing in creating concise overviews. Synthesize the provided research nodes into a coherent summary that highlights the main themes and key insights.",
      detailed: "You are a research assistant specializing in comprehensive analysis. Create a detailed summary that covers all major points, methodologies, and findings from the provided research nodes.",
      comparative: "You are a research assistant specializing in comparative analysis. Identify similarities, differences, contradictions, and complementary aspects between the provided research nodes.",
      thematic: "You are a research assistant specializing in thematic analysis. Identify and organize the content around major themes, patterns, and conceptual frameworks present in the research nodes."
    };
    
    const prompt = `${systemPrompts[summaryType as keyof typeof systemPrompts]}

Research Nodes to Summarize:
${nodeContents}${connectionInfo}

Please create a ${summaryType} summary that is approximately ${maxLength} words. Focus on:
1. Key insights and findings
2. Relationships between concepts
3. Important implications
4. Areas for further exploration

Summary:`;

    // For now, create a structured summary based on the type
    // In production, this would use OpenAI/Gemini API
    let summary = '';
    
    switch (summaryType) {
      case 'overview':
        summary = `This research cluster explores ${nodes.length} interconnected topics around ${nodes[0]?.title || 'the selected research area'}. `;
        summary += `Key themes include: ${nodes.map(n => n.title).join(', ')}. `;
        summary += `The research reveals significant insights about the relationships between these concepts, `;
        summary += `with particular emphasis on how they influence each other and contribute to the broader understanding of the domain.`;
        break;
        
      case 'detailed':
        summary = `Comprehensive Analysis of ${nodes.length} Research Nodes:\n\n`;
        nodes.forEach(node => {
          summary += `${node.title}: ${node.content.substring(0, 150)}...\n\n`;
        });
        summary += `This detailed analysis shows the interconnected nature of these research areas and their collective contribution to understanding the field.`;
        break;
        
      case 'comparative':
        summary = `Comparative Analysis:\n\n`;
        summary += `Similarities: The selected nodes share common themes around ${nodes[0]?.title || 'the research domain'}, `;
        summary += `with overlapping concepts and methodological approaches.\n\n`;
        summary += `Differences: Each node contributes unique perspectives, with varying levels of detail and focus areas. `;
        summary += `Some nodes provide broad overviews while others offer specific technical details.\n\n`;
        summary += `Complementary Aspects: Together, these nodes form a comprehensive view of the research landscape.`;
        break;
        
      case 'thematic':
        summary = `Thematic Organization:\n\n`;
        summary += `Theme 1 - Foundational Concepts: ${nodes.filter(n => n.type === 'topic').map(n => n.title).join(', ')}\n`;
        summary += `Theme 2 - Specific Applications: ${nodes.filter(n => n.type === 'subtopic').map(n => n.title).join(', ')}\n`;
        summary += `Theme 3 - Detailed Findings: ${nodes.filter(n => n.type === 'detail').map(n => n.title).join(', ')}\n\n`;
        summary += `These themes work together to provide a comprehensive understanding of the research domain.`;
        break;
    }
    
    return summary;
  } catch (error) {
    console.error('Error generating summary:', error);
    throw new Error('Failed to generate summary');
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the request
    const validatedData = SummaryRequestSchema.parse(body);
    
    // Get node data (in production, fetch from database)
    const nodeData = getSampleNodeData(validatedData.nodeIds);
    
    if (nodeData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid nodes found for the provided IDs',
      }, { status: 404 });
    }
    
    // Generate the summary
    const summary = await generateSummary(
      nodeData,
      validatedData.summaryType,
      validatedData.includeConnections,
      validatedData.maxLength
    );
    
    return NextResponse.json({
      success: true,
      summary,
      metadata: {
        nodeCount: nodeData.length,
        summaryType: validatedData.summaryType,
        wordCount: summary.split(' ').length,
        includedConnections: validatedData.includeConnections,
        generatedAt: new Date().toISOString(),
      },
      nodeData: nodeData.map(node => ({
        id: node.id,
        title: node.title,
        type: node.type,
      })),
    }, { status: 200 });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
      }, { status: 400 });
    }
    
    console.error('Error generating summary:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate summary',
    }, { status: 500 });
  }
}
