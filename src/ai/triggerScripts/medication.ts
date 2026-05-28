export const medicationInterviewScript = {
  category: 'missed_medication',
  questions: [
    { prompt: '漏服的是哪种药？', choices: ['拉莫三嗪', '左乙拉西坦', '其他'] },
    { prompt: '漏服时段？', choices: ['早', '中', '晚'] },
    { prompt: '最近漏服天数？', choices: ['1天', '2-3天', '3天以上'] },
  ],
} as const
