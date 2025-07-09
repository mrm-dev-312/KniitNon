'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Save,
  Download
} from 'lucide-react';

interface TextEditorProps {
  content?: string;
  onContentChange?: (content: string) => void;
  onSave?: (content: string) => void;
  className?: string;
}

type FormatCommand = 
  | 'bold' 
  | 'italic' 
  | 'underline' 
  | 'justifyLeft' 
  | 'justifyCenter' 
  | 'justifyRight'
  | 'insertUnorderedList'
  | 'insertOrderedList'
  | 'formatBlock';

/**
 * LongFormTextEditor component provides a rich text editing interface
 * for writing and formatting long-form content with AI assistance integration.
 */
const LongFormTextEditor: React.FC<TextEditorProps> = ({
  content = '',
  onContentChange,
  onSave,
  className = '',
}) => {
  const [editorContent, setEditorContent] = useState(content);
  const [wordCount, setWordCount] = useState(0);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = content;
      updateWordCount(content);
    }
  }, [content]);

  const updateWordCount = (text: string) => {
    const words = text.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  };

  const handleInput = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setEditorContent(newContent);
      updateWordCount(newContent);
      onContentChange?.(newContent);
    }
  };

  const executeCommand = (command: FormatCommand, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const handleHeading = (level: number) => {
    executeCommand('formatBlock', `h${level}`);
  };

  const handleSave = () => {
    onSave?.(editorContent);
  };

  const handleExport = () => {
    const blob = new Blob([editorContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`w-full border rounded-lg bg-card ${className}`}>
      {/* Toolbar */}
      <div className="border-b p-3 flex flex-wrap gap-2">
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => executeCommand('bold')}
            className="h-8 w-8 p-0"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => executeCommand('italic')}
            className="h-8 w-8 p-0"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => executeCommand('underline')}
            className="h-8 w-8 p-0"
          >
            <Underline className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-border" />

        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleHeading(1)}
            className="h-8 w-8 p-0"
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleHeading(2)}
            className="h-8 w-8 p-0"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleHeading(3)}
            className="h-8 w-8 p-0"
          >
            <Heading3 className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-border" />

        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => executeCommand('justifyLeft')}
            className="h-8 w-8 p-0"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => executeCommand('justifyCenter')}
            className="h-8 w-8 p-0"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => executeCommand('justifyRight')}
            className="h-8 w-8 p-0"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-border" />

        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => executeCommand('insertUnorderedList')}
            className="h-8 w-8 p-0"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => executeCommand('insertOrderedList')}
            className="h-8 w-8 p-0"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => executeCommand('formatBlock', 'blockquote')}
            className="h-8 w-8 p-0"
          >
            <Quote className="h-4 w-4" />
          </Button>
        </div>

        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          className="min-h-[500px] p-6 focus:outline-none prose prose-sm max-w-none"
          style={{ 
            lineHeight: '1.8',
            fontSize: '16px'
          }}
        />
        
        {/* Placeholder text when empty */}
        {!editorContent && (
          <div className="absolute top-6 left-6 text-muted-foreground pointer-events-none">
            Start writing your long-form content here...
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="border-t px-6 py-3 flex justify-between items-center text-sm text-muted-foreground">
        <span>Words: {wordCount}</span>
        <span>Ready for AI assistance</span>
      </div>
    </div>
  );
};

export default LongFormTextEditor;
