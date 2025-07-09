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
    const { query, perspective = 'general' } = await request.json();

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    // System prompt for generating research nodes from a search query
    const systemPrompt = `You are a research assistant that generates comprehensive research nodes for academic exploration from a search query.

Given a search query, create a structured research map with interconnected nodes that provide a 10,000-foot view of the topic and drill down into specific subtopics and details. Generate nodes that would be found in academic research, including:

1. Main conceptual frameworks
2. Historical development and context
3. Current research and findings
4. Debates and controversies
5. Practical applications
6. Future directions
7. Cross-disciplinary connections

Return a JSON response with this structure:

{
  "query": "The original search query",
  "perspective": "${perspective}",
  "summary": "Brief overview of the research area generated",
  "nodes": [
    {
      "id": "unique-id",
      "title": "Node Title",
      "content": "Comprehensive content with academic depth",
      "type": "topic" | "subtopic" | "detail",
      "connections": ["id1", "id2"],
      "source": "Academic source or research area",
      "depth": 0-2,
      "lens": "Technology" | "Science" | "History" | "Philosophy" | "Ethics" | "Economics" | "Psychology" | "Sociology" | "Other",
      "conflicts": ["conflicting-node-id"],
      "children": [],
      "parents": []
    }
  ]
}

Guidelines:
- Generate 8-15 nodes for comprehensive coverage
- Include diverse node types (topics, subtopics, details)
- Create meaningful connections between related concepts
- Include potential conflicts or debates between ideas
- Ensure academic rigor and depth in content
- Cover multiple perspectives and disciplinary lenses
- Include both foundational concepts and cutting-edge research

Search Query: "${query}"
Research Perspective: "${perspective}"`;

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
        max_tokens: 3000,
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
      
      // Fallback: Create a basic node structure from the query
      parsedResponse = createFallbackNodes(query, perspective);
    }

    // Validate and ensure proper structure
    if (!parsedResponse.nodes || !Array.isArray(parsedResponse.nodes)) {
      parsedResponse = createFallbackNodes(query, perspective);
    }

    // Ensure each node has required fields and proper connections
    parsedResponse.nodes = parsedResponse.nodes.map((node: any, index: number) => ({
      id: node.id || `search-node-${Date.now()}-${index}`,
      title: node.title || `Research Topic ${index + 1}`,
      content: node.content || 'Research content to be explored further.',
      type: node.type || (index === 0 ? 'topic' : index < 4 ? 'subtopic' : 'detail'),
      connections: Array.isArray(node.connections) ? node.connections : [],
      source: node.source || `Research on ${query}`,
      depth: typeof node.depth === 'number' ? node.depth : Math.min(index, 2),
      lens: node.lens || determineLens(query),
      conflicts: Array.isArray(node.conflicts) ? node.conflicts : [],
      children: Array.isArray(node.children) ? node.children : [],
      parents: Array.isArray(node.parents) ? node.parents : []
    }));

    // Add some automatic connections based on proximity and type
    addAutomaticConnections(parsedResponse.nodes);

    return NextResponse.json(parsedResponse);

  } catch (error) {
    console.error('Error generating research nodes from search:', error);
    return NextResponse.json(
      { error: 'Failed to generate research nodes from search' },
      { status: 500 }
    );
  }
}

// Fallback function to create basic nodes from search query
function createFallbackNodes(query: string, perspective: string) {
  const baseTopics = generateBaseTopics(query);
  
  return {
    query,
    perspective,
    summary: `Research nodes generated for: ${query}`,
    nodes: baseTopics.map((topic, index) => ({
      id: `fallback-node-${Date.now()}-${index}`,
      title: topic.title,
      content: topic.content,
      type: index === 0 ? 'topic' : index < 3 ? 'subtopic' : 'detail',
      connections: index > 0 ? [`fallback-node-${Date.now()}-${index - 1}`] : [],
      source: `Research on ${query}`,
      depth: Math.min(index, 2),
      lens: determineLens(query),
      conflicts: [],
      children: [],
      parents: []
    }))
  };
}

function generateBaseTopics(query: string) {
  const queryWords = query.toLowerCase().split(' ').filter(word => word.length > 2);
  const topics = [
    {
      title: `${query} - Overview`,
      content: `Comprehensive overview and introduction to ${query}, covering fundamental concepts and core principles.`
    },
    {
      title: `Historical Development of ${query}`,
      content: `Historical evolution and key milestones in the development of ${query}.`
    },
    {
      title: `Current Research in ${query}`,
      content: `Contemporary research trends, recent findings, and ongoing studies related to ${query}.`
    },
    {
      title: `Applications of ${query}`,
      content: `Practical applications and real-world implementations of ${query} concepts.`
    },
    {
      title: `Challenges in ${query}`,
      content: `Current challenges, limitations, and unresolved questions in ${query}.`
    },
    {
      title: `Future Directions`,
      content: `Emerging trends and future research directions in ${query}.`
    }
  ];

  return topics;
}

function determineLens(query: string): string {
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes('technology') || queryLower.includes('software') || queryLower.includes('digital')) {
    return 'Technology';
  } else if (queryLower.includes('history') || queryLower.includes('historical')) {
    return 'History';
  } else if (queryLower.includes('ethics') || queryLower.includes('moral')) {
    return 'Ethics';
  } else if (queryLower.includes('science') || queryLower.includes('research')) {
    return 'Science';
  } else if (queryLower.includes('economic') || queryLower.includes('market')) {
    return 'Economics';
  } else if (queryLower.includes('psychology') || queryLower.includes('behavior')) {
    return 'Psychology';
  } else if (queryLower.includes('social') || queryLower.includes('society')) {
    return 'Sociology';
  } else if (queryLower.includes('philosophy') || queryLower.includes('theory')) {
    return 'Philosophy';
  }
  
  return 'Other';
}

function addAutomaticConnections(nodes: any[]) {
  // Connect topics to their subtopics
  nodes.forEach((node, index) => {
    if (node.type === 'topic') {
      // Connect to next few subtopics
      for (let i = index + 1; i < Math.min(index + 4, nodes.length); i++) {
        if (nodes[i].type === 'subtopic' && !node.connections.includes(nodes[i].id)) {
          node.connections.push(nodes[i].id);
        }
      }
    } else if (node.type === 'subtopic') {
      // Connect subtopics to details
      for (let i = index + 1; i < Math.min(index + 3, nodes.length); i++) {
        if (nodes[i].type === 'detail' && !node.connections.includes(nodes[i].id)) {
          node.connections.push(nodes[i].id);
        }
      }
    }
  });
}
