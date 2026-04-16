/**
 * Reusable Framer Motion variants for SyncFm.
 * Focused on GPU-accelerated properties (opacity, transform).
 */

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3, ease: 'easeOut' }
};

export const fadeOut = {
  initial: { opacity: 1 },
  animate: { opacity: 0 },
  transition: { duration: 0.3, ease: 'easeIn' }
};

export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] }
};

export const slideDown = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
  transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] }
};

export const slideInLeft = {
  initial: { opacity: 0, x: -30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 30 },
  transition: { duration: 0.4, ease: 'easeOut' }
};

export const slideInRight = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
  transition: { duration: 0.4, ease: 'easeOut' }
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
  transition: { type: 'spring', damping: 25, stiffness: 300 }
};

export const scaleOut = {
  initial: { opacity: 1, scale: 1 },
  animate: { opacity: 0, scale: 0.9 },
  transition: { duration: 0.2, ease: 'easeIn' }
};

export const bounceIn = {
  initial: { opacity: 0, scale: 0.3 },
  animate: { opacity: 1, scale: 1 },
  transition: {
    type: 'spring',
    stiffness: 260,
    damping: 20
  }
};

export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

/**
 * Common Button Variants for Micro-interactions
 */
export const buttonInteraction = {
  hover: { scale: 1.03, transition: { duration: 0.2, ease: 'easeInOut' } },
  tap: { scale: 0.96, transition: { duration: 0.1, ease: 'easeInOut' } }
};

/**
 * Layout Item Variants (for Lists)
 */
export const listItem = {
  initial: { opacity: 0, scale: 0.95, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
  transition: { type: 'spring', damping: 25, stiffness: 300 }
};

/**
 * Custom Profile/User specific variants
 */
export const collapseOut = {
  initial: { opacity: 1, x: 0, height: 'auto' },
  exit: { 
    opacity: 0, 
    x: -30, 
    height: 0, 
    marginBottom: 0,
    paddingTop: 0,
    paddingBottom: 0,
    transition: { 
      duration: 0.4, 
      ease: [0.4, 0, 0.2, 1],
      opacity: { duration: 0.2 }
    } 
  }
};

export const slideUpBar = {
  initial: { y: 80, opacity: 0 },
  animate: { 
    y: 0, 
    opacity: 1,
    transition: { 
      type: 'spring', 
      damping: 20, 
      stiffness: 150 
    } 
  },
  exit: { 
    y: 80, 
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' }
  }
};
