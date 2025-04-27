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
    console.log('Grammar analysis: Starting API call to Claude');
    
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
    
    console.log('Grammar analysis: Received response from Claude');
    
    // Extract only the JSON part from the response
    let responseText = response.content[0].text.trim();
    console.log('Grammar analysis raw response (first 100 chars):', responseText.substring(0, 100));
    
    // If response starts with markdown code block, extract only the JSON part
    if (responseText.startsWith('```json')) {
      console.log('Grammar analysis: Detected JSON code block, extracting content');
      responseText = responseText.replace(/```json\n/, '').replace(/\n```$/, '');
    }
    
    // Additional cleanup for common JSON issues
    responseText = responseText.replace(/\n+/g, ' ').trim(); // Replace newlines with spaces
    
    try {
      const result = JSON.parse(responseText);
      console.log('Grammar analysis: Successfully parsed JSON', {
        score: result.score,
        errorCount: result.errors ? result.errors.length : 0
      });
      return result;
    } catch (jsonError) {
      console.error('Failed to parse JSON from Claude for grammar analysis:', jsonError);
      console.log('Raw Claude response for grammar analysis:', responseText.substring(0, 200) + '...');
      
      // Attempt to extract JSON with regex as a last resort
      console.log('Grammar analysis: Attempting regex JSON extraction');
      const jsonMatch = response.content[0].text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const result = JSON.parse(jsonMatch[0]);
          console.log('Grammar analysis: Successfully extracted JSON with regex', {
            score: result.score,
            errorCount: result.errors ? result.errors.length : 0
          });
          return result;
        } catch (e) {
          console.error('Failed to parse extracted JSON for grammar analysis:', e);
        }
      }
      
      console.log('Grammar analysis: All parsing attempts failed, using fallback');
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
    console.log('Character analysis: Starting API call to Claude');
    
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
    
    console.log('Character analysis: Received response from Claude');
    
    // Extract only the JSON part from the response
    let responseText = response.content[0].text.trim();
    console.log('Character analysis raw response (first 100 chars):', responseText.substring(0, 100));
    
    // If response starts with markdown code block, extract only the JSON part
    if (responseText.startsWith('```json')) {
      console.log('Character analysis: Detected JSON code block, extracting content');
      responseText = responseText.replace(/```json\n/, '').replace(/\n```$/, '');
    }
    
    // Additional cleanup for common JSON issues
    responseText = responseText.replace(/\n+/g, ' ').trim(); // Replace newlines with spaces
    
    try {
      const result = JSON.parse(responseText);
      console.log('Character analysis: Successfully parsed JSON', {
        score: result.score,
        characterCount: result.characters ? result.characters.length : 0
      });
      return result;
    } catch (jsonError) {
      console.error('Failed to parse JSON from Claude for character analysis:', jsonError);
      console.log('Raw Claude response for character analysis:', responseText.substring(0, 200) + '...');
      
      // Attempt to extract JSON with regex as a last resort
      console.log('Character analysis: Attempting regex JSON extraction');
      const jsonMatch = response.content[0].text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const result = JSON.parse(jsonMatch[0]);
          console.log('Character analysis: Successfully extracted JSON with regex', {
            score: result.score,
            characterCount: result.characters ? result.characters.length : 0
          });
          return result;
        } catch (e) {
          console.error('Failed to parse extracted JSON for character analysis:', e);
        }
      }
      
      console.log('Character analysis: All parsing attempts failed, using fallback');
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
    console.log('AI detection: Starting API call to Claude with text length:', truncatedText.length);
    console.log('AI detection: Sample of text:', truncatedText.substring(0, 100));
    
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 500,
      system: `You are an expert in detecting AI-generated text. Analyze the provided text and determine how likely it was generated by an AI system like ChatGPT, Claude, or similar large language models.

      Pay careful attention to:
      - Repetitive or formulaic phrasing
      - Lack of personal experiences or specific details
      - Generic descriptions
      - Overly perfect grammar and structure
      - Lack of idiosyncrasies or unique voice
      
      You MUST respond ONLY with valid JSON in this exact format, with no other text, explanation, or commentary:
      
      {
        "score": 0-100 (higher means more likely AI-generated),
        "reasoning": "detailed explanation of why you believe the text is or isn't AI-generated",
        "confidence": 0-1 confidence value
      }
      
      If the text appears CLEARLY AI-generated, score it 80-100.
      If the text CLEARLY appears human-written, score it 0-20.
      Uncertain cases should be scored between 20-80.
      
      Make sure your JSON is valid and properly escaped.
      DO NOT include any explanation or text outside the JSON.
      Only provide the JSON response, and nothing else.`,
      messages: [{ role: "user", content: truncatedText }]
    });
    
    console.log('AI detection: Received response from Claude');
    
    // Extract only the JSON part from the response
    let responseText = response.content[0].text.trim();
    console.log('AI detection raw response:', responseText);
    
    // If response starts with markdown code block, extract only the JSON part
    if (responseText.startsWith('```json')) {
      console.log('AI detection: Detected JSON code block, extracting content');
      responseText = responseText.replace(/```json\n/, '').replace(/\n```$/, '');
    }
    
    // Additional cleanup for common JSON issues
    responseText = responseText.replace(/\n+/g, ' ').trim(); // Replace newlines with spaces
    
    try {
      const result = JSON.parse(responseText);
      console.log('AI detection: Successfully parsed JSON', {
        score: result.score,
        confidence: result.confidence,
        reasoning: result.reasoning ? result.reasoning.substring(0, 100) + '...' : 'No reasoning provided'
      });
      return result;
    } catch (jsonError) {
      console.error('Failed to parse JSON from Claude for AI detection:', jsonError);
      console.log('Raw Claude response for AI detection:', responseText);
      
      // Attempt to extract JSON with regex as a last resort
      console.log('AI detection: Attempting regex JSON extraction');
      const jsonMatch = response.content[0].text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const matchedJson = jsonMatch[0];
          console.log('AI detection: Extracted potential JSON:', matchedJson);
          const result = JSON.parse(matchedJson);
          console.log('AI detection: Successfully extracted JSON with regex', {
            score: result.score,
            confidence: result.confidence
          });
          return result;
        } catch (e) {
          console.error('Failed to parse extracted JSON for AI detection:', e);
        }
      }
      
      console.log('AI detection: All parsing attempts failed, using fallback');
      return fallbackAIDetection();
    }
  } catch (error) {
    console.error('Claude AI detection error:', error);
    return fallbackAIDetection();
  }
}

// Fallback functions when Claude isn't available
function fallbackGrammarCheck(text) {
  console.log('Using fallback grammar check function');
  return {
    errors: [],
    score: 85,
    summary: "Grammar checked with basic system only.",
    correctedText: text || ""
  };
}

function fallbackCharacterAnalysis(text) {
  console.log('Using fallback character analysis function');
  return {
    characters: [],
    score: 60,
    suggestions: "Character analysis could not be performed with AI."
  };
}

function fallbackAIDetection() {
  console.log('Using fallback AI detection function - THIS IS A FALLBACK VALUE, NOT REAL ANALYSIS');
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
