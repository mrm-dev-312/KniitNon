// Test the improved topic extraction with the ChatGPT example
const testMessage = {
  role: 'assistant',
  content: `Sure! Below is a research outline focusing on ChatGPT, exploring its development, applications, implications, and challenges.

### Research Outline: ChatGPT

#### I. Introduction

   A. Background on AI and Natural Language Processing (NLP)

   B. Overview of ChatGPT

      1. Definition and purpose

      2. Evolution and iterations (GPT-1, GPT-2, GPT-3, GPT-4)

   C. Significance of the study

#### II. The Development of ChatGPT

   A. Technological Foundations

      1. Neural networks

      2. Transformer architecture

   B. Training Process

      1. Datasets used (size, diversity)

      2. Training methodologies (supervised, reinforcement learning)

   C. Key Innovations

      1. Scaling laws in language models

      2. Prompt engineering

#### III. Applications of ChatGPT

   A. Consumer Use Cases

      1. Writing assistance (emails, articles, creative writing)

      2. Language translation

      3. Chatbots and virtual assistants

   B. Business Applications

      1. Customer service automation

      2. Content generation for marketing

      3. Data analysis and summarization

   C. Educational Tools

      1. Tutoring and personalized learning

      2. Enhancing research efficiency

#### IV. Ethical Considerations

   A. Bias and Fairness

      1. Origin of biases in training data

      2. Impacts of biased outputs

   B. Misinformation and Disinformation

      1. Risks of generating false or misleading content

   C. Privacy and Data Security

      1. Handling user data

      2. compliance with regulations (GDPR, CCPA)

#### V. Societal Implications

   A. Impact on Employment

      1. Job displacement and creation

      2. Changes in skill requirements

   B. Human-AI Collaboration

      1. Enhancements in productivity

      2. Role of human oversight

   C. Accessibility and Digital Divide

      1. Democratization of information

      2. Bridging or widening gaps in access to technology`
};

// Test preview topic extraction (similar to HomeClient logic)
function testPreviewExtraction(content) {
  const topics = [];
  
  // Extract topics from structured outlines (Roman numerals, bullet points)
  const outlineMatches = content.match(/(?:^\s*(?:I{1,3}|IV|V|VI{1,3}|IX|X|\d+\.|\-|\*)\s+)(.+)/gm);
  if (outlineMatches) {
    outlineMatches.forEach(match => {
      const topic = match.replace(/^\s*(?:I{1,3}|IV|V|VI{1,3}|IX|X|\d+\.|\-|\*)\s+/, '').trim();
      if (topic.length > 10 && topic.length < 60) {
        topics.push(topic);
      }
    });
  }
  
  // Extract section headings (### format)
  const headingMatches = content.match(/#{1,4}\s+(.+)/g);
  if (headingMatches) {
    headingMatches.forEach(match => {
      const topic = match.replace(/#{1,4}\s+/, '').trim();
      if (topic.length > 5 && topic.length < 60) {
        topics.push(topic);
      }
    });
  }
  
  return Array.from(new Set(topics)).slice(0, 4);
}

// Test API fallback extraction
function testAPIExtraction(content) {
  const topics = [];
  
  // Extract structured outline content (Roman numerals, numbered lists)
  const outlineMatches = content.match(/(?:^\s*(?:I{1,3}|IV|V|VI{1,3}|IX|X|\d+\.|\-|\*)\s+)(.+?)(?=\n|$)/gm);
  if (outlineMatches && outlineMatches.length > 3) {
    outlineMatches.slice(0, 8).forEach((match) => {
      const cleanTitle = match.replace(/^\s*(?:I{1,3}|IV|V|VI{1,3}|IX|X|\d+\.|\-|\*)\s+/, '').trim();
      if (cleanTitle.length > 10 && cleanTitle.length < 100) {
        topics.push({
          title: cleanTitle,
          content: `Research area: ${cleanTitle}. Explore this topic in depth through academic investigation and analysis.`
        });
      }
    });
  }
  
  // Extract section headings (### format)
  const headingMatches = content.match(/#{1,4}\s+(.+)/g);
  if (headingMatches) {
    headingMatches.slice(0, 6).forEach(match => {
      const cleanTitle = match.replace(/#{1,4}\s+/, '').trim();
      if (cleanTitle.length > 5 && cleanTitle.length < 80) {
        topics.push({
          title: cleanTitle,
          content: `Key research area: ${cleanTitle}. This topic offers multiple avenues for academic exploration and investigation.`
        });
      }
    });
  }
  
  return topics.slice(0, 10);
}

console.log('=== Testing Topic Extraction ===\n');

console.log('Preview Topics (HomeClient):', testPreviewExtraction(testMessage.content));
console.log('\nAPI Topics (Fallback):', testAPIExtraction(testMessage.content).map(t => t.title));

console.log('\n=== Expected vs Actual ===');
console.log('Expected topics like: "Development of ChatGPT", "Applications of ChatGPT", "Ethical Considerations"');
console.log('Should NOT include: "Hello!", "research", "ChatGPT", "Generate Research Map"');
