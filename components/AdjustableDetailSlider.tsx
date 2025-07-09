'use client';

import React, { useState } from 'react';
import { Slider } from '@/components/ui/slider';

export type DetailLevel = 'low' | 'medium' | 'high';

interface AdjustableDetailSliderProps {
  onDetailLevelChange: (level: DetailLevel) => void;
  initialLevel?: DetailLevel;
  className?: string;
}

const DETAIL_LEVELS: Record<number, DetailLevel> = {
  0: 'low',
  1: 'medium',
  2: 'high',
};

const LEVEL_TO_VALUE: Record<DetailLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

const LEVEL_DESCRIPTIONS: Record<DetailLevel, string> = {
  low: 'Concise overviews, key terms, and foundational summaries',
  medium: 'Thematic surveys, systematic reviews, and comparative analysis',
  high: 'Rich academic depth, peer-reviewed sources, theoretical debates',
};

/**
 * AdjustableDetailSlider component allows users to dynamically adjust
 * the information density and academic rigor of their outline content.
 * 
 * Features three distinct levels:
 * - Low: Concise overviews, key terms, and foundational summaries
 * - Medium: Thematic surveys, systematic reviews, and comparative analysis  
 * - High: Rich academic depth, peer-reviewed sources, theoretical debates
 */
const AdjustableDetailSlider: React.FC<AdjustableDetailSliderProps> = ({
  onDetailLevelChange,
  initialLevel = 'medium',
  className = '',
}) => {
  const [currentLevel, setCurrentLevel] = useState<DetailLevel>(initialLevel);
  const [sliderValue, setSliderValue] = useState([LEVEL_TO_VALUE[initialLevel]]);

  const handleSliderChange = (value: number[]) => {
    const newValue = value[0];
    setSliderValue([newValue]);
    
    const newLevel = DETAIL_LEVELS[newValue];
    if (newLevel && newLevel !== currentLevel) {
      setCurrentLevel(newLevel);
      onDetailLevelChange(newLevel);
    }
  };

  return (
    <div className={`w-full space-y-4 p-4 border rounded-lg bg-card ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Detail Level</h3>
        <span className="text-sm font-semibold capitalize text-primary bg-primary/10 px-2 py-1 rounded">
          {currentLevel}
        </span>
      </div>
      
      <div className="space-y-3">
        <Slider
          value={sliderValue}
          onValueChange={handleSliderChange}
          max={2}
          min={0}
          step={1}
          className="w-full"
        />
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="text-center">Low</span>
          <span className="text-center">Medium</span>
          <span className="text-center">High</span>
        </div>
      </div>
      
      <div className="text-sm text-muted-foreground leading-relaxed bg-muted/50 p-3 rounded">
        <strong className="text-foreground">{currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1)}:</strong>{' '}
        {LEVEL_DESCRIPTIONS[currentLevel]}
      </div>
    </div>
  );
};

export default AdjustableDetailSlider;
