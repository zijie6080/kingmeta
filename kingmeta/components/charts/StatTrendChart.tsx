'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'

interface TrendPoint {
  stat_date: string
  win_rate: number | null
  pick_rate: number | null
  ban_rate: number | null
}

interface Props {
  data: TrendPoint[]
}

const fmt = (date: string) => {
  const d = new Date(date)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const CustomTooltip = ({ active, payload, label }: Record<string, unknown>) => {
  if (active && Array.isArray(payload) && payload.length) {
    return (
      <div className="bg-[#13131f] border border-white/10 rounded-xl p-3 text-xs shadow-2xl">
        <p className="text-gray-400 mb-2">{String(label)}</p>
        {(payload as Array<{ color: string; name: string; value: number }>).map((p) => (
          <div key={p.name} className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-gray-300">{p.name}</span>
            <span className="font-bold text-white ml-auto">{p.value?.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function StatTrendChart({ data }: Props) {
  const chartData = data.map(d => ({
    date: fmt(d.stat_date),
    '胜率': d.win_rate,
    '出场率': d.pick_rate,
    '禁用率': d.ban_rate,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
        <Line type="monotone" dataKey="胜率" stroke="#f97316" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#f97316' }} />
        <Line type="monotone" dataKey="出场率" stroke="#a78bfa" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        <Line type="monotone" dataKey="禁用率" stroke="#f43f5e" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
