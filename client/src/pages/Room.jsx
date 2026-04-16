import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Copy, Check, Search, Music, MessageCircle, Trash2, Share2, User } from 'lucide-react';
import Player from '../components/Player';
import Sidebar from '../components/Sidebar';
import Chat from '../components/Chat';
import ReactionOverlay from '../components/ReactionOverlay';
import MediaSearch from '../components/MediaSearch';
import ToastContainer from '../components/ToastContainer';

export default function Room() {
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const [username] = useState(
    searchParams.get('username') || 
    localStorage.getItem('syncfm_username') || 
    'Anonymous'
  );
  const [toasts, setToasts] = useState([]);
  const navigate = useNavigate();
  const socket = useSocket();
  
  const [roomData, setRoomData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  
  // UI States
  const [activeTab, setActiveTab] = useState('explore'); // 'explore' or 'social'
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Lifted Player Queue State
  const [playerState, setPlayerState] = useState({ queue: [], currentIndex: 0, playTrack: null });

  const addToast = (username, avatar, type) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, username, avatar, type }]);
    
    // Auto remove after 3.5s
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/rooms/${code}`);
        const data = await res.json();
        if (data.success) {
          setRoomData(data.room);
          setPlayerState(prev => ({ ...prev, queue: data.room.queue || [], currentIndex: data.room.currentTrackIndex || 0 }));
        } else {
          setError('Room not found');
        }
      } catch {
        setError('Error fetching room');
      }
    };
    fetchRoom();
  }, [code]);

  useEffect(() => {
    if (socket && roomData) {
      const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
      socket.emit('join_room', { code, username, avatar });
    }
  }, [socket, roomData, code, username]);

  useEffect(() => {
    if (!socket) return;
    
    socket.on('user_joined', (user) => {
      addToast(user.username, user.avatar, 'join');
    });

    socket.on('user_left', (socketId) => {
      // We need the username/avatar for the toast, but user_left usually only has socketId.
      // For a production app, we'd find the user in our local attendees list.
      addToast('Someone', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Left', 'leave');
    });

    socket.on('kicked', () => {
      alert("You have been removed from the party by the host.");
      navigate('/');
    });

    return () => {
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('kicked');
    };
  }, [socket, navigate]);

  const isAdmin = roomData?.adminUsername === username;

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-3xl font-bold mb-4">{error}</h1>
        <button onClick={() => navigate('/')} className="px-6 py-2 bg-indigo-600 rounded-lg">Go Home</button>
      </div>
    );
  }

  if (!roomData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse flex items-center text-indigo-400">
          <div className="w-12 h-12 border-4 border-t-indigo-500 border-indigo-500/20 rounded-full animate-spin"></div>
          <span className="ml-4 font-semibold text-lg">Loading Room...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-black text-white relative">
      <ReactionOverlay code={code} />
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <header className="flex-none flex items-center justify-between px-4 py-3 glass-panel border-b border-white/5 z-40 relative">
        <div className="flex items-center space-x-3">
          <motion.button 
            whileHover={{ rotate: -10, scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/')} 
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-400"
          >
            <LogOut size={20} />
          </motion.button>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center">
              Sync.fm <span className="mx-2 opacity-20">/</span> <span className="text-indigo-400 uppercase">{code}</span>
            </h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {!window.localStorage.getItem("spotify_token") ? (
            <button
              onClick={() => {
                const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID || 'YOUR_CLIENT_ID';
                const redirectUri = encodeURIComponent(window.location.origin);
                const scope = encodeURIComponent('streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state');
                window.location.href = `https://accounts.spotify.com/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=token&state=spotify_${code}`;
              }}
              className="px-2.5 py-1 text-xs font-semibold bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded border border-green-500/20 transition-colors"
            >
              Spotify
            </button>
          ) : (
            <button
              onClick={() => { window.localStorage.removeItem("spotify_token"); window.location.reload(); }}
              className="px-2.5 py-1 text-xs font-semibold bg-green-500/30 text-green-200 rounded border border-green-500/50"
            >
              Spotify ✓
            </button>
          )}

          {!window.localStorage.getItem("youtube_token") ? (
            <button
              onClick={() => {
                const googleClientId = import.meta.env.VITE_YOUTUBE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
                const redirectUri = encodeURIComponent(window.location.origin);
                const scope = encodeURIComponent('https://www.googleapis.com/auth/youtube.readonly');
                window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}&state=youtube_${code}`;
              }}
              className="px-2.5 py-1 text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded border border-red-500/20 transition-colors"
            >
              YT Music
            </button>
          ) : (
            <button
              onClick={() => { window.localStorage.removeItem("youtube_token"); window.location.reload(); }}
              className="px-2.5 py-1 text-xs font-semibold bg-red-500/30 text-red-200 rounded border border-red-500/50"
            >
              YT ✓
            </button>
          )}

          <motion.button 
            whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }}
            whileTap={{ scale: 0.9 }}
            onClick={copyCode} 
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-indigo-400"
          >
            {copied ? <Check size={20} /> : <Share2 size={20} />}
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/profile')} 
            className="p-1 px-1.5 md:p-2 hover:bg-white/5 rounded-full transition-colors text-white border border-white/10"
          >
            <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-indigo-600 flex items-center justify-center overflow-hidden">
               <User size={14} className="text-white" />
            </div>
          </motion.button>
        </div>
      </header>

      {/* Tab Navigation (Mobile First) */}
      <div className="flex-none flex items-center justify-around bg-black/80 border-b border-white/5 py-1 px-4 z-30 relative">
        <button 
          onClick={() => setActiveTab('explore')}
          className={`flex-1 max-w-xs flex items-center justify-center space-x-2 py-3 border-b-2 transition-colors ${
            activeTab === 'explore' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Music size={18} />
          <span className="font-semibold text-sm">Explore</span>
        </button>
        <button 
          onClick={() => setActiveTab('social')}
          className={`flex-1 max-w-xs flex items-center justify-center space-x-2 py-3 border-b-2 transition-colors ${
            activeTab === 'social' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <MessageCircle size={18} />
          <span className="font-semibold text-sm">Chat & Social</span>
        </button>
      </div>

      {/* Dynamic Content Area (Always leaves room for MiniPlayer at bottom) */}
      <main className="flex-1 overflow-hidden relative z-10 bg-gradient-to-b from-zinc-900/50 to-black pb-16 lg:pb-0">
        
        {/* EXPLORE TAB */}
        <div className={`absolute inset-0 flex flex-col transition-opacity duration-300 ${activeTab === 'explore' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <div className="p-4 w-full max-w-4xl mx-auto flex-none">
            <div className="glass-panel rounded-2xl overflow-hidden shadow-lg border border-white/5">
              <MediaSearch code={code} isAdmin={isAdmin} />
            </div>
            
            <h3 className="text-xl font-bold text-white mt-8 mb-4 px-2 tracking-tight">Queue</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto px-4 w-full max-w-4xl mx-auto space-y-2 pb-24">
            <AnimatePresence initial={false} mode="popLayout">
              {playerState.queue.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center p-8 text-zinc-500"
                >
                  Queue is empty. Search for a song above!
                </motion.div>
              )}
              {playerState.queue.map((track, idx) => (
                <motion.div
                  layout
                  key={track.id + idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                >
                  <button 
                    onClick={() => {
                      if (isAdmin) {
                        playerState.playTrack && playerState.playTrack(idx);
                      }
                    }}
                    className={`w-full flex items-center p-3 rounded-2xl transition-all ${
                      playerState.currentIndex === idx 
                        ? 'bg-indigo-600/20 border border-indigo-500/30 shadow-lg' 
                        : 'bg-black/20 hover:bg-white/5 border border-transparent'
                    } ${!isAdmin ? 'cursor-default' : ''}`}
                    title={!isAdmin ? 'Only the host can change tracks' : ''}
                  >
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-none mr-4">
                      <img src={track.albumArt || 'https://via.placeholder.com/48'} className="w-full h-full object-cover" alt="" />
                      {playerState.currentIndex === idx && (
                        <div className="absolute inset-0 bg-indigo-500/30 flex items-center justify-center backdrop-blur-[1px]">
                          <Music size={16} className="text-white drop-shadow-md animate-pulse" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0 pr-4">
                      <div className={`font-semibold text-sm sm:text-base truncate ${playerState.currentIndex === idx ? 'text-indigo-300' : 'text-white'}`}>
                        {track.title}
                      </div>
                      <div className="text-xs sm:text-sm text-zinc-400 truncate mt-0.5">{track.artist}</div>
                    </div>
                    <div className="flex-none flex items-center space-x-3">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-zinc-500 bg-white/5 px-2 py-0.5 rounded mb-1">{track.type}</span>
                        <span className="text-xs font-mono text-zinc-500">{formatTime(track.duration)}</span>
                      </div>
                      
                      {isAdmin && (
                        <motion.button 
                          whileHover={{ scale: 1.1, color: '#f87171' }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (socket) socket.emit('remove_from_queue', { code, trackId: track.id });
                          }}
                          className="p-2 text-zinc-500 hover:bg-red-500/10 rounded-xl transition-colors"
                          title="Remove from queue"
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      )}
                    </div>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* SOCIAL TAB */}
        <div className={`absolute inset-0 flex flex-col lg:flex-row transition-opacity duration-300 ${activeTab === 'social' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <div className="w-full lg:w-1/3 min-h-[150px] lg:h-full border-b lg:border-b-0 lg:border-r border-white/5 flex flex-col bg-black/40">
            <Sidebar code={code} isAdmin={isAdmin} adminUsername={username} />
          </div>
          <div className="flex-1 flex flex-col h-full bg-black/20 pb-16 lg:pb-0">
            <Chat code={code} username={username} />
          </div>
        </div>

      </main>

      {/* The Global Player (Docks at bottom or expands to Fullscreen) */}
      <Player 
        roomData={roomData} 
        code={code}
        isExpanded={isExpanded}
        setIsExpanded={setIsExpanded}
        onQueueUpdate={setPlayerState}
        isAdmin={isAdmin}
      />
      
    </div>
  );
}
