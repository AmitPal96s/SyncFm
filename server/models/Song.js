const mongoose = require('mongoose');

const SongSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: { type: String, required: true },
  albumArt: { type: String },
  audioUrl: { type: String },
  sourceId: { type: String },
  platform: { 
    type: String, 
    enum: ['spotify', 'youtube', 'mock'], 
    default: 'mock' 
  },
  duration: { type: Number },
  addedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  room: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Room', 
    required: true 
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Song', SongSchema);
