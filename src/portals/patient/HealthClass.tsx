import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useState } from 'react'
import { MOTION_PAGE_VARIANTS, MOTION_TRANSITION_FAST } from '../../constants/motion'

interface Article {
  id: string
  title: string
  read: string
  summary: string
  accent: string
  content: { heading: string; body: string }[]
}

const articles: Article[] = [
  {
    id: 'a1',
    title: '癫痫触发因素识别',
    read: '6 min',
    summary: '了解并规避日常生活中的常见诱因，有效降低发作风险。',
    accent: 'from-accent to-recovery',
    content: [
      {
        heading: '常见触发因素',
        body: '癫痫发作的触发因素因人而异，但研究表明睡眠不足是最普遍的诱因之一。睡眠剥夺会降低大脑皮层的兴奋阈值，从而增加异常放电的概率。',
      },
      {
        heading: '光敏性癫痫',
        body: '约 3% 的癫痫患者对特定频率的闪烁光线敏感，称为光敏性癫痫。屏幕闪烁、强烈阳光透过树叶的间隙、迪斯科灯光均可能构成触发。建议此类患者配戴防光敏眼镜并调低屏幕亮度。',
      },
      {
        heading: '情绪与应激',
        body: '情绪激动、焦虑或长期心理压力可改变神经元电活动的稳定性。学习正念冥想、保持规律的运动和充足的休息对控制应激反应有显著帮助。',
      },
      {
        heading: '饮酒与药物相互作用',
        body: '酒精会干扰抗癫痫药物的代谢，酒后戒断期间更是高危窗口。同样，某些抗生素、抗抑郁药也可能降低发作阈值，用药前务必告知医生病史。',
      },
    ],
  },
  {
    id: 'a2',
    title: '正确急救流程',
    read: '5 min',
    summary: '掌握发作时的标准处置步骤，守护患者安全。',
    accent: 'from-danger to-warn',
    content: [
      {
        heading: '第一步：保持冷静，计时',
        body: '目击发作时，立即启动计时。若发作持续超过 5 分钟，或患者在未完全清醒情况下连续发作两次，属于癫痫持续状态，需立即拨打急救电话。',
      },
      {
        heading: '第二步：清除危险物品',
        body: '迅速移开患者周围尖锐和坚硬物体，放置柔软垫物保护头部。不要强行按压或约束四肢，以防骨折。',
      },
      {
        heading: '第三步：保持气道通畅',
        body: '将患者侧卧（复原体位），使分泌物自然流出，防止误吸。切勿在口中放置任何物品——成人不会在发作中吞咽舌头，此举反而危险。',
      },
      {
        heading: '事后记录与报告',
        body: '发作结束后，记录发作类型（强直阵挛、失神等）、持续时长及意识恢复情况，并通过灵犀妙探的生活日志模块上传，供医生分析调整方案。',
      },
    ],
  },
  {
    id: 'a3',
    title: '用药依从性管理',
    read: '7 min',
    summary: '规律服药是控制发作的基石，了解依从性管理技巧。',
    accent: 'from-safe to-accent',
    content: [
      {
        heading: '为何不能漏服',
        body: '抗癫痫药物需要在血液中维持稳定的治疗浓度。单次漏服可使血药浓度在数小时内跌落至有效窗口以下，发作风险在漏服后 24-48 小时内显著上升。',
      },
      {
        heading: '固定服药时间',
        body: '每天在相同时间点服药，并将服药与已有的日常习惯（如早餐、刷牙）绑定，有助于形成条件反射式记忆。灵犀妙探可根据您的作息设置个性化提醒。',
      },
      {
        heading: '漏服后的处理',
        body: '若想起漏服时距下次服药时间超过一半，可补服当次剂量；若已接近下次服药时间，跳过本次补服，继续按常规计划服药，切勿双倍补服。',
      },
      {
        heading: '副作用应对策略',
        body: '常见副作用如嗜睡、头晕多在用药初期出现并逐渐缓解。出现皮疹、认知下降或情绪明显波动时，应及时联系主治医生，不要自行停药。',
      },
    ],
  },
  {
    id: 'a4',
    title: '睡眠管理策略',
    read: '4 min',
    summary: '建立优质睡眠环境，从根本上降低发作风险。',
    accent: 'from-recovery to-[#A371F7]',
    content: [
      {
        heading: '目标睡眠时长',
        body: '成年癫痫患者建议每夜保持 7-9 小时的连续睡眠。青少年及儿童需要更长的睡眠（9-11 小时），因为发育期的神经系统对睡眠剥夺尤为敏感。',
      },
      {
        heading: '规律作息',
        body: '尽量在相同时间入睡和起床，即使在周末也不例外。睡眠节律紊乱本身即为独立风险因素，频繁轮班工作的患者应与医生讨论专项管理方案。',
      },
      {
        heading: '睡前环境优化',
        body: '熄灯前 1 小时关闭蓝光屏幕，将卧室温度控制在 18-22°C，使用遮光窗帘减少光污染。避免睡前摄入咖啡因和酒精。',
      },
      {
        heading: '睡眠监测',
        body: '灵犀妙探会通过 IMU 加速度计检测夜间体动，识别潜在的夜间发作事件，并在睡眠质量报告中可视化展示 REM/深睡占比，供医生参考。',
      },
    ],
  },
  {
    id: 'a5',
    title: '饮食与营养建议',
    read: '5 min',
    summary: '科学饮食可辅助药物治疗，部分患者可通过饮食疗法减少发作。',
    accent: 'from-warn to-safe',
    content: [
      {
        heading: '生酮饮食（KD）',
        body: '高脂、低碳水化合物的生酮饮食可显著减少难治性癫痫患儿的发作频率，部分患者降幅超 50%。该方案需在营养师和神经科医生的严格监督下实施，不建议自行尝试。',
      },
      {
        heading: '血糖稳定的重要性',
        body: '血糖大幅波动可影响神经元的电生理稳定性。规律进食、避免长时间空腹、减少精制糖摄入有助于维持稳定的脑内环境。',
      },
      {
        heading: '微量营养素',
        body: '维生素 D 缺乏与癫痫发作频率增加存在相关性。叶酸对于正在服用丙戊酸钠的患者尤为重要，因该药物会抑制叶酸吸收，需额外补充。',
      },
      {
        heading: '避免过度饮水',
        body: '短时间内大量饮水（水中毒）可导致血钠稀释性下降，诱发低钠血症性发作。建议每日饮水量在 1.5-2 升之间，均匀分配至全天。',
      },
    ],
  },
  {
    id: 'a6',
    title: '社会心理与日常生活',
    read: '6 min',
    summary: '癫痫不只是医学问题，了解如何在学习、工作与社交中自我管理。',
    accent: 'from-nirs to-danger',
    content: [
      {
        heading: '驾驶与安全',
        body: '大多数国家和地区规定：患者须在医疗证明"最后一次发作距今满 1-2 年"后方可申请驾驶执照。此期间建议使用公共交通，外出时随身携带急救信息卡。',
      },
      {
        heading: '工作与学业',
        body: '大多数癫痫患者可以正常参与工作和学习。如需向雇主或学校披露病情，可申请合理便利（如弹性考试时间、远离高处作业）。灵犀妙探的报告生成功能可快速输出供单位存档的医疗摘要。',
      },
      {
        heading: '心理健康',
        body: '抑郁和焦虑在癫痫患者中的患病率约为普通人群的 2-3 倍，且二者互为风险因素。如出现持续情绪低落，请及时寻求心理咨询，不要将其视为"正常压力反应"。',
      },
      {
        heading: '与家人沟通',
        body: '教会家庭成员识别先兆症状和发作类型，掌握急救流程，并在家中存放必要的急救物资（如计时工具、体位垫）。监护人端的远程监控功能可在患者独处时提供额外安全保障。',
      },
    ],
  },
]

const CARD_ACCENTS = [
  'from-accent to-recovery',
  'from-danger to-warn',
  'from-safe to-accent',
  'from-recovery to-[#A371F7]',
  'from-warn to-safe',
  'from-[#A371F7] to-danger',
]

export function HealthClass(): JSX.Element {
  const [selected, setSelected] = useState<string | null>(null)
  const article = articles.find((item) => item.id === selected)

  return (
    <div className="relative h-full">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        {articles.map((item, index) => (
          <button
            key={item.id}
            className="rounded-md border border-border-default bg-bg-2 p-4 text-left transition-all duration-200 hover:border-border-emphasis active:scale-[0.98]"
            onClick={() => setSelected(item.id)}
          >
            <div className={`h-0.5 w-full rounded-full bg-gradient-to-r ${CARD_ACCENTS[index % CARD_ACCENTS.length]}`} />
            <h3 className="mt-3 font-semibold">{item.title}</h3>
            <p className="mt-2 text-sm text-text-secondary">{item.summary}</p>
            <div className="mt-3 text-xs text-text-muted">阅读 {item.read}</div>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {article && (
          <motion.aside
            variants={MOTION_PAGE_VARIANTS}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={MOTION_TRANSITION_FAST}
            className="absolute right-0 top-0 h-full w-[420px] overflow-y-auto rounded-l-lg border border-border-default bg-bg-1 p-6 shadow-xl"
          >
            <button
              className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full border border-border-default text-text-secondary transition-colors hover:border-border-emphasis hover:text-text-primary active:scale-95"
              onClick={() => setSelected(null)}
              aria-label="关闭"
            >
              <X size={14} />
            </button>
            <h2 className="pr-8 text-lg font-semibold text-text-primary">{article.title}</h2>
            <div className={`mt-2 h-0.5 w-12 rounded-full bg-gradient-to-r ${article.accent}`} />
            <div className="mt-4 space-y-4">
              {article.content.map((section) => (
                <div key={section.heading}>
                  <h3 className="text-sm font-semibold text-text-primary">{section.heading}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-text-secondary">{section.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 text-xs text-text-muted">阅读 {article.read}</div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  )
}
