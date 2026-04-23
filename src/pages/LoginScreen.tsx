import { motion } from 'framer-motion'
import { Brain } from 'lucide-react'
import { useState } from 'react'
import { MOTION_MODAL_CONTENT, MOTION_TRANSITION_FAST } from '../constants/motion'
import { useAppStore } from '../store'
import type { Portal } from '../types/user'

const cards: Array<{ role: Portal; title: string; subtitle: string }> = [
  { role: 'patient', title: '👤 患者', subtitle: '个人健康管理与预警' },
  { role: 'guardian', title: '👨‍👩‍👧 监护人', subtitle: '家庭守护与远程监控' },
  { role: 'doctor', title: '🩺 医生', subtitle: '临床管理与数据分析' },
]

export function LoginScreen(): JSX.Element {
  const login = useAppStore((state) => state.login)
  const [role, setRole] = useState<Portal | null>(null)
  const [username, setUsername] = useState('demo')
  const [password, setPassword] = useState('demo123')
  const [error, setError] = useState(false)

  return (
    <div className="relative flex h-screen flex-col items-center justify-center bg-bg-0 px-4">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="relative z-10 w-full max-w-5xl">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 text-2xl font-semibold">
            <Brain className="text-accent" /> 灵犀妙探
          </div>
          <p className="mt-2 text-text-secondary">智能癫痫全周期监测平台</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {cards.map((card) => (
            <button
              key={card.role}
              className={`rounded-lg border p-4 text-left transition-all ${role === card.role ? 'border-accent shadow-[0_0_20px_rgba(10,132,255,0.25)]' : 'border-border-default bg-bg-2/80'}`}
              onClick={() => setRole(card.role)}
            >
              <div className="font-semibold">{card.title}</div>
              <div className="mt-2 text-sm text-text-secondary">{card.subtitle}</div>
              <div className="mt-3 text-xs text-text-muted">演示账号: demo / demo123</div>
            </button>
          ))}
        </div>

        <motion.div
          variants={MOTION_MODAL_CONTENT}
          initial="initial"
          animate={role ? 'animate' : 'exit'}
          transition={MOTION_TRANSITION_FAST}
          className="mx-auto mt-5 max-w-md overflow-hidden"
        >
          <div className={`rounded-md border border-border-default bg-bg-2 p-4 ${error ? 'animate-shake' : ''}`}>
            <input className="mb-2 w-full rounded border border-border-default bg-bg-3 px-3 py-2" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="账号" />
            <input className="mb-3 w-full rounded border border-border-default bg-bg-3 px-3 py-2" value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="密码" />
            <button
              className="w-full rounded-md bg-accent px-3 py-2"
              onClick={() => {
                if (!role || username !== 'demo' || password !== 'demo123') {
                  setError(true)
                  window.setTimeout(() => setError(false), 300)
                  return
                }
                login({ id: 'demo', name: 'Demo User', role })
              }}
            >
              登录
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
