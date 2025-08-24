'use client';

import React, { useState } from 'react';
import OutlineBuilder from '@/components/features/outline/OutlineBuilder';
import AdjustableDetailSlider from '@/components/shared/AdjustableDetailSlider';
import VisualizationCanvas from '@/components/features/visualization/VisualizationCanvas';
import HierarchicalVisualization from '@/components/features/visualization/HierarchicalVisualization';
import AdvancedAIAssistant from '@/components/features/ai/AdvancedAIAssistant';
import StrategicNodeGenerator from '@/components/features/ai/StrategicNodeGenerator';
import { Chat } from '@/components/features/ai/chat';
import { AuthButton } from '@/components/AuthButton';
import { ProjectManager } from '@/components/features/project/ProjectManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DetailLevel } from '@/components/shared/AdjustableDetailSlider';
import { useOutlineStore } from '@/lib/stores/outline-store';
import { StructuredContentParser } from '@/lib/utils/structured-content-parser';
import { Zap, FileText, Settings, MessageCircle } from 'lucide-react';

export default function DashboardClient() {
  const [detailLevel, setDetailLevel] = useState<DetailLevel>('medium');
  const [researchFocus, setResearchFocus] = useState<string>('');
  const [useHierarchicalViz, setUseHierarchicalViz] = useState<boolean>(true);
  const { addNode, nodes } = useOutlineStore();

  // Convert OutlineNode to NodeData format expected by AdvancedAIAssistant
  const convertToNodeData = (outlineNodes: any[]) => {
    return outlineNodes.map(node => ({
      id: node.id,
      title: node.title,
      content: node.content || '',
      type: node.type,
      connections: node.metadata?.relationships || [],
      source: node.metadata?.source,
      depth: node.order || 0,
      lens: node.metadata?.lens
    }));
  };

  const handleDetailLevelChange = (level: DetailLevel) => {
    setDetailLevel(level);
    console.log('Detail level changed to:', level);
  };

  const handleNodeAssociation = (sectionId: string, nodeIds: string[]) => {
    console.log('Node association changed:', { sectionId, nodeIds });
  };

  const handleNodeSuggestionApply = (node: any) => {
    // Add the suggested node to the outline store
    const newNode = {
      id: node.id || `suggested-${Date.now()}`,
      title: node.title,
      content: node.content || node.description || '',
      type: node.type || 'topic',
      order: nodes.length + 1,
      parentId: node.parentId,
      metadata: {
        source: 'AI Suggestion',
        confidence: node.confidence
      }
    };
    addNode(newNode);
    console.log('Applied AI suggested node:', newNode);
  };

  const handleStrategicNodesGenerated = (strategicNodes: any[]) => {
    // Add strategic nodes to outline store
    const formattedNodes = strategicNodes.map((node, index) => ({
      id: `strategic-${Date.now()}-${index}`,
      title: node.title,
      content: node.content || node.description || '',
      type: node.type || 'topic',
      order: nodes.length + index + 1,
      parentId: node.parentId,
      metadata: {
        source: 'Strategic AI Generation',
        confidence: node.confidence || 0.8
      }
    }));
    
    formattedNodes.forEach(node => addNode(node));
    console.log('Strategic nodes generated:', formattedNodes);
  };

  const handleStrategicNodeAdopt = (node: any) => {
    // Add individual strategic node to outline store
    const formattedNode = {
      id: `strategic-single-${Date.now()}`,
      title: node.title,
      content: node.content || node.description || '',
      type: node.type || 'topic',
      order: nodes.length + 1,
      parentId: node.parentId,
      metadata: {
        source: 'Strategic AI Generation',
        confidence: node.confidence || 0.8
      }
    };
    addNode(formattedNode);
    console.log('Strategic node adopted:', formattedNode);
  };

  const handleSuggestionImplement = (suggestion: any) => {
    console.log('Implementing AI suggestion:', suggestion);
    // Could trigger various actions based on suggestion type
  };

  return (
    <div className="h-screen flex bg-background">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 border-b flex items-center justify-between px-6">
          <h1 className="text-2xl font-bold">Research Explorer</h1>
          <div className="flex items-center gap-3">
            <ProjectManager />
            <AuthButton />
          </div>
        </div>
        
        {/* Visualization Area */}
        <div className="flex-1 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Research Visualization</h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Visualization:</span>
              <button
                onClick={() => setUseHierarchicalViz(true)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  useHierarchicalViz
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Hierarchical
              </button>
              <button
                onClick={() => setUseHierarchicalViz(false)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  !useHierarchicalViz
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Force Layout
              </button>
            </div>
          </div>
          <div className="flex-1">
            {useHierarchicalViz ? (
              <HierarchicalVisualization className="h-full" />
            ) : (
              <VisualizationCanvas />
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Sidebar with Tabs */}
      <div className="w-[500px] border-l bg-card flex flex-col">
        {/* Detail Slider - Always visible */}
        <div className="p-4 border-b bg-muted/50">
          <AdjustableDetailSlider onDetailLevelChange={handleDetailLevelChange} />
        </div>
        
        {/* Tabbed Interface */}
        <div className="flex-1 p-4">
          <Tabs defaultValue="outline" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="outline" className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Outline
              </TabsTrigger>
              <TabsTrigger value="ai-assistant" className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                AI Assistant
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-1">
                <Settings className="h-3 w-3" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="outline" className="flex-1 overflow-hidden">
              <div className="h-full space-y-3">
                {/* Outline Type Toggle */}
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Outline Builder</h3>
                </div>

                {/* Outline Builder */}
                <div className="flex-1 overflow-hidden">
                  <OutlineBuilder />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ai-assistant" className="flex-1 overflow-auto">
              <div className="space-y-4">
                {/* Research Focus Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Research Focus (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., Climate change impacts, AI ethics, Historical analysis..."
                    value={researchFocus}
                    onChange={(e) => setResearchFocus(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Provide context to help AI generate more targeted suggestions
                  </p>
                </div>

                {/* AI Features Tabs */}
                <Tabs defaultValue="strategic" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="strategic" className="text-xs">
                      Strategic Nodes
                    </TabsTrigger>
                    <TabsTrigger value="advanced" className="text-xs">
                      Advanced Analysis
                    </TabsTrigger>
                    <TabsTrigger value="chat" className="text-xs">
                      Chat Assistant
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="strategic">
                    <StrategicNodeGenerator
                      onNodesGenerated={handleStrategicNodesGenerated}
                      onNodeAdopt={handleStrategicNodeAdopt}
                    />
                  </TabsContent>

                  <TabsContent value="advanced">
                    <AdvancedAIAssistant
                      nodes={convertToNodeData(nodes)}
                      researchFocus={researchFocus}
                      onNodeSuggestionApply={handleNodeSuggestionApply}
                      onSuggestionImplement={handleSuggestionImplement}
                    />
                  </TabsContent>

                  <TabsContent value="chat">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Research Chat</label>
                        <p className="text-xs text-muted-foreground">
                          Chat with AI to generate research nodes and insights
                        </p>
                      </div>
                      <div className="h-[300px] border rounded-lg overflow-hidden">
                        <Chat />
                      </div>
                      <button
                        className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                        onClick={(event) => {
                          // Extract nodes from AI responses in the chat
                          const chatContainer = document.querySelector('[data-role="assistant"]:last-child');
                          const lastAiResponse = chatContainer?.textContent?.replace('AI: ', '') || '';
                          
                          if (lastAiResponse && lastAiResponse.trim()) {
                            // Use structured content parser to extract multiple nodes
                            try {
                              const parsedNodes = StructuredContentParser.parseResponse(lastAiResponse);
                              const outlineNodes = StructuredContentParser.createOutlineNodes(parsedNodes, nodes.length);
                              
                              if (outlineNodes.length > 0) {
                                // Add all parsed nodes to the store
                                outlineNodes.forEach(node => addNode(node));
                                console.log(`Generated ${outlineNodes.length} nodes from AI response:`, outlineNodes);
                                
                                // Trigger visualization update
                                window.dispatchEvent(new CustomEvent('nodesAdded', { detail: outlineNodes }));
                                
                                // Show success feedback
                                const button = event.target as HTMLButtonElement;
                                const originalText = button.textContent;
                                button.textContent = `${outlineNodes.length} Nodes Generated!`;
                                button.className = button.className.replace('bg-primary', 'bg-green-600');
                                setTimeout(() => {
                                  button.textContent = originalText;
                                  button.className = button.className.replace('bg-green-600', 'bg-primary');
                                }, 3000);
                              } else {
                                // Fallback to single node creation
                                const sentences = lastAiResponse.split('.').filter(s => s.trim().length > 0);
                                const firstSentence = sentences[0]?.trim() || 'AI Generated Insight';
                                
                                const newNode = {
                                  id: `ai-response-${Date.now()}`,
                                  title: firstSentence.length > 50 ? firstSentence.substring(0, 50) + '...' : firstSentence,
                                  content: lastAiResponse.trim(),
                                  type: 'topic' as const,
                                  order: nodes.length + 1,
                                  metadata: {
                                    source: 'AI Chat Response',
                                    confidence: 0.8
                                  }
                                };
                                addNode(newNode);
                                console.log('Generated fallback node from AI response:', newNode);
                                
                                // Show success feedback
                                const button = event.target as HTMLButtonElement;
                                const originalText = button.textContent;
                                button.textContent = 'Node Generated!';
                                button.className = button.className.replace('bg-primary', 'bg-green-600');
                                setTimeout(() => {
                                  button.textContent = originalText;
                                  button.className = button.className.replace('bg-green-600', 'bg-primary');
                                }, 2000);
                              }
                            } catch (error) {
                              console.error('Error parsing AI response:', error);
                              // Show error feedback
                              const button = event.target as HTMLButtonElement;
                              const originalText = button.textContent;
                              button.textContent = 'Parsing Error';
                              button.className = button.className.replace('bg-primary', 'bg-red-600');
                              setTimeout(() => {
                                button.textContent = originalText;
                                button.className = button.className.replace('bg-red-600', 'bg-primary');
                              }, 2000);
                            }
                          } else {
                            console.log('No AI response found to generate node from');
                            // Show error feedback
                            const button = event.target as HTMLButtonElement;
                            const originalText = button.textContent;
                            button.textContent = 'No AI response found';
                            button.className = button.className.replace('bg-primary', 'bg-red-600');
                            setTimeout(() => {
                              button.textContent = originalText;
                              button.className = button.className.replace('bg-red-600', 'bg-primary');
                            }, 2000);
                          }
                        }}
                      >
                        Generate Nodes from AI Response
                      </button>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </TabsContent>

            <TabsContent value="chat" className="flex-1 overflow-hidden">
              <div className="h-full flex flex-col">
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
                    🧠 Research Chat Assistant
                  </h3>
                  <p className="text-xs text-blue-700">
                    Ask research questions and I&apos;ll automatically generate knowledge nodes for your visualization.
                    Try: &quot;Explain machine learning algorithms&quot; or &quot;Create a guide to climate change research&quot;
                  </p>
                </div>
                <div className="flex-1 overflow-hidden border rounded-lg min-h-0">
                  <Chat 
                    onNodesGenerated={(count) => {
                      console.log(`Chat generated ${count} nodes, total nodes now: ${nodes.length + count}`);
                      // Trigger a re-render of visualizations
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('chatNodesAdded', { detail: { count } }));
                      }, 100);
                    }}
                    autoGenerateNodes={true}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="flex-1">
              <div className="space-y-4">
                <h3 className="font-semibold">Dashboard Settings</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Current Detail Level</label>
                    <p className="text-sm text-muted-foreground">
                      {detailLevel.charAt(0).toUpperCase() + detailLevel.slice(1)}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Active Nodes</label>
                    <p className="text-sm text-muted-foreground">
                      {nodes.length} nodes in current research
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">AI Analysis Status</label>
                    <p className="text-sm text-muted-foreground">
                      {nodes.length > 0 ? 'Ready for analysis' : 'No nodes available'}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
