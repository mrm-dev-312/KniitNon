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

    // System prompt for generating research nodes with proper root structure
    const systemPrompt = `You are a research assistant that converts conversations into structured research nodes for academic exploration. 

Given a chat conversation, identify the MAIN RESEARCH SUBJECT as the root, then extract related topics, subtopics, and details. Generate a JSON response that follows this hierarchical structure:

{
  "summary": "Brief summary of the conversation topics",
  "rootTitle": "The main subject/theme of the entire conversation",
  "nodes": [
    {
      "id": "root",
      "title": "Main Research Subject", // This should be the overarching theme
      "content": "Overview of the main research area derived from the conversation",
      "type": "topic",
      "connections": [], // Root connects to main topics
      "source": "Primary conversation theme",
      "depth": 0,
      "lens": "Technology" | "Science" | "History" | "Philosophy" | "Ethics" | "Other",
      "children": ["topic-1", "topic-2", ...] // IDs of main topic children
    },
    {
      "id": "topic-1",
      "title": "Major Topic 1",
      "content": "Detailed content about this major topic area",
      "type": "topic",
      "connections": ["root"],
      "source": "Derived from conversation",
      "depth": 1,
      "lens": "...",
      "children": ["subtopic-1-1", ...]
    },
    // ... more topics and subtopics
  ]
}

CRITICAL: The first node must ALWAYS be the root node representing the main subject of the entire conversation. All other nodes should be hierarchically connected to this root. Make sure to:
1. Identify the core subject that encompasses the entire conversation as the root
2. Create 2-4 main topic children of the root
3. Add 3-6 subtopics under the main topics
4. Include specific details that can lead to further research
5. Ensure proper parent-child relationships in the children arrays
6. The root title should be the main subject, not generic terms like "Research Topics"

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
      
      // Fallback: Create a basic node structure from the conversation with proper root
      const topics = extractTopicsFromChat(messages);
      const rootTitle = determineRootTitle(messages, topics);
      
      parsedResponse = {
        summary: "Research topics extracted from conversation",
        rootTitle: rootTitle,
        nodes: [
          // Create root node
          {
            id: 'root',
            title: rootTitle,
            content: `Main research area encompassing: ${topics.slice(0, 3).map(t => t.title).join(', ')}`,
            type: 'topic',
            connections: [],
            source: 'Primary conversation theme',
            depth: 0,
            lens: 'Other',
            children: topics.slice(0, 5).map((_, index) => `topic-${index + 1}`)
          },
          // Create child topics
          ...topics.slice(0, 5).map((topic, index) => ({
            id: `topic-${index + 1}`,
            title: topic.title,
            content: topic.content,
            type: index < 2 ? 'topic' : 'subtopic',
            connections: ['root'],
            source: 'Derived from conversation',
            depth: index < 2 ? 1 : 2,
            lens: 'Other',
            children: [],
            parents: ['root']
          }))
        ]
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

// Helper function to determine the root title from conversation
function determineRootTitle(messages: ChatMessage[], topics: Array<{title: string, content: string}>): string {
  // Look for overarching themes or repeated concepts
  const allText = messages.map(m => m.content.toLowerCase()).join(' ');
  
  // Common research themes
  const themes = [
    'artificial intelligence', 'machine learning', 'neural networks',
    'climate change', 'sustainability', 'environmental science',
    'blockchain', 'cryptocurrency', 'digital transformation',
    'biotechnology', 'genetics', 'medical research',
    'quantum computing', 'physics', 'mathematics',
    'psychology', 'cognitive science', 'neuroscience',
    'economics', 'finance', 'business strategy',
    'history', 'philosophy', 'sociology'
  ];
  
  // Find theme with most occurrences
  let bestTheme = '';
  let maxCount = 0;
  
  themes.forEach(theme => {
    const count = (allText.match(new RegExp(theme, 'gi')) || []).length;
    if (count > maxCount) {
      maxCount = count;
      bestTheme = theme;
    }
  });
  
  if (bestTheme && maxCount > 1) {
    // Capitalize properly
    return bestTheme.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
  
  // Fallback: use the longest/most detailed topic
  if (topics.length > 0) {
    const bestTopic = topics.reduce((prev, current) => 
      current.title.length > prev.title.length ? current : prev
    );
    return bestTopic.title.length > 50 ? 
      bestTopic.title.substring(0, 47) + '...' : 
      bestTopic.title;
  }
  
  // Final fallback
  return 'Research Discussion Topics';
}

// Improved fallback function to extract meaningful topics from chat
function extractTopicsFromChat(messages: ChatMessage[]): Array<{title: string, content: string}> {
  const topics: Array<{title: string, content: string}> = [];
  
  messages.forEach((message) => {
    if (message.content.length < 50) return; // Skip very short messages
    
    // Extract structured outline content (Roman numerals, numbered lists)
    const outlineMatches = message.content.match(/(?:^\s*(?:I{1,3}|IV|V|VI{1,3}|IX|X|\d+\.|\-|\*)\s+)(.+?)(?=\n|$)/gm);
    if (outlineMatches && outlineMatches.length > 3) {
      outlineMatches.slice(0, 8).forEach((match, index) => {
        const cleanTitle = match.replace(/^\s*(?:I{1,3}|IV|V|VI{1,3}|IX|X|\d+\.|\-|\*)\s+/, '').trim();
        if (cleanTitle.length > 10 && cleanTitle.length < 100) {
          topics.push({
            title: cleanTitle,
            content: `Research area: ${cleanTitle}. Explore this topic in depth through academic investigation and analysis.`
          });
        }
      });
    }
    
    // Extract section headings (### format) but exclude numbered sections
    const headingMatches = message.content.match(/#{1,4}\s+(.+)/g);
    if (headingMatches) {
      headingMatches.slice(0, 6).forEach(match => {
        const cleanTitle = match.replace(/#{1,4}\s+/, '').trim();
        // Exclude numbered section headings and generic titles
        if (cleanTitle.length > 5 && cleanTitle.length < 80 &&
            !cleanTitle.match(/^\d+\.?$/) &&  // Exclude pure numbers like "1" or "1."
            !cleanTitle.match(/^\d+\.\d+/) && // Exclude numbered subsections like "1.1"
            !cleanTitle.match(/^[A-Za-z]\.$/) && // Exclude single letters like "A."
            cleanTitle !== 'Introduction' && cleanTitle !== 'Conclusion' &&
            cleanTitle !== 'Research Outline') {
          topics.push({
            title: cleanTitle,
            content: `Key research area: ${cleanTitle}. This topic offers multiple avenues for academic exploration and investigation.`
          });
        }
      });
    }
    
    // Extract technical terms and proper nouns for research topics
    if (message.content.includes('research') || message.content.includes('study') || message.content.includes('analysis')) {
      const technicalMatches = message.content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:in|of|for|and)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)*\b/g);
      if (technicalMatches) {
        technicalMatches
          .filter(match => 
            match.length > 8 && match.length < 60 && 
            !match.includes('User') && !match.includes('Hello') && 
            !match.includes('Generate') && !match.includes('Research Map')
          )
          .slice(0, 4)
          .forEach(match => {
            topics.push({
              title: match.trim(),
              content: `Academic research topic: ${match}. This area presents opportunities for comprehensive study and scholarly investigation.`
            });
          });
      }
    }
  });

  // If we found structured topics, use them; otherwise create a basic fallback
  if (topics.length > 0) {
    return topics.slice(0, 10); // Limit to 10 best topics
  }

  // Final fallback: create basic topics from message content
  const fallbackTopics = messages
    .filter(m => m.content.length > 30)
    .slice(0, 3)
    .map((message, index) => ({
      title: `Discussion Topic ${index + 1}`,
      content: message.content.length > 200 ? 
        message.content.substring(0, 200) + '...' : 
        message.content
    }));

  return fallbackTopics.length > 0 ? fallbackTopics : [{
    title: 'Conversation Analysis',
    content: 'Research topics and themes derived from the conversation for further academic exploration.'
  }];
}

