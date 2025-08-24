// Manual test script to verify the improved topic extraction functionality
// This script simulates the regex patterns we've improved

function testHeadingExtraction() {
  const testContent = `
# Research Overview

## Introduction

### 1

### 2.1 Subsection

### Artificial Intelligence Applications

### A.

### Machine Learning Fundamentals

### B.1

### Natural Language Processing

### Introduction

### Conclusion

### Deep Learning Techniques

### Research Outline
  `;

  console.log("Testing improved heading extraction...\n");

  // The improved regex pattern we implemented
  const headingMatches = testContent.match(/#{1,4}\s+(.+)/g);
  
  if (headingMatches) {
    console.log("All headings found:");
    headingMatches.forEach(match => {
      const topic = match.replace(/#{1,4}\s+/, '').trim();
      console.log(`  - "${topic}"`);
    });

    console.log("\nFiltered headings (after our improvements):");
    headingMatches.forEach(match => {
      const topic = match.replace(/#{1,4}\s+/, '').trim();
      
      // Apply our improved filtering
      if (topic.length > 5 && topic.length < 60 && 
          !topic.includes('Research Outline') &&
          !topic.match(/^\d+\.?$/) &&  // Exclude pure numbers like "1" or "1."
          !topic.match(/^\d+\.\d+/) && // Exclude numbered subsections like "1.1"
          !topic.match(/^[A-Za-z]\.$/) && // Exclude single letters like "A."
          topic !== 'Introduction' && topic !== 'Conclusion') {
        console.log(`  ✅ INCLUDED: "${topic}"`);
      } else {
        console.log(`  ❌ EXCLUDED: "${topic}" (${getExclusionReason(topic)})`);
      }
    });
  }
}

function getExclusionReason(topic) {
  if (topic.length <= 5) return "too short";
  if (topic.length >= 60) return "too long";
  if (topic.includes('Research Outline')) return "generic outline title";
  if (topic.match(/^\d+\.?$/)) return "pure number";
  if (topic.match(/^\d+\.\d+/)) return "numbered subsection";
  if (topic.match(/^[A-Za-z]\.$/)) return "single letter";
  if (topic === 'Introduction' || topic === 'Conclusion') return "generic section";
  return "unknown";
}

function testRootTitleDetermination() {
  console.log("\n\nTesting root title determination...\n");

  const mockMessages = [
    {
      role: 'user',
      content: 'I want to research artificial intelligence and machine learning applications in healthcare'
    },
    {
      role: 'assistant', 
      content: 'That sounds like a fascinating area! Machine learning has numerous applications in medical diagnosis, treatment planning, and drug discovery.'
    },
    {
      role: 'user',
      content: 'Can you help me understand neural networks and deep learning specifically for medical imaging?'
    }
  ];

  const mockTopics = [
    { title: 'Artificial Intelligence in Healthcare', content: 'Overview of AI applications' },
    { title: 'Machine Learning for Medical Diagnosis', content: 'ML diagnostic systems' },
    { title: 'Neural Networks in Medical Imaging', content: 'Deep learning for imaging' }
  ];

  // Simulate the determineRootTitle function logic
  const allText = mockMessages.map(m => m.content.toLowerCase()).join(' ');
  console.log("Combined text:", allText);

  const themes = [
    'artificial intelligence', 'machine learning', 'neural networks',
    'healthcare', 'medical', 'diagnosis'
  ];

  console.log("\nTheme detection:");
  themes.forEach(theme => {
    const count = (allText.match(new RegExp(theme, 'gi')) || []).length;
    console.log(`  - "${theme}": ${count} occurrences`);
  });

  // Find best theme
  let bestTheme = '';
  let maxCount = 0;
  
  themes.forEach(theme => {
    const count = (allText.match(new RegExp(theme, 'gi')) || []).length;
    if (count > maxCount) {
      maxCount = count;
      bestTheme = theme;
    }
  });

  if (bestTheme && maxCount > 1) {
    const rootTitle = bestTheme.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    console.log(`\n✅ DETERMINED ROOT TITLE: "${rootTitle}"`);
  } else {
    console.log(`\n❌ No clear theme found, would use fallback`);
  }
}

// Run the tests
testHeadingExtraction();
testRootTitleDetermination();

console.log("\n🎯 Test completed! The improvements should:");
console.log("1. ❌ Exclude numbered headings like '### 1', '### 2.1'");
console.log("2. ❌ Exclude single letters like '### A.'");
console.log("3. ❌ Exclude generic titles like 'Introduction', 'Conclusion'");
console.log("4. ✅ Include meaningful topics like 'Artificial Intelligence Applications'");
console.log("5. ✅ Determine appropriate root titles from conversation themes");
