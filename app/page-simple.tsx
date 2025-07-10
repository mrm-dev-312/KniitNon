'use client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function Home() {
  return (
    <div>
      <h1>Simple Test Page</h1>
      <p>This is a simple test to isolate the clientModules error.</p>
    </div>
  );
}
