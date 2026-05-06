const Room = require('../models/Room');
const Message = require('../models/Message');

const BOT_NAMES = ['ChillWave', 'SynthRider', 'NeonNinja', 'GrooveMaster', 'EchoBot'];
const BOT_MESSAGES = [
  'This track is fire 🔥',
  'Who selected this set?',
  'Such a vibe rn',
  'Loving the transition here',
  'Drop is coming...',
  'Can someone skip?',
  'Best listening party so far 🎉'
];

module.exports = (io) => {
  // Store connected users locally for quick reference
  const users = {};
  
  // In-memory playback state
  const roomsState = {};

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join a specific room
    socket.on('join-room', async ({ roomCode, userId, username, avatar }) => {
      socket.join(roomCode);
      users[socket.id] = { code: roomCode, userId, username, avatar };
      
      try {
        const room = await Room.findOne({ code: roomCode });
        if (room) {
          // Check if user already exists
          const exists = room.attendees.find(a => a.socketId === socket.id);
          if (!exists) {
            room.attendees.push({ socketId: socket.id, userId, username: username || 'Guest', avatar });
            await room.save();
          }
          
          const isHost = userId && room.host.toString() === userId.toString();
          const role = isHost ? 'host' : 'guest';

          // Initialize room state if empty
          if (!roomsState[roomCode]) {
            roomsState[roomCode] = {
              playbackState: {
                isPlaying: room.isPlaying,
                currentTime: room.playbackPosition,
                lastUpdated: Date.now(),
                currentTrackIndex: room.currentTrackIndex
              }
            };
          }

          const state = roomsState[roomCode].playbackState;
          const elapsed = state.isPlaying ? (Date.now() - state.lastUpdated) / 1000 : 0;
          const adjustedCurrentTime = state.currentTime + elapsed;

          socket.emit('room-joined', {
            roomId: room._id,
            role,
            hostId: room.host.toString(),
            playbackState: {
              ...state,
              currentTime: adjustedCurrentTime,
              serverTimestamp: Date.now()
            },
            attendees: room.attendees,
            queue: room.queue
          });

          // Broadcast to others in the room
          socket.to(roomCode).emit('user-joined', { socketId: socket.id, userId, role, username, avatar });

          // Fetch previous messages
          const msgs = await Message.find({ roomId: room._id }).sort({ createdAt: 1 }).limit(50);
          socket.emit('chat_history', msgs);
        }
      } catch (err) {
        console.error(err);
      }
    });

    // Playback explicit controls
    socket.on('play', async ({ currentTime, currentTrackIndex }) => {
      const user = users[socket.id];
      if (!user) return;
      
      try {
        const room = await Room.findOne({ code: user.code });
        if (!room || room.host.toString() !== user.userId?.toString()) return; // Host only

        const now = Date.now();
        if (!roomsState[user.code]) roomsState[user.code] = { playbackState: {} };
        
        roomsState[user.code].playbackState = {
          isPlaying: true,
          currentTime,
          lastUpdated: now,
          currentTrackIndex: currentTrackIndex !== undefined ? currentTrackIndex : roomsState[user.code].playbackState.currentTrackIndex
        };

        io.to(user.code).emit('play', { 
          currentTime, 
          serverTimestamp: now,
          currentTrackIndex: roomsState[user.code].playbackState.currentTrackIndex
        });

        await Room.updateOne({ code: user.code }, { isPlaying: true, playbackPosition: currentTime });
      } catch (err) { console.error(err); }
    });

    socket.on('pause', async ({ currentTime }) => {
      const user = users[socket.id];
      if (!user) return;
      
      try {
        const room = await Room.findOne({ code: user.code });
        if (!room || room.host.toString() !== user.userId?.toString()) return; // Host only

        const now = Date.now();
        if (roomsState[user.code]) {
          roomsState[user.code].playbackState.isPlaying = false;
          roomsState[user.code].playbackState.currentTime = currentTime;
          roomsState[user.code].playbackState.lastUpdated = now;
        }

        io.to(user.code).emit('pause', { currentTime });
        await Room.updateOne({ code: user.code }, { isPlaying: false, playbackPosition: currentTime });
      } catch (err) { console.error(err); }
    });

    socket.on('seek', async ({ currentTime }) => {
      const user = users[socket.id];
      if (!user) return;
      
      try {
        const room = await Room.findOne({ code: user.code });
        if (!room || room.host.toString() !== user.userId?.toString()) return; // Host only

        const now = Date.now();
        if (roomsState[user.code]) {
          roomsState[user.code].playbackState.currentTime = currentTime;
          roomsState[user.code].playbackState.lastUpdated = now;
        }

        io.to(user.code).emit('seek', { currentTime, serverTimestamp: now });
        await Room.updateOne({ code: user.code }, { playbackPosition: currentTime });
      } catch (err) { console.error(err); }
    });

    socket.on('replay', async ({ currentTrackIndex }) => {
      const user = users[socket.id];
      if (!user) return;
      
      try {
        const room = await Room.findOne({ code: user.code });
        if (!room || room.host.toString() !== user.userId?.toString()) return; // Host only

        const now = Date.now();
        if (!roomsState[user.code]) roomsState[user.code] = { playbackState: {} };
        
        roomsState[user.code].playbackState = {
          isPlaying: true,
          currentTime: 0,
          lastUpdated: now,
          currentTrackIndex: currentTrackIndex !== undefined ? currentTrackIndex : roomsState[user.code].playbackState.currentTrackIndex
        };

        io.to(user.code).emit('replay', { 
          currentTime: 0, 
          serverTimestamp: now,
          currentTrackIndex: roomsState[user.code].playbackState.currentTrackIndex
        });
        await Room.updateOne({ code: user.code }, { isPlaying: true, playbackPosition: 0, currentTrackIndex: roomsState[user.code].playbackState.currentTrackIndex });
      } catch (err) { console.error(err); }
    });

    socket.on('request-sync', ({ roomId }) => {
      const user = users[socket.id];
      if (!user || !roomsState[user.code]) return;
      
      const state = roomsState[user.code].playbackState;
      const elapsed = state.isPlaying ? (Date.now() - state.lastUpdated) / 1000 : 0;
      
      socket.emit('sync-state', {
        ...state,
        currentTime: state.currentTime + elapsed,
        serverTimestamp: Date.now()
      });
    });

    // Add to Queue (Admin Only)
    socket.on('add_to_queue', async ({ code, track }) => {
      const user = users[socket.id];
      if (!user) return;

      try {
        const room = await Room.findOne({ code });
        if (!room || room.host.toString() !== user.userId?.toString()) return;

        room.queue.push(track);
        await room.save();
        io.to(code).emit('queue_updated', room.queue);
      } catch (err) {
        console.error(err);
      }
    });

    // Remove from Queue (Admin Only)
    socket.on('remove_from_queue', async ({ code, trackId }) => {
      const user = users[socket.id];
      if (!user) return;

      try {
        const room = await Room.findOne({ code });
        if (!room || room.host.toString() !== user.userId?.toString()) return;

        room.queue = room.queue.filter(t => t.id !== trackId);
        await room.save();
        io.to(code).emit('queue_updated', room.queue);
      } catch (err) {
        console.error(err);
      }
    });

    // Chat Message
    socket.on('send_chat', async ({ code, text }) => {
      const user = users[socket.id];
      if (!user) return;
      
      try {
        const room = await Room.findOne({ code });
        if (!room) return;

        const msg = new Message({
          roomId: room._id,
          sender: user.username || 'Guest',
          text
        });
        await msg.save();
        
        io.to(code).emit('receive_chat', msg);
      } catch (err) {
        console.error(err);
      }
    });

    // Reaction Emoji
    socket.on('send_reaction', ({ code, emoji }) => {
      io.to(code).emit('receive_reaction', { emoji, id: Math.random() });
    });

    // Admin Kick User
    socket.on('kick_user', async ({ code, targetSocketId }) => {
      const user = users[socket.id];
      if (!user) return;

      try {
        const room = await Room.findOne({ code });
        if (!room || room.host.toString() !== user.userId?.toString()) return;

        // Remove from DB
        room.attendees = room.attendees.filter(a => a.socketId !== targetSocketId);
        await room.save();

        io.to(targetSocketId).emit('kicked');
        io.to(code).emit('user_left', targetSocketId);
        
        if (users[targetSocketId]) {
          delete users[targetSocketId];
        }
      } catch (err) {
        console.error(err);
      }
    });

    // Handle Disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.id}`);
      const user = users[socket.id];
      if (user) {
        try {
          const room = await Room.findOne({ code: user.code });
          if (room) {
            room.attendees = room.attendees.filter(a => a.socketId !== socket.id);
            await room.save();
            socket.to(user.code).emit('user_left', socket.id);
          }
        } catch (err) {
          console.error(err);
        }
        delete users[socket.id];
      }
    });
  });

  // Simulated live feel: periodically post a bot message or send a fake reaction to active rooms
  setInterval(async () => {
    try {
      const activeRoomsCount = io.sockets.adapter.rooms.size;
      if (activeRoomsCount === 0) return;

      for (const [roomCode, sockets] of io.sockets.adapter.rooms.entries()) {
        if (roomCode.length !== 4) continue; 

        const rand = Math.random();
        if (rand < 0.1) {
          const emojis = ['🔥', '❤️', '🎉', '👏', '🎵'];
          io.to(roomCode).emit('receive_reaction', { emoji: emojis[Math.floor(Math.random() * emojis.length)], id: Math.random() });
        } else if (rand < 0.15) {
          const room = await Room.findOne({ code: roomCode });
          if (room) {
            const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
            const text = BOT_MESSAGES[Math.floor(Math.random() * BOT_MESSAGES.length)];
            const msg = new Message({ roomId: room._id, sender: botName, text, isBot: true });
            await msg.save();
            io.to(roomCode).emit('receive_chat', msg);
          }
        } else if (rand > 0.95) {
            const fakeName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
            io.to(roomCode).emit('bot_joined', { username: fakeName });
        }
      }
    } catch(err) {
      console.error(err);
    }
  }, 5000);
};
