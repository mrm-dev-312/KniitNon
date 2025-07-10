import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Force dynamic rendering for this route since it uses request.headers
export const dynamic = 'force-dynamic';
const aiProvider = process.env.AI_PROVIDER || 'openai';

let aiClient: any;
let modelName: string;

if (aiProvider === 'gemini') {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  aiClient = genAI.getGenerativeModel({ model: 'gemini-pro' });
  modelName = 'gemini-pro';
} else {
  aiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });
  modelName = 'gpt-4o-mini';
}

export async function POST(request: Request) {
  try {
    const { nodeId, title, content, type, lens, depth, parentId } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Node title is required' }, { status: 400 });
    }

    // Calculate the next depth level for proper taxonomy progression
    const currentDepth = depth || 0;
    const nextDepth = currentDepth + 1;

    // System prompt for taxonomic drilling down with proper depth progression
    const systemPrompt = `You are a research assistant that creates taxonomic progressions for deep research exploration.

OBJECTIVE: Generate 6-10 research nodes that are ONE LEVEL DEEPER in the taxonomic hierarchy than the parent node.

TAXONOMIC PRINCIPLES:
- Follow natural classification hierarchies (broad → specific → granular → micro-details)
- Each new node should be a logical subdivision of the parent topic
- Maintain conceptual coherence while enabling deeper exploration
- Create meaningful connections that preserve the research thread

PARENT NODE CONTEXT:
- Title: "${title}"
- Content: "${content}"
- Current Depth: ${currentDepth}
- Target Depth: ${nextDepth}
- Type: "${type}"
- Lens: "${lens || 'General'}"

DEPTH GUIDANCE:
${nextDepth === 1 ? "Create main subtopics and primary categories" : 
  nextDepth === 2 ? "Create specific aspects and detailed components" : 
  nextDepth === 3 ? "Create granular elements and specialized areas" : 
  nextDepth === 4 ? "Create micro-details and technical specifics" : 
  "Create ultra-specific elements and edge cases"}

REQUIREMENTS:
1. Each node title should clearly indicate its relationship to the parent
2. Content should be substantive and academically rigorous
3. Create logical connections between the new nodes when appropriate
4. Ensure nodes can be further subdivided for infinite exploration
5. Maintain the research thread from "${title}" through deeper levels

Return ONLY valid JSON in this exact structure:
{
  "parentNode": {
    "id": "${nodeId}",
    "title": "${title}",
    "depth": ${currentDepth}
  },
  "drillDownNodes": [
    {
      "id": "drill-${nodeId}-${Date.now()}-1",
      "title": "Specific Subdivision Title",
      "content": "Detailed content that builds on the parent topic with academic depth and specificity appropriate for depth level ${nextDepth}",
      "type": "${nextDepth === 1 ? 'subtopic' : nextDepth === 2 ? 'detail' : 'micro-detail'}",
      "connections": ["${nodeId}"],
      "source": "Research area or academic source",
      "depth": ${nextDepth},
      "lens": "${lens || 'General'}",
      "parentId": "${nodeId}",
      "taxonomy": {
        "level": ${nextDepth},
        "parent": "${title}",
        "branch": "subdivision-name"
      }
    }
  ]
}

CRITICAL: Generate nodes that can themselves be further subdivided to enable infinite drilling down from any topic to any level of detail.`;

    let generatedContent: string;

    if (aiProvider === 'gemini') {
      const result = await aiClient.generateContent(systemPrompt);
      generatedContent = result.response.text();
    } else {
      const response = await aiClient.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt }
        ],
        temperature: 0.8,
        max_tokens: 2500,
      });
      generatedContent = response.choices[0]?.message?.content || '';
    }

    // Parse the AI response
    let parsedResponse;
    try {
      // Try to extract JSON from the response
      const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      
      // Fallback: Create basic drill-down nodes
      parsedResponse = createFallbackDrillDown(nodeId, title, content, type, lens);
    }

    // Validate and ensure proper structure
    if (!parsedResponse.drillDownNodes || !Array.isArray(parsedResponse.drillDownNodes)) {
      parsedResponse = createFallbackDrillDown(nodeId, title, content, type, lens);
    }

    // Ensure each node has required fields and proper taxonomic structure
    parsedResponse.drillDownNodes = parsedResponse.drillDownNodes.map((node: any, index: number) => {
      const nodeDepth = nextDepth;
      const nodeType = nodeDepth === 1 ? 'subtopic' : nodeDepth === 2 ? 'detail' : 'micro-detail';
      
      return {
        id: node.id || `drill-${nodeId}-${Date.now()}-${index}`,
        title: node.title || `${title} - Subdivision ${index + 1}`,
        content: node.content || `Detailed exploration of ${title} at taxonomic level ${nodeDepth}.`,
        type: nodeType,
        connections: [nodeId], // Always connect back to parent
        source: node.source || `Level ${nodeDepth} analysis of ${title}`,
        depth: nodeDepth,
        lens: node.lens || lens || 'General',
        parentId: nodeId,
        taxonomy: {
          level: nodeDepth,
          parent: title,
          branch: node.taxonomy?.branch || `branch-${index + 1}`
        }
      };
    });

    // Add interconnections between new nodes at the same level (optional)
    if (parsedResponse.drillDownNodes.length > 1) {
      // Create some cross-connections between related nodes at the same taxonomic level
      parsedResponse.drillDownNodes.forEach((node: any, index: number) => {
        if (index < parsedResponse.drillDownNodes.length - 1) {
          // Connect each node to the next one to create a chain of related concepts
          const nextNode = parsedResponse.drillDownNodes[index + 1];
          if (!node.connections.includes(nextNode.id)) {
            node.connections.push(nextNode.id);
          }
          if (!nextNode.connections.includes(node.id)) {
            nextNode.connections.push(node.id);
          }
        }
      });
    }

    return NextResponse.json(parsedResponse);

  } catch (error) {
    console.error('Error generating drill-down nodes:', error);
    return NextResponse.json(
      { error: 'Failed to generate drill-down nodes' },
      { status: 500 }
    );
  }
}

// Fallback function to create basic drill-down nodes
function createFallbackDrillDown(nodeId: string, title: string, content: string, type: string, lens?: string) {
  const drillDownAspects = [
    { suffix: 'Historical Development', focus: 'historical evolution and key milestones' },
    { suffix: 'Current Research', focus: 'contemporary studies and recent findings' },
    { suffix: 'Methodological Approaches', focus: 'research methods and analytical frameworks' },
    { suffix: 'Practical Applications', focus: 'real-world implementations and use cases' },
    { suffix: 'Challenges and Limitations', focus: 'current obstacles and unresolved issues' },
    { suffix: 'Future Directions', focus: 'emerging trends and research opportunities' },
    { suffix: 'Cross-Disciplinary Connections', focus: 'relationships with other fields of study' },
    { suffix: 'Case Studies', focus: 'specific examples and detailed analysis' }
  ];

  return {
    parentNode: { id: nodeId, title, type },
    drillDownNodes: drillDownAspects.map((aspect, index) => ({
      id: `drill-${nodeId}-${Date.now()}-${index}`,
      title: `${title}: ${aspect.suffix}`,
      content: `Detailed exploration of ${title} focusing on ${aspect.focus}. This area provides specific insights and deeper understanding of the topic.`,
      type: type === 'topic' ? 'subtopic' : 'detail',
      connections: [nodeId],
      source: `Deep dive into ${title}`,
      depth: type === 'topic' ? 1 : 2,
      lens: lens || 'Other',
      parentId: nodeId,
      conflicts: [],
      children: [],
      parents: [nodeId]
    }))
  };
}

function addDrillDownConnections(nodes: any[]) {
  // Add some connections between related drill-down nodes
  nodes.forEach((node, index) => {
    // Connect to 1-2 other nodes in the same drill-down set
    const connectTo = Math.min(2, nodes.length - 1);
    for (let i = 1; i <= connectTo; i++) {
      const targetIndex = (index + i) % nodes.length;
      if (targetIndex !== index && !node.connections.includes(nodes[targetIndex].id)) {
        node.connections.push(nodes[targetIndex].id);
      }
    }
  });
}
