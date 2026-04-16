import { motion } from 'framer-motion';

/**
 * PageTransition Component
 * Wraps routes to provide a consistent enter/exit animation.
 * Pattern: Slide + Fade (Right to Left)
 */
export default function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ 
        duration: 0.35, 
        ease: [0.33, 1, 0.68, 1] // Custom easeOutExpo-like curve
      }}
      className="w-full h-full min-h-screen"
    >
      {children}
    </motion.div>
  );
}
