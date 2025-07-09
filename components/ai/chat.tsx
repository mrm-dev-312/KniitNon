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
    <div className="flex flex-col w-full max-w-2xl mx-auto stretch border rounded-lg shadow-xl">
      <div className="flex-grow p-6 overflow-y-auto min-h-[400px]">
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
            Error: {error.message}
          </div>
        )}
        {messages.length > 0
          ? messages.map(m => (
              <div key={m.id} className="whitespace-pre-wrap mb-4">
                <span className={m.role === 'user' ? 'font-bold' : 'font-semibold text-primary'}>
                  {m.role === 'user' ? 'User: ' : 'AI: '}
                </span>
                {m.content}
              </div>
            ))
          : <div className="text-center text-muted-foreground">Start the conversation...</div>}
        {isLoading && (
          <div className="mb-4">
            <span className="font-semibold text-primary">AI: </span>
            <span className="animate-pulse">Thinking...</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex items-center">
          <input
            className="flex-grow w-full p-2 border rounded-md bg-secondary text-foreground"
            value={input}
            placeholder="Say something..."
            onChange={handleInputChange}
            disabled={isLoading}
          />
          <Button type="submit" className="ml-4" disabled={isLoading || !input.trim()}>
            {isLoading ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </form>
    </div>
  );
}
