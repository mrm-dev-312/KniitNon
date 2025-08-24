'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Brain, Network, AlertTriangle, Copy, Download } from 'lucide-react';

interface SummaryDialogProps {
  selectedNodeIds: string[];
  selectedNodes: Array<{ id: string; title: string; content: string; type: string }>;
  trigger?: React.ReactNode;
}

type SummaryType = 'overview' | 'detailed' | 'connections' | 'conflicts';

interface GeneratedSummary {
  id: string;
  summary: string;
  summaryType: string;
  nodeCount: number;
  relationships: Array<{
    source: string;
    target: string;
    type: string;
    description: string;
  }>;
  conflicts?: Array<{
    nodes: string[];
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  keyInsights: string[];
  generatedAt: string;
}

const SummaryDialog: React.FC<SummaryDialogProps> = ({
  selectedNodeIds,
  selectedNodes,
  trigger,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [summaryType, setSummaryType] = useState<SummaryType>('overview');
  const [includeRelationships, setIncludeRelationships] = useState(true);
  const [includeConflicts, setIncludeConflicts] = useState(false);
  const [maxLength, setMaxLength] = useState(500);
  const [generatedSummary, setGeneratedSummary] = useState<GeneratedSummary | null>(null);

  const resetState = () => {
    setGeneratedSummary(null);
    setSummaryType('overview');
    setIncludeRelationships(true);
    setIncludeConflicts(false);
    setMaxLength(500);
  };

  const handleGenerateSummary = async () => {
    setIsLoading(true);
    try {
      const requestData = {
        nodeIds: selectedNodeIds,
        summaryType,
        includeRelationships,
        includeConflicts,
        maxLength,
      };

      const response = await fetch('/api/research/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (result.success) {
        setGeneratedSummary(result.summary);
      } else {
        throw new Error(result.error || 'Failed to generate summary');
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate summary');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySummary = () => {
    if (generatedSummary) {
      const summaryText = `# Research Summary\n\n${generatedSummary.summary}\n\n## Key Insights\n${generatedSummary.keyInsights.map(insight => `- ${insight}`).join('\n')}\n\nGenerated: ${new Date(generatedSummary.generatedAt).toLocaleString()}`;
      navigator.clipboard.writeText(summaryText);
      alert('Summary copied to clipboard!');
    }
  };

  const handleDownloadSummary = () => {
    if (generatedSummary) {
      const summaryText = `# Research Summary (${generatedSummary.summaryType})\n\nNodes: ${selectedNodes.map(n => n.title).join(', ')}\nGenerated: ${new Date(generatedSummary.generatedAt).toLocaleString()}\n\n## Summary\n\n${generatedSummary.summary}\n\n## Key Insights\n\n${generatedSummary.keyInsights.map(insight => `- ${insight}`).join('\n')}\n\n${generatedSummary.relationships.length > 0 ? `## Relationships\n\n${generatedSummary.relationships.map(rel => `- ${rel.source} → ${rel.target}: ${rel.description}`).join('\n')}\n\n` : ''}${generatedSummary.conflicts && generatedSummary.conflicts.length > 0 ? `## Conflicts & Debates\n\n${generatedSummary.conflicts.map(conflict => `- ${conflict.nodes.join(' vs ')}: ${conflict.description} (${conflict.severity} severity)`).join('\n')}` : ''}`;
      
      const blob = new Blob([summaryText], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `research-summary-${Date.now()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const getSummaryTypeIcon = (type: SummaryType) => {
    switch (type) {
      case 'overview': return <FileText className="h-4 w-4" />;
      case 'detailed': return <Brain className="h-4 w-4" />;
      case 'connections': return <Network className="h-4 w-4" />;
      case 'conflicts': return <AlertTriangle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-yellow-100 text-yellow-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" disabled={selectedNodeIds.length === 0}>
      <Brain className="h-4 w-4 mr-2" />
      Generate Summary ({selectedNodeIds.length})
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetState();
    }}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Research Summary</DialogTitle>
          <DialogDescription>
            Create an AI-powered summary of {selectedNodeIds.length} selected research nodes.
          </DialogDescription>
        </DialogHeader>

        {!generatedSummary ? (
          <div className="space-y-4">
            {/* Selected Nodes Display */}
            <div className="space-y-2">
              <Label>Selected Nodes ({selectedNodeIds.length})</Label>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-2 border rounded">
                {selectedNodes.map((node) => (
                  <Badge key={node.id} variant="secondary" className="text-xs">
                    {node.title}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Summary Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="summary-type">Summary Type</Label>
              <Select value={summaryType} onValueChange={(value: SummaryType) => setSummaryType(value)}>
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center">
                      {getSummaryTypeIcon(summaryType)}
                      <span className="ml-2 capitalize">{summaryType}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      Overview - High-level summary
                    </div>
                  </SelectItem>
                  <SelectItem value="detailed">
                    <div className="flex items-center">
                      <Brain className="h-4 w-4 mr-2" />
                      Detailed - In-depth analysis
                    </div>
                  </SelectItem>
                  <SelectItem value="connections">
                    <div className="flex items-center">
                      <Network className="h-4 w-4 mr-2" />
                      Connections - Focus on relationships
                    </div>
                  </SelectItem>
                  <SelectItem value="conflicts">
                    <div className="flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Conflicts - Highlight debates
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-relationships"
                  checked={includeRelationships}
                  onCheckedChange={(checked) => setIncludeRelationships(checked as boolean)}
                />
                <Label htmlFor="include-relationships">Include relationship analysis</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-conflicts"
                  checked={includeConflicts}
                  onCheckedChange={(checked) => setIncludeConflicts(checked as boolean)}
                />
                <Label htmlFor="include-conflicts">Highlight conflicts and debates</Label>
              </div>
            </div>

            {/* Length Selection */}
            <div className="space-y-2">
              <Label htmlFor="max-length">Summary Length</Label>
              <Select value={maxLength.toString()} onValueChange={(value) => setMaxLength(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue>{maxLength} words</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="200">Brief (200 words)</SelectItem>
                  <SelectItem value="500">Standard (500 words)</SelectItem>
                  <SelectItem value="1000">Detailed (1000 words)</SelectItem>
                  <SelectItem value="1500">Comprehensive (1500 words)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Content */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Generated Summary</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopySummary}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadSummary}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
              
              <div className="bg-muted/50 p-4 rounded-lg">
                <Textarea
                  value={generatedSummary.summary}
                  readOnly
                  className="min-h-[200px] border-0 bg-transparent resize-none"
                />
              </div>
            </div>

            {/* Key Insights */}
            {generatedSummary.keyInsights.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold">Key Insights</h4>
                <ul className="space-y-1">
                  {generatedSummary.keyInsights.map((insight, index) => (
                    <li key={index} className="text-sm flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Relationships */}
            {generatedSummary.relationships.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold">Relationships</h4>
                <div className="space-y-2">
                  {generatedSummary.relationships.map((rel, index) => (
                    <div key={index} className="text-sm bg-blue-50 p-2 rounded">
                      <strong>{rel.source}</strong> → <strong>{rel.target}</strong>
                      <p className="text-muted-foreground">{rel.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conflicts */}
            {generatedSummary.conflicts && generatedSummary.conflicts.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold">Conflicts & Debates</h4>
                <div className="space-y-2">
                  {generatedSummary.conflicts.map((conflict, index) => (
                    <div key={index} className="text-sm bg-red-50 p-2 rounded">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getSeverityColor(conflict.severity)}>
                          {conflict.severity} severity
                        </Badge>
                        <span className="font-medium">{conflict.nodes.join(' vs ')}</span>
                      </div>
                      <p className="text-muted-foreground">{conflict.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            {generatedSummary ? 'Close' : 'Cancel'}
          </Button>
          {!generatedSummary && (
            <Button onClick={handleGenerateSummary} disabled={isLoading || selectedNodeIds.length === 0}>
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Generate Summary
                </>
              )}
            </Button>
          )}
          {generatedSummary && (
            <Button onClick={() => setGeneratedSummary(null)}>
              Generate New Summary
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SummaryDialog;
