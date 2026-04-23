export const MOTION_TRANSITION_FAST = { duration: 0.2, ease: 'easeInOut' } as const

export const MOTION_PAGE_VARIANTS = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
} as const

export const MOTION_TOAST_VARIANTS = {
  initial: { x: 96, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: 112, opacity: 0 },
} as const

export const MOTION_MODAL_BACKDROP = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
} as const

export const MOTION_MODAL_CONTENT = {
  initial: { scale: 0.94, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.97, opacity: 0 },
} as const
