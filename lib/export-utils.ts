import { OutlineNode } from '@/lib/stores/outline-store';

export interface ExportOptions {
  format: 'markdown' | 'txt';
  includeContent: boolean;
  includeMetadata: boolean;
}

/**
 * Converts outline nodes to Markdown format
 */
export function convertToMarkdown(
  nodes: OutlineNode[], 
  outlineContent?: string,
  options: ExportOptions = { format: 'markdown', includeContent: true, includeMetadata: false }
): string {
  let markdown = '';
  
  // Add title
  markdown += '# Research Outline\n\n';
  
  // Add generated timestamp
  markdown += `*Generated on ${new Date().toLocaleString()}*\n\n`;
  
  // Add nodes in order
  const sortedNodes = nodes.sort((a, b) => a.order - b.order);
  
  for (const node of sortedNodes) {
    // Determine heading level based on type
    const level = getMarkdownLevel(node.type);
    const heading = '#'.repeat(level);
    
    markdown += `${heading} ${node.title}\n\n`;
    
    // Add node content if available and requested
    if (options.includeContent && node.content) {
      markdown += `${node.content}\n\n`;
    }
    
    // Add metadata if requested
    if (options.includeMetadata && node.metadata) {
      markdown += '**Metadata:**\n';
      if (node.metadata.source) {
        markdown += `- Source: ${node.metadata.source}\n`;
      }
      if (node.metadata.confidence) {
        markdown += `- Confidence: ${node.metadata.confidence}\n`;
      }
      if (node.metadata.relationships?.length) {
        markdown += `- Related to: ${node.metadata.relationships.join(', ')}\n`;
      }
      markdown += '\n';
    }
  }
  
  // Add generated outline content if available
  if (options.includeContent && outlineContent) {
    markdown += '---\n\n';
    markdown += '## Generated Content\n\n';
    if (typeof outlineContent === 'string') {
      markdown += outlineContent;
    } else {
      markdown += '```json\n' + JSON.stringify(outlineContent, null, 2) + '\n```';
    }
    markdown += '\n\n';
  }
  
  return markdown;
}

/**
 * Converts outline nodes to plain text format
 */
export function convertToText(
  nodes: OutlineNode[], 
  outlineContent?: string,
  options: ExportOptions = { format: 'txt', includeContent: true, includeMetadata: false }
): string {
  let text = '';
  
  // Add title
  text += 'RESEARCH OUTLINE\n';
  text += '================\n\n';
  
  // Add generated timestamp
  text += `Generated on ${new Date().toLocaleString()}\n\n`;
  
  // Add nodes in order
  const sortedNodes = nodes.sort((a, b) => a.order - b.order);
  
  for (const node of sortedNodes) {
    // Determine indentation based on type
    const indent = getTextIndent(node.type);
    
    text += `${indent}${node.title}\n`;
    
    // Add node content if available and requested
    if (options.includeContent && node.content) {
      const contentLines = node.content.split('\n');
      for (const line of contentLines) {
        text += `${indent}  ${line}\n`;
      }
    }
    
    // Add metadata if requested
    if (options.includeMetadata && node.metadata) {
      text += `${indent}  [Metadata]\n`;
      if (node.metadata.source) {
        text += `${indent}    Source: ${node.metadata.source}\n`;
      }
      if (node.metadata.confidence) {
        text += `${indent}    Confidence: ${node.metadata.confidence}\n`;
      }
      if (node.metadata.relationships?.length) {
        text += `${indent}    Related to: ${node.metadata.relationships.join(', ')}\n`;
      }
    }
    
    text += '\n';
  }
  
  // Add generated outline content if available
  if (options.includeContent && outlineContent) {
    text += '\n' + '='.repeat(50) + '\n';
    text += 'GENERATED CONTENT\n';
    text += '='.repeat(50) + '\n\n';
    if (typeof outlineContent === 'string') {
      text += outlineContent;
    } else {
      text += JSON.stringify(outlineContent, null, 2);
    }
    text += '\n\n';
  }
  
  return text;
}

/**
 * Downloads content as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Get markdown heading level based on node type
 */
function getMarkdownLevel(type: OutlineNode['type']): number {
  switch (type) {
    case 'topic':
      return 2;
    case 'subtopic':
      return 3;
    case 'detail':
      return 4;
    default:
      return 3;
  }
}

/**
 * Get text indentation based on node type
 */
function getTextIndent(type: OutlineNode['type']): string {
  switch (type) {
    case 'topic':
      return '';
    case 'subtopic':
      return '  ';
    case 'detail':
      return '    ';
    default:
      return '  ';
  }
}

/**
 * Generate filename with timestamp
 */
export function generateFilename(baseName: string, extension: string): string {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
  return `${baseName}_${timestamp}.${extension}`;
}
