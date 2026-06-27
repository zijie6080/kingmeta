'use client'

import { useState, useEffect, useCallback } from 'react'
import HeroTable from '@/components/heroes/HeroTable'
import { Skeleton } from '@/components/ui/skeleton'
import type { HeroWithStats, HeroRole } from '@/types'
import { Filter, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

const ROLES: HeroRole[] = ['全部分路', '对抗路', '打野', '中路', '发育路', '游走']
const ROLE_EMOJIS: Record<string, string> = {
  '全部分路': '⚔️', '对抗路': '🗡️', '打野': '🌲', '中路': '⚡', '发育路': '🏹', '游走': '🌀'
}

export default function HeroesPage() {
  const [heroes, setHeroes] = useState<HeroWithStats[]>([])
  const [filtered, setFiltered] = useState<HeroWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<HeroRole>('全部分路')
  const [search, setSearch] = useState('')
  const [date, setDate] = useState('')

  const fetchHeroes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/heroes?mode=巅峰千强&limit=200')
      const json = await res.json()
      setHeroes(json.data ?? [])
      setDate(json.meta?.date ?? '')
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchHeroes() }, [fetchHeroes])

  useEffect(() => {
    let list = heroes
    if (role !== '全部分路') {
      list = list.filter(h => (h.roles as string[])?.some(r => r.includes(role)))
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(h => h.name?.toLowerCase().includes(q))
    }
    setFiltered(list)
  }, [heroes, role, search])

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">英雄数据</h1>
          {date && <p className="text-xs text-gray-500 mt-0.5">数据日期：{date} · 巅峰千强</p>}
        </div>
        <button onClick={fetchHeroes} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
          刷新
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-400 font-medium">筛选</span>
        </div>
        
        {/* Role filter */}
        <div className="flex flex-wrap gap-2 mb-3">
          {ROLES.map(r => (
            <button key={r}
              onClick={() => setRole(r)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                role === r
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'bg-white/[0.04] text-gray-400 border border-white/[0.06] hover:text-white hover:bg-white/[0.08]'
              )}>
              <span>{ROLE_EMOJIS[r]}</span>
              {r}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="搜索英雄名称…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none w-full md:w-64 focus:border-orange-500/40 transition-colors"
        />
      </div>

      {/* Stats summary */}
      {!loading && (
        <div className="flex items-center gap-4 mb-4 text-xs text-gray-600">
          <span>共 <strong className="text-gray-400">{filtered.length}</strong> 名英雄</span>
          {role !== '全部分路' && <span>分路：<strong className="text-orange-400">{role}</strong></span>}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-lg">暂无数据</p>
          <p className="text-sm mt-1">请运行爬虫初始化数据库</p>
        </div>
      ) : (
        <HeroTable heroes={filtered} />
      )}

      <p className="text-xs text-gray-700 text-center mt-6">
        胜率 ≥52% 为<span className="text-orange-400">强势</span>，≤48% 为<span className="text-blue-400">弱势</span> · 禁用率 ≥50% 红色标注
      </p>
    </div>
  )
}
