'use client';

import { useChat } from 'ai/react';
import { Button } from '@/components/ui/button';
import { useChatContext } from '@/lib/contexts/ChatContext';
import { useOutlineStore } from '@/lib/stores/outline-store';
import { UnifiedNodeGenerator } from '@/lib/utils/unified-node-generator';
import { useEffect, useState, useCallback } from 'react';

interface ChatProps {
  onNodesGenerated?: (nodeCount: number) => void;
  autoGenerateNodes?: boolean;
}

export function Chat({ onNodesGenerated, autoGenerateNodes = true }: ChatProps) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/chat',
  });
  const { setMessages: setChatContextMessages } = useChatContext();
  const { addNode, nodes: existingNodes } = useOutlineStore();
  const [isGeneratingNodes, setIsGeneratingNodes] = useState(false);
  const [lastProcessedMessageId, setLastProcessedMessageId] = useState<string | null>(null);

  // Sync messages with context
  useEffect(() => {
    setChatContextMessages(messages);
  }, [messages, setChatContextMessages]);

  // Auto-generate nodes from AI responses
  const processAIResponse = useCallback(async (message: any, messageIndex: number) => {
    if (!autoGenerateNodes || message.role !== 'assistant' || message.content.trim().length < 30) {
      return;
    }

    // Avoid processing the same message twice
    if (lastProcessedMessageId === message.id) {
      return;
    }

    setIsGeneratingNodes(true);
    setLastProcessedMessageId(message.id);

    try {
      console.log('🧠 Processing AI response for node generation:', message.content.substring(0, 100) + '...');
      
      const result = await UnifiedNodeGenerator.generateNodes(
        message.content,
        {
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
          messageIndex,
          existingNodes: existingNodes.map(node => ({
            id: node.id,
            title: node.title,
            content: node.content || '',
            type: node.type,
            level: 0,
            confidence: 0.8,
            source: 'conversation' as const,
            connections: [],
            metadata: { generatedAt: new Date().toISOString(), method: 'conversational' }
          }))
        }
      );

      if (result.nodes.length > 0) {
        console.log(`✅ Generated ${result.nodes.length} nodes with ${result.stats.confidence} confidence`);
        
        // Convert to outline nodes and add to store
        const outlineNodes = UnifiedNodeGenerator.convertToOutlineNodes(result.nodes);
        outlineNodes.forEach(node => addNode(node));
        
        // Provide user feedback
        const methodText = result.stats.structuredNodes > 0 ? 'structured parsing' : 'conversation analysis';
        console.log(`Generated ${result.nodes.length} research nodes via ${methodText} (Confidence: ${Math.round(result.stats.confidence * 100)}%)`);

        // Notify parent component
        onNodesGenerated?.(result.nodes.length);

        // Trigger visualization update
        window.dispatchEvent(new CustomEvent('nodesGenerated', { 
          detail: { 
            nodes: result.nodes, 
            stats: result.stats,
            source: 'chat-auto-generation'
          } 
        }));

      } else {
        console.log('ℹ️ No nodes generated from AI response');
      }

    } catch (error) {
      console.error('Error generating nodes from AI response:', error);
    } finally {
      setIsGeneratingNodes(false);
    }
  }, [messages, existingNodes, addNode, onNodesGenerated, autoGenerateNodes, lastProcessedMessageId]);

  // Process the most recent AI response when messages change
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant' && !isLoading) {
      // Add a small delay to ensure the message is fully rendered
      setTimeout(() => {
        processAIResponse(lastMessage, messages.length - 1);
      }, 500);
    }
  }, [messages, isLoading, processAIResponse]);

  // Manual node generation from latest AI response
  const handleManualNodeGeneration = useCallback(async () => {
    const lastAIMessage = [...messages].reverse().find(m => m.role === 'assistant');
    if (!lastAIMessage) {
      console.error('No AI response found to generate nodes from');
      return;
    }

    await processAIResponse(lastAIMessage, messages.indexOf(lastAIMessage));
  }, [messages, processAIResponse]);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 p-4 overflow-y-auto min-h-0">
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
            Error: {error.message}
          </div>
        )}
        
        {/* Chat messages */}
        {messages.length > 0
          ? messages.map(m => (
              <div key={m.id} className="whitespace-pre-wrap mb-4" data-role={m.role}>
                <span className={m.role === 'user' ? 'font-bold' : 'font-semibold text-primary'}>
                  {m.role === 'user' ? 'User: ' : 'AI: '}
                </span>
                <div className="mt-1 text-sm leading-relaxed">
                  {m.content.split('\n').map((line, index) => (
                    <p key={index} className="mb-2 last:mb-0">
                      {line}
                    </p>
                  ))}
                </div>
                {/* Show node generation indicator for AI messages */}
                {m.role === 'assistant' && isGeneratingNodes && lastProcessedMessageId === m.id && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="animate-spin h-3 w-3 border border-primary border-t-transparent rounded-full"></div>
                    <span>Generating research nodes...</span>
                  </div>
                )}
              </div>
            ))
          : <div className="text-center text-muted-foreground py-8">
              Start the conversation...<br/>
              <span className="text-xs">Ask research questions to automatically generate knowledge nodes</span>
            </div>}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="mb-4">
            <span className="font-semibold text-primary">AI: </span>
            <span className="animate-pulse">Thinking...</span>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t bg-background">
        <form onSubmit={handleSubmit} className="p-4">
          <div className="flex items-center gap-2">
            <input
              className="flex-1 p-2 border rounded-md bg-secondary text-foreground text-sm"
              value={input}
              placeholder="Ask a research question..."
              onChange={handleInputChange}
              disabled={isLoading}
            />
            <Button type="submit" size="sm" disabled={isLoading || !input.trim()}>
              {isLoading ? 'Sending...' : 'Send'}
            </Button>
          </div>
          
          {/* Manual node generation button */}
          {messages.length > 0 && messages.some(m => m.role === 'assistant') && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">
                {autoGenerateNodes ? 'Auto-generating nodes from AI responses' : 'Manual node generation available'}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleManualNodeGeneration}
                disabled={isGeneratingNodes || isLoading}
              >
                {isGeneratingNodes ? 'Generating...' : 'Generate Nodes'}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
