const mongoose = require('mongoose');

const resumeAnalysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalFileName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    default: 'pdf'
  },
  fileSize: {
    type: Number,
    required: true
  },
  extractedText: {
    type: String
  },
  extractedSkills: [{
    type: String
  }],
  skillGaps: [{
    type: String
  }],
  atsScore: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  recommendations: [{
    type: String
  }],
  analyzedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: { createdAt: true, updatedAt: false } });

resumeAnalysisSchema.index({ userId: 1 });

module.exports = mongoose.model('ResumeAnalysis', resumeAnalysisSchema);
