import { AnimatePresence, motion } from 'framer-motion'
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
  const [errorText, setErrorText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleLogin = (): void => {
    if (submitting) return
    if (!role || username !== 'demo' || password !== 'demo123') {
      setError(true)
      setErrorText(!role ? '请先选择身份后再登录。' : '账号或密码错误，请重试。')
      window.setTimeout(() => setError(false), 320)
      return
    }
    setError(false)
    setErrorText('')
    setSubmitting(true)
    window.setTimeout(() => login({ id: 'demo', name: 'Demo User', role }), 500)
  }

  return (
    <div className="relative flex h-screen flex-col items-center justify-center bg-bg-0 px-4">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-accent/15 blur-3xl" />
      <div className="relative z-10 w-full max-w-5xl">
        <motion.div className="mb-8 text-center" animate={submitting ? { y: -30, opacity: 0.4 } : { y: 0, opacity: 1 }} transition={{ duration: 0.25 }}>
          <div className="inline-flex items-center gap-2 text-2xl font-semibold">
            <Brain className="text-accent" /> 灵犀妙探
          </div>
          <p className="mt-2 text-text-secondary">智能癫痫全周期监测平台</p>
        </motion.div>

        <motion.div className="grid grid-cols-3 gap-4" animate={submitting ? { y: -80, opacity: 0 } : { y: 0, opacity: 1 }} transition={{ duration: 0.5 }}>
          {cards.map((card) => (
            <button
              key={card.role}
              className={`rounded-lg border p-4 text-left transition-all ${role === card.role ? 'border-accent shadow-[0_0_20px_rgba(10,132,255,0.25)]' : 'border-border-default bg-bg-2/80'} ${role && role !== card.role ? 'opacity-55' : ''}`}
              onClick={() => setRole(card.role)}
              disabled={submitting}
            >
              <div className="font-semibold">{card.title}</div>
              <div className="mt-2 text-sm text-text-secondary">{card.subtitle}</div>
              <div className="mt-3 text-xs text-text-muted">演示账号: demo / demo123</div>
            </button>
          ))}
        </motion.div>

        <AnimatePresence>
          {role && (
            <motion.div
              variants={MOTION_MODAL_CONTENT}
              initial="initial"
              animate={submitting ? { y: -60, opacity: 0 } : 'animate'}
              exit="exit"
              transition={MOTION_TRANSITION_FAST}
              className="mx-auto mt-5 max-w-md overflow-hidden"
            >
              <div className={`rounded-md border border-border-default bg-bg-2 p-4 ${error ? 'animate-shake' : ''}`}>
                <input className="mb-2 w-full rounded border border-border-default bg-bg-3 px-3 py-2" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="账号" />
                <input className="mb-2 w-full rounded border border-border-default bg-bg-3 px-3 py-2" value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="密码" />
                {errorText && <div className="mb-2 text-xs text-danger">{errorText}</div>}
                <button className="w-full rounded-md bg-accent px-3 py-2" onClick={handleLogin} disabled={submitting}>
                  {submitting ? '登录中...' : '登录'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
