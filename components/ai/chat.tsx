'use client';

import { useChat } from 'ai/react';
import { Button } from '@/components/ui/button';
import { useChatContext } from '@/lib/contexts/ChatContext';
import { useEffect } from 'react';

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/chat',
  });
  const { setMessages: setChatContextMessages } = useChatContext();

  // Sync messages with context
  useEffect(() => {
    setChatContextMessages(messages);
  }, [messages, setChatContextMessages]);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 p-4 overflow-y-auto min-h-0">
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
            Error: {error.message}
          </div>
        )}
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
              </div>
            ))
          : <div className="text-center text-muted-foreground py-8">Start the conversation...</div>}
        {isLoading && (
          <div className="mb-4">
            <span className="font-semibold text-primary">AI: </span>
            <span className="animate-pulse">Thinking...</span>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 border-t bg-background">
        <form onSubmit={handleSubmit} className="p-4">
          <div className="flex items-center gap-2">
            <input
              className="flex-1 p-2 border rounded-md bg-secondary text-foreground text-sm"
              value={input}
              placeholder="Say something..."
              onChange={handleInputChange}
              disabled={isLoading}
            />
            <Button type="submit" size="sm" disabled={isLoading || !input.trim()}>
              {isLoading ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
