// services/claudeService.js
console.log('Loading claudeService.js...');

// Explicitly check for API key before importing SDK to save resources
const apiKey = process.env.ANTHROPIC_API_KEY;
console.log('ANTHROPIC_API_KEY exists:', apiKey ? 'Yes' : 'No');

let anthropic = null;

// Only try to import and initialize if API key exists
if (apiKey) {
  try {
    const { Anthropic } = require('@anthropic-ai/sdk');
    console.log('Successfully imported @anthropic-ai/sdk');
    
    // Initialize with explicit error handling
    anthropic = new Anthropic({ apiKey });
    
    // Test if client was created properly
    if (anthropic && anthropic.messages) {
      console.log('Anthropic client initialized successfully');
    } else {
      console.error('Anthropic client initialization failed - client or messages property missing');
      anthropic = null;
    }
  } catch (error) {
    console.error('Error loading or initializing Anthropic SDK:', error);
    anthropic = null;
  }
} else {
  console.warn('WARNING: ANTHROPIC_API_KEY environment variable is not set or is empty. Claude features will not work.');
}

// Grammar analysis - with robust fallback
async function checkGrammarWithClaude(text) {
  if (!anthropic || !anthropic.messages) {
    console.log('Grammar check using fallback - Anthropic client not available');
    return {
      errors: [],
      score: 85,
      summary: "Grammar could not be checked with AI. Using basic scoring instead.",
      correctedText: text
    };
  }
  
  try {
    console.log("Calling Claude for grammar analysis...");
    const truncatedText = text.length > 8000 ? text.substring(0, 8000) + '...' : text;
    
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      system: `You are a writing tutor for students. Analyze the text for grammar, spelling, punctuation, and style issues. 
      Focus on providing helpful, educational feedback that would help young writers improve.
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
    
    // Parse the JSON response with error handling
    try {
      const result = JSON.parse(response.content[0].text);
      return result;
    } catch (parseError) {
      console.error('Error parsing Claude grammar response:', parseError);
      return {
        errors: [],
        score: 80,
        summary: "Grammar analysis completed, but results could not be processed.",
        correctedText: text
      };
    }
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

// Character analysis - with robust fallback
async function analyzeCharactersWithClaude(text) {
  if (!anthropic || !anthropic.messages) {
    console.log('Character analysis using fallback - Anthropic client not available');
    return {
      characters: [],
      score: 60,
      suggestions: "Character analysis could not be performed with AI. Using basic scoring instead."
    };
  }
  
  try {
    console.log("Calling Claude for character analysis...");
    const truncatedText = text.length > 8000 ? text.substring(0, 8000) + '...' : text;
    
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      system: `You are a literary character analyst for young writers. Identify characters in this story and analyze them.
      Return your analysis in JSON format with these fields:
      {
        "characters": [
          {"name": "character name", "role": "Protagonist/Antagonist/Supporting", "traits": "personality traits", "consistency": "High/Medium/Low"}
        ],
        "score": 0-100 score evaluating character development,
        "suggestions": "kid-friendly suggestions for improving characters"
      }`,
      messages: [{ role: "user", content: truncatedText }]
    });
    
    console.log("Claude character response received");
    
    // Parse the JSON response with error handling
    try {
      const result = JSON.parse(response.content[0].text);
      return result;
    } catch (parseError) {
      console.error('Error parsing Claude character response:', parseError);
      return {
        characters: [],
        score: 65,
        suggestions: "Characters were analyzed, but results could not be processed correctly."
      };
    }
  } catch (error) {
    console.error('Claude character analysis error:', error);
    return {
      characters: [],
      score: 60,
      suggestions: "Unable to analyze characters with AI assistant."
    };
  }
}

// AI content detection - with robust fallback
async function detectAIContentWithClaude(text) {
  if (!anthropic || !anthropic.messages) {
    console.log('AI detection using fallback - Anthropic client not available');
    return {
      score: 20,
      reasoning: "AI detection could not be performed. Using conservative estimate.",
      confidence: 0.5
    };
  }
  
  try {
    console.log("Calling Claude for AI detection...");
    const truncatedText = text.length > 10000 ? text.substring(0, 10000) + '...' : text;
    
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 500,
      system: `You are an AI content detector for an educational platform. Young students submit their writing and you need to determine 
      how likely it is that the text was generated by AI. Return your analysis in JSON format with these fields:
      {
        "score": 0-100 (higher means more likely AI-generated, should be under 7 for human writing),
        "reasoning": "explanation of your evaluation",
        "confidence": 0-1 representing your confidence in this assessment
      }`,
      messages: [{ role: "user", content: truncatedText }]
    });
    
    console.log("Claude AI detection response received");
    
    // Parse the JSON response with error handling
    try {
      const result = JSON.parse(response.content[0].text);
      return result;
    } catch (parseError) {
      console.error('Error parsing Claude AI detection response:', parseError);
      return {
        score: 25,
        reasoning: "AI content was analyzed, but results could not be processed correctly.",
        confidence: 0.6
      };
    }
  } catch (error) {
    console.error('Claude AI detection error:', error);
    return {
      score: 30,
      reasoning: "Unable to perform AI content detection with AI assistant.",
      confidence: 0.5
    };
  }
}

module.exports = {
  checkGrammarWithClaude,
  analyzeCharactersWithClaude,
  detectAIContentWithClaude
};
