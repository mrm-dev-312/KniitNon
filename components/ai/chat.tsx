'use client';

import { useChat } from 'ai/react';
import { Button } from '@/components/ui/button';

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto stretch border rounded-lg shadow-xl">
      <div className="flex-grow p-6 overflow-y-auto">
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
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex items-center">
          <input
            className="flex-grow w-full p-2 border rounded-md bg-secondary text-foreground"
            value={input}
            placeholder="Say something..."
            onChange={handleInputChange}
          />
          <Button type="submit" className="ml-4">Send</Button>
        </div>
      </form>
    </div>
  );
}
