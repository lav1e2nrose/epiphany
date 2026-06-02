import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, Mic, Send, User } from 'lucide-react'
import { getInterviewScript, inferTriggerCategory } from '../../ai/TriggerInterview'
import { createSpeechRecognition } from '../../ai/SpeechRecognition'
import type { AIFollowUpAnswer, TriggerCategory, TriggerRecord } from '../../types/clinical'

interface Props {
  onComplete: (record: TriggerRecord) => void
}

type ChatRole = 'ai' | 'user'
interface ChatMsg {
  id: string
  role: ChatRole
  text: string
}
type Phase = 'intro' | 'questioning' | 'done'

const categoryLabel: Record<TriggerCategory, string> = {
  sleep_deprivation: '睡眠不足',
  emotional_stress: '情绪压力',
  missed_medication: '漏服药',
  alcohol: '饮酒',
  flashing_light: '闪光刺激',
  fever: '发热',
  menstruation: '经期相关',
  fatigue: '劳累',
  other: '其他诱因',
}

let msgSeq = 0
function nextMsgId(): string {
  msgSeq += 1
  return `m${msgSeq}-${Date.now()}`
}

export function AIInterviewChat({ onComplete }: Props): JSX.Element {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: nextMsgId(), role: 'ai', text: '今天感觉怎么样？有什么想记录的吗？可以直接说，比如「昨晚没睡好」「压力很大」。' },
  ])
  const [phase, setPhase] = useState<Phase>('intro')
  const [category, setCategory] = useState<TriggerCategory>('other')
  const [rawInput, setRawInput] = useState('')
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState<AIFollowUpAnswer[]>([])
  const [typing, setTyping] = useState(false)
  const [draft, setDraft] = useState('')
  const [listening, setListening] = useState(false)
  const [voiceNotice, setVoiceNotice] = useState('')

  const timeoutRef = useRef<number | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const speechRef = useRef<ReturnType<typeof createSpeechRecognition> | null>(null)

  const script = useMemo(() => getInterviewScript(category), [category])
  const currentQuestion = phase === 'questioning' && !typing ? script.questions[qIndex] : null
  const progressTotal = script.questions.length

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
      speechRef.current?.stop()
    }
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  const appendAi = useCallback((text: string) => {
    setMessages((prev) => [...prev, { id: nextMsgId(), role: 'ai', text }])
  }, [])

  // AI「正在输入」延迟后再抛出消息，营造对话节奏
  const aiSay = useCallback(
    (text: string, after?: () => void) => {
      setTyping(true)
      timeoutRef.current = window.setTimeout(() => {
        setTyping(false)
        appendAi(text)
        after?.()
      }, 650)
    },
    [appendAi],
  )

  const finish = useCallback(() => {
    aiSay('好的，我已经把这些细节结构化整理好了，请确认后保存。', () => setPhase('done'))
  }, [aiSay])

  const recordAnswer = useCallback(
    (answer: AIFollowUpAnswer) => {
      const next = [...answers, answer]
      setAnswers(next)
      const askedIndex = next.length - 1
      if (askedIndex + 1 < script.questions.length) {
        setQIndex(askedIndex + 1)
        aiSay(script.questions[askedIndex + 1].prompt)
      } else {
        finish()
      }
    },
    [answers, aiSay, finish, script.questions],
  )

  const handleUserText = useCallback(
    (text: string, answerType: AIFollowUpAnswer['answerType']) => {
      const trimmed = text.trim()
      if (!trimmed) return
      setMessages((prev) => [...prev, { id: nextMsgId(), role: 'user', text: trimmed }])
      setDraft('')
      if (phase === 'intro') {
        const cat = inferTriggerCategory(trimmed)
        setCategory(cat)
        setRawInput(trimmed)
        setPhase('questioning')
        setQIndex(0)
        const firstQ = getInterviewScript(cat).questions[0]
        aiSay(`明白，我先按「${categoryLabel[cat]}」帮你记录。${firstQ.prompt}`)
      } else if (phase === 'questioning' && currentQuestion) {
        recordAnswer({ question: currentQuestion.prompt, answer: trimmed, answerType })
      }
    },
    [aiSay, currentQuestion, phase, recordAnswer],
  )

  const handleChoice = useCallback(
    (choice: string) => {
      if (!currentQuestion) return
      setMessages((prev) => [...prev, { id: nextMsgId(), role: 'user', text: choice }])
      recordAnswer({ question: currentQuestion.prompt, answer: choice, answerType: 'choice' })
    },
    [currentQuestion, recordAnswer],
  )

  // 语音输入：调用 Web Speech API，失败时回退文字（提示用户）
  const toggleVoice = useCallback(() => {
    if (listening) {
      speechRef.current?.stop()
      setListening(false)
      return
    }
    setVoiceNotice('')
    const handle = createSpeechRecognition(
      'zh-CN',
      (text) => {
        setListening(false)
        handleUserText(text, 'voice')
      },
      (message) => {
        setListening(false)
        setVoiceNotice(message)
      },
    )
    speechRef.current = handle
    setListening(true)
    handle.start()
  }, [handleUserText, listening])

  const confirmRecord = useCallback(() => {
    const severity = Math.max(1, Math.min(5, answers.length)) as 1 | 2 | 3 | 4 | 5
    onComplete({ category, rawInput, refinedAnswers: answers, severity })
  }, [answers, category, onComplete, rawInput])

  return (
    <div className="flex flex-col rounded-md border border-border-default bg-bg-2">
      <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Bot size={16} className="text-accent" /> 灵犀助手 · AI 引导式诱因记录
        </div>
        {phase !== 'intro' && (
          <span className="text-xs text-text-secondary">已记录维度 {answers.length} / {progressTotal}</span>
        )}
      </div>

      <div ref={scrollRef} className="h-64 space-y-3 overflow-auto p-3 text-sm">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
              className={`flex items-end gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${message.role === 'ai' ? 'bg-accent/20 text-accent' : 'bg-[var(--chat-bubble-patient)] text-text-primary'}`}>
                {message.role === 'ai' ? <Bot size={13} /> : <User size={13} />}
              </span>
              <div className={`max-w-[78%] rounded-lg px-3 py-2 ${message.role === 'ai' ? 'bg-bg-3 text-text-primary' : 'bg-[var(--chat-bubble-patient)] text-text-primary'}`}>
                {message.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {typing && (
          <div className="flex items-end gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent"><Bot size={13} /></span>
            <div className="flex items-center gap-1 rounded-lg bg-bg-3 px-3 py-2.5">
              {[0, 1, 2].map((dot) => (
                <span key={dot} className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-secondary" style={{ animationDelay: `${dot * 120}ms` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 当前问题的快捷选项 */}
      {currentQuestion && (
        <div className="flex flex-wrap gap-1.5 border-t border-border-subtle px-3 py-2">
          {currentQuestion.choices.map((choice) => (
            <button
              key={choice}
              className="rounded-full border border-border-default px-2.5 py-0.5 text-xs transition-all hover:border-accent active:scale-95"
              onClick={() => handleChoice(choice)}
            >
              {choice}
            </button>
          ))}
        </div>
      )}

      {/* 结构化结果 */}
      {phase === 'done' && (
        <div className="border-t border-border-subtle p-3">
          <div className="rounded-md border border-safe/50 bg-safe/5 p-3 text-xs">
            <div className="mb-2 font-semibold text-safe">✅ 已自动结构化</div>
            <div className="mb-1">诱因类别：{categoryLabel[category]}</div>
            <ul className="space-y-1 text-text-secondary">
              {answers.map((answer) => (
                <li key={answer.question}>• {answer.question.replace(/[？?]$/, '')}：{answer.answer}<span className="ml-1 text-text-muted">[{answer.answerType === 'voice' ? '语音' : answer.answerType === 'text' ? '文字' : '选择'}]</span></li>
              ))}
            </ul>
            <button className="mt-3 rounded border border-accent/70 bg-accent/10 px-3 py-1 transition-transform active:scale-95" onClick={confirmRecord}>
              确认结构化诱因并写入记录
            </button>
          </div>
        </div>
      )}

      {/* 输入区：文字 + 语音 */}
      {phase !== 'done' && (
        <div className="border-t border-border-subtle p-2">
          {voiceNotice && <div className="mb-1 px-1 text-xs text-warn">{voiceNotice}</div>}
          <div className="flex items-center gap-2">
            <button
              className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all active:scale-95 ${listening ? 'border-danger text-danger' : 'border-border-default text-text-secondary'}`}
              onClick={toggleVoice}
              title={listening ? '停止录音' : '语音输入'}
            >
              {listening && <span className="absolute inset-0 animate-ping rounded-full bg-danger/30" />}
              <Mic size={16} />
            </button>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') handleUserText(draft, 'text') }}
              placeholder={listening ? '正在聆听...' : phase === 'intro' ? '描述今天想记录的诱因...' : '也可输入自由回答...'}
              className="flex-1 rounded border border-border-default bg-bg-3 px-3 py-1.5 text-sm"
            />
            <button
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent/60 bg-accent/10 text-accent transition-transform active:scale-95 disabled:opacity-40"
              disabled={!draft.trim()}
              onClick={() => handleUserText(draft, 'text')}
              title="发送"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
