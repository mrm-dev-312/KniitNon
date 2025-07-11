'use client';

import React, { useState } from 'react';
import OutlineBuilder from '@/components/OutlineBuilder';
import HierarchicalOutlineBuilder from '@/components/HierarchicalOutlineBuilder';
import NodeHierarchyBuilder from '@/components/NodeHierarchyBuilder';
import AdjustableDetailSlider from '@/components/AdjustableDetailSlider';
import VisualizationCanvas from '@/components/VisualizationCanvas';
import AdvancedAIAssistant from '@/components/AdvancedAIAssistant';
import StrategicNodeGenerator from '@/components/StrategicNodeGenerator';
import { AuthButton } from '@/components/AuthButton';
import { ProjectManager } from '@/components/ProjectManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DetailLevel } from '@/components/AdjustableDetailSlider';
import { Zap, FileText, Settings } from 'lucide-react';

export default function DashboardClient() {
  const [detailLevel, setDetailLevel] = useState<DetailLevel>('medium');
  const [currentNodes, setCurrentNodes] = useState<any[]>([]);
  const [researchFocus, setResearchFocus] = useState<string>('');
  const [useHierarchicalOutline, setUseHierarchicalOutline] = useState<boolean>(false);

  const handleDetailLevelChange = (level: DetailLevel) => {
    setDetailLevel(level);
    console.log('Detail level changed to:', level);
  };

  const handleOutlineStructureChange = (outline: any) => {
    console.log('Hierarchical outline structure changed:', outline);
  };

  const handleNodeAssociation = (sectionId: string, nodeIds: string[]) => {
    console.log('Node association changed:', { sectionId, nodeIds });
  };

  const handleNodeSuggestionApply = (node: any) => {
    // Add the suggested node to the current research
    const newNode = {
      ...node,
      id: node.id || `suggested-${Date.now()}`,
      addedAt: new Date().toISOString()
    };
    setCurrentNodes(prev => [...prev, newNode]);
    console.log('Applied AI suggested node:', newNode);
  };

  const handleStrategicNodesGenerated = (nodes: any[]) => {
    // Add strategic nodes to current research
    const formattedNodes = nodes.map(node => ({
      ...node,
      addedAt: new Date().toISOString(),
      source: 'Strategic AI Generation'
    }));
    setCurrentNodes(prev => [...prev, ...formattedNodes]);
    console.log('Strategic nodes generated:', formattedNodes);
  };

  const handleStrategicNodeAdopt = (node: any) => {
    // Add individual strategic node to research
    const formattedNode = {
      ...node,
      addedAt: new Date().toISOString(),
      source: 'Strategic AI Generation'
    };
    setCurrentNodes(prev => [...prev, formattedNode]);
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
        <div className="flex-1 p-6">
          <VisualizationCanvas />
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
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="outline" className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Outline
              </TabsTrigger>
              <TabsTrigger value="ai-assistant" className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                AI Assistant
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
                  <div className="flex items-center gap-2">
                    <label className="text-xs">Hierarchical:</label>
                    <input
                      type="checkbox"
                      checked={useHierarchicalOutline}
                      onChange={(e) => setUseHierarchicalOutline(e.target.checked)}
                      className="rounded"
                    />
                  </div>
                </div>

                {/* Outline Builder */}
                <div className="flex-1 overflow-hidden">            {useHierarchicalOutline ? (
              <NodeHierarchyBuilder
                onStructureUpdate={handleOutlineStructureChange}
              />
            ) : (
                    <OutlineBuilder />
                  )}
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
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="strategic" className="text-xs">
                      Strategic Nodes
                    </TabsTrigger>
                    <TabsTrigger value="advanced" className="text-xs">
                      Advanced Analysis
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
                      nodes={currentNodes}
                      researchFocus={researchFocus}
                      onNodeSuggestionApply={handleNodeSuggestionApply}
                      onSuggestionImplement={handleSuggestionImplement}
                    />
                  </TabsContent>
                </Tabs>
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
                      {currentNodes.length} nodes in current research
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">AI Analysis Status</label>
                    <p className="text-sm text-muted-foreground">
                      {currentNodes.length > 0 ? 'Ready for analysis' : 'No nodes available'}
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
