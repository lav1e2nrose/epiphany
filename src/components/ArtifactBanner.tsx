import { AnimatePresence, motion } from 'framer-motion'

interface Props {
  visible: boolean
  message: string
}

export function ArtifactBanner({ visible, message }: Props): JSX.Element {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          className="rounded-md border border-warn/60 bg-warn/10 px-3 py-2 text-sm text-warn"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
