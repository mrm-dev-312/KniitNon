import { 
  convertToMarkdown, 
  convertToText, 
  generateFilename,
  downloadFile,
  ExportOptions 
} from '@/lib/export-utils';
import { OutlineNode } from '@/lib/stores/outline-store';

// Mock DOM methods for file download
const mockCreateElement = jest.fn();
const mockClick = jest.fn();
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();

Object.defineProperty(document, 'createElement', {
  writable: true,
  value: mockCreateElement,
});

Object.defineProperty(document.body, 'appendChild', {
  writable: true,
  value: mockAppendChild,
});

Object.defineProperty(document.body, 'removeChild', {
  writable: true,
  value: mockRemoveChild,
});

// Mock URL.createObjectURL and revokeObjectURL
const mockCreateObjectURL = jest.fn(() => 'mock-blob-url');
const mockRevokeObjectURL = jest.fn();

Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: mockCreateObjectURL,
});

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: mockRevokeObjectURL,
});

describe('Export Utilities', () => {
  const testNodes: OutlineNode[] = [
    {
      id: '1',
      title: 'Introduction',
      content: 'This is the introduction section with important background information.',
      type: 'topic',
      order: 0,
      metadata: {
        source: 'Research Paper 2023',
        confidence: 0.9
      }
    },
    {
      id: '2',
      title: 'Main Topic',
      content: 'This section covers the main topic in detail.',
      type: 'topic',
      order: 1,
      parentId: '1',
      metadata: {
        source: 'Academic Journal',
        confidence: 0.8,
        relationships: ['3', '4']
      }
    },
    {
      id: '3',
      title: 'Subtopic A',
      content: 'First subtopic with specific details.',
      type: 'subtopic',
      order: 2,
      parentId: '2'
    },
    {
      id: '4',
      title: 'Detail Point',
      content: 'Specific detail information.',
      type: 'detail',
      order: 3,
      parentId: '3'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock element
    const mockElement = {
      href: '',
      download: '',
      click: mockClick,
      style: { display: '' }
    };
    
    mockCreateElement.mockReturnValue(mockElement);
  });

  describe('convertToMarkdown', () => {
    it('should convert nodes to markdown format with content', () => {
      const options: ExportOptions = { format: 'markdown', includeContent: true, includeMetadata: false };
      const result = convertToMarkdown(testNodes, undefined, options);
      
      expect(result).toContain('# Research Outline');
      expect(result).toContain('## Introduction');
      expect(result).toContain('## Main Topic');  // Topics are level 2
      expect(result).toContain('### Subtopic A');  // Subtopics are level 3
      expect(result).toContain('#### Detail Point'); // Details are level 4
      expect(result).toContain('This is the introduction section');
      expect(result).toContain('This section covers the main topic');
    });

    it('should convert nodes to markdown format without content', () => {
      const options: ExportOptions = { format: 'markdown', includeContent: false, includeMetadata: false };
      const result = convertToMarkdown(testNodes, undefined, options);
      
      expect(result).toContain('# Research Outline');
      expect(result).toContain('## Introduction');
      expect(result).toContain('## Main Topic');  // Topics are level 2
      expect(result).not.toContain('This is the introduction section');
      expect(result).not.toContain('This section covers the main topic');
    });

    it('should include metadata when requested', () => {
      const options: ExportOptions = { format: 'markdown', includeContent: true, includeMetadata: true };
      const result = convertToMarkdown(testNodes, undefined, options);
      
      expect(result).toContain('- Source: Research Paper 2023');
      expect(result).toContain('- Confidence: 0.9');
      expect(result).toContain('- Related to: 3, 4');
    });

    it('should handle empty nodes array', () => {
      const options: ExportOptions = { format: 'markdown', includeContent: true, includeMetadata: false };
      const result = convertToMarkdown([], undefined, options);
      
      expect(result).toContain('# Research Outline');
    });

    it('should sort nodes by order', () => {
      const unorderedNodes = [...testNodes].reverse(); // Reverse order
      const options: ExportOptions = { format: 'markdown', includeContent: false, includeMetadata: false };
      const result = convertToMarkdown(unorderedNodes, undefined, options);
      
      const lines = result.split('\n').filter((line: string) => line.startsWith('#'));
      expect(lines[1]).toContain('Introduction'); // Should be first after title
      expect(lines[2]).toContain('Main Topic');   // Main Topic should be second
      expect(lines[3]).toContain('Subtopic A');   // Subtopic A should be third  
      expect(lines[4]).toContain('Detail Point'); // Detail Point should be fourth
    });
  });

  describe('convertToText', () => {
    it('should convert nodes to plain text format with content', () => {
      const options: ExportOptions = { format: 'txt', includeContent: true, includeMetadata: false };
      const result = convertToText(testNodes, undefined, options);
      
      expect(result).toContain('RESEARCH OUTLINE');
      expect(result).toContain('Introduction');
      expect(result).toContain('Main Topic');
      expect(result).toContain('Subtopic A');
      expect(result).toContain('Detail Point');
      expect(result).toContain('This is the introduction section');
    });

    it('should convert nodes to plain text format without content', () => {
      const options: ExportOptions = { format: 'txt', includeContent: false, includeMetadata: false };
      const result = convertToText(testNodes, undefined, options);
      
      expect(result).toContain('RESEARCH OUTLINE');
      expect(result).toContain('Introduction');
      expect(result).not.toContain('This is the introduction section');
    });

    it('should include metadata when requested', () => {
      const options: ExportOptions = { format: 'txt', includeContent: true, includeMetadata: true };
      const result = convertToText(testNodes, undefined, options);
      
      expect(result).toContain('Source: Research Paper 2023');
      expect(result).toContain('Confidence: 0.9');
    });

    it('should handle empty nodes array', () => {
      const options: ExportOptions = { format: 'txt', includeContent: true, includeMetadata: false };
      const result = convertToText([], undefined, options);
      
      expect(result).toContain('RESEARCH OUTLINE');
    });
  });

  describe('generateFilename', () => {
    it('should generate filename with timestamp', () => {
      const filename = generateFilename('outline', 'md');
      
      expect(filename).toMatch(/^outline_\d{8}T\d{6}\.md$/);
    });

    it('should generate filename with custom prefix', () => {
      const filename = generateFilename('research_notes', 'txt');
      
      expect(filename).toMatch(/^research_notes_\d{8}T\d{6}\.txt$/);
    });

    it('should handle different extensions', () => {
      const mdFilename = generateFilename('test', 'md');
      const txtFilename = generateFilename('test', 'txt');
      const pdfFilename = generateFilename('test', 'pdf');
      
      expect(mdFilename).toMatch(/\.md$/);
      expect(txtFilename).toMatch(/\.txt$/);
      expect(pdfFilename).toMatch(/\.pdf$/);
    });

    it('should generate unique filenames', async () => {
      const filename1 = generateFilename('test', 'md');
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1000));
      const filename2 = generateFilename('test', 'md');
      
      expect(filename1).not.toBe(filename2);
    });
  });

  describe('downloadFile', () => {
    it('should create and trigger download for markdown file', () => {
      const content = '# Test Content\n\nThis is a test.';
      const filename = 'test.md';
      
      downloadFile(content, filename, 'text/markdown;charset=utf-8');
      
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockCreateObjectURL).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'text/markdown;charset=utf-8'
        })
      );
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('should create and trigger download for plain text file', () => {
      const content = 'Plain text content';
      const filename = 'test.txt';
      
      downloadFile(content, filename, 'text/plain;charset=utf-8');
      
      expect(mockCreateObjectURL).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'text/plain;charset=utf-8'
        })
      );
    });

    it('should set correct element properties', () => {
      const content = 'Test content';
      const filename = 'test.md';
      
      downloadFile(content, filename, 'text/markdown;charset=utf-8');
      
      const mockElement = mockCreateElement.mock.results[0].value;
      expect(mockElement.href).toBe('mock-blob-url');
      expect(mockElement.download).toBe(filename);
    });

    it('should handle different MIME types', () => {
      const mimeTypes = [
        'text/markdown;charset=utf-8',
        'text/plain;charset=utf-8',
        'application/json'
      ];

      mimeTypes.forEach((mimeType) => {
        jest.clearAllMocks();
        downloadFile('content', 'test.txt', mimeType);
        
        expect(mockCreateObjectURL).toHaveBeenCalledWith(
          expect.objectContaining({ type: mimeType })
        );
      });
    });
  });

  describe('Integration Tests', () => {
    it('should export and download markdown file end-to-end', () => {
      const options: ExportOptions = { format: 'markdown', includeContent: true, includeMetadata: false };
      const markdownContent = convertToMarkdown(testNodes, undefined, options);
      const filename = generateFilename('test_outline', 'md');
      
      downloadFile(markdownContent, filename, 'text/markdown;charset=utf-8');
      
      expect(markdownContent).toContain('# Research Outline');
      expect(markdownContent).toContain('## Introduction');
      expect(filename).toMatch(/^test_outline_\d{8}T\d{6}\.md$/);
      expect(mockClick).toHaveBeenCalled();
    });

    it('should export and download plain text file end-to-end', () => {
      const options: ExportOptions = { format: 'txt', includeContent: false, includeMetadata: false };
      const textContent = convertToText(testNodes, undefined, options);
      const filename = generateFilename('outline', 'txt');
      
      downloadFile(textContent, filename, 'text/plain;charset=utf-8');
      
      expect(textContent).toContain('RESEARCH OUTLINE');
      expect(textContent).toContain('Introduction');
      expect(filename).toMatch(/\.txt$/);
      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle nodes with missing content', () => {
      const nodesWithoutContent: OutlineNode[] = [
        { id: '1', title: 'Title Only', type: 'topic', order: 0 }
      ];
      
      const markdownOptions: ExportOptions = { format: 'markdown', includeContent: true, includeMetadata: false };
      const textOptions: ExportOptions = { format: 'txt', includeContent: true, includeMetadata: false };
      
      const markdown = convertToMarkdown(nodesWithoutContent, undefined, markdownOptions);
      const plainText = convertToText(nodesWithoutContent, undefined, textOptions);
      
      expect(markdown).toContain('## Title Only');
      expect(plainText).toContain('Title Only');
    });

    it('should handle nodes with special characters in titles', () => {
      const specialNodes: OutlineNode[] = [
        { 
          id: '1', 
          title: 'Title with "quotes" & special chars <>', 
          content: 'Content with **markdown** and *emphasis*',
          type: 'topic', 
          order: 0 
        }
      ];
      
      const markdownOptions: ExportOptions = { format: 'markdown', includeContent: true, includeMetadata: false };
      const textOptions: ExportOptions = { format: 'txt', includeContent: true, includeMetadata: false };
      
      const markdown = convertToMarkdown(specialNodes, undefined, markdownOptions);
      const plainText = convertToText(specialNodes, undefined, textOptions);
      
      expect(markdown).toContain('Title with "quotes" & special chars <>');
      expect(plainText).toContain('Title with "quotes" & special chars <>');
    });

    it('should handle very long content', () => {
      const longContent = 'A'.repeat(10000);
      const longNodes: OutlineNode[] = [
        { id: '1', title: 'Long Content', content: longContent, type: 'topic', order: 0 }
      ];
      
      const markdownOptions: ExportOptions = { format: 'markdown', includeContent: true, includeMetadata: false };
      const textOptions: ExportOptions = { format: 'txt', includeContent: true, includeMetadata: false };
      
      const markdown = convertToMarkdown(longNodes, undefined, markdownOptions);
      const plainText = convertToText(longNodes, undefined, textOptions);
      
      expect(markdown).toContain(longContent);
      expect(plainText).toContain(longContent);
    });
  });
});
