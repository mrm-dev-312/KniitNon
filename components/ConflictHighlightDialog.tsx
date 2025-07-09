'use client';

import React, { useState, useEffect } from 'react';
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
import { AlertTriangle, Brain, Search, Eye, EyeOff, Filter } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface ConflictHighlightDialogProps {
  selectedNodeIds: string[];
  selectedNodes: Array<{ id: string; title: string; content: string; type: string }>;
  trigger?: React.ReactNode;
  onConflictsDetected?: (conflicts: ConflictHighlight[]) => void;
}

interface ConflictHighlight {
  id: string;
  nodeId: string;
  nodeTitle: string;
  conflictType: 'methodological' | 'empirical' | 'theoretical' | 'interpretive' | 'unresolved';
  severity: 'low' | 'medium' | 'high';
  description: string;
  textSegment: string;
  relatedNodes?: string[];
  sources: string[];
  keywords: string[];
  suggestedResolution?: string;
  lastUpdated: string;
}

interface ConflictAnalysisResult {
  nodeId: string;
  totalConflicts: number;
  conflictsByType: Record<string, number>;
  conflictsBySeverity: Record<string, number>;
  highlights: ConflictHighlight[];
  unresolvedQuestions: string[];
  suggestedInvestigations: string[];
  analysisDate: string;
}

type AnalysisType = 'internal' | 'cross-node' | 'comprehensive';
type SeverityThreshold = 'low' | 'medium' | 'high';

const ConflictHighlightDialog: React.FC<ConflictHighlightDialogProps> = ({
  selectedNodeIds,
  selectedNodes,
  trigger,
  onConflictsDetected,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisType, setAnalysisType] = useState<AnalysisType>('comprehensive');
  const [severityThreshold, setSeverityThreshold] = useState<SeverityThreshold>('low');
  const [includeUnresolved, setIncludeUnresolved] = useState(true);
  const [includeBiases, setIncludeBiases] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<ConflictAnalysisResult[]>([]);
  const [selectedConflictTypes, setSelectedConflictTypes] = useState<string[]>(['all']);
  const [showDetails, setShowDetails] = useState<{ [key: string]: boolean }>({});

  const resetState = () => {
    setAnalysisResults([]);
    setSelectedConflictTypes(['all']);
    setShowDetails({});
    setAnalysisType('comprehensive');
    setSeverityThreshold('low');
    setIncludeUnresolved(true);
    setIncludeBiases(false);
  };

  const handleAnalyzeConflicts = async () => {
    setIsLoading(true);
    try {
      const requestData = {
        nodeIds: selectedNodeIds,
        analysisType,
        includeUnresolved,
        includeBiases,
        severityThreshold,
      };

      const response = await fetch('/api/research/analyze-conflicts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (result.success) {
        setAnalysisResults(result.results);
        
        // Notify parent component of detected conflicts
        const allConflicts = result.results.flatMap((r: ConflictAnalysisResult) => r.highlights);
        onConflictsDetected?.(allConflicts);
      } else {
        throw new Error(result.error || 'Failed to analyze conflicts');
      }
    } catch (error) {
      console.error('Error analyzing conflicts:', error);
      alert(error instanceof Error ? error.message : 'Failed to analyze conflicts');
    } finally {
      setIsLoading(false);
    }
  };

  const getConflictTypeIcon = (type: string) => {
    switch (type) {
      case 'methodological': return '🔬';
      case 'empirical': return '📊';
      case 'theoretical': return '🧠';
      case 'interpretive': return '🤔';
      case 'unresolved': return '❓';
      default: return '⚠️';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getConflictTypeColor = (type: string) => {
    switch (type) {
      case 'methodological': return 'bg-blue-100 text-blue-800';
      case 'empirical': return 'bg-green-100 text-green-800';
      case 'theoretical': return 'bg-purple-100 text-purple-800';
      case 'interpretive': return 'bg-indigo-100 text-indigo-800';
      case 'unresolved': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredConflicts = analysisResults.flatMap(result => 
    result.highlights.filter(conflict => 
      selectedConflictTypes.includes('all') || 
      selectedConflictTypes.includes(conflict.conflictType)
    )
  );

  const toggleDetails = (conflictId: string) => {
    setShowDetails(prev => ({
      ...prev,
      [conflictId]: !prev[conflictId]
    }));
  };

  const conflictTypes = ['methodological', 'empirical', 'theoretical', 'interpretive', 'unresolved'];

  const defaultTrigger = (
    <Button variant="outline" size="sm" disabled={selectedNodeIds.length === 0}>
      <AlertTriangle className="h-4 w-4 mr-2" />
      Analyze Conflicts ({selectedNodeIds.length})
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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conflict & Debate Analysis</DialogTitle>
          <DialogDescription>
            Identify scholarly debates, methodological conflicts, and unresolved questions in {selectedNodeIds.length} selected research nodes.
          </DialogDescription>
        </DialogHeader>

        {analysisResults.length === 0 ? (
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

            {/* Analysis Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="analysis-type">Analysis Type</Label>
              <Select value={analysisType} onValueChange={(value: AnalysisType) => setAnalysisType(value)}>
                <SelectTrigger>
                  <SelectValue>
                    <span className="capitalize">{analysisType}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal - Within each node</SelectItem>
                  <SelectItem value="cross-node">Cross-node - Between nodes</SelectItem>
                  <SelectItem value="comprehensive">Comprehensive - All conflicts</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Severity Threshold */}
            <div className="space-y-2">
              <Label htmlFor="severity">Minimum Severity</Label>
              <Select value={severityThreshold} onValueChange={(value: SeverityThreshold) => setSeverityThreshold(value)}>
                <SelectTrigger>
                  <SelectValue>
                    <Badge className={getSeverityColor(severityThreshold)}>
                      {severityThreshold}
                    </Badge>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <Badge className={getSeverityColor('low')}>Low</Badge>
                  </SelectItem>
                  <SelectItem value="medium">
                    <Badge className={getSeverityColor('medium')}>Medium</Badge>
                  </SelectItem>
                  <SelectItem value="high">
                    <Badge className={getSeverityColor('high')}>High</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-unresolved"
                  checked={includeUnresolved}
                  onCheckedChange={(checked) => setIncludeUnresolved(checked as boolean)}
                />
                <Label htmlFor="include-unresolved">Include unresolved questions</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-biases"
                  checked={includeBiases}
                  onCheckedChange={(checked) => setIncludeBiases(checked as boolean)}
                />
                <Label htmlFor="include-biases">Detect potential biases</Label>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Analysis Summary */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Analysis Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="font-medium">Total Conflicts</div>
                  <div className="text-2xl font-bold text-destructive">
                    {analysisResults.reduce((sum, r) => sum + r.totalConflicts, 0)}
                  </div>
                </div>
                <div>
                  <div className="font-medium">Nodes Analyzed</div>
                  <div className="text-2xl font-bold">{analysisResults.length}</div>
                </div>
                <div>
                  <div className="font-medium">High Severity</div>
                  <div className="text-2xl font-bold text-red-600">
                    {analysisResults.reduce((sum, r) => sum + (r.conflictsBySeverity.high || 0), 0)}
                  </div>
                </div>
                <div>
                  <div className="font-medium">Unresolved</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {analysisResults.reduce((sum, r) => sum + r.unresolvedQuestions.length, 0)}
                  </div>
                </div>
              </div>
            </div>

            {/* Conflict Type Filter */}
            <div className="space-y-2">
              <Label>Filter by Conflict Type</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedConflictTypes.includes('all') ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedConflictTypes(['all'])}
                >
                  All Types
                </Button>
                {conflictTypes.map((type) => (
                  <Button
                    key={type}
                    variant={selectedConflictTypes.includes(type) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      if (selectedConflictTypes.includes(type)) {
                        setSelectedConflictTypes(prev => prev.filter(t => t !== type));
                      } else {
                        setSelectedConflictTypes(prev => [...prev.filter(t => t !== 'all'), type]);
                      }
                    }}
                  >
                    {getConflictTypeIcon(type)} {type}
                  </Button>
                ))}
              </div>
            </div>

            {/* Conflicts List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredConflicts.map((conflict) => (
                <div key={conflict.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getConflictTypeColor(conflict.conflictType)}>
                        {getConflictTypeIcon(conflict.conflictType)} {conflict.conflictType}
                      </Badge>
                      <Badge className={getSeverityColor(conflict.severity)}>
                        {conflict.severity}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleDetails(conflict.id)}
                    >
                      {showDetails[conflict.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm">{conflict.nodeTitle}</h4>
                    <p className="text-sm text-muted-foreground">{conflict.description}</p>
                  </div>

                  {showDetails[conflict.id] && (
                    <div className="space-y-2 border-t pt-2">
                      <div>
                        <Label className="text-xs">Relevant Text Segment</Label>
                        <Textarea
                          value={conflict.textSegment}
                          readOnly
                          className="text-xs h-20 resize-none"
                        />
                      </div>
                      
                      {conflict.keywords.length > 0 && (
                        <div>
                          <Label className="text-xs">Keywords</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {conflict.keywords.map((keyword, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {conflict.sources.length > 0 && (
                        <div>
                          <Label className="text-xs">Conflicting Sources</Label>
                          <p className="text-xs text-muted-foreground">
                            {conflict.sources.join(', ')}
                          </p>
                        </div>
                      )}

                      {conflict.suggestedResolution && (
                        <div>
                          <Label className="text-xs">Suggested Resolution</Label>
                          <p className="text-xs text-muted-foreground">
                            {conflict.suggestedResolution}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Unresolved Questions */}
            {analysisResults.some(r => r.unresolvedQuestions.length > 0) && (
              <div className="space-y-2">
                <h4 className="font-semibold">Unresolved Questions</h4>
                <ul className="space-y-1">
                  {analysisResults.flatMap(r => r.unresolvedQuestions).map((question, index) => (
                    <li key={index} className="text-sm flex items-start">
                      <span className="w-2 h-2 bg-orange-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      {question}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            {analysisResults.length > 0 ? 'Close' : 'Cancel'}
          </Button>
          {analysisResults.length === 0 && (
            <Button onClick={handleAnalyzeConflicts} disabled={isLoading || selectedNodeIds.length === 0}>
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Analyze Conflicts
                </>
              )}
            </Button>
          )}
          {analysisResults.length > 0 && (
            <Button onClick={() => setAnalysisResults([])}>
              Run New Analysis
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConflictHighlightDialog;
