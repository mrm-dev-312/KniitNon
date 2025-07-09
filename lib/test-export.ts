import { convertToMarkdown, convertToText, generateFilename } from './export-utils';
import { OutlineNode } from './stores/outline-store';

// Test data
const testNodes: OutlineNode[] = [
  {
    id: '1',
    title: 'Introduction to AI',
    type: 'topic',
    order: 0,
    content: 'This section covers the basics of artificial intelligence.'
  },
  {
    id: '2',
    title: 'Machine Learning Fundamentals',
    type: 'subtopic',
    order: 1,
    content: 'An overview of machine learning concepts and algorithms.'
  },
  {
    id: '3',
    title: 'Neural Networks',
    type: 'detail',
    order: 2,
    content: 'Deep dive into neural network architectures.'
  }
];

// Test markdown export
console.log('=== MARKDOWN EXPORT TEST ===');
const markdownOutput = convertToMarkdown(testNodes, 'Generated outline content here...');
console.log(markdownOutput);

console.log('\n=== TEXT EXPORT TEST ===');
const textOutput = convertToText(testNodes, 'Generated outline content here...');
console.log(textOutput);

console.log('\n=== FILENAME GENERATION TEST ===');
console.log('Markdown filename:', generateFilename('outline', 'md'));
console.log('Text filename:', generateFilename('outline', 'txt'));
