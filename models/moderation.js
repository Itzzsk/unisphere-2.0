const mongoose = require('mongoose'); // <-- This line was missing!

const badWordSchema = new mongoose.Schema({
  word: { 
    type: String, 
    required: true, 
    lowercase: true,
    trim: true 
  },
  language: { 
    type: String, 
    required: true, 
    lowercase: true,
    enum: ['en', 'es', 'fr', 'de', 'it', 'pt', 'hi', 'ar', 'zh', 'ja', 'ko', 'ru', 'kn', 'other']
  },
  origin: { 
    type: String,
    enum: ['english', 'kannada', 'hindi', 'spanish', 'french', 'other'],
    default: 'english'
  },
  severity: {
    type: String,
    enum: ['mild', 'moderate', 'severe'],
    default: 'moderate'
  },
  category: {
    type: String,
    enum: ['profanity', 'hate', 'sexual', 'violence', 'spam', 'other'],
    default: 'profanity'
  },
  variations: [String],
  addedBy: { type: String, default: 'system' },
  isActive: { type: Boolean, default: true }
}, { 
  timestamps: true
});

// Prevent duplicate words per language
badWordSchema.index({ word: 1, language: 1 }, { unique: true });

module.exports = mongoose.model('BadWord', badWordSchema);
