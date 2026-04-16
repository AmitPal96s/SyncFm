import { motion, useReducedMotion } from 'framer-motion';

/**
 * EqualizerBars Component
 * Animated bars that react to the playback state.
 */
export default function EqualizerBars({ isPlaying, count = 5, color = "indigo" }) {
  const shouldReduceMotion = useReducedMotion();

  const barVariants = {
    playing: (i) => ({
      height: ["20%", "80%", "40%", "100%", "30%"],
      transition: {
        duration: 0.8,
        repeat: Infinity,
        delay: i * 0.1,
        ease: "easeInOut"
      }
    }),
    paused: {
      height: "20%",
      transition: { duration: 0.5 }
    }
  };

  const colors = {
    indigo: "bg-indigo-400",
    purple: "bg-purple-400",
    pink: "bg-pink-400"
  };

  return (
    <div className="flex items-end justify-center space-x-1 h-full py-1">
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          custom={i}
          variants={barVariants}
          animate={isPlaying && !shouldReduceMotion ? "playing" : "paused"}
          className={`w-1 rounded-full ${colors[color] || colors.indigo}`}
        />
      ))}
    </div>
  );
}
