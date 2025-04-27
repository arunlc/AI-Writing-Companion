const natural = require('natural');
const claudeService = require('./claudeService');

// Initialize NLP tools
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;
const analyzer = new natural.SentimentAnalyzer('English', stemmer, 'afinn');

// Cache for repeated analysis requests (helps with Render's free tier resource limits)
const analysisCache = new Map();
const CACHE_TTL = 3600000; // 1 hour in milliseconds

// Main analysis function
async function analyzeWriting(text, title = '') {
  try {
    // Add input validation
    if (!text || typeof text !== 'string') {
      console.error('Invalid text input:', text);
      return {
        basicMetrics: {
          wordCount: 0,
          sentenceCount: 0,
          avgWordsPerSentence: 0
        },
        grammar: fallbackGrammarCheck(""),
        tone: { classification: 'Neutral', confidence: 0.5, sentiment: 'Neutral', appropriateness: 70 },
        characters: { characters: [], score: 0, suggestions: "No text to analyze" },
        structure: { beginning: 'Not analyzed', middle: 'Not analyzed', end: 'Not analyzed', suggestions: 'No text to analyze', score: 0, uniqueness: 0 },
        logicalFlaws: { flaws: [], questions: [], score: 0 },
        tense: { primary: 'Not analyzed', inconsistencies: [], score: 0 },
        metrics: {
          aiScore: 50,
          plagiarismScore: 0,
          originalityScore: 0,
          genre: 'Unknown',
          subGenres: [],
          overallScore: 0
        }
      };
    }

    // Generate a cache key based on text content
    // We're using a short hash of the text to avoid storing full text as keys
    const cacheKey = hashText(text);
    
    // Check if we have a cached result for this exact text
    if (analysisCache.has(cacheKey)) {
      const cachedResult = analysisCache.get(cacheKey);
      if (Date.now() - cachedResult.timestamp < CACHE_TTL) {
        return cachedResult.analysis;
      } else {
        // Remove expired cache entry
        analysisCache.delete(cacheKey);
      }
    }
    
    // Basic text metrics
    const tokens = tokenizer.tokenize(text);
    const wordCount = tokens.length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceCount = Math.max(1, sentences.length); // Avoid division by zero
    const avgWordsPerSentence = wordCount / sentenceCount;
    
    // Define timeouts for analyses to prevent hanging operations
    const timeout = ms => new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Analysis timeout after ' + ms + 'ms')), ms)
    );
    
    // Create safe analysis functions with timeouts
    const safeAnalyze = async (fn, fallback) => {
      try {
        return await Promise.race([
          fn(),
          timeout(10000) // 10 second timeout
        ]);
      } catch (error) {
        console.error(`Analysis timed out or failed: ${error.message}`);
        return fallback;
      }
    };
    
    // Analysis components with error handling and timeouts
    const [
      grammarAnalysisResult,
      toneAnalysisResult,
      characterAnalysisResult,
      structureAnalysisResult,
      logicalFlawsAnalysisResult,
      tenseAnalysisResult,
      aiContentScoreResult,
      plagiarismScoreResult,
      genreAnalysisResult
    ] = await Promise.allSettled([
      safeAnalyze(() => checkGrammar(text), performBasicGrammarCheck(text)),
      safeAnalyze(() => analyzeTone(text), { classification: 'Neutral', confidence: 0.5, sentiment: 'Neutral', appropriateness: 70 }),
      safeAnalyze(() => analyzeCharacters(text), performBasicCharacterAnalysis(text)),
      safeAnalyze(() => analyzeStructure(text), { beginning: 'Not analyzed', middle: 'Not analyzed', end: 'Not analyzed', suggestions: 'Try to have a clear beginning, middle, and end.', score: 60, uniqueness: 70 }),
      safeAnalyze(() => checkLogicalFlaws(text), { flaws: [], questions: [], score: 80 }),
      safeAnalyze(() => analyzeTense(text), { primary: 'Mixed', inconsistencies: [], score: 90 }),
      safeAnalyze(() => detectAIContent(text), { score: 50, fullResponse: fallbackAIDetection() }),
      safeAnalyze(() => checkPlagiarism(text), 2),
      safeAnalyze(() => identifyGenre(text), { primaryGenre: 'Fiction', subGenres: [] })
    ]);
    
    // Extract results, handling potential failures
    const grammarAnalysis = getSettledValue(grammarAnalysisResult, performBasicGrammarCheck(text));
    const toneAnalysis = getSettledValue(toneAnalysisResult, { classification: 'Neutral', confidence: 0.5, sentiment: 'Neutral', appropriateness: 70 });
    const characterAnalysis = getSettledValue(characterAnalysisResult, performBasicCharacterAnalysis(text));
    const structureAnalysis = getSettledValue(structureAnalysisResult, { beginning: 'Not analyzed', middle: 'Not analyzed', end: 'Not analyzed', suggestions: 'Try to have a clear beginning, middle, and end.', score: 60, uniqueness: 70 });
    const logicalFlawsAnalysis = getSettledValue(logicalFlawsAnalysisResult, { flaws: [], questions: [], score: 80 });
    const tenseAnalysis = getSettledValue(tenseAnalysisResult, { primary: 'Mixed', inconsistencies: [], score: 90 });
    const aiContentScore = getSettledValue(aiContentScoreResult, { score: 50, fullResponse: fallbackAIDetection() });
    const plagiarismScore = getSettledValue(plagiarismScoreResult, 2);
    const genreAnalysis = getSettledValue(genreAnalysisResult, { primaryGenre: 'Fiction', subGenres: [] });
    
    // 10. Originality score calculation
    const originalityScore = calculateOriginality(
      aiContentScore.score, // Now using .score from the object 
      plagiarismScore, 
      structureAnalysis.uniqueness || 70
    );
    
    // Calculate overall score using weighted components
    const overallScore = calculateOverallScore({
      grammar: grammarAnalysis.score,
      tone: toneAnalysis.appropriateness,
      structure: structureAnalysis.score,
      characters: characterAnalysis.score,
      logicalFlow: logicalFlawsAnalysis.score,
      tense: tenseAnalysis.score,
      aiContent: 100 - aiContentScore.score, // Now using .score from the object
      plagiarism: 100 - plagiarismScore,
      originality: originalityScore
    });
    
    // Create complete analysis result
    const analysisResult = {
      basicMetrics: {
        wordCount,
        sentenceCount,
        avgWordsPerSentence
      },
      grammar: grammarAnalysis,
      tone: toneAnalysis,
      characters: characterAnalysis,
      structure: structureAnalysis,
      logicalFlaws: logicalFlawsAnalysis,
      tense: tenseAnalysis,
      // Add full AI detection data
      aiDetection: aiContentScore.fullResponse,
      metrics: {
        aiScore: aiContentScore.score, // Now using .score from the object
        plagiarismScore: plagiarismScore,
        originalityScore: originalityScore,
        genre: genreAnalysis.primaryGenre,
        subGenres: genreAnalysis.subGenres || [],
        overallScore: overallScore
      }
    };
    
    // Cache the result
    analysisCache.set(cacheKey, {
      analysis: analysisResult,
      timestamp: Date.now()
    });
    
    return analysisResult;
  } catch (error) {
    console.error('Error analyzing writing:', error);
    // Return a basic analysis instead of throwing an error
    return {
      error: 'Failed to complete full analysis: ' + error.message,
      basicMetrics: {
        wordCount: text ? text.split(/\s+/).filter(w => w.length > 0).length : 0,
        sentenceCount: text ? text.split(/[.!?]+/).filter(s => s.trim().length > 0).length : 0,
        avgWordsPerSentence: 0
      },
      grammar: fallbackGrammarCheck(text || ""),
      tone: { classification: 'Neutral', confidence: 0.5, sentiment: 'Neutral', appropriateness: 70 },
      characters: fallbackCharacterAnalysis(text || ""),
      structure: { beginning: 'Basic analysis only', middle: 'Basic analysis only', end: 'Basic analysis only', suggestions: 'Server encountered an issue. Try again later.', score: 60, uniqueness: 70 },
      logicalFlaws: { flaws: [], questions: [], score: 80 },
      tense: { primary: 'Mixed', inconsistencies: [], score: 90 },
      metrics: {
        aiScore: 50,
        plagiarismScore: 5,
        originalityScore: 70,
        genre: 'Fiction',
        subGenres: [],
        overallScore: 65
      }
    };
  }
}

// Helper to safely extract value from Promise.allSettled result
function getSettledValue(result, defaultValue) {
  return result.status === 'fulfilled' ? result.value : defaultValue;
}

// Simple hash function for text
function hashText(text) {
  if (!text) return '0';
  
  let hash = 0;
  if (text.length === 0) return hash.toString();
  
  const sample = text.length > 100 ? text.substring(0, 100) : text;
  
  for (let i = 0; i < sample.length; i++) {
    const char = sample.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return hash.toString();
}

// Grammar checking function with Claude integration
async function checkGrammar(text) {
  try {
    // Use Claude Haiku for grammar analysis
    return await claudeService.checkGrammarWithClaude(text);
  } catch (error) {
    console.error('Grammar check error with Claude:', error);
    // Fall back to basic implementation if Claude fails
    return performBasicGrammarCheck(text);
  }
}

// Fallback grammar checker
function performBasicGrammarCheck(text) {
  // Basic error patterns to check
  const commonErrors = [
    { pattern: /\bi\b/g, correction: 'I', explanation: 'The pronoun "I" should always be capitalized.' },
    { pattern: /\s+,/g, correction: ',', explanation: 'No space before comma.' },
    { pattern: /\s+\./g, correction: '.', explanation: 'No space before period.' },
    { pattern: /\s{2,}/g, correction: ' ', explanation: 'Multiple spaces should be a single space.' },
    { pattern: /\b(am|is|are|was|were)\s+been\b/g, correction: '[am/is/are/was/were] being', explanation: 'Incorrect use of "been" in progressive tense.' },
    { pattern: /\b(dont|cant|wont|shouldnt|couldnt|wouldnt|didnt)\b/g, correction: "[don't/can't/won't/shouldn't/couldn't/wouldn't/didn't]", explanation: 'Contractions need apostrophes.' }
  ];
  
  const errors = [];
  let score = 100;
  
  if (text) {
    commonErrors.forEach(err => {
      const matches = text.match(err.pattern);
      if (matches) {
        matches.forEach(match => {
          errors.push({
            original: match,
            correction: err.correction,
            explanation: err.explanation
          });
          // Deduct points for each error found
          score -= 3;
        });
      }
    });
  }
  
  // Ensure score doesn't go below 0
  score = Math.max(0, score);
  
  return {
    errors,
    score,
    summary: "Grammar analysis completed using basic checks.",
    correctedText: text ? applyCorrectionToText(text, errors) : ""
  };
}

// Tone analysis function (simplified)
async function analyzeTone(text) {
  // Tokenize the text
  const tokens = tokenizer.tokenize(text);
  
  // Get sentiment score using the AFINN lexicon
  const sentimentScore = analyzer.getSentiment(tokens);
  
  // Determine sentiment category
  let sentiment = 'Neutral';
  if (sentimentScore > 0.2) sentiment = 'Positive';
  if (sentimentScore < -0.2) sentiment = 'Negative';
  
// Basic tone classification based on text patterns
  let classification = 'Neutral';
  const formalPatterns = [
    /\b(therefore|however|consequently|furthermore|moreover|thus|hence)\b/i,
    /\b(in accordance with|pursuant to|with regard to)\b/i
  ];
  
  const casualPatterns = [
    /\b(lol|omg|haha|yeah|cool|awesome|gonna|wanna)\b/i,
    /[!]{2,}/
  ];
  
  // Check patterns and assign scores
  let formalScore = 0;
  let casualScore = 0;
  
  formalPatterns.forEach(pattern => {
    if (pattern.test(text)) formalScore += 1;
  });
  
  casualPatterns.forEach(pattern => {
    if (pattern.test(text)) casualScore += 1;
  });
  
  // Determine classification based on scores
  if (formalScore > casualScore) {
    classification = 'Formal';
  } else if (casualScore > formalScore) {
    classification = 'Casual';
  }
  
  // Calculate confidence
  const totalPatterns = formalPatterns.length + casualPatterns.length;
  const highestScore = Math.max(formalScore, casualScore);
  const confidence = totalPatterns > 0 ? highestScore / totalPatterns : 0.5;
  
  // Estimate appropriateness (can be refined)
  const appropriateness = 70 + (confidence * 15) + (sentimentScore > 0 ? 5 : 0);
  
  return {
    classification,
    confidence,
    sentiment,
    appropriateness: Math.min(100, Math.max(0, appropriateness))
  };
}

// Character analysis with Claude integration
async function analyzeCharacters(text) {
  try {
    // Use Claude Haiku for character analysis
    return await claudeService.analyzeCharactersWithClaude(text);
  } catch (error) {
    console.error('Character analysis error with Claude:', error);
    // Fall back to basic implementation if Claude fails
    return performBasicCharacterAnalysis(text);
  }
}

// Fallback character analysis
function performBasicCharacterAnalysis(text) {
  // Simple character detection using regular expressions
  const characterPattern = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b(?:\s+(?:said|asked|replied|spoke|thought|felt|walked|ran|jumped|looked))/g;
  
  let match;
  const characterMentions = {};
  
  if (text) {
    while ((match = characterPattern.exec(text)) !== null) {
      const name = match[1];
      characterMentions[name] = (characterMentions[name] || 0) + 1;
    }
  }
  
  // Convert to character objects
  const characters = Object.keys(characterMentions)
    .filter(name => characterMentions[name] >= 2)
    .map(name => {
      // Guess the role based on mention frequency
      let role = 'Supporting';
      if (characterMentions[name] === Math.max(...Object.values(characterMentions))) {
        role = 'Protagonist';
      }
      
      return {
        name,
        role,
        traits: 'Unknown',
        consistency: characterMentions[name] > 5 ? 'High' : 'Medium'
      };
    });
  
  // Calculate score based on characters and mentions
  const characterCount = characters.length;
  const totalMentions = Object.values(characterMentions).reduce((sum, val) => sum + val, 0) || 0;
  const score = Math.min(100, Math.max(0, 40 + (characterCount * 10) + (totalMentions / 2)));
  
  return {
    characters,
    score,
    suggestions: "Try to develop your characters more by showing their unique traits and behaviors."
  };
}

// Structure analysis (simplified)
async function analyzeStructure(text) {
  // Split into beginning (first 20%), middle (60%), and end (last 20%)
  const paragraphs = text.split(/\n\s*\n/);
  const totalParagraphs = paragraphs.length;
  
  if (totalParagraphs < 3) {
    return {
      beginning: 'Too short to analyze properly',
      middle: 'Too short to analyze properly',
      end: 'Too short to analyze properly',
      suggestions: 'Try to write more paragraphs to create a fuller story structure',
      score: 50,
      uniqueness: 60
    };
  }
  
  const beginningParagraphs = paragraphs.slice(0, Math.max(1, Math.floor(totalParagraphs * 0.2)));
  const middleParagraphs = paragraphs.slice(
    Math.floor(totalParagraphs * 0.2),
    Math.floor(totalParagraphs * 0.8)
  );
  const endingParagraphs = paragraphs.slice(Math.floor(totalParagraphs * 0.8));
  
  // Basic checks
  const beginning = beginningParagraphs.join('\n');
  const beginningHasCharacter = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b/.test(beginning);
  const beginningHasSetting = /\b(at|in|on|near|around|inside|outside)\b/.test(beginning);
  
  const ending = endingParagraphs.join('\n');
  const hasResolution = /\b(finally|eventually|in the end|ultimately|at last|concluded|resolved|finished|ended)\b/i.test(ending);
  
  // Create structure analysis
  const beginningQuality = beginningHasCharacter && beginningHasSetting ? 'Present and engaging' : 
                          beginningHasCharacter || beginningHasSetting ? 'Partially established' : 'Needs improvement';
  
  const middleQuality = middleParagraphs.length >= 2 ? 'Well developed' : 'Could be expanded';
  
  const endQuality = hasResolution ? 'Has resolution' : 'Needs stronger conclusion';
  
  // Calculate score
  let structureScore = 50;
  
  if (beginningHasCharacter) structureScore += 10;
  if (beginningHasSetting) structureScore += 10;
  if (middleParagraphs.length >= 3) structureScore += 10;
  if (hasResolution) structureScore += 10;
  
  structureScore = Math.min(100, structureScore);
  
  // Generate suggestions
  let suggestions = [];
  if (!beginningHasCharacter) suggestions.push('Introduce your main character(s) earlier');
  if (!beginningHasSetting) suggestions.push('Establish the setting in your opening');
  if (middleParagraphs.length < 2) suggestions.push('Develop your middle section more');
  if (!hasResolution) suggestions.push('Add a stronger conclusion');
  
  return {
    beginning: beginningQuality,
    middle: middleQuality,
    end: endQuality,
    suggestions: suggestions.join('. '),
    score: structureScore,
    uniqueness: 70 // Placeholder
  };
}

// Logical flaws check (simplified)
async function checkLogicalFlaws(text) {
  // This would be more sophisticated in production
  return {
    flaws: [],
    questions: [],
    score: 80
  };
}

// Tense analysis (simplified)
async function analyzeTense(text) {
  // Define regex patterns for different tenses
  const pastTensePatterns = [
    /\b(was|were|had|did|said|went|came|saw|took|made)\b/i
  ];
  
  const presentTensePatterns = [
    /\b(is|are|am|has|have|do|does|say|go|come|see)\b/i
  ];
  
  // Count occurrences
  let pastCount = 0;
  let presentCount = 0;
  
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  sentences.forEach(sentence => {
    pastTensePatterns.forEach(pattern => {
      if (pattern.test(sentence)) pastCount++;
    });
    
    presentTensePatterns.forEach(pattern => {
      if (pattern.test(sentence)) presentCount++;
    });
  });
  
  // Determine primary tense
  let primaryTense = 'Mixed';
  if (pastCount > presentCount * 1.5) {
    primaryTense = 'Past tense';
  } else if (presentCount > pastCount * 1.5) {
    primaryTense = 'Present tense';
  }
  
  return {
    primary: primaryTense,
    inconsistencies: [],
    score: 90
  };
}

// AI content detection with Claude integration - UPDATED
async function detectAIContent(text) {
  try {
    // Use Claude for AI content detection
    const result = await claudeService.detectAIContentWithClaude(text);
    
    // Return both the score and the full response object
    return {
      score: result.score,
      fullResponse: result // Contains reasoning, confidence, etc.
    };
  } catch (error) {
    console.error('AI detection error with Claude:', error);
    // Fall back to basic implementation with a more cautious value
    return {
      score: 50,
      fullResponse: fallbackAIDetection()
    };
  }
}

// Plagiarism check (simplified)
async function checkPlagiarism(text) {
  // For demo purposes, return a low score
  return 2;
}

// Genre identification (simplified)
async function identifyGenre(text) {
  // Define genre keywords
  const genrePatterns = {
    'Fiction - Fantasy': [/\b(magic|wizard|spell|dragon|elf|elves|enchant)\b/i, 2],
    'Fiction - Science Fiction': [/\b(space|planet|alien|future|technology|robot)\b/i, 2],
    'Fiction - Mystery': [/\b(detective|mystery|clue|suspect|investigate|murder)\b/i, 2],
    'Fiction - Adventure': [/\b(adventure|journey|discover|explore|quest|mission)\b/i, 1.5],
    'Non-Fiction - Essay': [/\b(argue|point|thesis|therefore|however|conclude)\b/i, 1.5],
    'Poetry': [/\b(verse|rhyme|poet|stanza|rhythm|meter|sonnet)\b/i, 3]
  };
  
  // Score each genre
  const genreScores = {};
  
  Object.entries(genrePatterns).forEach(([genre, [pattern, weight]]) => {
    const matches = text.match(pattern);
    genreScores[genre] = matches ? matches.length * weight : 0;
  });
  
  // Sort genres by score
  const sortedGenres = Object.entries(genreScores)
    .sort((a, b) => b[1] - a[1]);
  
  // Get primary genre and sub-genres
  const primaryGenre = sortedGenres.length > 0 ? sortedGenres[0][0] : 'Fiction';
  const subGenres = sortedGenres
    .slice(1, 3)
    .filter(([_, score]) => score > 0)
    .map(([genre, _]) => genre);
  
  return {
    primaryGenre,
    subGenres,
    confidence: 0.7
  };
}

// Calculate originality score
function calculateOriginality(aiScore, plagiarismScore, structureUniqueness) {
  const aiComponent = (100 - aiScore) * 0.4;
  const plagiarismComponent = (100 - plagiarismScore * 10) * 0.3;
  const uniquenessComponent = structureUniqueness * 0.3;
  
  let originalityScore = aiComponent + plagiarismComponent + uniquenessComponent;
  originalityScore = Math.min(100, Math.max(0, Math.round(originalityScore)));
  
  return originalityScore;
}

// Calculate overall score
function calculateOverallScore(scores) {
  const weights = {
    grammar: 0.1,
    tone: 0.1,
    structure: 0.15,
    characters: 0.15,
    logicalFlow: 0.1,
    tense: 0.05,
    aiContent: 0.15,
    plagiarism: 0.1,
    originality: 0.1
  };
  
  let overallScore = 0;
  
  Object.entries(weights).forEach(([component, weight]) => {
    if (scores[component] !== undefined) {
      overallScore += scores[component] * weight;
    }
  });
  
  return Math.round(overallScore);
}

// Apply corrections to text
function applyCorrectionToText(originalText, errors) {
  let correctedText = originalText;
  
  errors.forEach(error => {
    correctedText = correctedText.replace(error.original, error.correction);
  });
  
  return correctedText;
}

// Add helper function for character analysis fallbacks
function fallbackCharacterAnalysis() {
  return {
    characters: [],
    score: 60,
    suggestions: "Character analysis could not be performed with AI."
  };
}

// Add helper function for grammar check fallbacks
function fallbackGrammarCheck(text) {
  return {
    errors: [],
    score: 85,
    summary: "Grammar checked with basic system only.",
    correctedText: text || ""
  };
}

// Add helper function for AI detection fallbacks
function fallbackAIDetection() {
  return {
    score: 20,
    reasoning: "AI detection could not be performed with AI assistant.",
    confidence: 0.5
  };
}

module.exports = {
  analyzeWriting
};
