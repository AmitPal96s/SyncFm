import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';

/**
 * ConfirmModal Component
 * A reusable modal for destructive actions.
 */
export default function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  danger = true 
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400 }}
              className="w-full max-w-md bg-[#121212] border border-white/10 rounded-2xl shadow-2xl pointer-events-auto overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-xl ${danger ? 'bg-red-500/10' : 'bg-indigo-500/10'} mb-4`}>
                    <AlertCircle className={danger ? 'text-red-400' : 'text-indigo-400'} size={24} />
                  </div>
                  <button onClick={onCancel} className="text-zinc-500 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                  {message}
                </p>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={onCancel}
                    className="flex-1 py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onConfirm}
                    className={`flex-1 py-3 px-4 rounded-xl ${
                      danger ? 'bg-red-600 hover:bg-red-500' : 'bg-indigo-600 hover:bg-indigo-500'
                    } text-white font-semibold transition-colors text-sm shadow-lg`}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
