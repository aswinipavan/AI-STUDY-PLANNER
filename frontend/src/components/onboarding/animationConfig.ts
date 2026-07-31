import type { Variants } from 'framer-motion';

/** Cubic bezier: custom ease-out (matches Apple's spring feel) */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Cubic bezier: ease-in for exits */
export const EASE_IN = [0.4, 0, 1, 1] as const;

/** Shared staggered text reveal variants — used on every onboarding page */
export const textVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.14,
      duration: 0.7,
      ease: EASE_OUT,
    },
  }),
};
