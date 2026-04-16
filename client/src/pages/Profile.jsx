import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Calendar, 
  Music, 
  Search, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  ArrowUpDown,
  History,
  AlertCircle,
  X,
  CheckCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { 
  fadeIn, 
  slideUp, 
  staggerContainer, 
  collapseOut, 
  slideUpBar,
  scaleIn
} from '../animations/variants';
import ConfirmModal from '../components/ConfirmModal';

// API Configuration
const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function Profile() {
  const shouldReduceMotion = useReducedMotion();
  const observer = useRef();
  
  // State
  const [user, setUser] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSongs, setTotalSongs] = useState(0);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  
  // Selection Logic
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, title } or 'bulk' or 'all'

  // Fetch User & Songs
  const fetchData = useCallback(async (pageNum = 1, shouldAppend = false) => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      setError('AUTH_REQUIRED');
      setLoading(false);
      return;
    }

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(
        `${API_URL}/api/users/me/songs?page=${pageNum}&platform=${filter}&sortBy=${sortBy}&order=${order}`, 
        config
      );
      
      const { songs: newSongs, pagination } = response.data;
      
      if (shouldAppend) {
        setSongs(prev => [...prev, ...newSongs]);
      } else {
        setSongs(newSongs);
      }
      
      setTotalPages(pagination.totalPages);
      setTotalSongs(pagination.total);
      
      if (!user) {
        let userData = {};
        try {
          const stored = localStorage.getItem('user_data');
          if (stored && stored !== 'undefined') {
            userData = JSON.parse(stored);
          }
        } catch (e) {
          console.error('Error parsing user data', e);
        }
        
        setUser({
          username: userData?.username || 'SyncUser',
          email: userData?.email || 'user@syncfm.com',
          joinedAt: userData?.joinedAt || '2026-01-15'
        });
      }
      
      setError(null);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('SESSION_EXPIRED');
        localStorage.removeItem('token');
        localStorage.removeItem('user_data');
      } else {
        setError('FETCH_ERROR');
        toast.error('Connection error');
      }
    } finally {
      setLoading(false);
    }
  }, [filter, sortBy, order, user]);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetchData(1, false);
  }, [fetchData]);

  // Infinite Scroll Trigger
  const lastSongElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && page < totalPages) {
        setPage(prev => {
          const nextPage = prev + 1;
          fetchData(nextPage, true);
          return nextPage;
        });
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, page, totalPages, fetchData]);

  // Delete Actions
  const handleDelete = async () => {
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };
    
    try {
      if (deleteTarget === 'bulk') {
        const res = await axios.delete(`${API_URL}/api/users/me/songs`, { 
          ...config, 
          data: { songIds: selectedIds } 
        });
        setSongs(prev => prev.filter(s => !selectedIds.includes(s._id)));
        setTotalSongs(prev => prev - res.data.deletedCount);
        setSelectedIds([]);
        toast.success(`Removed ${res.data.deletedCount} songs`);
      } else if (deleteTarget === 'all') {
        await axios.delete(`${API_URL}/api/users/me/songs`, { 
          ...config, 
          data: { clearAll: true } 
        });
        setSongs([]);
        setTotalSongs(0);
        toast.success('History cleared');
      } else {
        await axios.delete(`${API_URL}/api/users/me/songs/${deleteTarget.id}`, config);
        setSongs(prev => prev.filter(s => s._id !== deleteTarget.id));
        setTotalSongs(prev => prev - 1);
        toast.success('Removed from history');
      }
    } catch (err) {
      toast.error('Deletion failed');
    } finally {
      setDeleteTarget(null);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === songs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(songs.map(s => s._id));
    }
  };

  const platformColors = {
    spotify: 'text-green-400 bg-green-500/10 border-green-500/20',
    youtube: 'text-red-400 bg-red-500/10 border-red-500/20',
    mock: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20'
  };

  return (
    <motion.div 
      variants={fadeIn}
      initial="initial"
      animate="animate"
      className="min-h-screen bg-[#050505] text-white p-4 md:p-8 pt-24"
    >
      <Toaster position="top-right" />
      
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* USER INFO CARD */}
        <motion.div 
          variants={slideUp}
          className="glass-panel p-6 md:p-8 rounded-[2rem] flex flex-col md:flex-row items-center gap-8 border border-white/5 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-[100px] -z-10" />
          
          <div className="relative group">
            <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 p-1">
              <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center border-4 border-[#050505] overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} className="w-full h-full object-cover" alt="" />
                ) : (
                  <User size={64} className="text-zinc-600" />
                )}
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 bg-indigo-500 p-2 rounded-xl shadow-lg border-2 border-zinc-950">
              <CheckCircle size={16} className="text-white" />
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl font-bold tracking-tight mb-2">{user?.username || 'Loading...'}</h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-zinc-400 text-sm">
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full">
                <Mail size={14} className="text-indigo-400" />
                {user?.email}
              </div>
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full">
                <Calendar size={14} className="text-indigo-400" />
                Joined {user?.joinedAt || '2026'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
              <p className="text-2xl font-bold text-white">{totalSongs}</p>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Songs Added</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
              <p className="text-2xl font-bold text-white">0</p>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Rank</p>
            </div>
          </div>
        </motion.div>

        {/* CONTROLS BAR */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-zinc-900/40 p-2 rounded-2xl border border-white/5">
          <div className="flex items-center space-x-1 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
            {['all', 'spotify', 'youtube', 'mock'].map(p => (
              <button
                key={p}
                onClick={() => setFilter(p)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all relative ${
                  filter === p ? 'text-white' : 'text-zinc-500 hover:text-white'
                }`}
              >
                {p}
                {filter === p && (
                  <motion.div 
                    layoutId="activeFilter"
                    className="absolute inset-0 bg-white/10 rounded-xl -z-10"
                  />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto px-2">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
              <ArrowUpDown size={14} />
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent border-none focus:ring-0 cursor-pointer text-zinc-300"
              >
                <option value="createdAt">Date Added</option>
                <option value="title">Title</option>
              </select>
            </div>
            <button 
              onClick={() => setOrder(order === 'desc' ? 'asc' : 'desc')}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors text-zinc-400"
            >
              {order === 'desc' ? <Clock size={16} /> : <History size={16} />}
            </button>
            <div className="h-6 w-[1px] bg-white/10 mx-1" />
            <button 
              onClick={selectAll}
              className={`text-[10px] font-bold uppercase transition-colors ${
                selectedIds.length === songs.length ? 'text-indigo-400' : 'text-zinc-500 hover:text-white'
              }`}
            >
              Select All
            </button>
          </div>
        </div>

        {/* SONG HISTORY LIST */}
        <div className="space-y-4 pb-32">
          {loading && songs.length === 0 ? (
            // Skeleton State
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-zinc-900/50 animate-pulse border border-white/5" />
            ))
          ) : error === 'AUTH_REQUIRED' || error === 'SESSION_EXPIRED' ? (
            <div className="p-20 text-center glass-panel rounded-[2.5rem] border border-white/5 bg-zinc-950/50">
              <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/20">
                <Lock size={40} className="text-indigo-400" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-2">
                {error === 'AUTH_REQUIRED' ? 'Identity Required' : 'Session Expired'}
              </h3>
              <p className="text-zinc-500 max-w-sm mx-auto mb-8 font-medium leading-relaxed">
                {error === 'AUTH_REQUIRED' 
                  ? 'Please log in or create an account to view and manage your song history.'
                  : 'Your session has timed out. Please return home and log in again to continue.'}
              </p>
              <button 
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-indigo-600/20 uppercase tracking-widest text-xs"
              >
                Return to Login <ArrowRight size={16} />
              </button>
            </div>
          ) : error ? (
            <div className="p-12 text-center glass-panel rounded-3xl border border-red-500/20">
              <AlertCircle size={48} className="text-red-500 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold mb-2">Oops! Something went wrong</h3>
              <p className="text-zinc-400 mb-6 font-medium">We couldn't reach the server. Please check your connection.</p>
              <button 
                onClick={() => fetchData(1)}
                className="px-8 py-3 bg-indigo-600 rounded-xl font-bold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
              >
                Retry Connection
              </button>
            </div>
          ) : songs.length === 0 ? (
            <div className="p-20 text-center glass-panel rounded-3xl border border-white/5 bg-zinc-950/50">
              <History size={64} className="text-zinc-800 mx-auto mb-4 opacity-50" />
              <h3 className="text-2xl font-bold text-zinc-300">No song history found</h3>
              <p className="text-zinc-500 mt-2 font-medium">Start joining rooms and adding some bangers! 🎵</p>
            </div>
          ) : (
            <motion.div 
              variants={staggerContainer}
              className="space-y-3"
            >
              <AnimatePresence mode="popLayout">
                {songs.map((song, index) => (
                  <motion.div
                    key={song._id}
                    variants={collapseOut}
                    layout
                    ref={index === songs.length - 1 ? lastSongElementRef : null}
                    className={`group relative flex items-center p-3 rounded-2xl border transition-all ${
                      selectedIds.includes(song._id) 
                        ? 'bg-indigo-600/10 border-indigo-500/50 shadow-lg' 
                        : 'bg-zinc-900/30 border-white/5 hover:border-white/10 hover:bg-zinc-900/50'
                    }`}
                  >
                    {/* Checkbox */}
                    <button 
                      onClick={() => toggleSelect(song._id)}
                      className={`w-5 h-5 rounded-md border-2 mr-4 flex items-center justify-center transition-all ${
                        selectedIds.includes(song._id) 
                          ? 'bg-indigo-500 border-indigo-500' 
                          : 'border-white/10 group-hover:border-white/30'
                      }`}
                    >
                      {selectedIds.includes(song._id) && <X size={12} className="text-white" />}
                    </button>

                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-800 shrink-0">
                      <img src={song.albumArt} alt="" className="w-full h-full object-cover" />
                    </div>

                    <div className="ml-4 flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-white truncate text-sm md:text-base uppercase tracking-tight">{song.title}</h4>
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border inline-flex ${platformColors[song.platform] || platformColors.mock}`}>
                          {song.platform}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                        <span className="flex items-center gap-1.5"><Music size={12} /> {song.artist}</span>
                        <span className="flex items-center gap-1.5 font-bold text-zinc-400">
                          <ExternalLink size={12} className="text-indigo-500" /> Room: {song.room?.name || 'Vibes'} ({song.room?.code})
                        </span>
                        <span className="flex items-center gap-1.5"><Clock size={12} /> {new Date(song.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 pr-2">
                       <button
                         onClick={() => setDeleteTarget({ id: song._id, title: song.title })}
                         className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                         title="Remove from history"
                       >
                         <Trash2 size={18} />
                       </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {/* BULK ACTION BAR */}
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div 
              variants={slideUpBar}
              initial="initial"
              animate="animate"
              exit="exit"
              className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[95%] max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-3 shadow-[0_32px_64px_rgba(0,0,0,0.8)] z-[100] flex flex-col md:flex-row items-center justify-between gap-4 ring-1 ring-white/5"
            >
              <div className="flex items-center space-x-4 pl-4">
                <div className="bg-indigo-600 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ring-4 ring-indigo-600/20">
                   {selectedIds.length}
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-tight">Selection Active</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Choose an action below</p>
                </div>
              </div>

              <div className="flex items-center gap-2 pr-1">
                <button 
                  onClick={() => setSelectedIds([])}
                  className="px-6 py-3 rounded-full hover:bg-white/5 text-zinc-400 text-xs font-bold transition-colors uppercase tracking-widest"
                >
                  Cancel
                </button>
                <div className="h-6 w-[1px] bg-white/10 mx-1" />
                <button 
                  onClick={() => setDeleteTarget('bulk')}
                  className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-full transition-all shadow-lg shadow-red-600/20 uppercase tracking-widest"
                >
                  Delete Selected
                </button>
                <button 
                  onClick={() => setDeleteTarget('all')}
                  className="px-6 py-3 border border-red-500/30 hover:bg-red-500/10 text-red-400 text-xs font-bold rounded-full transition-all uppercase tracking-widest"
                >
                  Clear All
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CONFIRM MODAL */}
        <ConfirmModal 
          isOpen={!!deleteTarget}
          title={
            deleteTarget === 'all' ? 'Clear All History?' : 
            deleteTarget === 'bulk' ? `Delete ${selectedIds.length} songs?` : 
            'Remove from history?'
          }
          message={
            deleteTarget === 'all' ? 'This action will permanently remove your entire song history. This cannot be undone.' : 
            deleteTarget === 'bulk' ? `You are about to remove ${selectedIds.length} tracks from your history.` : 
            `Do you want to remove "${deleteTarget?.title}" from your listening history?`
          }
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          danger={true}
        />

      </div>
    </motion.div>
  );
}
