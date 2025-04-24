const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  correctedContent: String,
  analysis: {
    basicMetrics: {
      wordCount: Number,
      sentenceCount: Number,
      avgWordsPerSentence: Number
    },
    grammar: {
      errors: [{
        original: String,
        correction: String,
        explanation: String
      }],
      score: Number
    },
    tone: {
      classification: String,
      confidence: Number,
      sentiment: String,
      appropriateness: Number
    },
    characters: {
      characters: [{
        name: String,
        role: String,
        traits: String,
        consistency: String
      }],
      score: Number
    },
    structure: {
      beginning: String,
      middle: String,
      end: String,
      suggestions: String,
      score: Number,
      uniqueness: Number
    },
    logicalFlaws: {
      flaws: [String],
      questions: [String],
      score: Number
    },
    tense: {
      primary: String,
      inconsistencies: [String],
      score: Number
    },
    metrics: {
      aiScore: Number,
      plagiarismScore: Number,
      originalityScore: Number,
      genre: String,
      subGenres: [String],
      overallScore: Number
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('Submission', SubmissionSchema);
