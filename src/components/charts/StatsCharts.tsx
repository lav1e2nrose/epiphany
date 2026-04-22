import { RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, BarChart, XAxis, YAxis, CartesianGrid, Bar } from 'recharts'

interface Props {
  adherence: number
}

const dist = [
  { name: '周一', value: 2 },
  { name: '周二', value: 1 },
  { name: '周三', value: 3 },
  { name: '周四', value: 2 },
  { name: '周五', value: 4 },
  { name: '周六', value: 2 },
  { name: '周日', value: 1 },
]

export function StatsCharts({ adherence }: Props): JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-md border border-border-default bg-bg-2 p-2">
        <div className="text-xs text-text-secondary">服药依从性</div>
        <div className="h-44">
          <ResponsiveContainer>
            <RadialBarChart innerRadius="55%" outerRadius="100%" data={[{ name: 'adherence', value: adherence, fill: '#0A84FF' }]}>
              <RadialBar dataKey="value" />
              <Tooltip />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-md border border-border-default bg-bg-2 p-2">
        <div className="text-xs text-text-secondary">事件分布</div>
        <div className="h-44">
          <ResponsiveContainer>
            <BarChart data={dist}>
              <CartesianGrid stroke="#30363D" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#8B949E" />
              <YAxis stroke="#8B949E" />
              <Tooltip />
              <Bar dataKey="value" fill="#39D0D8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
