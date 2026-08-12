const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InterviewSession',
    required: true
  },
  text: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['technical', 'behavioral', 'hr']
  },
  topic: {
    type: String
  },
  order: {
    type: Number,
    required: true
  },
  generatedBy: {
    type: String,
    enum: ['ai', 'manual'],
    default: 'ai'
  }
}, { timestamps: { createdAt: true, updatedAt: false } });

questionSchema.index({ sessionId: 1 });

module.exports = mongoose.model('Question', questionSchema);
