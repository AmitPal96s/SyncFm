import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { Users, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Sidebar({ code, isAdmin, adminUsername }) {
  const [listeners, setListeners] = useState([]);
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on('room_state', (state) => {
      setListeners(state.attendees || []);
    });

    socket.on('user_joined', (user) => {
      setListeners(prev => {
        // Prevent dupes
        if (prev.find(l => l.socketId === user.socketId)) return prev;
        return [...prev, user];
      });
    });

    socket.on('user_left', (socketId) => {
      setListeners(prev => prev.filter(l => l.socketId !== socketId));
    });

    socket.on('bot_joined', (user) => {
      const botObj = { socketId: 'bot_' + Math.random(), username: user.username, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}` };
      setListeners(prev => [...prev, botObj]);
      // Remove bot after 10 seconds to simulate popping in and out
      setTimeout(() => {
        setListeners(prev => prev.filter(l => l.socketId !== botObj.socketId));
      }, 10000);
    });

    return () => {
      socket.off('room_state');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('bot_joined');
    };
  }, [socket]);

  const sendReaction = (emoji) => {
    if (socket) socket.emit('send_reaction', { code, emoji });
  };

  const handleKick = (targetSocketId) => {
    if (socket && window.confirm('Are you sure you want to kick this user from the party?')) {
      socket.emit('kick_user', { code, targetSocketId, adminUsername });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 px-2">
        <h3 className="text-sm font-semibold flex items-center text-zinc-300">
          <Users size={16} className="mr-2 text-indigo-400" />
          Listeners ({listeners.length})
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-2 px-2 scrollbar-thin">
        <AnimatePresence initial={false} mode="popLayout">
          {listeners.map((l, idx) => (
            <motion.div
              layout
              key={l.socketId || idx}
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 25,
                mass: 1
              }}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="relative shrink-0">
                  <img src={l.avatar} alt="avatar" className="w-8 h-8 rounded-full bg-zinc-800" />
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-black rounded-full"
                  />
                </div>
                <span className="text-sm font-medium text-zinc-200 truncate flex-1">
                  {l.username} {l.username === adminUsername && <span className="opacity-50 text-xs ml-1">(Host)</span>}
                </span>
              </div>
              
              {isAdmin && l.username !== adminUsername && socket && !l.socketId?.startsWith('bot_') && (
                <button 
                  onClick={() => handleKick(l.socketId)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 transition-all text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-md shrink-0 focus:opacity-100 focus:outline-none"
                  title="Remove Guest"
                >
                  <X size={14} />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-4 pt-4 border-t border-white/5 flex justify-center space-x-2">
        {['🔥', '❤️', '🎉', '👏'].map(emoji => (
          <button 
            key={emoji}
            onClick={() => sendReaction(emoji)}
            className="w-10 h-10 rounded-full bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-center text-xl transition-transform hover:scale-110 active:scale-95"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
