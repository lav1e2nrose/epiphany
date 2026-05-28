import { useMemo, useState } from 'react'
import { ChannelStatusBadge } from '../../components/ChannelStatusBadge'
import { useAppStore } from '../../store'

type Tab = 'overview' | 'history' | 'medication' | 'exam' | 'questionnaire' | 'events'

export function PatientArchiveCenter(): JSX.Element {
  const patients = useAppStore((state) => state.patients)
  const selectedDoctorPatientId = useAppStore((state) => state.selectedDoctorPatientId)
  const setSelectedDoctorPatientId = useAppStore((state) => state.setSelectedDoctorPatientId)
  const medicalHistories = useAppStore((state) => state.medicalHistories)
  const chatChannels = useAppStore((state) => state.chatChannels)
  const clinicalEvents = useAppStore((state) => state.clinicalEvents)
  const [tab, setTab] = useState<Tab>('overview')

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedDoctorPatientId) ?? patients[0],
    [patients, selectedDoctorPatientId],
  )

  const history = selectedPatient ? medicalHistories[selectedPatient.id] : undefined
  const relatedEvents = selectedPatient ? clinicalEvents.filter((event) => event.patientId === selectedPatient.id).slice(0, 3) : []

  return (
    <div className="grid h-full grid-cols-[280px_1fr] gap-3 overflow-auto">
      <aside className="rounded-md border border-border-default bg-bg-2 p-3 text-sm">
        <div className="font-semibold">患者档案中心</div>
        <div className="mt-2 space-y-1">
          {patients.map((patient) => (
            <button key={patient.id} className={`flex w-full items-center justify-between rounded border px-2 py-2 ${selectedPatient?.id === patient.id ? 'border-accent bg-accent/10' : 'border-border-default bg-bg-3/60'}`} onClick={() => setSelectedDoctorPatientId(patient.id)}>
              <span>{patient.name} · {patient.age}</span>
              <span className="text-xs text-text-secondary">{patient.riskLevel}</span>
            </button>
          ))}
        </div>
      </aside>
      <section className="rounded-md border border-border-default bg-bg-2 p-3 text-sm">
        {selectedPatient && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{selectedPatient.name} · {selectedPatient.age}岁</h2>
                <div className="text-xs text-text-secondary">档案完整度 87% · 版本 {history?.lockedByDoctor ? '已锁定 v1.2' : '未锁定'}</div>
              </div>
              <ChannelStatusBadge channel={chatChannels[selectedPatient.id]} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {[
                ['overview', '概览'],
                ['history', '既往史'],
                ['medication', '用药'],
                ['exam', '检查'],
                ['questionnaire', '量表'],
                ['events', '事件历史'],
              ].map(([key, label]) => (
                <button key={key} className={`rounded-full border px-2 py-0.5 ${tab === key ? 'border-accent bg-accent/20' : 'border-border-default'}`} onClick={() => setTab(key as Tab)}>{label}</button>
              ))}
            </div>

            <div className="mt-3 space-y-2 text-xs">
              {tab === 'overview' && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded border border-border-default bg-bg-3 p-2">首发年龄 {history?.onsetAge ?? '--'}</div>
                  <div className="rounded border border-border-default bg-bg-3 p-2">本周事件 {selectedPatient.weeklySeizures} 次</div>
                  <div className="rounded border border-border-default bg-bg-3 p-2">依从性 {selectedPatient.adherence}%</div>
                </div>
              )}
              {tab === 'history' && (
                <div className="rounded border border-border-default bg-bg-3 p-2">
                  热性惊厥史：{String(history?.febrileSeizure.value ?? 'unknown')} · 脑炎史：{String(history?.cerebralInfection.value ?? 'unknown')}
                </div>
              )}
              {tab === 'medication' && (
                <div className="space-y-1">
                  {(history?.medications ?? []).map((medication) => <div key={medication.drugName} className="rounded border border-border-default bg-bg-3 p-2">{medication.drugName} · {medication.dosage} · {medication.effect}</div>)}
                </div>
              )}
              {tab === 'exam' && (
                <div className="space-y-1">
                  {(history?.examinations ?? []).map((exam) => <div key={`${exam.type}-${exam.date}`} className="rounded border border-border-default bg-bg-3 p-2">{exam.type} · {exam.date} · {exam.conclusion}</div>)}
                </div>
              )}
              {tab === 'questionnaire' && (
                <div className="space-y-1">
                  {(history?.questionnaires ?? []).map((questionnaire) => <div key={questionnaire.name} className="rounded border border-border-default bg-bg-3 p-2">{questionnaire.name}：{questionnaire.totalScore} ({questionnaire.interpretation})</div>)}
                </div>
              )}
              {tab === 'events' && (
                <div className="space-y-1">
                  {relatedEvents.map((event) => <div key={event.id} className="rounded border border-border-default bg-bg-3 p-2">{new Date(event.timestamp).toLocaleString('zh-CN')} · 前：{event.pre.triggers[0]?.category ?? '无'} · 中：{event.ictal.seizureType}</div>)}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
