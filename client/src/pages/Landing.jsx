import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogIn } from 'lucide-react';
import logo from '../assets/SyncFmLogo.png';  

export default function Landing() {
  const [activeTab, setActiveTab] = useState('join');
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

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
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12" style={{ viewTransitionName: 'page' }}>
      
      <div className="mb-12 text-center animate-fade-in-up">
        <div className="inline-flex items-center justify-center p-4 mb-6 rounded-full bg-indigo-500/10 ring-1 ring-indigo-500/30">
          <img src={logo} alt="Sync.fm Logo" className="w-12 h-12 object-contain" />
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
          Sync.fm
        </h1>
        <p className="mt-4 text-lg text-zinc-400 max-w-md mx-auto">
          Experience music together in real-time. Join a listening party and vibe with friends.
        </p>
      </div>

      <div className="w-full max-w-md glass-panel rounded-2xl p-6 md:p-8 shadow-2xl transition-all duration-300">
        
        {/* Tabs */}
        <div className="flex p-1 mb-8 space-x-1 bg-black/40 rounded-xl">
          <button
            onClick={() => setActiveTab('join')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'join' 
                ? 'bg-indigo-500/20 text-indigo-300 shadow' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
            }`}
          >
            Join Room
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'create' 
                ? 'bg-purple-500/20 text-purple-300 shadow' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
            }`}
          >
            Create Room
          </button>
        </div>

        {/* Tab Content */}
        <div className="relative">
          {activeTab === 'join' ? (
            <form onSubmit={handleJoin} className="space-y-5 animate-fade-in">
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
              <button
                type="submit"
                className="w-full flex items-center justify-center py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/25 mt-2"
              >
                <LogIn size={20} className="mr-2" /> Join Party
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreate} className="space-y-5 animate-fade-in">
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
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center py-3.5 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-purple-500/25 mt-2 disabled:opacity-50"
              >
                <Plus size={20} className="mr-2" /> {isLoading ? 'Creating...' : 'Create Room'}
              </button>
            </form>
          )}
        </div>
      </div>
      
    </div>
  );
}
