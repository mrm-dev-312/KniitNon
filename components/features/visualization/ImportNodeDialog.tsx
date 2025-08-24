'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, Plus, FileText, Link, Image, Upload } from 'lucide-react';

interface ImportNodeDialogProps {
  onImportSuccess: (node: any) => void;
  parentNodeId?: string;
  trigger?: React.ReactNode;
}

type ImportType = 'text' | 'link' | 'image';

const ImportNodeDialog: React.FC<ImportNodeDialogProps> = ({
  onImportSuccess,
  parentNodeId,
  trigger,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [importType, setImportType] = useState<ImportType>('text');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    url: '',
    imageUrl: '',
    source: '',
    tags: [] as string[],
  });
  const [currentTag, setCurrentTag] = useState('');

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      url: '',
      imageUrl: '',
      source: '',
      tags: [],
    });
    setCurrentTag('');
    setImportType('text');
  };

  const handleAddTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()],
      }));
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && currentTag.trim()) {
      e.preventDefault();
      handleAddTag();
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) return 'Title is required';
    if (!formData.content.trim()) return 'Content is required';
    if (importType === 'link' && !formData.url.trim()) return 'URL is required for links';
    if (importType === 'image' && !formData.imageUrl.trim()) return 'Image URL is required for images';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
      return;
    }

    setIsLoading(true);
    try {
      const requestData = {
        type: importType,
        title: formData.title,
        content: formData.content,
        ...(formData.url && { url: formData.url }),
        ...(formData.imageUrl && { imageUrl: formData.imageUrl }),
        ...(formData.source && { source: formData.source }),
        ...(formData.tags.length > 0 && { tags: formData.tags }),
        ...(parentNodeId && { parentNodeId }),
      };

      const response = await fetch('/api/research/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (result.success) {
        onImportSuccess(result.node);
        setIsOpen(false);
        resetForm();
      } else {
        throw new Error(result.error || 'Failed to import node');
      }
    } catch (error) {
      console.error('Error importing node:', error);
      alert(error instanceof Error ? error.message : 'Failed to import node');
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeIcon = (type: ImportType) => {
    switch (type) {
      case 'text': return <FileText className="h-4 w-4" />;
      case 'link': return <Link className="h-4 w-4" />;
      case 'image': return <Image className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Upload className="h-4 w-4 mr-2" />
      Import Node
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Research Node</DialogTitle>
          <DialogDescription>
            Add custom content to your research graph from text, links, or images.
            {parentNodeId && " This will be added as a child node."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Import Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="import-type">Content Type</Label>
            <Select value={importType} onValueChange={(value: ImportType) => setImportType(value)}>
              <SelectTrigger>
                <SelectValue>
                  <div className="flex items-center">
                    {getTypeIcon(importType)}
                    <span className="ml-2 capitalize">{importType}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Text Content
                  </div>
                </SelectItem>
                <SelectItem value="link">
                  <div className="flex items-center">
                    <Link className="h-4 w-4 mr-2" />
                    Web Link
                  </div>
                </SelectItem>
                <SelectItem value="image">
                  <div className="flex items-center">
                    <Image className="h-4 w-4 mr-2" />
                    Image
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter a descriptive title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>

          {/* URL field for links */}
          {importType === 'link' && (
            <div className="space-y-2">
              <Label htmlFor="url">URL *</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com"
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              />
            </div>
          )}

          {/* Image URL field for images */}
          {importType === 'image' && (
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL *</Label>
              <Input
                id="imageUrl"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={formData.imageUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
              />
            </div>
          )}

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">
              Content * 
              {importType === 'link' && ' (Description or summary)'}
              {importType === 'image' && ' (Description or caption)'}
            </Label>
            <Textarea
              id="content"
              placeholder={
                importType === 'text' ? 'Enter your research content...' :
                importType === 'link' ? 'Describe this link and its relevance...' :
                'Describe this image and its significance...'
              }
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              rows={4}
            />
          </div>

          {/* Source */}
          <div className="space-y-2">
            <Label htmlFor="source">Source (Optional)</Label>
            <Input
              id="source"
              placeholder="e.g., Book, Article, Website, Personal Notes"
              value={formData.source}
              onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (Optional)</Label>
            <div className="flex space-x-2">
              <Input
                id="tags"
                placeholder="Add a tag and press Enter"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button type="button" size="sm" onClick={handleAddTag} disabled={!currentTag.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import Node
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportNodeDialog;
