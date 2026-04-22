import { AnimatePresence, motion } from 'framer-motion'

interface Props {
  visible: boolean
  onClose: () => void
}

export function EmergencyOverlay({ visible, onClose }: Props): JSX.Element {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0D0000]/90 backdrop-blur"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            className="w-[560px] rounded-xl border border-danger/60 bg-bg-1 p-6"
          >
            <h2 className="text-2xl font-semibold text-danger">高危报警</h2>
            <p className="mt-2 text-text-secondary">状态：发送中 → 已送达 → 等待确认</p>
            <div className="mt-6 flex justify-end gap-3">
              <button className="rounded-md border border-border-default px-4 py-2">🗺 一键导航</button>
              <button className="rounded-md bg-danger px-4 py-2 text-white" onClick={onClose}>✓ 已确认处理</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
