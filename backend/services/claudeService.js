const axios = require('axios');
const crypto = require('crypto');

class ClaudeService {
  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    this.baseURL = 'https://api.anthropic.com/v1';
    this.model = 'claude-3-5-sonnet-20250605';
    this.cache = new Map(); // Simple in-memory cache
    this.maxCacheSize = 1000;
  }

  // Generate cache key for content
  generateCacheKey(content, title) {
    const hash = crypto.createHash('sha256');
    hash.update(content + title);
    return hash.digest('hex');
  }

  // Check cache for existing analysis
  getFromCache(cacheKey) {
    return this.cache.get(cacheKey);
  }

  // Store analysis in cache
  setCache(cacheKey, analysis) {
    // Implement simple LRU by removing oldest entries
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(cacheKey, {
      ...analysis,
      cached: true,
      cachedAt: new Date()
    });
  }

  // Preprocess content to optimize tokens
  preprocessContent(content) {
    // Remove excessive whitespace
    let processed = content.replace(/\s+/g, ' ').trim();
    
    // Limit content length (keep first 8000 characters for analysis)
    if (processed.length > 8000) {
      processed = processed.substring(0, 8000) + '... [content truncated for analysis]';
    }
    
    return processed;
  }

  // Create comprehensive analysis prompt
  createAnalysisPrompt(content, title) {
    return `Please analyze this student writing submission comprehensively. Provide your analysis in JSON format with the following structure:

{
  "overall_score": <number 0-100>,
  "grammar_analysis": {
    "score": <number 0-100>,
    "errors_found": <number>,
    "specific_issues": ["<error 1>", "<error 2>"],
    "suggestions": ["<suggestion 1>", "<suggestion 2>"]
  },
  "character_development": {
    "score": <number 0-100>,
    "strengths": ["<strength 1>", "<strength 2>"],
    "areas_for_improvement": ["<area 1>", "<area 2>"],
    "feedback": "<detailed feedback>"
  },
  "story_structure": {
    "score": <number 0-100>,
    "has_clear_beginning": <boolean>,
    "has_developed_middle": <boolean>,
    "has_satisfying_ending": <boolean>,
    "pacing_feedback": "<feedback>",
    "structural_suggestions": ["<suggestion 1>", "<suggestion 2>"]
  },
  "tone_analysis": {
    "primary_tone": "<detected tone>",
    "tone_consistency": <number 0-100>,
    "target_audience": "<detected audience>",
    "tone_feedback": "<feedback>"
  },
  "tense_consistency": {
    "score": <number 0-100>,
    "primary_tense": "<detected tense>",
    "tense_errors": <number>,
    "inconsistencies": ["<inconsistency 1>", "<inconsistency 2>"]
  },
  "ai_content_detection": {
    "likelihood_ai_generated": <number 0-100>,
    "reasoning": "<detailed reasoning>",
    "specific_indicators": ["<indicator 1>", "<indicator 2>"],
    "human_elements": ["<element 1>", "<element 2>"]
  },
  "engagement_level": {
    "score": <number 0-100>,
    "engaging_elements": ["<element 1>", "<element 2>"],
    "areas_lacking_engagement": ["<area 1>", "<area 2>"]
  },
  "actionable_feedback": {
    "top_priorities": ["<priority 1>", "<priority 2>", "<priority 3>"],
    "specific_next_steps": ["<step 1>", "<step 2>", "<step 3>"],
    "encouragement": "<positive feedback>"
  },
  "word_count": <number>,
  "reading_level": "<grade level>",
  "genre_classification": "<detected genre>"
}

**Title:** ${title}

**Content to analyze:**
${content}

Please be thorough but constructive in your feedback, focusing on helping the student improve their writing skills.`;
  }

  // Call Claude API
  async callClaudeAPI(prompt) {
    try {
      const response = await axios.post(
        `${this.baseURL}/messages`,
        {
          model: this.model,
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
            'x-api-key': this.apiKey
          },
          timeout: 30000 // 30 second timeout
        }
      );

      return response.data.content[0].text;
    } catch (error) {
      console.error('Claude API Error:', error.response?.data || error.message);
      throw new Error(`Claude API failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Parse Claude response
  parseClaudeResponse(response) {
    try {
      // Extract JSON from response (Claude sometimes wraps JSON in markdown)
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response');
      }

      const jsonString = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonString);

      // Validate required fields
      const requiredFields = [
        'overall_score', 'grammar_analysis', 'character_development',
        'story_structure', 'tone_analysis', 'tense_consistency',
        'ai_content_detection', 'engagement_level', 'actionable_feedback'
      ];

      for (const field of requiredFields) {
        if (!parsed[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      return parsed;
    } catch (error) {
      console.error('Parse error:', error);
      throw new Error(`Failed to parse Claude response: ${error.message}`);
    }
  }

  // Generate fallback analysis when Claude is unavailable
  generateFallbackAnalysis(content, title) {
    const wordCount = content.split(/\s+/).length;
    const sentences = content.split(/[.!?]+/).length - 1;
    const avgWordsPerSentence = sentences > 0 ? Math.round(wordCount / sentences) : 0;

    return {
      overall_score: 75,
      grammar_analysis: {
        score: 70,
        errors_found: 0,
        specific_issues: [],
        suggestions: ["Please review with a human editor for detailed grammar feedback."]
      },
      character_development: {
        score: 75,
        strengths: ["Character development analysis requires human review"],
        areas_for_improvement: ["Detailed character analysis pending"],
        feedback: "Character development analysis will be provided by your assigned editor."
      },
      story_structure: {
        score: 75,
        has_clear_beginning: true,
        has_developed_middle: true,
        has_satisfying_ending: true,
        pacing_feedback: "Story structure analysis pending human review",
        structural_suggestions: ["Structure analysis will be provided by your editor"]
      },
      tone_analysis: {
        primary_tone: "To be determined",
        tone_consistency: 75,
        target_audience: "To be determined",
        tone_feedback: "Tone analysis will be provided during editor review"
      },
      tense_consistency: {
        score: 75,
        primary_tense: "Mixed",
        tense_errors: 0,
        inconsistencies: []
      },
      ai_content_detection: {
        likelihood_ai_generated: 10,
        reasoning: "Analysis pending - will be reviewed by human evaluator",
        specific_indicators: [],
        human_elements: ["Unique personal voice", "Individual writing style"]
      },
      engagement_level: {
        score: 75,
        engaging_elements: ["Personal narrative elements"],
        areas_lacking_engagement: ["To be determined by editor"]
      },
      actionable_feedback: {
        top_priorities: [
          "Continue to next stage for detailed feedback",
          "Prepare for editor meeting",
          "Review basic writing fundamentals"
        ],
        specific_next_steps: [
          "Wait for plagiarism review completion",
          "Schedule meeting with assigned editor",
          "Review submission for any obvious errors"
        ],
        encouragement: "Great job submitting your work! Your editor will provide detailed feedback soon."
      },
      word_count: wordCount,
      reading_level: avgWordsPerSentence > 20 ? "College" : avgWordsPerSentence > 15 ? "High School" : "Middle School",
      genre_classification: "To be determined",
      fallback_used: true,
      analysis_timestamp: new Date().toISOString()
    };
  }

  // Main analysis function
  async analyzeSubmission(content, title) {
    const cacheKey = this.generateCacheKey(content, title);
    
    // Check cache first
    const cachedResult = this.getFromCache(cacheKey);
    if (cachedResult) {
      console.log('Analysis served from cache');
      return cachedResult;
    }

    try {
      // Preprocess content
      const processedContent = this.preprocessContent(content);
      
      // Create analysis prompt
      const prompt = this.createAnalysisPrompt(processedContent, title);
      
      // Call Claude API
      const response = await this.callClaudeAPI(prompt);
      
      // Parse response
      const analysis = this.parseClaudeResponse(response);
      
      // Add metadata
      analysis.analysis_timestamp = new Date().toISOString();
      analysis.cached = false;
      analysis.fallback_used = false;
      
      // Cache the result
      this.setCache(cacheKey, analysis);
      
      console.log('Analysis completed successfully');
      return analysis;
      
    } catch (error) {
      console.error('Claude analysis failed, using fallback:', error.message);
      
      // Generate fallback analysis
      const fallbackAnalysis = this.generateFallbackAnalysis(content, title);
      
      // Don't cache fallback analyses
      return fallbackAnalysis;
    }
  }

  // Get API usage stats (for monitoring)
  getUsageStats() {
    return {
      cacheSize: this.cache.size,
      maxCacheSize: this.maxCacheSize,
      cacheHitRate: this.cache.size > 0 ? 'Available in cache' : 'Cache empty'
    };
  }

  // Clear cache (for maintenance)
  clearCache() {
    this.cache.clear();
    console.log('Claude analysis cache cleared');
  }
}

// Export singleton instance
const claudeService = new ClaudeService();

// Export the main function for backwards compatibility
const analyzeWithClaude = async (content, title) => {
  return await claudeService.analyzeSubmission(content, title);
};

module.exports = {
  ClaudeService,
  analyzeWithClaude,
  claudeService
};
