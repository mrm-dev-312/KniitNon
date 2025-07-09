import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schema for summary requests
const SummaryRequestSchema = z.object({
  nodeIds: z.array(z.string()).min(1).max(20), // Limit to reasonable number of nodes
  summaryType: z.enum(['overview', 'detailed', 'connections', 'conflicts']).default('overview'),
  includeRelationships: z.boolean().default(true),
  includeConflicts: z.boolean().default(false),
  maxLength: z.number().min(100).max(2000).default(500),
});

type SummaryRequest = z.infer<typeof SummaryRequestSchema>;

interface NodeSummary {
  id: string;
  summary: string;
  summaryType: string;
  nodeCount: number;
  relationships: Array<{
    source: string;
    target: string;
    type: string;
    description: string;
  }>;
  conflicts?: Array<{
    nodes: string[];
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  keyInsights: string[];
  generatedAt: string;
}

// Mock node data for summary generation (in real app, fetch from database)
const mockNodes = {
  'node-1': {
    id: 'node-1',
    title: 'Climate Change',
    content: 'Overview of global climate change impacts and causes. This comprehensive topic covers the fundamental science behind climate change, including greenhouse gas emissions, temperature rise patterns, and environmental impacts.',
    type: 'topic',
    source: 'NASA Climate'
  },
  'node-2': {
    id: 'node-2',
    title: 'Carbon Emissions',
    content: 'Analysis of CO2 and greenhouse gas emissions from various sources including industry, transportation, and agriculture. Detailed breakdown of emission sources and reduction strategies.',
    type: 'subtopic',
    source: 'EPA Reports'
  },
  'node-3': {
    id: 'node-3',
    title: 'Sea Level Rise',
    content: 'Documentation of rising sea levels and coastal impacts due to thermal expansion and ice sheet melting. Regional variations and future projections.',
    type: 'subtopic',
    source: 'NOAA Data'
  },
};

// Helper function to generate AI summary using OpenAI or Gemini
async function generateAISummary(
  nodes: Array<{ id: string; title: string; content: string; type: string; source?: string }>,
  summaryType: string,
  includeRelationships: boolean,
  includeConflicts: boolean,
  maxLength: number
): Promise<{ summary: string; keyInsights: string[]; relationships: any[]; conflicts?: any[] }> {
  
  const apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
  const isOpenAI = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('No AI API key configured');
  }

  const nodeTexts = nodes.map(n => `**${n.title}** (${n.type}): ${n.content}`).join('\n\n');
  
  let prompt = '';
  
  switch (summaryType) {
    case 'overview':
      prompt = `Provide a comprehensive overview summary of the following research nodes. Focus on the main themes, key concepts, and overall narrative. Keep it concise but informative (max ${maxLength} words):\n\n${nodeTexts}`;
      break;
    case 'detailed':
      prompt = `Provide a detailed analysis of the following research nodes. Include specific data points, methodologies, and nuanced insights. Aim for depth over breadth (max ${maxLength} words):\n\n${nodeTexts}`;
      break;
    case 'connections':
      prompt = `Analyze the relationships and connections between the following research nodes. Focus on how they relate to each other, shared themes, and interconnected concepts (max ${maxLength} words):\n\n${nodeTexts}`;
      break;
    case 'conflicts':
      prompt = `Identify any conflicts, contradictions, or areas of debate between the following research nodes. Highlight disagreements in the literature or conflicting viewpoints (max ${maxLength} words):\n\n${nodeTexts}`;
      break;
  }

  if (includeRelationships) {
    prompt += '\n\nAlso identify key relationships between these nodes and how they connect thematically.';
  }

  if (includeConflicts) {
    prompt += '\n\nHighlight any scholarly debates, conflicts, or unresolved questions within or between these topics.';
  }

  prompt += '\n\nFormat your response as JSON with the following structure:\n{\n  "summary": "main summary text",\n  "keyInsights": ["insight 1", "insight 2", "insight 3"],\n  "relationships": [{"source": "node title 1", "target": "node title 2", "type": "relationship type", "description": "how they relate"}],\n  "conflicts": [{"nodes": ["conflicting node titles"], "description": "nature of conflict", "severity": "low|medium|high"}]\n}';

  try {
    if (isOpenAI) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert research analyst who excels at synthesizing information from multiple sources and identifying patterns, relationships, and conflicts in academic content.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: Math.min(maxLength * 2, 2000),
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content;

      if (!aiResponse) {
        throw new Error('No response from OpenAI');
      }

      // Try to parse JSON response
      try {
        return JSON.parse(aiResponse);
      } catch {
        // Fallback if JSON parsing fails
        return {
          summary: aiResponse,
          keyInsights: [],
          relationships: [],
          conflicts: includeConflicts ? [] : undefined,
        };
      }
    } else {
      // Use Gemini API (similar structure)
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            maxOutputTokens: Math.min(maxLength * 2, 2000),
            temperature: 0.7,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!aiResponse) {
        throw new Error('No response from Gemini');
      }

      // Try to parse JSON response
      try {
        return JSON.parse(aiResponse);
      } catch {
        // Fallback if JSON parsing fails
        return {
          summary: aiResponse,
          keyInsights: [],
          relationships: [],
          conflicts: includeConflicts ? [] : undefined,
        };
      }
    }
  } catch (error) {
    console.error('AI API error:', error);
    // Fallback to simple text combination
    return {
      summary: `Combined summary of ${nodes.length} research nodes: ${nodes.map(n => n.title).join(', ')}. ${nodes.map(n => n.content.substring(0, 100)).join(' ')}...`,
      keyInsights: nodes.map(n => `Key insight from ${n.title}`),
      relationships: [],
      conflicts: includeConflicts ? [] : undefined,
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the request
    const validatedData = SummaryRequestSchema.parse(body);
    
    // Get node data (in real app, fetch from database)
    const nodes = validatedData.nodeIds
      .map(id => mockNodes[id as keyof typeof mockNodes])
      .filter(Boolean);

    if (nodes.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid nodes found for the provided IDs',
      }, { status: 404 });
    }

    // Generate AI summary
    const aiResult = await generateAISummary(
      nodes,
      validatedData.summaryType,
      validatedData.includeRelationships,
      validatedData.includeConflicts,
      validatedData.maxLength
    );

    // Create the node summary
    const nodeSummary: NodeSummary = {
      id: `summary_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      summary: aiResult.summary,
      summaryType: validatedData.summaryType,
      nodeCount: nodes.length,
      relationships: aiResult.relationships || [],
      conflicts: aiResult.conflicts,
      keyInsights: aiResult.keyInsights || [],
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      summary: nodeSummary,
      message: `Generated ${validatedData.summaryType} summary for ${nodes.length} nodes`,
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
