import { OpenAIStream, StreamingTextResponse } from 'ai';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const aiProvider = process.env.AI_PROVIDER || 'openai'; // Default to openai

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

export async function POST(req: Request) {
  try {
    // Extract the messages from the body of the request
    const { messages } = await req.json();

    // Check if API keys are missing and provide a mock response for testing
    if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
      // Mock response for testing when API keys are not available
      const lastMessage = messages[messages.length - 1];
      const mockResponse = `Thank you for your message: "${lastMessage.content}". This is a mock response because no API keys are configured. To enable real AI responses, please add your OPENAI_API_KEY or GEMINI_API_KEY to your .env.local file.`;
      
      // Return a simple text response instead of a stream for testing
      return new Response(mockResponse, {
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

  let response;

    if (aiProvider === 'gemini') {
      const chat = aiClient.startChat({
        history: messages.map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        })),
        generationConfig: {
          maxOutputTokens: 2000,
        },
      });
      response = await chat.sendMessageStream(messages[messages.length - 1].content);
      const stream = response.stream.pipeThrough(new TextEncoderStream());
      return new StreamingTextResponse(stream);
    } else {
      // Research-assistant steering system message
      const systemMessage = {
        role: 'system' as const,
        content: 'You are a Research Assistant. Start at a clear, neutral, Wikipedia-level explanation, then progressively guide the user into deeper research topics. Ask one concise probing question at a time to clarify intent. Structure responses with: brief overview, 2-4 key subtopics, and 1-2 suggested next questions. Avoid filler. When appropriate, propose how to turn the topic into research nodes (topic → subtopic → detail).'
      };

      response = await aiClient.chat.completions.create({
        model: modelName,
        stream: true,
        messages: [systemMessage, ...messages],
      });
      const stream = OpenAIStream(response);
      return new StreamingTextResponse(stream);
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`, {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}

