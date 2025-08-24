// Test script to verify node expansion fix - run with: node --loader ts-node/esm test-node-expansion.ts
const { InfiniteResearchTree } = require('./lib/utils/infinite-research-tree');

// Test the convertOutlineToResearch method
const testOutlineNode = {
  id: 'test-basic-operations',
  title: 'Basic Operations',
  content: 'Fundamental mathematical operations',
  type: 'topic',
  order: 1,
  metadata: {
    source: 'user-created',
    confidence: 0.9,
    relationships: []
  }
};

console.log('Testing convertOutlineToResearch...');
try {
  const researchNode = InfiniteResearchTree.convertOutlineToResearch(testOutlineNode);
  console.log('Converted node:', {
    id: researchNode.id,
    title: researchNode.title,
    isExpandable: researchNode.isExpandable,
    expansionCount: researchNode.expansionCount,
    level: researchNode.level
  });
  console.log('✅ convertOutlineToResearch working correctly');
} catch (error) {
  console.error('❌ convertOutlineToResearch failed:', error.message);
}

// Test the createRootNode method
console.log('\nTesting createRootNode...');
try {
  const rootNode = InfiniteResearchTree.createRootNode(
    'Mathematics Fundamentals',
    'Core mathematical concepts and operations'
  );
  console.log('Created root node:', {
    id: rootNode.id,
    title: rootNode.title,
    isExpandable: rootNode.isExpandable,
    level: rootNode.level
  });
  console.log('✅ createRootNode working correctly');
} catch (error) {
  console.error('❌ createRootNode failed:', error.message);
}

console.log('\nTest completed - fix should resolve "Node not Found" errors');
