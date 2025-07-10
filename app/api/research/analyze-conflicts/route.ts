import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Force dynamic rendering for this route since it uses request.headers
export const dynamic = 'force-dynamic';
// Validation schema for conflict analysis requests
const ConflictAnalysisRequestSchema = z.object({
  nodeId: z.string().optional(), // Analyze single node
  nodeIds: z.array(z.string()).optional(), // Analyze multiple nodes
  analysisType: z.enum(['internal', 'cross-node', 'comprehensive']).default('comprehensive'),
  includeUnresolved: z.boolean().default(true),
  includeBiases: z.boolean().default(false),
  severityThreshold: z.enum(['low', 'medium', 'high']).default('low'),
});

type ConflictAnalysisRequest = z.infer<typeof ConflictAnalysisRequestSchema>;

interface ConflictHighlight {
  id: string;
  nodeId: string;
  nodeTitle: string;
  conflictType: 'methodological' | 'empirical' | 'theoretical' | 'interpretive' | 'unresolved';
  severity: 'low' | 'medium' | 'high';
  description: string;
  textSegment: string; // The specific text that contains the conflict
  relatedNodes?: string[]; // Other nodes involved in this conflict
  sources: string[]; // Conflicting sources
  keywords: string[]; // Keywords that identify the conflict
  suggestedResolution?: string;
  lastUpdated: string;
}

interface ConflictAnalysisResult {
  nodeId: string;
  totalConflicts: number;
  conflictsByType: Record<string, number>;
  conflictsBySeverity: Record<string, number>;
  highlights: ConflictHighlight[];
  unresolvedQuestions: string[];
  suggestedInvestigations: string[];
  analysisDate: string;
}

// Mock node data for conflict analysis (in real app, fetch from database)
const mockNodeData = {
  'node-1': {
    id: 'node-1',
    title: 'Climate Change',
    content: 'Overview of global climate change impacts and causes. While there is broad scientific consensus on anthropogenic climate change, debates persist regarding the precise magnitude of warming, regional impacts, and optimal mitigation strategies. Some studies suggest temperature increases of 1.5°C while others project 2-3°C by 2100. The effectiveness of carbon pricing versus regulatory approaches remains contentious among policymakers.',
    type: 'topic',
    source: 'NASA Climate'
  },
  'node-2': {
    id: 'node-2',
    title: 'Carbon Emissions',
    content: 'Analysis of CO2 and greenhouse gas emissions from various sources. Recent studies show conflicting data on emission reduction trends: EPA reports a 10% decrease since 2010, while independent analyses suggest only 3-5% actual reduction when accounting for exported emissions. The methodology for measuring Scope 3 emissions remains highly contested among researchers.',
    type: 'subtopic',
    source: 'EPA Reports'
  },
  'node-3': {
    id: 'node-3',
    title: 'Sea Level Rise',
    content: 'Documentation of rising sea levels and coastal impacts. Satellite altimetry shows 3.3mm/year rise, but tide gauge data indicates 1.8mm/year. This discrepancy between measurement methods has sparked debate about data reliability. Antarctic ice sheet stability projections vary wildly from 10cm to 2m additional rise by 2100, creating uncertainty for coastal planning.',
    type: 'subtopic',
    source: 'NOAA Data'
  },
};

// Helper function to detect conflicts using AI
async function detectConflictsWithAI(
  nodes: Array<{ id: string; title: string; content: string; source?: string }>,
  analysisType: string,
  includeUnresolved: boolean,
  includeBiases: boolean
): Promise<ConflictHighlight[]> {
  
  const apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
  const isOpenAI = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('No AI API key configured');
  }

  const nodeTexts = nodes.map(n => `**Node ${n.id} - ${n.title}** (${n.source || 'Unknown source'}): ${n.content}`).join('\n\n');
  
  let prompt = `Analyze the following research content for scholarly debates, conflicts, methodological disputes, and unresolved questions. Look for:

1. **Methodological conflicts**: Different research methods producing different results
2. **Empirical conflicts**: Contradictory data or findings between studies
3. **Theoretical conflicts**: Competing theories or frameworks
4. **Interpretive conflicts**: Different interpretations of the same data
5. **Unresolved questions**: Areas where research is incomplete or inconclusive`;

  if (includeBiases) {
    prompt += `\n6. **Potential biases**: Sources of bias that might affect conclusions`;
  }

  prompt += `\n\nContent to analyze:\n\n${nodeTexts}`;

  prompt += `\n\nIdentify specific conflicts and format your response as JSON with this structure:
{
  "conflicts": [
    {
      "nodeId": "node-X",
      "conflictType": "methodological|empirical|theoretical|interpretive|unresolved",
      "severity": "low|medium|high",
      "description": "Description of the conflict or debate",
      "textSegment": "The specific text that shows the conflict",
      "relatedNodes": ["other-node-ids-if-applicable"],
      "sources": ["conflicting source names"],
      "keywords": ["key", "terms", "identifying", "conflict"],
      "suggestedResolution": "How this might be resolved"
    }
  ]
}`;

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
              content: 'You are an expert research analyst specializing in identifying scholarly debates, methodological conflicts, and unresolved questions in academic content. You excel at spotting contradictions, inconsistencies, and areas where more research is needed.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.3, // Lower temperature for more consistent analysis
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
        const parsed = JSON.parse(aiResponse);
        return parsed.conflicts || [];
      } catch {
        // Fallback parsing attempt
        return [];
      }
    } else {
      // Use Gemini API
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
            maxOutputTokens: 2000,
            temperature: 0.3,
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
        const parsed = JSON.parse(aiResponse);
        return parsed.conflicts || [];
      } catch {
        // Fallback parsing attempt
        return [];
      }
    }
  } catch (error) {
    console.error('AI API error:', error);
    // Return fallback conflicts for demo
    return [
      {
        id: `conflict_${Date.now()}_1`,
        nodeId: nodes[0]?.id || 'unknown',
        nodeTitle: nodes[0]?.title || 'Unknown',
        conflictType: 'empirical' as const,
        severity: 'medium' as const,
        description: 'Conflicting data measurements detected',
        textSegment: 'Different measurement methodologies producing varying results',
        sources: ['Source A', 'Source B'],
        keywords: ['measurement', 'methodology', 'discrepancy'],
        lastUpdated: new Date().toISOString(),
      }
    ];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the request
    const validatedData = ConflictAnalysisRequestSchema.parse(body);
    
    // Determine which nodes to analyze
    let nodeIds: string[] = [];
    if (validatedData.nodeId) {
      nodeIds = [validatedData.nodeId];
    } else if (validatedData.nodeIds) {
      nodeIds = validatedData.nodeIds;
    } else {
      return NextResponse.json({
        success: false,
        error: 'Either nodeId or nodeIds must be provided',
      }, { status: 400 });
    }

    // Get node data (in real app, fetch from database)
    const nodes = nodeIds
      .map(id => mockNodeData[id as keyof typeof mockNodeData])
      .filter(Boolean);

    if (nodes.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid nodes found for the provided IDs',
      }, { status: 404 });
    }

    // Detect conflicts using AI
    const detectedConflicts = await detectConflictsWithAI(
      nodes,
      validatedData.analysisType,
      validatedData.includeUnresolved,
      validatedData.includeBiases
    );

    // Filter by severity threshold
    const severityOrder = { low: 1, medium: 2, high: 3 };
    const thresholdLevel = severityOrder[validatedData.severityThreshold];
    const filteredConflicts = detectedConflicts.filter(
      conflict => severityOrder[conflict.severity] >= thresholdLevel
    );

    // Generate analysis results for each node
    const results: ConflictAnalysisResult[] = nodes.map(node => {
      const nodeConflicts = filteredConflicts.filter(c => c.nodeId === node.id);
      
      const conflictsByType = nodeConflicts.reduce((acc, conflict) => {
        acc[conflict.conflictType] = (acc[conflict.conflictType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const conflictsBySeverity = nodeConflicts.reduce((acc, conflict) => {
        acc[conflict.severity] = (acc[conflict.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Generate unresolved questions based on conflicts
      const unresolvedQuestions = nodeConflicts
        .filter(c => c.conflictType === 'unresolved')
        .map(c => c.description);

      // Generate investigation suggestions
      const suggestedInvestigations = nodeConflicts
        .filter(c => c.suggestedResolution)
        .map(c => c.suggestedResolution!)
        .slice(0, 3); // Limit to top 3 suggestions

      return {
        nodeId: node.id,
        totalConflicts: nodeConflicts.length,
        conflictsByType,
        conflictsBySeverity,
        highlights: nodeConflicts,
        unresolvedQuestions,
        suggestedInvestigations,
        analysisDate: new Date().toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      results,
      totalNodesAnalyzed: nodes.length,
      totalConflictsFound: filteredConflicts.length,
      message: `Analyzed ${nodes.length} nodes and found ${filteredConflicts.length} conflicts`,
    }, { status: 200 });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
      }, { status: 400 });
    }
    
    console.error('Error analyzing conflicts:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze conflicts',
    }, { status: 500 });
  }
}
