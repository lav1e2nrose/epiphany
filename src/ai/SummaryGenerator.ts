import type { AISummary, ClinicalSeizureEvent, MedicalHistory } from '../types/clinical'

function nextId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

export function generateSummaryDraft(params: {
  patientId: string
  periodStart: number
  periodEnd: number
  events: ClinicalSeizureEvent[]
  medicalHistory?: MedicalHistory
}): AISummary {
  const { patientId, periodStart, periodEnd, events, medicalHistory } = params
  const durationDays = Math.max(1, Math.round((periodEnd - periodStart) / (24 * 3600 * 1000)))
  const sleepTriggerCount = events.filter((event) => event.pre.triggers.some((trigger) => trigger.category === 'sleep_deprivation')).length
  const confirmedCount = events.filter((event) => event.confirmed === 'confirmed').length
  const missedDoseCount = events.filter((event) => event.medicationCompliance.missedDoseLast24h).length
  const onsetAge = medicalHistory?.onsetAge ?? 0

  return {
    id: nextId('ai-summary'),
    patientId,
    periodStart,
    periodEnd,
    generatedAt: Date.now(),
    modelVersion: 'EpiNet-Summary-v2.0-mock',
    highlights: [
      `本周期（${durationDays}天）共记录 ${events.length} 次可疑事件，其中 ${confirmedCount} 次已复核。`,
      `睡眠相关诱因出现 ${sleepTriggerCount} 次，建议优先关注夜间监测策略。`,
      `漏服药事件 ${missedDoseCount} 次，建议继续强化用药提醒。`,
    ],
    detectedPatterns: [
      { pattern: '睡眠相关发作倾向', confidence: Math.min(95, 65 + sleepTriggerCount * 5), suggestion: '优化作息并维持睡眠监测模式。' },
      { pattern: '依从性波动风险', confidence: Math.min(90, 55 + missedDoseCount * 8), suggestion: '复诊时重点核查服药计划执行情况。' },
    ],
    medicationAnalysis: onsetAge > 0 ? `患者首发年龄 ${onsetAge} 岁，建议结合现用药方案评估长期控制目标。` : '建议结合当前药物方案及日志依从性记录进行综合评估。',
    recommendations: ['继续完成三段式发作记录', '复诊前携带关键事件波形与视频片段', '优先讨论高置信度模式对应治疗策略'],
    draftStatus: 'draft',
  }
}
