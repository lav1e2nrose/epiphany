import { useMemo, useRef, useState } from 'react'
import { Lock, Save } from 'lucide-react'
import { MedicalHistoryForm } from '../../components/clinical/MedicalHistoryForm'
import { useAppStore } from '../../store'
import type { MedicalHistory } from '../../types/clinical'

const chapters: Array<{ key: string; label: string }> = [
  { key: 'basic', label: '1. 基本信息' },
  { key: 'history', label: '2. 既往疾病史' },
  { key: 'medication', label: '3. 用药记录' },
  { key: 'evolution', label: '4. 发作演变' },
  { key: 'exam', label: '5. 检查报告' },
  { key: 'questionnaire', label: '6. 心理量表' },
]

// 简单完成度估算：各关键维度是否已填写
function completion(history: MedicalHistory): number {
  const checks = [
    history.cerebralInfection.value !== 'unknown',
    history.headTrauma.value !== 'unknown',
    history.birthInjury.value !== 'unknown',
    history.febrileSeizure.value !== 'unknown',
    history.familyHistory.value !== 'unknown',
    history.medications.length > 0,
    history.onsetAge > 0,
    history.seizureFrequencyHistory.length > 0,
    history.examinations.length > 0,
    history.questionnaires.length > 0,
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

export function MyProfile(): JSX.Element {
  const patientId = useAppStore((state) => state.currentUser?.id ?? 'p1')
  const currentUser = useAppStore((state) => state.currentUser)
  const patients = useAppStore((state) => state.patients)
  const history = useAppStore((state) => state.medicalHistories[patientId] ?? state.medicalHistories.p1)
  const upsertMedicalHistory = useAppStore((state) => state.upsertMedicalHistory)
  const pushAlert = useAppStore((state) => state.pushAlert)

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [activeChapter, setActiveChapter] = useState('basic')
  const [lockRequested, setLockRequested] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const patient = useMemo(() => patients.find((item) => item.id === patientId), [patients, patientId])
  const readOnly = history.lockedByDoctor
  const pct = completion(history)

  const scrollTo = (key: string): void => {
    setActiveChapter(key)
    scrollRef.current?.querySelector(`[data-section="${key}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleChange = (next: MedicalHistory): void => {
    upsertMedicalHistory(next)
    setSavedAt(Date.now())
  }

  const requestLock = (): void => {
    setLockRequested(true)
    pushAlert({
      id: `lock-${Date.now()}`,
      type: 'success',
      title: '已提交锁定申请',
      message: '档案已提交给医生审核，确认后将锁定为正式版本。',
      timestamp: Date.now(),
      handlingStatus: 'resolved',
    })
  }

  return (
    <div className="grid h-full grid-cols-[220px_1fr] gap-3">
      <aside className="flex flex-col rounded-md border border-border-default bg-bg-2 p-3 text-sm">
        <div className="font-semibold">我的档案</div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>完整度</span>
            <span className="font-mono">{pct}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-bg-0">
            <div className="h-full rounded bg-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <nav className="mt-4 flex-1 space-y-1 text-xs">
          {chapters.map((chapter) => (
            <button
              key={chapter.key}
              className={`block w-full rounded px-2 py-1.5 text-left transition-colors ${activeChapter === chapter.key ? 'bg-bg-3 text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
              onClick={() => scrollTo(chapter.key)}
            >
              {chapter.label}
            </button>
          ))}
        </nav>
        <div className="mt-3 space-y-2">
          <div className={`rounded border px-2 py-1 text-xs ${readOnly ? 'border-warn/50 text-warn' : 'border-safe/40 text-safe'}`}>
            {readOnly ? '已锁定（医生）· 只读' : '可编辑 · 自动保存'}
          </div>
          <button
            className="flex w-full items-center justify-center gap-1 rounded border border-border-default px-2 py-1.5 text-xs transition-transform active:scale-95 disabled:opacity-40"
            disabled={readOnly || lockRequested}
            onClick={requestLock}
          >
            <Lock size={12} /> {lockRequested ? '锁定申请已提交' : '申请医生锁定'}
          </button>
        </div>
      </aside>

      <section ref={scrollRef} className="space-y-4 overflow-auto rounded-md border border-border-default bg-bg-1 p-3 text-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{patient?.name ?? currentUser?.name ?? '患者'} · 个人临床档案</h2>
          {savedAt && (
            <span className="flex items-center gap-1 text-xs text-safe"><Save size={12} /> 已自动保存 · {new Date(savedAt).toLocaleTimeString('zh-CN')}</span>
          )}
        </div>

        {/* 基本信息（来自账户登记，作为档案抬头） */}
        <section data-section="basic" className="rounded-md border border-border-default bg-bg-2 p-3">
          <h3 className="font-semibold">基本信息</h3>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
            <div className="rounded border border-border-default bg-bg-3 p-2"><div className="text-text-secondary">姓名</div><div className="mt-1">{patient?.name ?? currentUser?.name ?? '—'}</div></div>
            <div className="rounded border border-border-default bg-bg-3 p-2"><div className="text-text-secondary">年龄</div><div className="mt-1 font-mono">{patient?.age ?? '—'} 岁</div></div>
            <div className="rounded border border-border-default bg-bg-3 p-2"><div className="text-text-secondary">首发年龄</div><div className="mt-1 font-mono">{history.onsetAge || '—'} 岁</div></div>
            <div className="rounded border border-border-default bg-bg-3 p-2"><div className="text-text-secondary">病程</div><div className="mt-1 font-mono">{patient && history.onsetAge ? Math.max(0, patient.age - history.onsetAge) : '—'} 年</div></div>
          </div>
          <p className="mt-2 text-xs text-text-muted">基本身份信息来自账户登记。下方各章节可直接编辑，修改即时保存。</p>
        </section>

        <MedicalHistoryForm history={history} readOnly={readOnly} onChange={handleChange} />
      </section>
    </div>
  )
}
