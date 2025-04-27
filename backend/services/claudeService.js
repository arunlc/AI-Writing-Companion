// services/claudeService.js
const { Anthropic } = require('@anthropic-ai/sdk');

console.log('Loading claudeService.js with updated SDK');

let anthropic = null;

try {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log('ANTHROPIC_API_KEY exists:', !!apiKey);
  
  if (apiKey) {
    // Initialize with the latest SDK format
    anthropic = new Anthropic({ apiKey });
    console.log('Anthropic client initialized with latest SDK');
  } else {
    console.warn('No API key found, Claude features will be disabled');
  }
} catch (error) {
  console.error('Error initializing Anthropic client:', error);
}

// Functions using the latest SDK format
async function checkGrammarWithClaude(text) {
  if (!anthropic) {
    console.log('Using fallback for grammar analysis - no client');
    return fallbackGrammarCheck(text);
  }
  
  try {
    const truncatedText = text.length > 5000 ? text.substring(0, 5000) + '...' : text;
    
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      system: `You are a writing tutor. Analyze the text for grammar. Return JSON format with these fields:
      {
        "errors": [{"original": "text with error", "correction": "corrected text", "explanation": "why this is an error"}],
        "score": 0-100 score,
        "summary": "summary of issues",
        "correctedText": "corrected version"
      }`,
      messages: [{ role: "user", content: truncatedText }]
    });
    
    return JSON.parse(response.content[0].text);
  } catch (error) {
    console.error('Claude grammar analysis error:', error);
    return fallbackGrammarCheck(text);
  }
}

// Add similar updates to the other functions...

// Fallback method for grammar
function fallbackGrammarCheck(text) {
  return {
    errors: [],
    score: 85,
    summary: "Grammar checked with basic system only.",
    correctedText: text
  };
}

module.exports = {
  checkGrammarWithClaude,
  analyzeCharactersWithClaude,
  detectAIContentWithClaude
};
