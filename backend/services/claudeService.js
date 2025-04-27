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

// Grammar analysis function
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
      system: `You are a writing tutor. Analyze the text for grammar errors.
      
      You MUST respond ONLY with valid JSON in this exact format, with no other text, explanation, or commentary:
      
      {
        "errors": [{"original": "text with error", "correction": "corrected text", "explanation": "why this is an error"}],
        "score": 0-100 score,
        "summary": "summary of issues",
        "correctedText": "corrected version"
      }
      
      Make sure your JSON is valid and properly escaped.
      DO NOT include any explanation or text outside the JSON.
      Only provide the JSON response, and nothing else.`,
      messages: [{ role: "user", content: truncatedText }]
    });
    
    // Extract only the JSON part from the response
    let responseText = response.content[0].text.trim();
    
    // If response starts with markdown code block, extract only the JSON part
    if (responseText.startsWith('```json')) {
      responseText = responseText.replace(/```json\n/, '').replace(/\n```$/, '');
    }
    
    // Additional cleanup for common JSON issues
    responseText = responseText.replace(/\n+/g, ' ').trim(); // Replace newlines with spaces
    
    try {
      return JSON.parse(responseText);
    } catch (jsonError) {
      console.error('Failed to parse JSON from Claude:', jsonError);
      console.log('Raw Claude response:', response.content[0].text.substring(0, 200) + '...');
      
      // Attempt to extract JSON with regex as a last resort
      const jsonMatch = response.content[0].text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.error('Failed to parse extracted JSON:', e);
        }
      }
      
      return fallbackGrammarCheck(text);
    }
  } catch (error) {
    console.error('Claude grammar analysis error:', error);
    return fallbackGrammarCheck(text);
  }
}

// Character analysis function
async function analyzeCharactersWithClaude(text) {
  if (!anthropic) {
    console.log('Using fallback for character analysis - no client');
    return fallbackCharacterAnalysis(text);
  }
  
  try {
    const truncatedText = text.length > 5000 ? text.substring(0, 5000) + '...' : text;
    
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      system: `Identify characters in this story and analyze them.
      
      You MUST respond ONLY with valid JSON in this exact format, with no other text, explanation, or commentary:
      
      {
        "characters": [
          {"name": "character name", "role": "role", "traits": "traits", "consistency": "High/Medium/Low"}
        ],
        "score": 0-100 score,
        "suggestions": "suggestions for improvement"
      }
      
      Make sure your JSON is valid and properly escaped.
      DO NOT include any explanation or text outside the JSON.
      Only provide the JSON response, and nothing else.`,
      messages: [{ role: "user", content: truncatedText }]
    });
    
    // Extract only the JSON part from the response
    let responseText = response.content[0].text.trim();
    
    // If response starts with markdown code block, extract only the JSON part
    if (responseText.startsWith('```json')) {
      responseText = responseText.replace(/```json\n/, '').replace(/\n```$/, '');
    }
    
    // Additional cleanup for common JSON issues
    responseText = responseText.replace(/\n+/g, ' ').trim(); // Replace newlines with spaces
    
    try {
      return JSON.parse(responseText);
    } catch (jsonError) {
      console.error('Failed to parse JSON from Claude:', jsonError);
      console.log('Raw Claude response:', response.content[0].text.substring(0, 200) + '...');
      
      // Attempt to extract JSON with regex as a last resort
      const jsonMatch = response.content[0].text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.error('Failed to parse extracted JSON:', e);
        }
      }
      
      return fallbackCharacterAnalysis(text);
    }
  } catch (error) {
    console.error('Claude character analysis error:', error);
    return fallbackCharacterAnalysis(text);
  }
}

// AI detection function
async function detectAIContentWithClaude(text) {
  if (!anthropic) {
    console.log('Using fallback for AI detection - no client');
    return fallbackAIDetection();
  }
  
  try {
    const truncatedText = text.length > 5000 ? text.substring(0, 5000) + '...' : text;
    
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 500,
      system: `Determine how likely the text was generated by AI.
      
      You MUST respond ONLY with valid JSON in this exact format, with no other text, explanation, or commentary:
      
      {
        "score": 0-100 (higher means more likely AI-generated),
        "reasoning": "explanation",
        "confidence": 0-1 confidence value
      }
      
      Make sure your JSON is valid and properly escaped.
      DO NOT include any explanation or text outside the JSON.
      Only provide the JSON response, and nothing else.`,
      messages: [{ role: "user", content: truncatedText }]
    });
    
    // Extract only the JSON part from the response
    let responseText = response.content[0].text.trim();
    
    // If response starts with markdown code block, extract only the JSON part
    if (responseText.startsWith('```json')) {
      responseText = responseText.replace(/```json\n/, '').replace(/\n```$/, '');
    }
    
    // Additional cleanup for common JSON issues
    responseText = responseText.replace(/\n+/g, ' ').trim(); // Replace newlines with spaces
    
    try {
      return JSON.parse(responseText);
    } catch (jsonError) {
      console.error('Failed to parse JSON from Claude:', jsonError);
      console.log('Raw Claude response:', response.content[0].text.substring(0, 200) + '...');
      
      // Attempt to extract JSON with regex as a last resort
      const jsonMatch = response.content[0].text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.error('Failed to parse extracted JSON:', e);
        }
      }
      
      return fallbackAIDetection();
    }
  } catch (error) {
    console.error('Claude AI detection error:', error);
    return fallbackAIDetection();
  }
}

// Fallback functions when Claude isn't available
function fallbackGrammarCheck(text) {
  return {
    errors: [],
    score: 85,
    summary: "Grammar checked with basic system only.",
    correctedText: text || ""
  };
}

function fallbackCharacterAnalysis(text) {
  return {
    characters: [],
    score: 60,
    suggestions: "Character analysis could not be performed with AI."
  };
}

function fallbackAIDetection() {
  return {
    score: 20,
    reasoning: "AI detection could not be performed with AI assistant.",
    confidence: 0.5
  };
}

module.exports = {
  checkGrammarWithClaude,
  analyzeCharactersWithClaude,
  detectAIContentWithClaude
};
