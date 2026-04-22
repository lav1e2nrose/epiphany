import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'

const articles = [
  { id: 'a1', title: '癫痫触发因素识别', read: '6 min', content: '常见触发因素包括睡眠不足、情绪应激、闪光刺激、饮酒。' },
  { id: 'a2', title: '正确急救流程', read: '5 min', content: '保持呼吸道通畅，侧卧位，记录发作时间，避免强行按压肢体。' },
  { id: 'a3', title: '用药依从性管理', read: '7 min', content: '建议固定时间服药并启用提醒，避免漏服导致风险升高。' },
  { id: 'a4', title: '睡眠管理策略', read: '4 min', content: '建立规律作息，减少夜间刺激，目标睡眠时长 7-9 小时。' },
]

export function HealthClass(): JSX.Element {
  const [selected, setSelected] = useState<string | null>(null)
  const article = articles.find((item) => item.id === selected)

  return (
    <div className="relative h-full">
      <div className="grid grid-cols-3 gap-3">
        {articles.map((item) => (
          <button key={item.id} className="rounded-md border border-border-default bg-bg-2 p-4 text-left" onClick={() => setSelected(item.id)}>
            <div className="h-1 rounded-full bg-gradient-to-r from-accent to-recovery" />
            <h3 className="mt-3 font-semibold">{item.title}</h3>
            <p className="mt-2 text-sm text-text-secondary">{item.content}</p>
            <div className="mt-3 text-xs text-text-secondary">阅读 {item.read}</div>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {article && (
          <motion.aside
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            exit={{ x: 420 }}
            className="absolute right-0 top-0 h-full w-[420px] rounded-l-lg border border-border-default bg-bg-1 p-4"
          >
            <button className="mb-3 text-sm text-text-secondary" onClick={() => setSelected(null)}>关闭</button>
            <h3 className="text-lg font-semibold">{article.title}</h3>
            <p className="mt-3 text-sm leading-6 text-text-secondary">{article.content.repeat(8)}</p>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  )
}
