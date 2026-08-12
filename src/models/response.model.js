const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InterviewSession',
    required: true
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  answerText: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  aiFeedback: {
    type: String
  },
  strengths: [{
    type: String
  }],
  improvements: [{
    type: String
  }],
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: { createdAt: true, updatedAt: false } });

responseSchema.index({ sessionId: 1, questionId: 1 }, { unique: true });

module.exports = mongoose.model('Response', responseSchema);
