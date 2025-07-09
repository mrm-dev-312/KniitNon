import { OpenAIStream, StreamingTextResponse } from 'ai';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// IMPORTANT! Set the runtime to edge
export const runtime = 'edge';

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
  // Extract the messages from the body of the request
  const { messages } = await req.json();

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
    response = await aiClient.chat.completions.create({
      model: modelName,
      stream: true,
      messages: messages,
    });
    const stream = OpenAIStream(response);
    return new StreamingTextResponse(stream);
  }
}
