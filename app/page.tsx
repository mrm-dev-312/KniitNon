import HomeClient from '@/components/HomeClient';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-bold text-center mb-4">KniitNon</h1>
        <p className="text-center text-muted-foreground mb-8">
          This is a functional, full-stack chat application scaffold.
        </p>
        
        <HomeClient />
      </div>
    </div>
  );
}
