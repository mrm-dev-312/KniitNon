'use client';

import { Chat } from '@/components/features/ai/chat';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useChatContext } from '@/lib/contexts/ChatContext';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

export default function HomeClient() {
  const { messages, hasMessages } = useChatContext();
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [previewTopics, setPreviewTopics] = useState<string[]>([]);

  const generatePreviewTopics = useCallback(() => {
    // Extract meaningful topics from conversation using improved analysis
    const topics: string[] = [];
    
    // Look for structured content patterns (outlines, headings, technical terms)
    for (const message of messages) {
      const content = message.content.toLowerCase();
      
      // Extract main section titles (Roman numerals like "II. The Development of ChatGPT")
      const mainSectionMatches = message.content.match(/(?:^|\n)\s*(?:I{1,3}|IV|V|VI{1,3}|IX|X)\.\s+(.+?)(?=\n|$)/gm);
      if (mainSectionMatches) {
        mainSectionMatches.forEach(match => {
          const topic = match.replace(/(?:^|\n)\s*(?:I{1,3}|IV|V|VI{1,3}|IX|X)\.\s+/, '').trim();
          if (topic.length > 5 && topic.length < 80) {
            topics.push(topic);
          }
        });
      }
      
      // Extract topics from structured outlines (subsections)
      const outlineMatches = message.content.match(/(?:^\s*(?:\d+\.|\-|\*)\s+)(.+)/gm);
      if (outlineMatches) {
        outlineMatches.forEach(match => {
          const topic = match.replace(/^\s*(?:\d+\.|\-|\*)\s+/, '').trim();
          if (topic.length > 10 && topic.length < 60) {
            topics.push(topic);
          }
        });
      }
      
      // Extract section headings (### format) but exclude numbered sections
      const headingMatches = message.content.match(/#{1,4}\s+(.+)/g);
      if (headingMatches) {
        headingMatches.forEach(match => {
          const topic = match.replace(/#{1,4}\s+/, '').trim();
          // Exclude numbered section headings like "1", "2.", "1.1", etc.
          if (topic.length > 5 && topic.length < 60 && 
              !topic.includes('Research Outline') &&
              !topic.match(/^\d+\.?$/) &&  // Exclude pure numbers like "1" or "1."
              !topic.match(/^\d+\.\d+/) && // Exclude numbered subsections like "1.1"
              !topic.match(/^[A-Za-z]\.$/) && // Exclude single letters like "A."
              topic !== 'Introduction' && topic !== 'Conclusion') {
            topics.push(topic);
          }
        });
      }
      
      // Extract technical or academic terms (capitalized phrases) as fallback
      if (content.includes('research') || content.includes('analysis') || content.includes('study')) {
        const academicMatches = message.content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g);
        if (academicMatches) {
          academicMatches.forEach(match => {
            if (match.length > 8 && match.length < 50 && 
                !match.includes('User') && !match.includes('AI') && 
                !match.includes('Hello') && !match.includes('Generate')) {
              topics.push(match);
            }
          });
        }
      }
    }
    
    // Remove duplicates and select best topics, prioritizing longer/more detailed topics
    const uniqueTopics = Array.from(new Set(topics))
      .filter(topic => topic.length > 3 && topic.length < 50)
      .sort((a, b) => b.length - a.length) // Longer topics first
      .slice(0, 4);
      
    setPreviewTopics(uniqueTopics.length > 0 ? uniqueTopics : ['Research Topics Identified']);
  }, [messages]);

  // Show suggestion after user has had a meaningful conversation
  useEffect(() => {
    if (messages.length >= 4) { // At least 2 exchanges
      setShowSuggestion(true);
      generatePreviewTopics();
    }
  }, [messages, generatePreviewTopics]);

  const handleOpenResearchExplorer = async () => {
    if (hasMessages && messages.length > 0) {
      setIsGenerating(true);
      try {
        // Generate research nodes from chat
        const response = await fetch('/api/research/generate-from-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ messages }),
        });

        if (response.ok) {
          const generatedData = await response.json();
          // Store the generated data in localStorage for the dashboard to use
          localStorage.setItem('generated-research-data', JSON.stringify(generatedData));
          
          // Show success message
          console.log(`Successfully generated ${generatedData.nodes?.length || 0} research nodes from chat`);
          
          // Navigate to dashboard
          router.push('/dashboard');
        } else {
          console.error('Failed to generate research data');
          // Still navigate to dashboard with fallback data
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Error generating research data:', error);
        // Still navigate to dashboard with fallback data
        router.push('/dashboard');
      } finally {
        setIsGenerating(false);
      }
    } else {
      // No chat messages, just navigate to dashboard
      router.push('/dashboard');
    }
  };

  return (
    <>
      <div className="flex gap-4 justify-center mb-8">
        <Button 
          size="lg" 
          onClick={handleOpenResearchExplorer}
          disabled={isGenerating}
          className={showSuggestion ? 'animate-pulse' : ''}
        >
          {isGenerating ? 'Generating Research...' : 'Open Research Explorer'}
          {hasMessages && !isGenerating && (
            <span className="ml-2 text-xs bg-primary-foreground text-primary px-2 py-1 rounded-full">
              from chat
            </span>
          )}
        </Button>
      </div>

      {/* Suggestion banner */}
      {showSuggestion && !isGenerating && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900">Ready to explore your research topics?</h3>
              <p className="text-sm text-blue-700 mb-2">
                I can generate an interactive research map from our conversation with {messages.length} messages.
              </p>
              {previewTopics.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-blue-600">Topics identified:</span>
                  {previewTopics.map((topic, index) => (
                    <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {topic}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <Button 
              onClick={handleOpenResearchExplorer}
              variant="outline"
              size="sm"
              className="bg-blue-100 hover:bg-blue-200 ml-4"
            >
              Generate Research Map
            </Button>
          </div>
        </div>
      )}
      
      <Chat />
    </>
  );
}
