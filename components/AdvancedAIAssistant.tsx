'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Lightbulb, 
  Search, 
  GitBranch, 
  Target, 
  Eye, 
  TrendingUp,
  Zap,
  BookOpen,
  Network,
  ChevronRight,
  RefreshCw,
  CheckCircle
} from 'lucide-react';

interface NodeData {
  id: string;
  title: string;
  content: string;
  type: 'topic' | 'subtopic' | 'detail';
  connections?: string[];
  source?: string;
  depth?: number;
  lens?: string;
}

interface ResearchGap {
  id: string;
  title: string;
  description: string;
  importance: 'high' | 'medium' | 'low';
  suggestedApproach: string;
  relatedNodes: string[];
  potentialSources: string[];
}

interface TopicCluster {
  id: string;
  name: string;
  theme: string;
  nodes: string[];
  connections: string[];
  suggestedDirection: string;
}

interface AdvancedSuggestion {
  id: string;
  type: 'node_expansion' | 'research_gap' | 'connection_opportunity' | 'deeper_analysis' | 'alternative_perspective';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  rationale: string;
  suggestedNodes?: Partial<NodeData>[];
  implementationSteps: string[];
}

interface AdvancedAIResponse {
  suggestions: AdvancedSuggestion[];
  researchGaps: ResearchGap[];
  topicClusters: TopicCluster[];
  automaticNodes: Partial<NodeData>[];
  metadata: {
    generatedAt: string;
    nodeCount: number;
    analysisDepth: string;
    researchFocus?: string;
    totalSuggestions: number;
    gapCount: number;
    clusterCount: number;
  };
}

interface AdvancedAIAssistantProps {
  nodes: NodeData[];
  currentContext?: any;
  researchFocus?: string;
  onNodeSuggestionApply?: (node: Partial<NodeData>) => void;
  onSuggestionImplement?: (suggestion: AdvancedSuggestion) => void;
}

const AdvancedAIAssistant: React.FC<AdvancedAIAssistantProps> = ({
  nodes,
  currentContext,
  researchFocus,
  onNodeSuggestionApply,
  onSuggestionImplement
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<AdvancedAIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSuggestionTypes, setSelectedSuggestionTypes] = useState([
    'node_expansion',
    'research_gap',
    'connection_opportunity'
  ]);
  const [academicLevel, setAcademicLevel] = useState('undergraduate');
  const [implementedSuggestions, setImplementedSuggestions] = useState<Set<string>>(new Set());

  const generateAdvancedSuggestions = async () => {
    if (nodes.length === 0) {
      setError('No nodes available for analysis');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/advanced-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodes,
          currentContext,
          researchFocus,
          academicLevel,
          suggestionTypes: selectedSuggestionTypes,
          maxSuggestions: 8
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate suggestions: ${response.status}`);
      }

      const data: AdvancedAIResponse = await response.json();
      setAiResponse(data);

    } catch (error) {
      console.error('Error generating advanced suggestions:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-generate suggestions when component mounts or nodes change significantly
  useEffect(() => {
    if (nodes.length > 0 && !aiResponse) {
      generateAdvancedSuggestions();
    }
  }, [nodes.length]);

  const handleImplementSuggestion = (suggestion: AdvancedSuggestion) => {
    setImplementedSuggestions(prev => {
      const newSet = new Set(prev);
      newSet.add(suggestion.id);
      return newSet;
    });
    onSuggestionImplement?.(suggestion);
  };

  const handleApplyNodeSuggestion = (node: Partial<NodeData>) => {
    onNodeSuggestionApply?.(node);
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'node_expansion': return <TrendingUp className="h-4 w-4" />;
      case 'research_gap': return <Search className="h-4 w-4" />;
      case 'connection_opportunity': return <GitBranch className="h-4 w-4" />;
      case 'deeper_analysis': return <Eye className="h-4 w-4" />;
      case 'alternative_perspective': return <Target className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <Zap className="h-5 w-5" />
            Advanced AI Assistant
          </CardTitle>
          <CardDescription className="text-red-600">
            {error}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={generateAdvancedSuggestions} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-600" />
          Advanced AI Research Assistant
        </CardTitle>
        <CardDescription>
          Intelligent analysis and suggestions for your research
        </CardDescription>
        
        {/* Control Panel */}
        <div className="flex items-center gap-4 pt-2">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Academic Level:</label>
            <select 
              value={academicLevel}
              onChange={(e) => setAcademicLevel(e.target.value)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="undergraduate">Undergraduate</option>
              <option value="graduate">Graduate</option>
              <option value="professional">Professional</option>
            </select>
          </div>
          
          <Button 
            onClick={generateAdvancedSuggestions}
            disabled={isLoading || nodes.length === 0}
            size="sm"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Generate Analysis
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {aiResponse && (
        <CardContent>
          <Tabs defaultValue="suggestions" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="suggestions" className="flex items-center gap-1">
                <Lightbulb className="h-3 w-3" />
                Suggestions ({aiResponse.suggestions.length})
              </TabsTrigger>
              <TabsTrigger value="gaps" className="flex items-center gap-1">
                <Search className="h-3 w-3" />
                Gaps ({aiResponse.researchGaps.length})
              </TabsTrigger>
              <TabsTrigger value="clusters" className="flex items-center gap-1">
                <Network className="h-3 w-3" />
                Clusters ({aiResponse.topicClusters.length})
              </TabsTrigger>
              <TabsTrigger value="auto-nodes" className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                Auto Nodes ({aiResponse.automaticNodes.length})
              </TabsTrigger>
            </TabsList>

            {/* Advanced Suggestions Tab */}
            <TabsContent value="suggestions" className="space-y-4">
              {aiResponse.suggestions.map((suggestion) => (
                <Card key={suggestion.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getSuggestionIcon(suggestion.type)}
                        <CardTitle className="text-base">{suggestion.title}</CardTitle>
                        <Badge variant={getPriorityColor(suggestion.priority)}>
                          {suggestion.priority}
                        </Badge>
                      </div>
                      
                      {implementedSuggestions.has(suggestion.id) ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleImplementSuggestion(suggestion)}
                        >
                          Implement
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <p className="text-sm text-gray-600">{suggestion.description}</p>
                    
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <h5 className="font-medium text-sm text-blue-900 mb-1">Rationale:</h5>
                      <p className="text-sm text-blue-700">{suggestion.rationale}</p>
                    </div>

                    {suggestion.implementationSteps.length > 0 && (
                      <div>
                        <h5 className="font-medium text-sm mb-2">Implementation Steps:</h5>
                        <ol className="list-decimal list-inside space-y-1">
                          {suggestion.implementationSteps.map((step, index) => (
                            <li key={index} className="text-sm text-gray-600">{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {suggestion.suggestedNodes && suggestion.suggestedNodes.length > 0 && (
                      <div>
                        <h5 className="font-medium text-sm mb-2">Suggested Nodes:</h5>
                        <div className="space-y-2">
                          {suggestion.suggestedNodes.map((node, index) => (
                            <div key={index} className="border rounded p-2 bg-gray-50">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm">{node.title}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleApplyNodeSuggestion(node)}
                                >
                                  Add Node
                                </Button>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">{node.content?.substring(0, 100)}...</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Research Gaps Tab */}
            <TabsContent value="gaps" className="space-y-4">
              {aiResponse.researchGaps.map((gap) => (
                <Card key={gap.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{gap.title}</CardTitle>
                      <Badge className={getImportanceColor(gap.importance)}>
                        {gap.importance} importance
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <p className="text-sm text-gray-600">{gap.description}</p>
                    
                    <div className="bg-green-50 p-3 rounded-lg">
                      <h5 className="font-medium text-sm text-green-900 mb-1">Suggested Approach:</h5>
                      <p className="text-sm text-green-700">{gap.suggestedApproach}</p>
                    </div>

                    {gap.potentialSources.length > 0 && (
                      <div>
                        <h5 className="font-medium text-sm mb-2">Potential Sources:</h5>
                        <ul className="list-disc list-inside space-y-1">
                          {gap.potentialSources.map((source, index) => (
                            <li key={index} className="text-sm text-gray-600">{source}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Topic Clusters Tab */}
            <TabsContent value="clusters" className="space-y-4">
              {aiResponse.topicClusters.map((cluster) => (
                <Card key={cluster.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Network className="h-4 w-4" />
                      {cluster.name}
                    </CardTitle>
                    <CardDescription>Theme: {cluster.theme}</CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <div>
                      <h5 className="font-medium text-sm mb-2">Nodes in Cluster ({cluster.nodes.length}):</h5>
                      <div className="flex flex-wrap gap-1">
                        {cluster.nodes.slice(0, 6).map((nodeId) => (
                          <Badge key={nodeId} variant="outline" className="text-xs">
                            {nodes.find(n => n.id === nodeId)?.title || nodeId}
                          </Badge>
                        ))}
                        {cluster.nodes.length > 6 && (
                          <Badge variant="secondary" className="text-xs">
                            +{cluster.nodes.length - 6} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="bg-purple-50 p-3 rounded-lg">
                      <h5 className="font-medium text-sm text-purple-900 mb-1">Suggested Direction:</h5>
                      <p className="text-sm text-purple-700">{cluster.suggestedDirection}</p>
                    </div>

                    {cluster.connections.length > 0 && (
                      <div>
                        <h5 className="font-medium text-sm mb-1">External Connections:</h5>
                        <p className="text-xs text-gray-600">{cluster.connections.length} connections to other clusters</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Automatic Nodes Tab */}
            <TabsContent value="auto-nodes" className="space-y-4">
              {aiResponse.automaticNodes.map((node, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{node.title}</CardTitle>
                      <Button
                        size="sm"
                        onClick={() => handleApplyNodeSuggestion(node)}
                      >
                        <ChevronRight className="h-4 w-4 mr-1" />
                        Add to Research
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-2">{node.content}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Badge variant="outline">{node.type}</Badge>
                      <Badge variant="outline">{node.lens}</Badge>
                      <span>Source: {node.source}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>

          {/* Metadata */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                Analysis completed at {new Date(aiResponse.metadata.generatedAt).toLocaleTimeString()}
              </span>
              <span>
                {aiResponse.metadata.nodeCount} nodes analyzed • {aiResponse.metadata.analysisDepth} level
              </span>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default AdvancedAIAssistant;
