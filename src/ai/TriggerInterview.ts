import type { TriggerCategory, TriggerRecord } from '../types/clinical'
import { feverInterviewScript } from './triggerScripts/fever'
import { medicationInterviewScript } from './triggerScripts/medication'
import { moodInterviewScript } from './triggerScripts/mood'
import { sleepInterviewScript } from './triggerScripts/sleep'

interface InterviewQuestion {
  prompt: string
  choices: readonly string[]
}

interface InterviewScript {
  category: TriggerCategory
  questions: readonly InterviewQuestion[]
}

const scripts: Record<TriggerCategory, InterviewScript> = {
  sleep_deprivation: sleepInterviewScript,
  emotional_stress: moodInterviewScript,
  missed_medication: medicationInterviewScript,
  fever: feverInterviewScript,
  alcohol: {
    category: 'alcohol',
    questions: [
      { prompt: '饮酒类型？', choices: ['啤酒', '白酒', '其他'] },
      { prompt: '大约饮用量？', choices: ['少量', '中等', '较多'] },
      { prompt: '饮酒时间？', choices: ['白天', '晚饭后', '睡前'] },
    ],
  },
  flashing_light: {
    category: 'flashing_light',
    questions: [
      { prompt: '闪光来源？', choices: ['屏幕', '太阳反光', '灯光'] },
      { prompt: '持续时长？', choices: ['<5分钟', '5-20分钟', '>20分钟'] },
      { prompt: '是否伴随不适？', choices: ['无', '轻微头晕', '明显不适'] },
    ],
  },
  menstruation: {
    category: 'menstruation',
    questions: [
      { prompt: '目前处于周期哪一阶段？', choices: ['经前', '经期中', '经后'] },
      { prompt: '是否伴随明显不适？', choices: ['无', '轻度痛经', '重度痛经'] },
      { prompt: '睡眠是否受影响？', choices: ['否', '轻度', '明显'] },
    ],
  },
  fatigue: {
    category: 'fatigue',
    questions: [
      { prompt: '近两天工作/学习强度？', choices: ['正常', '偏高', '很高'] },
      { prompt: '是否连续熬夜？', choices: ['没有', '1晚', '2晚及以上'] },
      { prompt: '当前疲劳程度？', choices: ['1-轻', '3-中', '5-重'] },
    ],
  },
  other: {
    category: 'other',
    questions: [
      { prompt: '请描述你认为的诱因。', choices: ['环境变化', '身体不适', '其他'] },
      { prompt: '诱因出现多久后发生事件？', choices: ['<10分钟', '10-60分钟', '>1小时'] },
      { prompt: '强度评估（1-5）', choices: ['1', '3', '5'] },
    ],
  },
}

const keywordMap: Array<{ category: TriggerCategory; keywords: string[] }> = [
  { category: 'sleep_deprivation', keywords: ['没睡好', '熬夜', '睡眠', '困'] },
  { category: 'emotional_stress', keywords: ['心情', '焦虑', '压力', '生气', '低落'] },
  { category: 'missed_medication', keywords: ['漏服', '忘记吃药', '没吃药', '停药'] },
  { category: 'alcohol', keywords: ['喝酒', '酒', '啤酒', '白酒'] },
  { category: 'flashing_light', keywords: ['闪光', '屏幕', '灯光', '频闪'] },
  { category: 'fever', keywords: ['发热', '发烧', '体温'] },
  { category: 'menstruation', keywords: ['经期', '月经'] },
  { category: 'fatigue', keywords: ['劳累', '疲劳', '太累'] },
]

export function inferTriggerCategory(rawInput: string): TriggerCategory {
  const hit = keywordMap.find((item) => item.keywords.some((keyword) => rawInput.includes(keyword)))
  return hit?.category ?? 'other'
}

export function getInterviewScript(category: TriggerCategory): InterviewScript {
  return scripts[category]
}

export function toTriggerRecord(category: TriggerCategory, rawInput: string, answers: Array<{ question: string; answer: string }>): TriggerRecord {
  return {
    category,
    rawInput,
    refinedAnswers: answers.map((item) => ({ question: item.question, answer: item.answer, answerType: 'text' })),
    severity: Math.min(5, Math.max(1, Math.ceil(answers.length / 2))) as 1 | 2 | 3 | 4 | 5,
  }
}
