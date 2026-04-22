import { motion } from 'framer-motion'
import { Siren } from 'lucide-react'
import { useRef, useState } from 'react'

interface Props {
  holdDuration?: number
  onTrigger: () => void
}

export function SOSButton({ holdDuration = 3000, onTrigger }: Props): JSX.Element {
  const [progress, setProgress] = useState(0)
  const timerRef = useRef<number | null>(null)

  const clear = (): void => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current)
    timerRef.current = null
    setProgress(0)
  }

  const start = (): void => {
    const started = performance.now()
    timerRef.current = window.setInterval(() => {
      const elapsed = performance.now() - started
      const ratio = Math.min(1, elapsed / holdDuration)
      setProgress(ratio)
      if (ratio >= 1) {
        clear()
        onTrigger()
      }
    }, 30)
  }

  return (
    <button
      className="relative flex h-20 w-20 items-center justify-center rounded-full border border-danger/60 bg-danger/20 text-danger"
      onMouseDown={start}
      onMouseUp={clear}
      onMouseLeave={clear}
      onTouchStart={start}
      onTouchEnd={clear}
      aria-label="SOS"
    >
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" stroke="rgba(248,81,73,0.3)" strokeWidth="6" fill="none" />
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="#F85149"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={Math.PI * 2 * 45}
          strokeDashoffset={(1 - progress) * Math.PI * 2 * 45}
        />
      </svg>
      <motion.span whileTap={{ scale: 0.96 }} className="relative z-10">
        <Siren />
      </motion.span>
    </button>
  )
}
