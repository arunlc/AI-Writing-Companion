const natural = require('natural');
const claudeService = require('./claudeService');

// Initialize NLP tools
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;
const analyzer = new natural.SentimentAnalyzer('English', stemmer, 'afinn');

// Main analysis function
async function analyzeWriting(text, title = '') {
  try {
    // Basic text metrics
    const tokens = tokenizer.tokenize(text);
    const wordCount = tokens.length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceCount = sentences.length;
    const avgWordsPerSentence = wordCount / sentenceCount;
    
    // 1. Grammar and proofreading analysis
    const grammarAnalysis = await checkGrammar(text);
    
    // 2. Tone and sentiment analysis
    const toneAnalysis = await analyzeTone(text);
    
    // 3. Character analysis
    const characterAnalysis = await analyzeCharacters(text);
    
    // 4. Structure analysis
    const structureAnalysis = await analyzeStructure(text);
    
    // 5. Logical flow analysis
    const logicalFlawsAnalysis = await checkLogicalFlaws(text);
    
    // 6. Tense analysis
    const tenseAnalysis = await analyzeTense(text);
    
    // 7. AI content detection
    const aiContentScore = await detectAIContent(text);
    
    // 8. Plagiarism check (mocked for demo purposes)
    const plagiarismScore = await checkPlagiarism(text);
    
    // 9. Genre identification
    const genreAnalysis = await identifyGenre(text);
    
    // 10. Originality score calculation
    const originalityScore = calculateOriginality(
      aiContentScore, 
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
      aiContent: 100 - aiContentScore,
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
      metrics: {
        aiScore: aiContentScore,
        plagiarismScore: plagiarismScore,
        originalityScore: originalityScore,
        genre: genreAnalysis.primaryGenre,
        subGenres: genreAnalysis.subGenres,
        overallScore: overallScore
      }
    };
    
    return analysisResult;
  } catch (error) {
    console.error('Error analyzing writing:', error);
    throw new Error('Failed to analyze writing: ' + error.message);
  }
}

// Grammar checking function (simplified for now)
async function checkGrammar(text) {
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
  
  // Ensure score doesn't go below 0
  score = Math.max(0, score);
  
  return {
    errors,
    score,
    correctedText: applyCorrectionToText(text, errors)
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
  const confidence = highestScore / totalPatterns;
  
  // Estimate appropriateness (can be refined)
  const appropriateness = 70 + (confidence * 15) + (sentimentScore > 0 ? 5 : 0);
  
  return {
    classification,
    confidence,
    sentiment,
    appropriateness: Math.min(100, Math.max(0, appropriateness))
  };
}

// Other analysis functions (simplified implementations)
async function analyzeCharacters(text) {
  // Simple character detection using regular expressions
  const characterPattern = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b(?:\s+(?:said|asked|replied|spoke|thought|felt|walked|ran|jumped|looked))/g;
  
  let match;
  const characterMentions = {};
  
  while ((match = characterPattern.exec(text)) !== null) {
    const name = match[1];
    characterMentions[name] = (characterMentions[name] || 0) + 1;
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
  const totalMentions = Object.values(characterMentions).reduce((sum, val) => sum + val, 0);
  const score = Math.min(100, Math.max(0, 40 + (characterCount * 10) + (totalMentions / 2)));
  
  return {
    characters,
    score
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
  if (pastCount > presentCount) {
    primaryTense = 'Past tense';
  } else if (presentCount > pastCount) {
    primaryTense = 'Present tense';
  }
  
  return {
    primary: primaryTense,
    inconsistencies: [],
    score: 90
  };
}

// AI content detection (simplified)
async function detectAIContent(text) {
  // For demo purposes, return a low score
  return 3;
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
  const primaryGenre = sortedGenres[0][0];
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

module.exports = {
  analyzeWriting
};
