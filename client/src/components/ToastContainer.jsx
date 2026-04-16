import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, LogOut } from 'lucide-react';

/**
 * Toast Component
 * Represents a single notification bubble.
 */
function Toast({ toast, onDismiss }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.8 }}
      className="flex items-center p-4 bg-[#121212] border border-white/10 rounded-2xl shadow-2xl min-w-[280px] pointer-events-auto"
    >
      <div className="relative">
        <img src={toast.avatar} alt="" className="w-10 h-10 rounded-full border border-indigo-500/30" />
        <div className={`absolute -bottom-1 -right-1 p-1 rounded-full text-white ${toast.type === 'join' ? 'bg-green-500' : 'bg-red-500 shadow-lg'}`}>
          {toast.type === 'join' ? <LogIn size={8} /> : <LogOut size={8} />}
        </div>
      </div>
      
      <div className="ml-4 overflow-hidden">
        <p className="text-sm font-bold text-white truncate">{toast.username}</p>
        <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
          {toast.type === 'join' ? 'Joined the room' : 'Left the party'}
        </p>
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        className="ml-auto p-1.5 text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        <LogIn size={14} className="rotate-45" /> 
      </button>
    </motion.div>
  );
}

/**
 * ToastContainer Component
 * Handles the stacking and layout of multiple toasts.
 */
export default function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed top-6 right-6 z-[200] flex flex-col items-end space-y-4 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );
}
