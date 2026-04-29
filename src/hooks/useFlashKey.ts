import { useEffect, useRef, useState } from 'react'

/** Returns true for 100ms whenever value changes — use to drive an opacity flash. */
export function useFlashKey(value: number | string): boolean {
  const [flashing, setFlashing] = useState(false)
  const prevRef = useRef(value)
  useEffect(() => {
    if (prevRef.current === value) return
    prevRef.current = value
    setFlashing(true)
    const t = window.setTimeout(() => setFlashing(false), 100)
    return () => window.clearTimeout(t)
  }, [value])
  return flashing
}
