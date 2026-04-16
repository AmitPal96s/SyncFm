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

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join a specific room
    socket.on('join_room', async ({ code, username, avatar }) => {
      socket.join(code);
      users[socket.id] = { code, username, avatar };
      
      try {
        const room = await Room.findOne({ code });
        if (room) {
          // Check if user already exists
          const exists = room.attendees.find(a => a.socketId === socket.id);
          if (!exists) {
            room.attendees.push({ socketId: socket.id, username, avatar });
            await room.save();
          }
          
          // Broadcast to others in the room
          socket.to(code).emit('user_joined', { socketId: socket.id, username, avatar });
          
          // Send current state to the joining user
          socket.emit('room_state', {
            attendees: room.attendees,
            currentTrackIndex: room.currentTrackIndex,
            playbackPosition: room.playbackPosition,
            isPlaying: room.isPlaying,
            timestamp: Date.now()
          });

          // Fetch previous messages
          const msgs = await Message.find({ roomId: room._id }).sort({ createdAt: 1 }).limit(50);
          socket.emit('chat_history', msgs);
        }
      } catch (err) {
        console.error(err);
      }
    });

    // Player Sync (Strict Host Source of Truth)
    socket.on('player_update', async ({ code, currentTrackIndex, playbackPosition, isPlaying }) => {
      const user = users[socket.id];
      if (!user) return;

      try {
        const room = await Room.findOne({ code });
        if (!room || room.adminUsername !== user.username) return; // Strict Host enforcement

        socket.to(code).emit('sync_playback', { 
          currentTrackIndex, 
          playbackPosition, 
          isPlaying, 
          timestamp: Date.now() 
        });
        
        await Room.updateOne({ code }, {
          currentTrackIndex,
          playbackPosition,
          isPlaying
        });
      } catch (err) {
        console.error(err);
      }
    });

    // Add to Queue (Admin Only)
    socket.on('add_to_queue', async ({ code, track }) => {
      const user = users[socket.id];
      if (!user) return;

      try {
        const room = await Room.findOne({ code });
        if (!room) return;

        // Authorization check
        if (room.adminUsername !== user.username) {
          socket.emit('error', 'Only the host can add tracks to the queue.');
          return;
        }

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
        if (!room) return;

        // Authorization check
        if (room.adminUsername !== user.username) {
          socket.emit('error', 'Only the host can remove tracks from the queue.');
          return;
        }

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
          sender: user.username,
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
    socket.on('kick_user', async ({ code, targetSocketId, adminUsername }) => {
      try {
        const room = await Room.findOne({ code });
        if (!room) return;
        
        // Primitive security check: verify the issuer matches the room's admin record
        if (room.adminUsername !== adminUsername) {
          console.log(`Unauthorized kick attempt by ${adminUsername}`);
          return;
        }

        // Remove from DB
        room.attendees = room.attendees.filter(a => a.socketId !== targetSocketId);
        await room.save();

        // Send a targeted event to the victim socket
        io.to(targetSocketId).emit('kicked');

        // Broadcast to the rest of the room that the user left (to clear the Sidebar)
        io.to(code).emit('user_left', targetSocketId);
        
        // Clean up server-side reference if it exists
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
        // Remove from db
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

      // For every active room in socket namespace
      for (const [roomCode, sockets] of io.sockets.adapter.rooms.entries()) {
        // Socket.io room id is either actual room string or socket.id. Filter out socket ids.
        if (roomCode.length !== 4) continue; // Our codes are 4 digits

        const rand = Math.random();
        if (rand < 0.1) {
          // 10% chance per interval to send a fake reaction
          const emojis = ['🔥', '❤️', '🎉', '👏', '🎵'];
          io.to(roomCode).emit('receive_reaction', { emoji: emojis[Math.floor(Math.random() * emojis.length)], id: Math.random() });
        } else if (rand < 0.15) {
          // 5% chance to send a fake chat message
          const room = await Room.findOne({ code: roomCode });
          if (room) {
            const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
            const text = BOT_MESSAGES[Math.floor(Math.random() * BOT_MESSAGES.length)];
            const msg = new Message({ roomId: room._id, sender: botName, text, isBot: true });
            await msg.save();
            io.to(roomCode).emit('receive_chat', msg);
          }
        } else if (rand > 0.95) {
            // 5% chance to simulate a fake user joining temporarily
            const fakeName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
            io.to(roomCode).emit('bot_joined', { username: fakeName });
        }
      }
    } catch(err) {
      console.error(err);
    }
  }, 5000); // Check every 5 seconds
};
