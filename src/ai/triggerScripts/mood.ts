export const moodInterviewScript = {
  category: 'emotional_stress',
  questions: [
    { prompt: '主要是哪种情绪波动？', choices: ['焦虑', '愤怒', '低落'] },
    { prompt: '这种情绪持续多久了？', choices: ['<2小时', '半天', '全天'] },
    { prompt: '是否有明确触发事件？', choices: ['工作学习', '家庭关系', '无明确事件'] },
    { prompt: '请评估强度（1-5）', choices: ['1-轻微', '3-中等', '5-严重'] },
  ],
} as const
