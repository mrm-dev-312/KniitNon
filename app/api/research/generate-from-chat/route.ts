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

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'No chat messages provided' }, { status: 400 });
    }

    // Create a summary of the chat conversation
    const chatSummary = messages
      .map((msg: ChatMessage) => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`)
      .join('\n');

    // System prompt for generating research nodes
    const systemPrompt = `You are a research assistant that converts conversations into structured research nodes for academic exploration. 

Given a chat conversation, extract the main topics, subtopics, and details that would be valuable for research. Generate a JSON response with research nodes that follow this structure:

{
  "summary": "Brief summary of the conversation topics",
  "nodes": [
    {
      "id": "unique-id",
      "title": "Node Title",
      "content": "Detailed content about this research area",
      "type": "topic" | "subtopic" | "detail",
      "connections": ["id1", "id2"], // IDs of related nodes
      "source": "Derived from conversation",
      "depth": 0-2, // 0 = main topic, 1 = subtopic, 2 = detail
      "lens": "Technology" | "Science" | "History" | "Philosophy" | "Ethics" | "Other"
    }
  ]
}

Make sure to:
1. Create meaningful connections between related concepts
2. Include at least 5-10 nodes for a rich research experience
3. Vary the types (topic, subtopic, detail) appropriately
4. Extract specific details that can lead to further research
5. Ensure each node has substantial content for exploration

Conversation to analyze:
${chatSummary}`;

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
        temperature: 0.7,
        max_tokens: 2000,
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
      
      // Fallback: Create a basic node structure from the conversation
      const topics = extractTopicsFromChat(messages);
      parsedResponse = {
        summary: "Research topics extracted from conversation",
        nodes: topics.map((topic, index) => ({
          id: `chat-node-${index + 1}`,
          title: topic.title,
          content: topic.content,
          type: index === 0 ? 'topic' : (index < 3 ? 'subtopic' : 'detail'),
          connections: index > 0 ? [`chat-node-${index}`] : [],
          source: 'Derived from conversation',
          depth: Math.min(index, 2),
          lens: 'Other'
        }))
      };
    }

    // Validate and ensure proper structure
    if (!parsedResponse.nodes || !Array.isArray(parsedResponse.nodes)) {
      throw new Error('Invalid node structure in AI response');
    }

    // Ensure each node has required fields
    parsedResponse.nodes = parsedResponse.nodes.map((node: any, index: number) => ({
      id: node.id || `generated-node-${index + 1}`,
      title: node.title || `Research Topic ${index + 1}`,
      content: node.content || 'Research content to be explored.',
      type: node.type || 'topic',
      connections: Array.isArray(node.connections) ? node.connections : [],
      source: node.source || 'Generated from conversation',
      depth: typeof node.depth === 'number' ? node.depth : 0,
      lens: node.lens || 'Other',
      children: [],
      parents: [],
      conflicts: []
    }));

    return NextResponse.json(parsedResponse);

  } catch (error) {
    console.error('Error generating research nodes from chat:', error);
    return NextResponse.json(
      { error: 'Failed to generate research nodes' },
      { status: 500 }
    );
  }
}

// Fallback function to extract basic topics from chat
function extractTopicsFromChat(messages: ChatMessage[]): Array<{title: string, content: string}> {
  const topics: Array<{title: string, content: string}> = [];
  
  messages.forEach((message, index) => {
    if (message.role === 'user' && message.content.length > 20) {
      // Extract potential topics from user messages
      const words = message.content.split(' ');
      if (words.length > 3) {
        topics.push({
          title: words.slice(0, 4).join(' ').replace(/[?!.]/g, ''),
          content: message.content
        });
      }
    }
  });

  // If no topics found, create a default one
  if (topics.length === 0) {
    topics.push({
      title: 'Conversation Topics',
      content: 'Research topics derived from the conversation for further exploration.'
    });
  }

  return topics.slice(0, 8); // Limit to 8 topics
}
