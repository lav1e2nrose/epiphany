import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAppStore } from '../../store'

export function MyProfile(): JSX.Element {
  const patientId = useAppStore((state) => state.currentUser?.id ?? 'p1')
  const history = useAppStore((state) => state.medicalHistories[patientId] ?? state.medicalHistories.p1)
  const upsertMedicalHistory = useAppStore((state) => state.upsertMedicalHistory)

  const toggle = (key: 'cerebralInfection' | 'headTrauma' | 'birthInjury' | 'febrileSeizure' | 'familyHistory'): void => {
    upsertMedicalHistory({
      ...history,
      [key]: {
        ...history[key],
        value: history[key].value === true ? false : true,
      },
      updatedAt: Date.now(),
    })
  }

  const freqData = history.seizureFrequencyHistory.map((item) => ({ name: `${item.year}`, count: item.monthlyCount }))

  return (
    <div className="grid h-full grid-cols-[220px_1fr] gap-3">
      <aside className="rounded-md border border-border-default bg-bg-2 p-3 text-sm">
        <div className="font-semibold">我的档案</div>
        <div className="mt-2 space-y-1 text-xs text-text-secondary">
          <div>1. 基本信息</div>
          <div>2. 既往疾病史</div>
          <div>3. 用药记录</div>
          <div>4. 发作演变</div>
          <div>5. 检查报告</div>
          <div>6. 心理量表</div>
        </div>
        <div className="mt-4 rounded border border-border-default px-2 py-1 text-xs">{history.lockedByDoctor ? '已锁定（医生）' : '可编辑'}</div>
      </aside>

      <section className="space-y-3 overflow-auto rounded-md border border-border-default bg-bg-2 p-3 text-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">既往疾病史（郭老师要求字段）</h2>
          <span className="text-xs text-text-secondary">最后更新：{new Date(history.updatedAt).toLocaleString('zh-CN')}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            ['cerebralInfection', '脑炎/脑膜炎史'],
            ['headTrauma', '脑外伤史'],
            ['birthInjury', '出生时缺氧/产伤'],
            ['febrileSeizure', '热性惊厥史'],
            ['familyHistory', '癫痫家族史'],
          ].map(([key, label]) => {
            const typedKey = key as 'cerebralInfection' | 'headTrauma' | 'birthInjury' | 'febrileSeizure' | 'familyHistory'
            return (
              <button key={key} className="flex items-center justify-between rounded border border-border-default bg-bg-3 px-2 py-2" onClick={() => toggle(typedKey)}>
                <span>{label}</span>
                <span>{history[typedKey].value === true ? '是' : history[typedKey].value === false ? '否' : '不确定'}</span>
              </button>
            )
          })}
        </div>

        <div>
          <h3 className="font-semibold">发作演变</h3>
          <div className="mt-2 h-[180px] rounded border border-border-subtle bg-bg-3/50 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={freqData}>
                <XAxis dataKey="name" tick={{ fill: '#8B949E', fontSize: 11 }} />
                <YAxis tick={{ fill: '#8B949E', fontSize: 11 }} />
                <Tooltip />
                <Line dataKey="count" stroke="#0A84FF" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h3 className="font-semibold">检查报告（示例）</h3>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            {history.examinations.map((exam) => (
              <div key={`${exam.type}-${exam.date}`} className="rounded border border-border-default bg-bg-3 p-2">
                <div>{exam.type} · {exam.date}</div>
                <div className="text-text-secondary">{exam.hospital}</div>
                <div className="mt-1">{exam.conclusion}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
