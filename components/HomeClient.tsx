'use client';

import { Chat } from '@/components/ai/chat';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useChatContext } from '@/lib/contexts/ChatContext';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function HomeClient() {
  const { messages, hasMessages } = useChatContext();
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [previewTopics, setPreviewTopics] = useState<string[]>([]);

  // Show suggestion after user has had a meaningful conversation
  useEffect(() => {
    if (messages.length >= 4) { // At least 2 exchanges
      setShowSuggestion(true);
      generatePreviewTopics();
    }
  }, [messages]);

  const generatePreviewTopics = () => {
    // Extract key topics from recent messages for preview
    const recentMessages = messages.slice(-4);
    const topics = recentMessages
      .filter(m => m.content.length > 20)
      .map(m => {
        const words = m.content.split(' ');
        // Find capitalized words or topics (simple heuristic)
        const topics = words.filter(word => 
          word.length > 4 && 
          (word[0] === word[0].toUpperCase() || 
           word.toLowerCase().includes('research') ||
           word.toLowerCase().includes('study') ||
           word.toLowerCase().includes('analysis'))
        );
        return topics.slice(0, 2);
      })
      .flat()
      .filter((topic, index, arr) => arr.indexOf(topic) === index)
      .slice(0, 3);
    
    setPreviewTopics(topics);
  };

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
