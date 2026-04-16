import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogIn, User, ArrowRight, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import logo from '../assets/SyncFmLogo.png';  
import AuthModal from '../components/AuthModal';
import toast from 'react-hot-toast';

export default function Landing() {
  const [activeTab, setActiveTab] = useState('join');
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    let userData = {};
    try {
      userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    } catch (e) {
      console.error('Error parsing user data', e);
    }
    
    if (token) {
      setIsLoggedIn(true);
      if (userData && userData.username) setUsername(userData.username);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_data');
    setIsLoggedIn(false);
    toast.success('Logged out');
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!username || !roomCode) return;
    navigate(`/room/${roomCode}?username=${encodeURIComponent(username)}`);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!username || !roomName) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, roomName })
      });
      const data = await response.json();
      if (data.success) {
        navigate(`/room/${data.room.code}?username=${encodeURIComponent(username)}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-screen px-4 py-12 relative"
    >
      {/* Top Header Actions */}
      <div className="absolute top-8 right-8 flex items-center gap-3">
        {isLoggedIn ? (
          <>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-2xl hover:bg-red-500/20 transition-all text-red-400 text-xs font-bold uppercase tracking-wider"
            >
              <LogOut size={16} /> Logout
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/profile')}
              className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl hover:bg-white/10 transition-all group"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center overflow-hidden shrink-0 shadow-lg shadow-indigo-600/20">
                <User size={18} className="text-white" />
              </div>
            </motion.button>
          </>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-3 bg-indigo-600 px-6 py-2.5 rounded-2xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 text-white text-xs font-bold uppercase tracking-widest"
          >
            <LogIn size={16} /> Login / Sign Up
          </motion.button>
        )}
      </div>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
      
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="mb-12 text-center"
      >
        <motion.div 
          whileHover={{ scale: 1.05, rotate: 5 }}
          className="inline-flex items-center justify-center p-4 mb-6 rounded-full bg-indigo-500/10 ring-1 ring-indigo-500/30"
        >
          <img src={logo} alt="Sync.fm Logo" className="w-12 h-12 object-contain" />
        </motion.div>
        <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
          Sync.fm
        </h1>
        <p className="mt-4 text-lg text-zinc-400 max-w-md mx-auto">
          Experience music together in real-time. Join a listening party and vibe with friends.
        </p>
      </motion.div>

      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-md glass-panel rounded-2xl p-6 md:p-8 shadow-2xl transition-all duration-300"
      >
        
        {/* Tabs */}
        <div className="flex p-1 mb-8 space-x-1 bg-black/40 rounded-xl">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab('join')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'join' 
                ? 'bg-indigo-500/20 text-indigo-300 shadow' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
            }`}
          >
            Join Room
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'create' 
                ? 'bg-purple-500/20 text-purple-300 shadow' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
            }`}
          >
            Create Room
          </motion.button>
        </div>

        {/* Tab Content */}
        <div className="relative overflow-hidden">
          {activeTab === 'join' ? (
            <motion.form 
              key="join"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              onSubmit={handleJoin} 
              className="space-y-5"
            >
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Your Name</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                  placeholder="e.g. ChillWave"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Room Code</label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all uppercase"
                  placeholder="4-Digit Code"
                  maxLength={4}
                  required
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02, backgroundColor: '#4f46e5' }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full flex items-center justify-center py-3.5 px-4 bg-indigo-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/25 mt-2"
              >
                <LogIn size={20} className="mr-2" /> Join Party
              </motion.button>
            </motion.form>
          ) : (
            <motion.form 
              key="create"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              onSubmit={handleCreate} 
              className="space-y-5"
            >
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Your Name</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                  placeholder="e.g. Master DJ"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Room Name</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                  placeholder="e.g. Late Night Vibes"
                  required
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02, backgroundColor: '#9333ea' }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center py-3.5 px-4 bg-purple-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-purple-500/25 mt-2 disabled:opacity-50"
              >
                <Plus size={20} className="mr-2" /> {isLoading ? 'Creating...' : 'Create Room'}
              </motion.button>
            </motion.form>
          )}
        </div>
      </motion.div>
      
    </motion.div>
  );
}

