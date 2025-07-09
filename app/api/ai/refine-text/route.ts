import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { TEXT_REFINEMENT_PROMPT } from '@/lib/prompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type RefinementType = 'expand' | 'refine' | 'rephrase' | 'academic_upgrade' | 'simplify';

interface RefinementRequest {
  text: string;
  type: RefinementType;
  instructions?: string;
  targetLength?: number;
  tone?: 'academic' | 'professional' | 'casual';
}

export async function POST(request: NextRequest) {
  try {
    const body: RefinementRequest = await request.json();
    const { text, type, instructions, targetLength, tone = 'academic' } = body;

    // Validate required parameters
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text content is required' },
        { status: 400 }
      );
    }

    if (!type || !['expand', 'refine', 'rephrase', 'academic_upgrade', 'simplify'].includes(type)) {
      return NextResponse.json(
        { error: 'Valid refinement type is required (expand, refine, rephrase, academic_upgrade, simplify)' },
        { status: 400 }
      );
    }

    // Create specific prompt based on refinement type
    const userPrompt = createRefinementPrompt(text, type, instructions, targetLength, tone);

    // Generate refined content using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        TEXT_REFINEMENT_PROMPT,
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.6, // Slightly lower for more controlled refinement
      max_tokens: calculateMaxTokens(text, type, targetLength),
    });

    const refinedContent = completion.choices[0].message.content;
    
    if (!refinedContent) {
      throw new Error('No content generated from OpenAI');
    }

    // Parse the response to extract refined text and explanation
    const { improvedText, explanation, suggestions } = parseRefinementResponse(refinedContent);

    // Calculate improvement metrics
    const metrics = calculateImprovementMetrics(text, improvedText);

    const response = {
      originalText: text,
      improvedText,
      explanation,
      suggestions,
      refinementType: type,
      metadata: {
        generatedAt: new Date().toISOString(),
        tone,
        targetLength,
        instructions,
        estimatedTokens: completion.usage?.total_tokens || 0
      },
      metrics
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error refining text:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to refine text',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Create a specific prompt based on the refinement type
 */
function createRefinementPrompt(
  text: string, 
  type: RefinementType, 
  instructions?: string, 
  targetLength?: number, 
  tone?: string
): string {
  let basePrompt = `Please ${type.replace('_', ' ')} the following text:\n\n"${text}"\n\n`;

  switch (type) {
    case 'expand':
      basePrompt += `Add depth, examples, analysis, or supporting details to make the content more comprehensive. `;
      if (targetLength) {
        basePrompt += `Target approximately ${targetLength} words. `;
      }
      break;
    
    case 'refine':
      basePrompt += `Improve clarity, flow, word choice, and sentence structure while maintaining the original meaning. `;
      break;
    
    case 'rephrase':
      basePrompt += `Maintain the exact meaning while improving expression and ${tone} tone. `;
      break;
    
    case 'academic_upgrade':
      basePrompt += `Enhance scholarly tone, add academic rigor, and use appropriate terminology for academic writing. `;
      break;
    
    case 'simplify':
      basePrompt += `Make complex ideas more accessible without losing precision or important details. `;
      break;
  }

  if (instructions) {
    basePrompt += `\n\nSpecial instructions: ${instructions}`;
  }

  basePrompt += `\n\nPlease provide your response in the following format:
IMPROVED TEXT:
[Your improved version here]

EXPLANATION:
[Brief explanation of the changes made]

SUGGESTIONS:
[Any additional suggestions for further improvement]`;

  return basePrompt;
}

/**
 * Calculate appropriate max tokens based on refinement type and target length
 */
function calculateMaxTokens(originalText: string, type: RefinementType, targetLength?: number): number {
  const originalLength = originalText.split(' ').length;
  
  switch (type) {
    case 'expand':
      return targetLength ? Math.max(targetLength * 1.5, 1000) : originalLength * 3;
    case 'refine':
    case 'rephrase':
      return Math.max(originalLength * 1.5, 500);
    case 'academic_upgrade':
      return Math.max(originalLength * 2, 800);
    case 'simplify':
      return Math.max(originalLength * 1.2, 400);
    default:
      return 1000;
  }
}

/**
 * Parse the refinement response to extract components
 */
function parseRefinementResponse(response: string): {
  improvedText: string;
  explanation: string;
  suggestions: string[];
} {
  const sections = response.split(/(?:IMPROVED TEXT:|EXPLANATION:|SUGGESTIONS:)/i);
  
  let improvedText = '';
  let explanation = '';
  let suggestions: string[] = [];

  if (sections.length >= 2) {
    improvedText = sections[1]?.trim() || '';
  }
  
  if (sections.length >= 3) {
    explanation = sections[2]?.trim() || '';
  }
  
  if (sections.length >= 4) {
    const suggestionsText = sections[3]?.trim() || '';
    suggestions = suggestionsText
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('-'))
      .map(s => s.replace(/^[-•]\s*/, ''));
  }

  // Fallback if parsing fails
  if (!improvedText) {
    improvedText = response;
    explanation = 'Text has been refined according to your specifications.';
    suggestions = ['Review the changes and make any additional adjustments as needed.'];
  }

  return { improvedText, explanation, suggestions };
}

/**
 * Calculate improvement metrics comparing original and improved text
 */
function calculateImprovementMetrics(originalText: string, improvedText: string) {
  const originalWords = originalText.split(/\s+/).filter(w => w.length > 0);
  const improvedWords = improvedText.split(/\s+/).filter(w => w.length > 0);
  
  const originalSentences = originalText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const improvedSentences = improvedText.split(/[.!?]+/).filter(s => s.trim().length > 0);

  return {
    originalWordCount: originalWords.length,
    improvedWordCount: improvedWords.length,
    wordCountChange: improvedWords.length - originalWords.length,
    wordCountChangePercent: Math.round(((improvedWords.length - originalWords.length) / originalWords.length) * 100),
    originalSentenceCount: originalSentences.length,
    improvedSentenceCount: improvedSentences.length,
    averageWordsPerSentence: {
      original: Math.round(originalWords.length / originalSentences.length),
      improved: Math.round(improvedWords.length / improvedSentences.length)
    },
    readabilityImprovement: calculateReadabilityScore(improvedText) - calculateReadabilityScore(originalText)
  };
}

/**
 * Simple readability score calculation (approximation)
 */
function calculateReadabilityScore(text: string): number {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const complexWords = words.filter(w => w.length > 6).length;
  
  if (sentences.length === 0) return 0;
  
  const avgWordsPerSentence = words.length / sentences.length;
  const complexWordRatio = complexWords / words.length;
  
  // Simplified readability score (higher is better)
  return Math.max(0, 100 - (avgWordsPerSentence * 1.015) - (complexWordRatio * 84.6));
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'Text refinement API is ready',
    supportedTypes: ['expand', 'refine', 'rephrase', 'academic_upgrade', 'simplify'],
    supportedTones: ['academic', 'professional', 'casual'],
    usage: {
      endpoint: '/api/ai/refine-text',
      method: 'POST',
      requiredFields: ['text', 'type'],
      optionalFields: ['instructions', 'targetLength', 'tone']
    }
  });
}
