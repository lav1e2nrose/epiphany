import { motion } from 'framer-motion'
import clsx from 'clsx'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { MOTION_TRANSITION_FAST } from '../../constants/motion'

export interface NavItem {
  key: string
  label: string
  icon: JSX.Element
}

interface Props {
  items: NavItem[]
  activeKey: string
  onSelect: (key: string) => void
}

export function Sidebar({ items, activeKey, onSelect }: Props): JSX.Element {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 200 }}
      transition={MOTION_TRANSITION_FAST}
      className="flex h-full flex-col border-r border-border-subtle bg-bg-1 py-4"
    >
      <div className="flex-1 space-y-1 px-2">
        {items.map((item) => {
          const active = item.key === activeKey
          return (
            <button
              key={item.key}
              className={clsx(
                'group relative flex w-full items-center gap-3 overflow-hidden rounded-md px-3 py-2 text-left transition-all',
                active ? 'bg-bg-3 text-text-primary' : 'text-text-secondary hover:text-text-primary',
              )}
              onClick={() => onSelect(item.key)}
              title={collapsed ? item.label : undefined}
            >
              {active && <span className="absolute left-0 top-1 bottom-1 w-1 rounded-r bg-accent" />}
              <span>{item.icon}</span>
              {!collapsed && <span className="text-sm">{item.label}</span>}
            </button>
          )
        })}
      </div>
      <button className="mx-2 mt-2 flex items-center justify-center rounded-md border border-border-default py-2" onClick={() => setCollapsed((value) => !value)}>
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </motion.aside>
  )
}
