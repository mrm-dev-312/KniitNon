'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Target, 
  Map, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  BookOpen,
  Lightbulb,
  RefreshCw,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface StrategicNode {
  id: string;
  title: string;
  content: string;
  type: 'field_boundary' | 'core_concept' | 'methodological_approach' | 'theoretical_framework';
  depth: number;
  importance: 'critical' | 'important' | 'supplementary';
  lens: string;
  strategicRationale: string;
  nextSteps: string[];
  prerequisiteNodes: string[];
  connections: string[];
  expansionPotential: 'high' | 'medium' | 'low';
}

interface NodeGenerationResponse {
  strategy: string;
  phase: 'foundation' | 'exploration' | 'analysis' | 'synthesis';
  nodes: StrategicNode[];
  fieldBoundaries: {
    included: string[];
    excluded: string[];
    reasoning: string;
  };
  conceptualFramework: {
    coreThemes: string[];
    methodologicalApproaches: string[];
    theoreticalFoundations: string[];
  };
  progressionMap: {
    currentPhase: string;
    nextPhase: string;
    readinessIndicators: string[];
  };
  metadata: {
    generatedAt: string;
    strategy: string;
    academicLevel: string;
    totalNodes: number;
    estimatedCompletionTime: string;
  };
}

interface StrategicNodeGeneratorProps {
  onNodesGenerated?: (nodes: StrategicNode[]) => void;
  onNodeAdopt?: (node: StrategicNode) => void;
}

const StrategicNodeGenerator: React.FC<StrategicNodeGeneratorProps> = ({
  onNodesGenerated,
  onNodeAdopt
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<NodeGenerationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  // Form state
  const [topic, setTopic] = useState('');
  const [researchContext, setResearchContext] = useState('');
  const [academicLevel, setAcademicLevel] = useState<'undergraduate' | 'graduate' | 'professional'>('undergraduate');
  const [generationStrategy, setGenerationStrategy] = useState<'progressive_disclosure' | 'field_boundaries' | 'high_level_concepts' | 'comprehensive'>('progressive_disclosure');
  const [maxDepth, setMaxDepth] = useState(2);
  const [focusAreas, setFocusAreas] = useState<string>('');
  const [excludeAreas, setExcludeAreas] = useState<string>('');

  const generateNodes = async () => {
    if (!topic.trim()) {
      setError('Please enter a research topic');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const requestBody = {
        topic: topic.trim(),
        researchContext: researchContext.trim() || undefined,
        academicLevel,
        generationStrategy,
        maxDepth,
        focusAreas: focusAreas.trim() ? focusAreas.split(',').map(s => s.trim()) : [],
        excludeAreas: excludeAreas.trim() ? excludeAreas.split(',').map(s => s.trim()) : []
      };

      const res = await fetch('/api/ai/strategic-nodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        throw new Error(`Failed to generate nodes: ${res.status}`);
      }

      const data: NodeGenerationResponse = await res.json();
      setResponse(data);
      onNodesGenerated?.(data.nodes);

    } catch (error) {
      console.error('Error generating strategic nodes:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate nodes');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleNodeExpanded = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'field_boundary': return <Map className="h-4 w-4" />;
      case 'core_concept': return <Target className="h-4 w-4" />;
      case 'methodological_approach': return <BookOpen className="h-4 w-4" />;
      case 'theoretical_framework': return <Lightbulb className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'field_boundary': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'core_concept': return 'bg-green-100 text-green-800 border-green-200';
      case 'methodological_approach': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'theoretical_framework': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'important': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'supplementary': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getExpansionColor = (potential: string) => {
    switch (potential) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Strategic Node Generator
          </CardTitle>
          <CardDescription>
            Generate research nodes using strategic pedagogical approaches
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Topic Input */}
          <div>
            <label className="block text-sm font-medium mb-1">Research Topic *</label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Artificial Intelligence in Healthcare, Climate Change Mitigation..."
              className="w-full"
            />
          </div>

          {/* Research Context */}
          <div>
            <label className="block text-sm font-medium mb-1">Research Context (Optional)</label>
            <Textarea
              value={researchContext}
              onChange={(e) => setResearchContext(e.target.value)}
              placeholder="Provide additional context, specific angles, or constraints for your research..."
              rows={3}
            />
          </div>

          {/* Configuration Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Academic Level</label>
              <select
                value={academicLevel}
                onChange={(e) => setAcademicLevel(e.target.value as any)}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="undergraduate">Undergraduate</option>
                <option value="graduate">Graduate</option>
                <option value="professional">Professional</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Strategy</label>
              <select
                value={generationStrategy}
                onChange={(e) => setGenerationStrategy(e.target.value as any)}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="progressive_disclosure">Progressive Disclosure</option>
                <option value="field_boundaries">Field Boundaries</option>
                <option value="high_level_concepts">High-Level Concepts</option>
                <option value="comprehensive">Comprehensive</option>
              </select>
            </div>
          </div>

          {/* Focus Areas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Focus Areas (comma-separated)</label>
              <Input
                value={focusAreas}
                onChange={(e) => setFocusAreas(e.target.value)}
                placeholder="ethics, applications, methodology..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Exclude Areas (comma-separated)</label>
              <Input
                value={excludeAreas}
                onChange={(e) => setExcludeAreas(e.target.value)}
                placeholder="technical details, implementation..."
              />
            </div>
          </div>

          {/* Max Depth */}
          <div>
            <label className="block text-sm font-medium mb-1">Maximum Depth: {maxDepth}</label>
            <input
              type="range"
              min="1"
              max="4"
              value={maxDepth}
              onChange={(e) => setMaxDepth(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Shallow</span>
              <span>Deep</span>
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={generateNodes}
            disabled={isLoading || !topic.trim()}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating Strategic Nodes...
              </>
            ) : (
              <>
                <Target className="h-4 w-4 mr-2" />
                Generate Strategic Nodes
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200">
          <CardContent className="p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {response && (
        <div className="space-y-4">
          {/* Strategy Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Strategic Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-gray-700">Strategy & Phase</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{response.strategy}</Badge>
                    <ArrowRight className="h-3 w-3" />
                    <Badge className={response.phase === 'foundation' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                      {response.phase}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm text-gray-700">Completion Time</h4>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3 text-gray-500" />
                    <span className="text-sm">{response.metadata.estimatedCompletionTime}</span>
                  </div>
                </div>
              </div>

              {/* Field Boundaries */}
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-2">Field Boundaries</h4>
                <div className="text-sm space-y-2">
                  <div>
                    <span className="font-medium text-green-700">Included: </span>
                    {response.fieldBoundaries?.included?.length > 0 
                      ? response.fieldBoundaries.included.join(', ')
                      : 'No specific areas defined'}
                  </div>
                  <div>
                    <span className="font-medium text-red-700">Excluded: </span>
                    {response.fieldBoundaries?.excluded?.length > 0 
                      ? response.fieldBoundaries.excluded.join(', ')
                      : 'No exclusions specified'}
                  </div>
                  <p className="text-gray-600 italic">
                    {response.fieldBoundaries?.reasoning || 'Reasoning not provided'}
                  </p>
                </div>
              </div>

              {/* Conceptual Framework */}
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-2">Conceptual Framework</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Core Themes:</span>
                    <ul className="list-disc list-inside text-gray-600 mt-1">
                      {response.conceptualFramework?.coreThemes?.length > 0 ? (
                        response.conceptualFramework.coreThemes.map((theme, index) => (
                          <li key={index}>{theme}</li>
                        ))
                      ) : (
                        <li className="italic">No core themes identified</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <span className="font-medium">Methods:</span>
                    <ul className="list-disc list-inside text-gray-600 mt-1">
                      {response.conceptualFramework?.methodologicalApproaches?.length > 0 ? (
                        response.conceptualFramework.methodologicalApproaches.map((method, index) => (
                          <li key={index}>{method}</li>
                        ))
                      ) : (
                        <li className="italic">No methods specified</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <span className="font-medium">Foundations:</span>
                    <ul className="list-disc list-inside text-gray-600 mt-1">
                      {response.conceptualFramework?.theoreticalFoundations?.length > 0 ? (
                        response.conceptualFramework.theoreticalFoundations.map((foundation, index) => (
                          <li key={index}>{foundation}</li>
                        ))
                      ) : (
                        <li className="italic">No foundations listed</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generated Nodes */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">
              Strategic Nodes ({response.nodes?.length || 0})
            </h3>
            
            {response.nodes && response.nodes.length > 0 ? (
              response.nodes.map((node) => (
                <Card key={node.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleNodeExpanded(node.id)}
                        >
                          {expandedNodes.has(node.id) ? 
                            <ChevronDown className="h-4 w-4" /> : 
                            <ChevronRight className="h-4 w-4" />
                          }
                        </Button>
                      
                      {getTypeIcon(node.type)}
                      <CardTitle className="text-base">{node.title}</CardTitle>
                      
                      <div className="flex items-center gap-1">
                        <Badge className={getTypeColor(node.type)}>
                          {node.type.replace('_', ' ')}
                        </Badge>
                        <Badge className={getImportanceColor(node.importance)}>
                          {node.importance}
                        </Badge>
                        <span className={`text-xs ${getExpansionColor(node.expansionPotential)}`}>
                          <TrendingUp className="h-3 w-3 inline mr-1" />
                          {node.expansionPotential}
                        </span>
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      onClick={() => onNodeAdopt?.(node)}
                    >
                      Adopt Node
                    </Button>
                  </div>
                </CardHeader>
                
                {expandedNodes.has(node.id) && (
                  <CardContent className="space-y-3 pt-0">
                    <p className="text-sm text-gray-700">{node.content || 'No content provided'}</p>
                    
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <h5 className="font-medium text-sm text-blue-900 mb-1">Strategic Rationale:</h5>
                      <p className="text-sm text-blue-700">{node.strategicRationale || 'No rationale provided'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {node.nextSteps && node.nextSteps.length > 0 && (
                        <div>
                          <h5 className="font-medium text-sm mb-1">Next Steps:</h5>
                          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                            {node.nextSteps.map((step, index) => (
                              <li key={index}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {node.prerequisiteNodes && node.prerequisiteNodes.length > 0 && (
                        <div>
                          <h5 className="font-medium text-sm mb-1">Prerequisites:</h5>
                          <div className="flex flex-wrap gap-1">
                            {node.prerequisiteNodes.map((prereq) => (
                              <Badge key={prereq} variant="outline" className="text-xs">
                                {prereq}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                      <span>Depth: {node.depth || 0} | Lens: {node.lens || 'Not specified'}</span>
                      <span>{node.connections?.length || 0} connections</span>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-gray-500 italic">No strategic nodes generated. Try adjusting your parameters and generating again.</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Progression Map */}
          {response.progressionMap && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Research Progression</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Current:</span>
                  <Badge>{response.progressionMap.currentPhase}</Badge>
                  <ArrowRight className="h-3 w-3" />
                  <span className="text-sm font-medium">Next:</span>
                  <Badge variant="outline">{response.progressionMap.nextPhase}</Badge>
                </div>
                
                <div>
                  <h5 className="font-medium text-sm mb-2">Readiness Indicators:</h5>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    {response.progressionMap?.readinessIndicators?.length > 0 ? (
                      response.progressionMap.readinessIndicators.map((indicator, index) => (
                        <li key={index}>{indicator}</li>
                      ))
                    ) : (
                      <li className="italic">No readiness indicators specified</li>
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default StrategicNodeGenerator;
