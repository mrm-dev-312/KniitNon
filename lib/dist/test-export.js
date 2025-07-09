"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const export_utils_1 = require("./export-utils");
// Test data
const testNodes = [
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
const markdownOutput = (0, export_utils_1.convertToMarkdown)(testNodes, 'Generated outline content here...');
console.log(markdownOutput);
console.log('\n=== TEXT EXPORT TEST ===');
const textOutput = (0, export_utils_1.convertToText)(testNodes, 'Generated outline content here...');
console.log(textOutput);
console.log('\n=== FILENAME GENERATION TEST ===');
console.log('Markdown filename:', (0, export_utils_1.generateFilename)('outline', 'md'));
console.log('Text filename:', (0, export_utils_1.generateFilename)('outline', 'txt'));
