// 临床在用的标准化心理评估量表定义。
// 收录三套癫痫共病筛查常用量表：NDDI-E（癫痫专用抑郁筛查）、PHQ-9（抑郁）、GAD-7（焦虑）。
// 评分与划界沿用各量表公开发表的标准用法，用于演示真实可作答 + 自动计分 + 解释。

export type ScaleSeverity = 'safe' | 'warn' | 'danger'

export interface ScaleOption {
  label: string
  value: number
}

export interface ScaleItem {
  id: string
  text: string
}

export interface ScaleInterpretation {
  level: string
  note: string
  severity: ScaleSeverity
}

export interface ClinicalScale {
  key: string
  name: string
  fullName: string
  description: string
  timeframe: string
  options: ScaleOption[]
  items: ScaleItem[]
  /** 量表理论分值范围，用于趋势图刻度 */
  range: [number, number]
  interpret: (total: number) => ScaleInterpretation
  /** 自杀/自伤条目索引（命中非零时单独警示），可选 */
  riskItemIndex?: number
}

// PHQ-9 / GAD-7 共用的 0-3 频率选项（近两周）
const FREQUENCY_OPTIONS: ScaleOption[] = [
  { label: '完全不会', value: 0 },
  { label: '好几天', value: 1 },
  { label: '一半以上天数', value: 2 },
  { label: '几乎每天', value: 3 },
]

export const NDDI_E: ClinicalScale = {
  key: 'NDDI-E',
  name: 'NDDI-E',
  fullName: '癫痫患者神经疾病抑郁量表',
  description: '专为癫痫患者设计的抑郁快速筛查，规避了与发作/药物副作用混淆的躯体症状条目。',
  timeframe: '过去两周内',
  options: [
    { label: '从不', value: 1 },
    { label: '很少', value: 2 },
    { label: '有时', value: 3 },
    { label: '总是或经常', value: 4 },
  ],
  items: [
    { id: 'q1', text: '做任何事情都很吃力' },
    { id: 'q2', text: '觉得自己什么都做不好' },
    { id: 'q3', text: '感到内疚自责' },
    { id: 'q4', text: '觉得活着不如死了好' },
    { id: 'q5', text: '感到沮丧、灰心' },
    { id: 'q6', text: '难以从生活中获得乐趣' },
  ],
  range: [6, 24],
  riskItemIndex: 3,
  interpret: (total) =>
    total > 15
      ? { level: '提示重性抑郁可能', note: '总分 > 15，建议进一步精神科评估。', severity: 'danger' }
      : { level: '未达抑郁划界', note: '总分 ≤ 15，暂未提示重性抑郁，仍需结合临床。', severity: 'safe' },
}

export const PHQ9: ClinicalScale = {
  key: 'PHQ-9',
  name: 'PHQ-9',
  fullName: '患者健康问卷（抑郁）',
  description: '应用最广的抑郁自评量表，可同时筛查与评估抑郁严重程度。',
  timeframe: '过去两周内，有多少时候受到以下问题困扰',
  options: FREQUENCY_OPTIONS,
  items: [
    { id: 'q1', text: '做事时提不起劲或没有兴趣' },
    { id: 'q2', text: '感到心情低落、沮丧或绝望' },
    { id: 'q3', text: '入睡困难、睡不安稳或睡眠过多' },
    { id: 'q4', text: '感觉疲倦或没有活力' },
    { id: 'q5', text: '食欲不振或吃太多' },
    { id: 'q6', text: '觉得自己很糟，或觉得自己很失败，或让自己/家人失望' },
    { id: 'q7', text: '对事物专注有困难，例如阅读或看电视时' },
    { id: 'q8', text: '动作或说话缓慢到旁人已察觉，或相反地坐立不安、动来动去' },
    { id: 'q9', text: '有不如死掉或用某种方式伤害自己的念头' },
  ],
  range: [0, 27],
  riskItemIndex: 8,
  interpret: (total) => {
    if (total >= 20) return { level: '重度抑郁', note: '建议尽快精神科就诊与干预。', severity: 'danger' }
    if (total >= 15) return { level: '中重度抑郁', note: '建议积极治疗并随访。', severity: 'danger' }
    if (total >= 10) return { level: '中度抑郁', note: '建议治疗方案评估。', severity: 'warn' }
    if (total >= 5) return { level: '轻度抑郁', note: '建议观察随访。', severity: 'warn' }
    return { level: '无明显抑郁', note: '当前未提示明显抑郁症状。', severity: 'safe' }
  },
}

export const GAD7: ClinicalScale = {
  key: 'GAD-7',
  name: 'GAD-7',
  fullName: '广泛性焦虑量表',
  description: '广泛性焦虑障碍的标准筛查与严重程度评估工具。',
  timeframe: '过去两周内，有多少时候受到以下问题困扰',
  options: FREQUENCY_OPTIONS,
  items: [
    { id: 'q1', text: '感到紧张、焦虑或烦躁' },
    { id: 'q2', text: '无法停止或控制担忧' },
    { id: 'q3', text: '对各种各样的事情过度担忧' },
    { id: 'q4', text: '很难放松下来' },
    { id: 'q5', text: '由于坐立不安而难以静坐' },
    { id: 'q6', text: '变得容易烦恼或易怒' },
    { id: 'q7', text: '感到害怕，好像有可怕的事情会发生' },
  ],
  range: [0, 21],
  interpret: (total) => {
    if (total >= 15) return { level: '重度焦虑', note: '建议精神科评估与干预。', severity: 'danger' }
    if (total >= 10) return { level: '中度焦虑', note: '建议进一步评估。', severity: 'warn' }
    if (total >= 5) return { level: '轻度焦虑', note: '建议观察随访。', severity: 'warn' }
    return { level: '无明显焦虑', note: '当前未提示明显焦虑症状。', severity: 'safe' }
  },
}

export const CLINICAL_SCALES: ClinicalScale[] = [NDDI_E, PHQ9, GAD7]

export function getScaleByName(name: string): ClinicalScale | undefined {
  return CLINICAL_SCALES.find((scale) => scale.key === name || scale.name === name)
}
