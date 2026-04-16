import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogIn, UserPlus, Mail, Lock, User } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function AuthModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('login');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = activeTab === 'login' ? '/api/auth/login' : '/api/auth/register';
      const response = await axios.post(`${API_URL}${endpoint}`, formData);

      const { token, user } = response.data;
      
      // Save to localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user_data', JSON.stringify(user));

      toast.success(activeTab === 'login' ? 'Welcome back!' : 'Account created!');
      onClose();
      
      // Optional: Force a refresh or update context if needed
      window.location.reload(); 
    } catch (err) {
      console.error('Auth Error:', err);
      const errorMsg = err.response?.data?.msg || err.message || 'Authentication failed';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md"
          />

          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] shadow-2xl pointer-events-auto p-8 overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Sync.fm</h2>
                  <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest mt-1">Connect Your Rhythm</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-500 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex p-1 mb-8 bg-zinc-900 rounded-2xl">
                <button
                  onClick={() => setActiveTab('login')}
                  className={`flex-1 flex items-center justify-center py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                    activeTab === 'login' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <LogIn size={14} className="mr-2" /> Login
                </button>
                <button
                  onClick={() => setActiveTab('register')}
                  className={`flex-1 flex items-center justify-center py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                    activeTab === 'register' ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <UserPlus size={14} className="mr-2" /> Register
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {activeTab === 'register' && (
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      name="username"
                      type="text"
                      placeholder="Username"
                      value={formData.username}
                      onChange={handleChange}
                      required
                      className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-white"
                    />
                  </div>
                )}
                
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    name="email"
                    type="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-white"
                  />
                </div>

                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    name="password"
                    type="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-white"
                  />
                </div>

                <button
                  disabled={loading}
                  type="submit"
                  className={`w-full py-4 rounded-2xl font-bold text-sm uppercase tracking-widest text-white shadow-xl transition-all active:scale-95 disabled:opacity-50 mt-4 ${
                    activeTab === 'login' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-purple-600 hover:bg-purple-500'
                  }`}
                >
                  {loading ? 'Authenticating...' : activeTab === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              <p className="mt-8 text-center text-[10px] text-zinc-600 font-medium uppercase tracking-[0.2em]">
                By joining, you agree to the <span className="text-zinc-400 cursor-pointer hover:underline">Terms of Service</span>
              </p>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
