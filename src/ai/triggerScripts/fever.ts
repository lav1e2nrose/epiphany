export const feverInterviewScript = {
  category: 'fever',
  questions: [
    { prompt: '最高体温大约多少？', choices: ['37.5-38℃', '38-39℃', '39℃以上'] },
    { prompt: '发热持续多久？', choices: ['<12小时', '12-24小时', '>24小时'] },
    { prompt: '是否已服用退烧药？', choices: ['未服用', '已服用一次', '已连续服用'] },
  ],
} as const
