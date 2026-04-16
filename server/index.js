require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const path = require('path');

const Room = require('./models/Room');
const setupRoomSockets = require('./sockets/roomHandler');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const DEFAULT_QUEUE = [
  {
    id: "track1",
    title: "Cinematic Chillout",
    artist: "SoundHelix",
    albumArt: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=500",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duration: 372,
    type: "audio"
  },
  {
    id: "track2",
    title: "Driving Bass",
    artist: "SoundHelix",
    albumArt: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=500",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    duration: 425,
    type: "audio"
  },
  {
    id: "track3",
    title: "Electronic Vibe",
    artist: "SoundHelix",
    albumArt: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?auto=format&fit=crop&q=80&w=500",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    duration: 344,
    type: "audio"
  }
];

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/syncfm')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB error:', err));

app.post('/api/rooms', async (req, res) => {
  try {
    const { username, roomName } = req.body;
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    
    const newRoom = new Room({
      code,
      name: roomName || 'My Sync.fm Room',
      adminUsername: username,
      queue: DEFAULT_QUEUE
    });
    
    await newRoom.save();
    res.json({ success: true, room: newRoom });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search API
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ results: [] });

    const results = [];
    
    // Support both standard and VITE_ prefixed env vars for flexibility
    const YT_KEY = process.env.YOUTUBE_API_KEY;
    const SP_ID = process.env.SPOTIFY_CLIENT_ID || process.env.VITE_SPOTIFY_CLIENT_ID;
    const SP_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

    // 1. YouTube Search
    if (YT_KEY) {
      try {
        const ytRes = await axios.get('https://www.googleapis.com/youtube/v3/search', {
          params: {
            part: 'snippet',
            q: q,
            maxResults: 5,
            type: 'video',
            key: YT_KEY
          }
        });

        const ytTracks = ytRes.data.items.map(item => ({
          id: 'yt_' + item.id.videoId,
          title: item.snippet.title,
          artist: item.snippet.channelTitle,
          albumArt: item.snippet.thumbnails.high ? item.snippet.thumbnails.high.url : item.snippet.thumbnails.default.url,
          type: 'youtube',
          sourceId: item.id.videoId,
          duration: 300 
        }));
        results.push(...ytTracks);
      } catch (err) {
        console.error('YouTube search error:', err.response?.data || err.message);
      }
    } else {
      console.warn('YouTube search skipped: YOUTUBE_API_KEY not found in .env');
    }

    // 2. Spotify Search
    if (SP_ID && SP_SECRET) {
      try {
        const authRes = await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
          headers: {
            'Authorization': 'Basic ' + Buffer.from(SP_ID + ':' + SP_SECRET).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        const token = authRes.data.access_token;

        const spRes = await axios.get('https://api.spotify.com/v1/search', {
          params: { q, type: 'track', limit: 5 },
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const spTracks = spRes.data.tracks.items.map(item => ({
          id: 'sp_' + item.id,
          title: item.name,
          artist: item.artists.map(a => a.name).join(', '),
          albumArt: item.album.images[0] ? item.album.images[0].url : '',
          type: 'spotify',
          sourceId: `spotify:track:${item.id}`,
          duration: Math.floor(item.duration_ms / 1000)
        }));
        results.push(...spTracks);
      } catch (err) {
        console.error('Spotify search error:', err.response?.data || err.message);
      }
    } else {
      console.warn('Spotify search skipped: SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET not found in .env');
    }

    res.json({ 
      success: true, 
      results,
      meta: {
        youtubeEnabled: !!YT_KEY,
        spotifyEnabled: !!(SP_ID && SP_SECRET)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload Endpoint
app.post('/api/upload', upload.single('audio'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    // Construct the public URL
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    
    res.json({ 
      success: true, 
      url: fileUrl, 
      filename: req.file.originalname 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rooms/:code', async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.code });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({ success: true, room });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

setupRoomSockets(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
