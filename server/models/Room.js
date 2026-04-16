const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  adminUsername: { type: String, required: true, default: 'Admin' },
  currentTrackIndex: { type: Number, default: 0 },
  playbackPosition: { type: Number, default: 0 },
  isPlaying: { type: Boolean, default: false },
  queue: [
    {
      id: String,
      title: String,
      artist: String,
      albumArt: String,
      audioUrl: String,
      duration: Number,
      type: { type: String },
      sourceId: String,
      sourceUrl: String,
    }
  ],
  attendees: [
    {
      socketId: String,
      username: String,
      avatar: String,
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Room', RoomSchema);
