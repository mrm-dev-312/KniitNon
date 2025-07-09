import { NextResponse } from 'next/server';

export async function GET() {
  // Placeholder for fetching initial exploration data (nodes)
  // This will eventually connect to Prisma to fetch actual data
  const nodes = [
    {
      id: '1',
      title: 'Node 1: Introduction to AI',
      content: 'Artificial intelligence (AI) is a broad field...',
      depth: 0,
      lens: 'Technology',
      sources: [],
      children: ['2', '3'],
      parents: [],
      conflicts: [],
    },
    {
      id: '2',
      title: 'Node 2: Machine Learning Basics',
      content: 'Machine learning is a subset of AI...',
      depth: 1,
      lens: 'Technology',
      sources: [],
      children: [],
      parents: ['1'],
      conflicts: [],
    },
    {
      id: '3',
      title: 'Node 3: Ethical Considerations of AI',
      content: 'As AI becomes more prevalent, ethical concerns arise...',
      depth: 1,
      lens: 'Ethics',
      sources: [],
      children: [],
      parents: ['1'],
      conflicts: [],
    },
  ];

  return NextResponse.json(nodes);
}
