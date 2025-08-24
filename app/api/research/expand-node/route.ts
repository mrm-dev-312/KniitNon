import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ExpandNodeRequest {
  prompt: string;
  parentNodeId: string;
  parentLevel: number;
  maxLevels: number;
  maxChildren: number;
  rootContext: string;
  pathContext: string[];
}

export async function POST(req: NextRequest) {
  try {
    const body: ExpandNodeRequest = await req.json();
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a research assistant that helps expand knowledge trees. You create hierarchical research structures with focused topics and subtopics. Always return valid JSON in the exact format specified.`
        },
        {
          role: "user",
          content: body.prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from AI');
    }

    // Parse the AI response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseContent);
    } catch (parseError) {
      // If JSON parsing fails, try to extract JSON from the response
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid JSON response from AI');
      }
    }

    // Validate the response structure
    if (!parsedResponse.nodes || !Array.isArray(parsedResponse.nodes)) {
      throw new Error('Invalid response format: missing nodes array');
    }

    // Enhance nodes with additional metadata
    const enhancedNodes = parsedResponse.nodes.map((node: any, index: number) => ({
      ...node,
      id: `${body.parentNodeId}-child-${index + 1}-${Date.now()}`,
      parentId: body.parentNodeId,
      level: node.level || (body.parentLevel + 1),
      order: index + 1,
      isExpandable: node.isExpandable !== false,
      isExpanded: false,
      expansionCount: 0,
      metadata: {
        source: 'tree-expansion',
        parentNodeId: body.parentNodeId,
        parentLevel: body.parentLevel,
        rootContext: body.rootContext,
        pathContext: body.pathContext,
        generatedAt: new Date().toISOString(),
        ...node.metadata
      }
    }));

    return NextResponse.json({
      success: true,
      nodes: enhancedNodes,
      metadata: {
        parentNodeId: body.parentNodeId,
        generatedCount: enhancedNodes.length,
        maxLevels: body.maxLevels,
        rootContext: body.rootContext
      }
    });

  } catch (error) {
    console.error('Expand node API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        nodes: []
      },
      { status: 500 }
    );
  }
}
