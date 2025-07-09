'use client';

import React from 'react';
import OutlineBuilder from '@/components/OutlineBuilder';
import AdjustableDetailSlider from '@/components/AdjustableDetailSlider';
import VisualizationCanvas from '@/components/VisualizationCanvas';
import { AuthButton } from '@/components/AuthButton';
import { ProjectManager } from '@/components/ProjectManager';
import { DetailLevel } from '@/components/AdjustableDetailSlider';

export default function DashboardPage() {
  const handleDetailLevelChange = (level: DetailLevel) => {
    console.log('Detail level changed to:', level);
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

      {/* Sidebar */}
      <div className="w-96 border-l bg-card flex flex-col">
        {/* Detail Slider */}
        <div className="p-4 border-b">
          <AdjustableDetailSlider onDetailLevelChange={handleDetailLevelChange} />
        </div>
        
        {/* Outline Builder */}
        <div className="flex-1 p-4">
          <OutlineBuilder />
        </div>
      </div>
    </div>
  );
}
