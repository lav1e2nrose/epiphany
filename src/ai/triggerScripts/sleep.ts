export const sleepInterviewScript = {
  category: 'sleep_deprivation',
  questions: [
    { prompt: '昨晚大约几点上床？', choices: ['22:00前', '22:00-23:00', '23:00后'] },
    { prompt: '夜里是否多次醒来？', choices: ['没有', '1-2次', '3次以上'] },
    { prompt: '总睡眠时长大约多少？', choices: ['<4h', '4-6h', '6-8h'] },
    { prompt: '白天有补觉吗？', choices: ['没有', '短时补觉', '补觉超过1小时'] },
  ],
} as const
