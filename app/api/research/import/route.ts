import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Force dynamic rendering for this route since it uses request.headers
export const dynamic = 'force-dynamic';

// Validation schema for import requests
const ImportRequestSchema = z.object({
  type: z.enum(['text', 'link', 'image']),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  url: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  source: z.string().optional(),
  parentNodeId: z.string().optional(), // For adding as a child of existing node
  tags: z.array(z.string()).optional(),
});

type ImportRequest = z.infer<typeof ImportRequestSchema>;

interface ImportedNode {
  id: string;
  title: string;
  content: string;
  type: 'topic' | 'subtopic' | 'detail';
  connections: string[];
  source?: string;
  url?: string;
  imageUrl?: string;
  tags?: string[];
  isImported: boolean;
  importedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the request
    const validatedData = ImportRequestSchema.parse(body);
    
    // Generate a unique ID for the imported node
    const nodeId = `imported_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Determine node type based on content and context
    let nodeType: 'topic' | 'subtopic' | 'detail' = 'detail';
    if (validatedData.parentNodeId) {
      nodeType = 'detail'; // Children are always details
    } else if (validatedData.content.length > 500) {
      nodeType = 'topic'; // Longer content suggests main topic
    } else {
      nodeType = 'subtopic'; // Default for medium content
    }
    
    // Create the imported node
    const importedNode: ImportedNode = {
      id: nodeId,
      title: validatedData.title,
      content: validatedData.content,
      type: nodeType,
      connections: validatedData.parentNodeId ? [validatedData.parentNodeId] : [],
      source: validatedData.source || `Imported ${validatedData.type}`,
      url: validatedData.url,
      imageUrl: validatedData.imageUrl,
      tags: validatedData.tags || [],
      isImported: true,
      importedAt: new Date().toISOString(),
    };
    
    // TODO: In a real application, save to database
    // For now, we'll return the node for client-side storage
    
    return NextResponse.json({
      success: true,
      node: importedNode,
      message: `Successfully imported ${validatedData.type}: ${validatedData.title}`,
    }, { status: 201 });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
      }, { status: 400 });
    }
    
    console.error('Error importing node:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to import node',
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Return list of imported nodes (for future use)
  try {
    // TODO: Fetch from database
    // For now, return empty array
    return NextResponse.json({
      success: true,
      importedNodes: [],
      message: 'Retrieved imported nodes',
    });
    
  } catch (error) {
    console.error('Error fetching imported nodes:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch imported nodes',
    }, { status: 500 });
  }
}
