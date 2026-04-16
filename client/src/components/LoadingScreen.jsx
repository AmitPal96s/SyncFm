import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import logo from '../assets/SyncFmLogo.png';

/**
 * LoadingScreen Component
 * Handles the initial application bootstrap visual.
 */
export default function LoadingScreen({ isLoading }) {
  const [progress, setProgress] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isLoading) return;

    // Simulate progress over 2.5 seconds
    const duration = 2500;
    const intervalTime = 25;
    const increment = (100 / duration) * intervalTime;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + increment;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isLoading]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8, ease: 'easeInOut' } }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#050505] text-white"
        >
          {/* Main Content Container */}
          <div className="relative flex flex-col items-center space-y-8">
            
            {/* Pulsing Logo */}
            <motion.div
              animate={shouldReduceMotion ? {} : {
                scale: [1, 1.08, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="relative p-6 rounded-3xl bg-indigo-500/5 ring-1 ring-indigo-500/20 shadow-[0_0_50px_rgba(99,102,241,0.1)]"
            >
              <img src={logo} alt="SyncFm" className="w-24 h-24 object-contain" />
              
              {/* Equalizer Bars Overlay */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-end space-x-1 h-8">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={shouldReduceMotion ? { height: "50%" } : {
                      height: ["20%", "80%", "40%", "100%", "20%"]
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      delay: i * 0.15,
                      ease: "easeInOut"
                    }}
                    className="w-1.5 bg-indigo-400 rounded-full"
                  />
                ))}
              </div>
            </motion.div>

            {/* Tagline */}
            <div className="text-center overflow-hidden">
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400"
              >
                Sync.fm
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ delay: 0.6 }}
                className="text-xs uppercase tracking-[0.3em] font-medium mt-2"
              >
                Collaborative Rhythm
              </motion.p>
            </div>

            {/* Progress Bar Container */}
            <div className="w-64">
              <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Initializing</span>
                <span className="text-[10px] font-mono font-bold text-indigo-400">{Math.round(progress)}%</span>
              </div>
              <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "linear" }}
                />
              </div>
            </div>
          </div>

          {/* Background Ambient Glows */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none overflow-hidden">
             <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
             <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full -translate-x-1/2 translate-y-1/2" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
