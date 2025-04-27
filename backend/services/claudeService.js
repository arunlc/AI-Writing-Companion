// services/claudeService.js
console.log('Starting claudeService.js initialization');

// Debug environment variables
console.log('Environment variables available:', Object.keys(process.env).filter(key => !key.includes('SECRET')).join(', '));
console.log('ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);
console.log('API key begins with:', process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.substring(0, 7) + '...' : 'undefined');

let anthropic = null;

try {
  console.log('Attempting to import Anthropic SDK');
  const { Anthropic } = require('@anthropic-ai/sdk');
  console.log('Successfully imported Anthropic SDK');
  
  if (process.env.ANTHROPIC_API_KEY) {
    console.log('Initializing Anthropic client with API key');
    try {
      anthropic = new Anthropic({ 
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      console.log('Anthropic client created:', !!anthropic);
      console.log('Anthropic client messages property exists:', !!(anthropic && anthropic.messages));
    } catch (initError) {
      console.error('Error initializing Anthropic client:', initError);
    }
  } else {
    console.warn('No API key found, skipping Anthropic client initialization');
  }
} catch (importError) {
  console.error('Error importing Anthropic SDK:', importError);
}

// Grammar analysis with extensive fallback
async function checkGrammarWithClaude(text) {
  console.log('checkGrammarWithClaude called, anthropic exists:', !!anthropic);
  
  if (!anthropic || !anthropic.messages) {
    console.log('Using fallback for grammar analysis');
    return {
      errors: [],
      score: 85,
      summary: "Grammar could not be checked with AI. Using basic scoring instead.",
      correctedText: text
    };
  }
  
  try {
    console.log("Calling Claude for grammar analysis");
    const truncatedText = text.length > 5000 ? text.substring(0, 5000) + '...' : text;
    
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      system: `You are a writing tutor for students. Analyze the text for grammar.
      Return your analysis in JSON format with these fields:
      {
        "errors": [{"original": "text with error", "correction": "corrected text", "explanation": "why this is an error"}],
        "score": 0-100 score evaluating grammar quality,
        "summary": "kid-friendly summary of grammar strengths and areas to improve",
        "correctedText": "full corrected version of the text"
      }`,
      messages: [{ role: "user", content: truncatedText }]
    });
    
    console.log("Claude grammar response received");
    return JSON.parse(response.content[0].text);
  } catch (error) {
    console.error('Claude grammar analysis error:', error);
    return {
      errors: [],
      score: 75,
      summary: "Unable to analyze grammar with AI assistant.",
      correctedText: text
    };
  }
}

// Character analysis with fallback
async function analyzeCharactersWithClaude(text) {
  console.log('analyzeCharactersWithClaude called, anthropic exists:', !!anthropic);
  
  if (!anthropic || !anthropic.messages) {
    console.log('Using fallback for character analysis');
    return {
      characters: [],
      score: 60,
      suggestions: "Character analysis could not be performed with AI."
    };
  }
  
  try {
    console.log("Calling Claude for character analysis");
    const truncatedText = text.length > 5000 ? text.substring(0, 5000) + '...' : text;
    
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      system: `Identify characters in this story and analyze them.
      Return JSON format with these fields:
      {
        "characters": [
          {"name": "character name", "role": "role", "traits": "traits", "consistency": "High/Medium/Low"}
        ],
        "score": 0-100 score,
        "suggestions": "suggestions for improvement"
      }`,
      messages: [{ role: "user", content: truncatedText }]
    });
    
    console.log("Claude character response received");
    return JSON.parse(response.content[0].text);
  } catch (error) {
    console.error('Claude character analysis error:', error);
    return {
      characters: [],
      score: 60,
      suggestions: "Unable to analyze characters with AI assistant."
    };
  }
}

// AI content detection with fallback
async function detectAIContentWithClaude(text) {
  console.log('detectAIContentWithClaude called, anthropic exists:', !!anthropic);
  
  if (!anthropic || !anthropic.messages) {
    console.log('Using fallback for AI detection');
    return {
      score: 20,
      reasoning: "AI detection could not be performed.",
      confidence: 0.5
    };
  }
  
  try {
    console.log("Calling Claude for AI detection");
    const truncatedText = text.length > 5000 ? text.substring(0, 5000) + '...' : text;
    
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 500,
      system: `Determine how likely the text was generated by AI. Return JSON format:
      {
        "score": 0-100 (higher means more likely AI-generated),
        "reasoning": "explanation",
        "confidence": 0-1 confidence value
      }`,
      messages: [{ role: "user", content: truncatedText }]
    });
    
    console.log("Claude AI detection response received");
    return JSON.parse(response.content[0].text);
  } catch (error) {
    console.error('Claude AI detection error:', error);
    return {
      score: 30,
      reasoning: "Unable to perform AI content detection.",
      confidence: 0.5
    };
  }
}

// Debug functions
function testAnthropicConnection() {
  console.log('Testing Anthropic connection...');
  if (!anthropic || !anthropic.messages) {
    console.log('Cannot test connection: Anthropic client not initialized');
    return false;
  }
  
  return true;
}

// Try to test the connection immediately
testAnthropicConnection();

module.exports = {
  checkGrammarWithClaude,
  analyzeCharactersWithClaude,
  detectAIContentWithClaude
};
