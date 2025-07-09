import { Chat } from '@/components/ai/chat';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-bold text-center mb-4">KniitNon</h1>
        <p className="text-center text-muted-foreground mb-8">
          This is a functional, full-stack chat application scaffold.
        </p>
        
        <div className="flex gap-4 justify-center mb-8">
          <Link href="/dashboard">
            <Button size="lg">
              Open Research Explorer
            </Button>
          </Link>
        </div>
        
        <Chat />
      </div>
    </div>
  );
}
