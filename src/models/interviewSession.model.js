const mongoose = require('mongoose');

const interviewSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true
  },
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'cancelled'],
    default: 'in-progress'
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  },
  overallScore: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  }
}, { timestamps: true });

interviewSessionSchema.index({ userId: 1 });

module.exports = mongoose.model('InterviewSession', interviewSessionSchema);
