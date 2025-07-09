import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
    const { nodeId, title, content, type, lens } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Node title is required' }, { status: 400 });
    }

    // System prompt for drilling down deeper into a specific topic
    const systemPrompt = `You are a research assistant that helps users explore topics in greater depth by generating more specific, detailed research nodes.

Given a research node, create 6-10 more specific research nodes that drill deeper into that topic. These should be:

1. More specific subtopics and details
2. Different aspects and perspectives
3. Current debates and controversies
4. Practical applications and case studies
5. Methodological approaches
6. Historical developments
7. Future research directions
8. Cross-connections to related fields

Generate nodes that are more granular and specific than the original node, allowing for deeper academic exploration.

Return a JSON response with this structure:

{
  "parentNode": {
    "id": "${nodeId}",
    "title": "${title}",
    "type": "${type}"
  },
  "drillDownNodes": [
    {
      "id": "unique-id",
      "title": "Specific Node Title",
      "content": "Detailed, specific content with academic depth",
      "type": "subtopic" | "detail",
      "connections": ["${nodeId}"], // Always connect back to parent
      "source": "Academic source or research area",
      "depth": ${type === 'topic' ? 1 : 2}, // Deeper than parent
      "lens": "${lens || 'Other'}",
      "parentId": "${nodeId}",
      "conflicts": [],
      "children": [],
      "parents": ["${nodeId}"]
    }
  ]
}

Guidelines for drilling down:
- Create 6-10 more specific nodes
- Each node should be more granular than the parent
- Include diverse perspectives and approaches
- Ensure academic rigor and depth
- Create meaningful connections between the new nodes
- Include both theoretical and practical aspects
- Consider current research and future directions

Parent Node Information:
- Title: "${title}"
- Content: "${content}"
- Type: "${type}"
- Lens: "${lens || 'Other'}"

Generate specific, detailed research nodes that would naturally fall under this parent topic.`;

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

    // Ensure each node has required fields
    parsedResponse.drillDownNodes = parsedResponse.drillDownNodes.map((node: any, index: number) => ({
      id: node.id || `drill-${nodeId}-${Date.now()}-${index}`,
      title: node.title || `${title} - Aspect ${index + 1}`,
      content: node.content || `Detailed exploration of ${title} from a specific perspective.`,
      type: type === 'topic' ? 'subtopic' : 'detail',
      connections: [nodeId, ...(Array.isArray(node.connections) ? node.connections.filter((id: string) => id !== nodeId) : [])],
      source: node.source || `Deep dive into ${title}`,
      depth: type === 'topic' ? 1 : 2,
      lens: node.lens || lens || 'Other',
      parentId: nodeId,
      conflicts: Array.isArray(node.conflicts) ? node.conflicts : [],
      children: [],
      parents: [nodeId]
    }));

    // Add some interconnections between the new nodes
    addDrillDownConnections(parsedResponse.drillDownNodes);

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
