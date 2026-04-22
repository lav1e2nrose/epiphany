import { motion } from 'framer-motion'
import clsx from 'clsx'
import { useAppStore } from '../../store'
import type { Portal } from '../../types/user'

const portals: Array<{ key: Portal; label: string }> = [
  { key: 'patient', label: '患者端' },
  { key: 'guardian', label: '监护人端' },
  { key: 'doctor', label: '医生端' },
]

export function PortalSwitcher(): JSX.Element {
  const currentPortal = useAppStore((state) => state.currentPortal)
  const switchPortal = useAppStore((state) => state.switchPortal)

  return (
    <div className="relative flex rounded-full border border-border-default bg-bg-2 p-1">
      {portals.map((portal) => {
        const active = portal.key === currentPortal
        return (
          <button
            key={portal.key}
            className={clsx(
              'relative z-10 rounded-full px-3 py-1 text-xs transition-all no-drag',
              active ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary',
            )}
            onClick={() => switchPortal(portal.key)}
          >
            {active && (
              <motion.span
                layoutId="portal-active"
                className="absolute inset-0 -z-10 rounded-full bg-accent-dim"
                transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              />
            )}
            {portal.label}
          </button>
        )
      })}
    </div>
  )
}
