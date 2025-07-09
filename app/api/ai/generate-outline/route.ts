import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { 
  OUTLINE_GENERATION_PROMPT, 
  generateOutlinePrompt,
  NodeData,
  OutlineContext 
} from '@/lib/prompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nodeIds, detailLevel, purpose, academicLevel } = body;

    // Validate required parameters
    if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
      return NextResponse.json(
        { error: 'Node IDs array is required' },
        { status: 400 }
      );
    }

    if (!detailLevel || !['low', 'medium', 'high'].includes(detailLevel)) {
      return NextResponse.json(
        { error: 'Valid detail level (low, medium, high) is required' },
        { status: 400 }
      );
    }

    // Fetch node data (you may need to implement this based on your data source)
    const nodes = await fetchNodesByIds(nodeIds);
    
    if (nodes.length === 0) {
      return NextResponse.json(
        { error: 'No valid nodes found for provided IDs' },
        { status: 404 }
      );
    }

    // Prepare context for outline generation
    const context: OutlineContext = {
      nodes,
      detailLevel,
      purpose,
      academicLevel
    };

    // Generate outline using OpenAI
    const outlinePrompt = generateOutlinePrompt(context);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4', // Use gpt-4 for better academic writing
      messages: [
        OUTLINE_GENERATION_PROMPT,
        outlinePrompt
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    const outlineContent = completion.choices[0].message.content;
    
    if (!outlineContent) {
      throw new Error('No content generated from OpenAI');
    }

    // Parse the JSON response
    let outline;
    try {
      outline = JSON.parse(outlineContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      return NextResponse.json(
        { error: 'Failed to generate valid outline structure' },
        { status: 500 }
      );
    }

    // Add metadata to the response
    const response = {
      outline,
      metadata: {
        generatedAt: new Date().toISOString(),
        nodeCount: nodes.length,
        detailLevel,
        purpose,
        academicLevel,
        estimatedTokens: completion.usage?.total_tokens || 0
      },
      nodes: nodes.map(node => ({ id: node.id, title: node.title })) // Include node references
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error generating AI outline:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate outline',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch nodes by their IDs from your data source
 * This should be implemented based on your actual data storage
 */
async function fetchNodesByIds(nodeIds: string[]): Promise<NodeData[]> {
  // For now, return sample data that matches the expected structure
  // You should replace this with actual database queries
  
  const sampleNodes: NodeData[] = [
    {
      id: '1',
      title: 'Climate Change Overview',
      content: 'Climate change refers to long-term shifts in global or regional climate patterns, primarily attributed to human activities since the mid-20th century.',
      type: 'topic',
      source: 'IPCC Report 2023',
      connections: ['2', '3']
    },
    {
      id: '2', 
      title: 'Greenhouse Gas Emissions',
      content: 'The primary driver of climate change is the increase in greenhouse gases, particularly carbon dioxide from fossil fuel combustion.',
      type: 'subtopic',
      source: 'NASA Climate Data',
      connections: ['1', '4']
    },
    {
      id: '3',
      title: 'Impact on Ecosystems',
      content: 'Climate change affects ecosystems through temperature changes, altered precipitation patterns, and extreme weather events.',
      type: 'subtopic', 
      source: 'Nature Journal 2023',
      connections: ['1']
    },
    {
      id: '4',
      title: 'Carbon Footprint Measurement',
      content: 'Detailed methodologies for measuring and calculating carbon footprints across different industries and activities.',
      type: 'detail',
      source: 'Environmental Science Research',
      connections: ['2']
    }
  ];

  // Filter to only return nodes that match the requested IDs
  return sampleNodes.filter(node => nodeIds.includes(node.id));
}

// GET endpoint for testing and retrieving available nodes
export async function GET() {
  try {
    // Return available sample nodes for testing
    const availableNodes = await fetchNodesByIds(['1', '2', '3', '4']);
    
    return NextResponse.json({
      availableNodes: availableNodes.map(node => ({
        id: node.id,
        title: node.title,
        type: node.type
      })),
      message: 'Available nodes for outline generation'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch available nodes' },
      { status: 500 }
    );
  }
}
