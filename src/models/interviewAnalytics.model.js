const mongoose = require('mongoose');

const interviewAnalyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  totalInterviews: {
    type: Number,
    default: 0
  },
  averageScore: {
    type: Number,
    default: 0
  },
  avgScoreByTopic: {
    type: Map,
    of: Number,
    default: {}
  },
  strongTopics: [{
    type: String
  }],
  weakTopics: [{
    type: String
  }],
  progressTrend: [{
    date: {
      type: Date,
      default: Date.now
    },
    score: {
      type: Number,
      required: true
    }
  }],
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: false });

module.exports = mongoose.model('InterviewAnalytics', interviewAnalyticsSchema);
