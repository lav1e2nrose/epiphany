export const MOTION_TRANSITION_FAST = { duration: 0.2, ease: 'easeInOut' } as const

export const MOTION_TRANSITION_MODAL_EXIT = { duration: 0.1, ease: 'easeIn' } as const

export const MOTION_TRANSITION_SPRING = { type: 'spring', stiffness: 360, damping: 28 } as const

export const MOTION_PAGE_VARIANTS = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
} as const

/**
 * Direction-aware page transition variants.
 * direction > 0 = navigating forward (new page slides in from right, old exits left)
 * direction < 0 = navigating backward (new page slides in from left, old exits right)
 */
export function makePageVariants(direction: number): {
  initial: { opacity: number; x: number }
  animate: { opacity: number; x: number }
  exit: { opacity: number; x: number }
} {
  const offset = 24
  return {
    initial: { opacity: 0, x: direction >= 0 ? offset : -offset },
    animate: { opacity: 1, x: 0 },
    exit:    { opacity: 0, x: direction >= 0 ? -offset : offset },
  }
}

export const MOTION_TOAST_VARIANTS = {
  initial: { x: '100%', opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: '120%', opacity: 0 },
} as const

export const MOTION_MODAL_BACKDROP = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
} as const

export const MOTION_MODAL_CONTENT = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.95, opacity: 0 },
} as const
