import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, Brain, ChevronRight, FileText, HeartPulse, Pill, Sparkles, Stethoscope, X } from 'lucide-react'
import { ChannelStatusBadge } from '../../components/ChannelStatusBadge'
import { useAppStore } from '../../store'
import { getScaleByName } from '../../data/clinicalScales'
import type { ClinicalSeizureEvent, MedicalHistory, SeizureType } from '../../types/clinical'

const seizureTypeLabel: Record<SeizureType, string> = {
  focal_aware: '局灶性意识清醒',
  focal_impaired: '局灶性意识障碍',
  focal_to_bilateral: '局灶继发双侧强直阵挛',
  generalized_tonic_clonic: '全面性强直阵挛',
  absence: '失神',
  myoclonic: '肌阵挛',
  atonic: '失张力',
  unknown: '待判定',
}
const effectLabel: Record<string, string> = { effective: '有效', partial: '部分有效', ineffective: '无效', sideeffect: '副作用' }
const boolLabel = (value: boolean | 'unknown'): string => (value === true ? '是' : value === false ? '否' : '不确定')
const riskClass: Record<string, string> = {
  seizure: 'bg-danger/20 text-danger',
  warning: 'bg-warn/20 text-warn',
  safe: 'bg-safe/20 text-safe',
}

type CardKey = 'history' | 'medication' | 'exam' | 'questionnaire' | 'events'

function Card({ icon, title, summary, onOpen }: { icon: JSX.Element; title: string; summary: JSX.Element; onOpen: () => void }): JSX.Element {
  return (
    <button
      className="group flex flex-col rounded-md border border-border-default bg-bg-2 p-3 text-left transition-all hover:border-border-emphasis"
      onClick={onOpen}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold">{icon} {title}</span>
        <ChevronRight size={14} className="text-text-muted transition-transform group-hover:translate-x-0.5" />
      </div>
      <div className="flex-1 text-xs text-text-secondary">{summary}</div>
      <span className="mt-2 text-[11px] text-accent opacity-0 transition-opacity group-hover:opacity-100">点击查看患者提交的完整信息 →</span>
    </button>
  )
}

export function PatientArchiveCenter(): JSX.Element {
  const patients = useAppStore((state) => state.patients)
  const selectedDoctorPatientId = useAppStore((state) => state.selectedDoctorPatientId)
  const setSelectedDoctorPatientId = useAppStore((state) => state.setSelectedDoctorPatientId)
  const medicalHistories = useAppStore((state) => state.medicalHistories)
  const chatChannels = useAppStore((state) => state.chatChannels)
  const chatMessages = useAppStore((state) => state.chatMessages)
  const clinicalEvents = useAppStore((state) => state.clinicalEvents)
  const aiSummaries = useAppStore((state) => state.aiSummaries)
  const requestPage = useAppStore((state) => state.requestPage)
  const setReviewFocusTimestamp = useAppStore((state) => state.setReviewFocusTimestamp)
  const [openCard, setOpenCard] = useState<CardKey | null>(null)
  const [query, setQuery] = useState('')

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedDoctorPatientId) ?? patients[0],
    [patients, selectedDoctorPatientId],
  )
  const filtered = useMemo(() => patients.filter((patient) => patient.name.includes(query.trim())), [patients, query])

  const history: MedicalHistory | undefined = selectedPatient ? medicalHistories[selectedPatient.id] : undefined
  const events = useMemo(
    () => (selectedPatient ? clinicalEvents.filter((event) => event.patientId === selectedPatient.id) : []),
    [clinicalEvents, selectedPatient],
  )
  const summaries = selectedPatient ? (aiSummaries[selectedPatient.id] ?? []) : []
  const latestSummary = summaries[0]
  const freqData = (history?.seizureFrequencyHistory ?? []).map((point) => ({ name: `${point.year}`, count: point.monthlyCount }))

  const unreadCount = (patientId: string): number => (chatMessages[patientId] ?? []).filter((message) => !message.read && message.sender === 'patient').length

  const jumpToWaveform = (event: ClinicalSeizureEvent): void => {
    setReviewFocusTimestamp(event.timestamp)
    requestPage('review')
  }

  return (
    <div className="grid h-full grid-cols-[280px_1fr] gap-3 overflow-hidden">
      <aside className="flex min-h-0 flex-col rounded-md border border-border-default bg-bg-2 p-3 text-sm">
        <div className="font-semibold">患者档案中心</div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索患者姓名"
          className="mt-2 w-full rounded border border-border-default bg-bg-3 px-2 py-1 text-xs"
        />
        <div className="mt-2 flex-1 space-y-1 overflow-auto">
          {filtered.map((patient) => {
            const unread = unreadCount(patient.id)
            return (
              <button
                key={patient.id}
                className={`flex w-full items-center justify-between rounded border px-2 py-2 text-left ${selectedPatient?.id === patient.id ? 'border-accent bg-accent/10' : 'border-border-default bg-bg-3/60'}`}
                onClick={() => { setSelectedDoctorPatientId(patient.id); setOpenCard(null) }}
              >
                <span className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-0 text-xs">{patient.name.slice(0, 1)}</span>
                  <span>
                    <span className="block">{patient.name} · {patient.age}</span>
                    <span className="block text-[11px] text-text-secondary">依从 {patient.adherence}%</span>
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  {unread > 0 && <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] text-white">{unread}</span>}
                  <span className={`rounded px-1.5 py-0.5 text-[10px] ${riskClass[patient.riskLevel] ?? 'bg-bg-0'}`}>{patient.riskLevel}</span>
                </span>
              </button>
            )
          })}
        </div>
      </aside>

      <section className="min-h-0 overflow-auto rounded-md border border-border-default bg-bg-1 p-3 text-sm">
        {selectedPatient && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">{selectedPatient.name} · {selectedPatient.age}岁</h2>
                <div className="mt-0.5 text-xs text-text-secondary">
                  档案完整度 {history ? '87%' : '—'} · {history?.lockedByDoctor ? '已锁定 v1.2' : '未锁定'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs ${riskClass[selectedPatient.riskLevel] ?? 'bg-bg-0'}`}>风险：{selectedPatient.riskLevel}</span>
                <ChannelStatusBadge channel={chatChannels[selectedPatient.id]} />
              </div>
            </div>

            {/* 快捷指标 */}
            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
              {[
                { label: '首发年龄', value: `${history?.onsetAge ?? '--'} 岁` },
                { label: '病程', value: `${history?.onsetAge ? Math.max(0, selectedPatient.age - history.onsetAge) : '--'} 年` },
                { label: '本周事件', value: `${selectedPatient.weeklySeizures} 次` },
                { label: '服药依从性', value: `${selectedPatient.adherence}%` },
              ].map((stat) => (
                <div key={stat.label} className="rounded-md border border-border-default bg-bg-2 p-2">
                  <div className="text-xs text-text-secondary">{stat.label}</div>
                  <div className="mt-1 font-mono text-lg">{stat.value}</div>
                </div>
              ))}
            </div>

            {/* 信息卡片网格 */}
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              <Card
                icon={<Brain size={14} className="text-accent" />}
                title="既往史摘要"
                summary={
                  <ul className="space-y-0.5">
                    <li>热性惊厥史：{boolLabel(history?.febrileSeizure.value ?? 'unknown')}</li>
                    <li>脑炎/脑膜炎：{boolLabel(history?.cerebralInfection.value ?? 'unknown')}</li>
                    <li>脑外伤：{boolLabel(history?.headTrauma.value ?? 'unknown')}</li>
                    <li>家族史：{boolLabel(history?.familyHistory.value ?? 'unknown')}</li>
                  </ul>
                }
                onOpen={() => setOpenCard('history')}
              />
              <Card
                icon={<Pill size={14} className="text-accent" />}
                title="当前用药"
                summary={
                  <ul className="space-y-0.5">
                    {(history?.medications ?? []).slice(0, 3).map((medication) => (
                      <li key={medication.drugName}>{medication.drugName} · {medication.dosage} <span className="text-text-muted">({effectLabel[medication.effect]})</span></li>
                    ))}
                    {(history?.medications ?? []).length === 0 && <li className="text-text-muted">暂无用药记录</li>}
                  </ul>
                }
                onOpen={() => setOpenCard('medication')}
              />
              <Card
                icon={<Stethoscope size={14} className="text-accent" />}
                title="检查报告"
                summary={<span>{(history?.examinations ?? []).length} 份报告（EEG / MRI / PET-CT 等）</span>}
                onOpen={() => setOpenCard('exam')}
              />
              <Card
                icon={<HeartPulse size={14} className="text-accent" />}
                title="心理量表"
                summary={
                  <ul className="space-y-0.5">
                    {(history?.questionnaires ?? []).slice(-3).map((questionnaire, index) => (
                      <li key={`${questionnaire.name}-${index}`}>{questionnaire.name}：{questionnaire.totalScore}（{questionnaire.interpretation}）</li>
                    ))}
                    {(history?.questionnaires ?? []).length === 0 && <li className="text-text-muted">暂无量表记录</li>}
                  </ul>
                }
                onOpen={() => setOpenCard('questionnaire')}
              />
              <Card
                icon={<Activity size={14} className="text-accent" />}
                title="最近发作事件"
                summary={
                  <ul className="space-y-0.5">
                    {events.slice(0, 3).map((event) => (
                      <li key={event.id}>{new Date(event.timestamp).toLocaleDateString('zh-CN')} · {seizureTypeLabel[event.ictal.seizureType]} {event.confirmed === 'confirmed' ? '✓' : '⏱'}</li>
                    ))}
                    {events.length === 0 && <li className="text-text-muted">暂无事件</li>}
                  </ul>
                }
                onOpen={() => setOpenCard('events')}
              />
              <div className="flex flex-col rounded-md border border-border-default bg-bg-2 p-3">
                <span className="mb-1 flex items-center gap-1.5 text-sm font-semibold"><Sparkles size={14} className="text-accent" /> AI 智能小结</span>
                {latestSummary ? (
                  <div className="text-xs text-text-secondary">
                    <span className={latestSummary.draftStatus === 'doctor_approved' ? 'text-safe' : 'text-warn'}>
                      {latestSummary.draftStatus === 'doctor_approved' ? '✓ 已采纳' : '草稿待确认'}
                    </span>
                    <div className="mt-1">{latestSummary.highlights[0]}</div>
                  </div>
                ) : (
                  <div className="text-xs text-text-muted">尚未生成 · 可在「AI 智能小结」页生成</div>
                )}
              </div>
            </div>

            {/* 发作频率趋势 */}
            <div className="mt-3 rounded-md border border-border-default bg-bg-2 p-3">
              <div className="mb-1 text-sm font-semibold">发作频率趋势（每月次数）</div>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={freqData}>
                    <XAxis dataKey="name" tick={{ fill: '#8B949E', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#8B949E', fontSize: 11 }} width={28} />
                    <Tooltip contentStyle={{ background: '#161B22', border: '1px solid #30363D', fontSize: 11 }} />
                    <Line dataKey="count" stroke="#0A84FF" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </section>

      {/* 卡片放大详情弹窗 */}
      <AnimatePresence>
        {openCard && selectedPatient && (
          <motion.div
            className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/60 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpenCard(null)}
          >
            <motion.div
              className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-[10px] border border-border-emphasis bg-bg-1"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border-subtle p-4">
                <div className="font-semibold">
                  {selectedPatient.name} ·{' '}
                  {openCard === 'history' ? '既往疾病史' : openCard === 'medication' ? '用药记录' : openCard === 'exam' ? '检查报告' : openCard === 'questionnaire' ? '心理量表' : '发作事件（三段式）'}
                </div>
                <button className="text-text-secondary hover:text-text-primary" onClick={() => setOpenCard(null)}><X size={18} /></button>
              </div>

              <div className="flex-1 space-y-3 overflow-auto p-4 text-sm">
                {openCard === 'history' && history && (
                  <div className="grid gap-2 md:grid-cols-2">
                    {[
                      ['脑炎/脑膜炎史', history.cerebralInfection],
                      ['脑外伤史', history.headTrauma],
                      ['出生时缺氧/产伤', history.birthInjury],
                      ['热性惊厥史', history.febrileSeizure],
                      ['癫痫家族史', history.familyHistory],
                    ].map(([label, field]) => {
                      const detail = field as MedicalHistory['cerebralInfection']
                      return (
                        <div key={label as string} className="rounded border border-border-default bg-bg-2 p-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{label as string}</span>
                            <span className={detail.value === true ? 'text-warn' : 'text-text-secondary'}>{boolLabel(detail.value)}</span>
                          </div>
                          {detail.detail && <div className="mt-1 text-text-secondary">详情：{detail.detail}</div>}
                          {detail.ageAtEvent !== undefined && <div className="text-text-secondary">发生年龄：{detail.ageAtEvent} 岁</div>}
                        </div>
                      )
                    })}
                    <div className="rounded border border-border-default bg-bg-2 p-2 text-xs md:col-span-2">发作演变：{history.seizureEvolutionNotes || '—'}</div>
                  </div>
                )}

                {openCard === 'medication' && history && (
                  <div className="space-y-2 text-xs">
                    {history.medications.map((medication, index) => (
                      <div key={`${medication.drugName}-${index}`} className="rounded border border-border-default bg-bg-2 p-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{medication.drugName} · {medication.dosage}</span>
                          <span className={medication.endDate ? 'text-text-muted' : 'text-safe'}>{medication.endDate ? '已停药' : '在服'}</span>
                        </div>
                        <div className="mt-1 text-text-secondary">起止：{medication.startDate} ~ {medication.endDate ?? '至今'} · 评估：{effectLabel[medication.effect]}</div>
                        {medication.notes && <div className="text-text-secondary">备注：{medication.notes}</div>}
                      </div>
                    ))}
                    <div className="rounded border border-border-default bg-bg-2 p-2">既往不良反应：{history.drugReactions || '无'}</div>
                  </div>
                )}

                {openCard === 'exam' && history && (
                  <div className="grid gap-2 md:grid-cols-2">
                    {history.examinations.map((exam, index) => (
                      <div key={`${exam.type}-${index}`} className="rounded border border-border-default bg-bg-2 p-2 text-xs">
                        <div className="flex items-center gap-2"><FileText size={13} className="text-accent" /><span className="font-medium">{exam.type} · {exam.date}</span></div>
                        <div className="mt-1 text-text-secondary">{exam.hospital}</div>
                        <div className="mt-1">{exam.conclusion}</div>
                        {exam.attachments.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {exam.attachments.map((file) => (
                              <span key={file.name} className="rounded bg-bg-3 px-1.5 py-0.5 text-[11px] text-text-secondary">📎 {file.name}{file.sizeLabel ? ` (${file.sizeLabel})` : ''}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {openCard === 'questionnaire' && history && (
                  <div className="space-y-2 text-xs">
                    {history.questionnaires.map((questionnaire, index) => {
                      const scale = getScaleByName(questionnaire.name)
                      const interp = scale?.interpret(questionnaire.totalScore)
                      return (
                        <div key={`${questionnaire.name}-${index}`} className="rounded border border-border-default bg-bg-2 p-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{questionnaire.name} · {questionnaire.date}</span>
                            <span className="font-mono">总分 {questionnaire.totalScore}</span>
                          </div>
                          <div className="mt-1 text-text-secondary">{scale?.fullName ?? ''} · 解释：{questionnaire.interpretation}{interp ? ` (${interp.note})` : ''}</div>
                          {Object.keys(questionnaire.itemScores).length > 0 && (
                            <div className="mt-1 text-text-muted">条目得分：{Object.entries(questionnaire.itemScores).map(([key, value]) => `${key}=${value}`).join(' · ')}</div>
                          )}
                        </div>
                      )
                    })}
                    {history.questionnaires.length === 0 && <div className="text-text-muted">暂无量表记录</div>}
                  </div>
                )}

                {openCard === 'events' && (
                  <div className="space-y-2 text-xs">
                    {events.map((event) => (
                      <div key={event.id} className="rounded border border-border-default bg-bg-2 p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{new Date(event.timestamp).toLocaleString('zh-CN')} · {seizureTypeLabel[event.ictal.seizureType]}</span>
                          <span className={event.confirmed === 'confirmed' ? 'text-safe' : 'text-warn'}>{event.confirmed === 'confirmed' ? '✓ 已复核' : '⏱ 待复核'}</span>
                        </div>
                        <div className="mt-1 text-recovery">【前】诱因：{event.pre.triggers.map((trigger) => trigger.category).join('、') || '无'} · 先兆：{event.pre.aura.map((aura) => aura.description).join('、') || '无'}</div>
                        <div className="text-danger">【中】症状：{event.ictal.symptoms.join(' / ') || '无'}</div>
                        {event.ictal.patientDescription && <div className="text-text-secondary">患者：「{event.ictal.patientDescription}」</div>}
                        {event.ictal.witnessDescription && <div className="text-text-secondary">旁观：「{event.ictal.witnessDescription}」</div>}
                        <div className="text-recovery">【后】{event.post.state} · 恢复 {event.post.recoveryDurationMin} 分钟</div>
                        <button
                          className="mt-2 rounded border border-accent/60 bg-accent/10 px-2 py-1 text-[11px] transition-transform active:scale-95"
                          onClick={() => jumpToWaveform(event)}
                        >
                          在波形回溯中打开此事件 →
                        </button>
                      </div>
                    ))}
                    {events.length === 0 && <div className="text-text-muted">暂无事件</div>}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
