'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Search, Zap, BarChart2, List, Trophy, Home } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

const NAV_ITEMS = [
  { href: '/', label: '首页', icon: Home },
  { href: '/heroes', label: '英雄', icon: List },
  { href: '/tier', label: '梯度', icon: Trophy },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<{ id: string; name: string; avatar_url?: string; roles?: string[] }[]>([])
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null as unknown as ReturnType<typeof setTimeout>)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])

  const handleSearch = (q: string) => {
    setSearch(q)
    clearTimeout(debounceRef.current)
    if (!q.trim()) { setResults([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
        const json = await res.json()
        setResults(json.data ?? [])
        setOpen(true)
      } catch {}
    }, 250)
  }

  const handleSelect = (id: string) => {
    router.push(`/hero/${id}`)
    setOpen(false)
    setSearch('')
  }

  return (
    <>
      {/* Desktop / top navbar */}
      <nav className={cn(
        'fixed top-0 left-0 right-0 z-50 h-14 transition-all duration-300',
        scrolled
          ? 'bg-[#080810]/98 backdrop-blur-2xl border-b border-white/[0.07] shadow-xl shadow-black/20'
          : 'bg-[#080810]/80 backdrop-blur-xl'
      )}>
        <div className="max-w-6xl mx-auto h-full px-4 flex items-center gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5 font-bold text-lg shrink-0 group">
            <div className="w-7 h-7 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-shadow">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-white">King</span><span className="text-orange-400">Meta</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1 ml-1">
            {NAV_ITEMS.map(item => {
              const active = pathname === item.href
              return (
                <Link key={item.href} href={item.href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-150',
                    active
                      ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.06]'
                  )}>
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              )
            })}
          </div>

          {/* Search */}
          <div className="relative ml-auto">
            <div className={cn(
              'flex items-center gap-2 border rounded-xl px-3 py-1.5 transition-all duration-200',
              open || search
                ? 'bg-white/[0.08] border-orange-500/30 w-52'
                : 'bg-white/[0.04] border-white/[0.08] w-40 md:w-48'
            )}>
              <Search className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="搜索英雄…"
                value={search}
                onChange={e => handleSearch(e.target.value)}
                onFocus={() => search && setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                className="bg-transparent text-sm text-white placeholder-gray-600 outline-none flex-1 min-w-0"
              />
              {search && (
                <button onClick={() => { setSearch(''); setResults([]); setOpen(false) }}
                  className="text-gray-600 hover:text-white text-xs">✕</button>
              )}
            </div>
            {open && results.length > 0 && (
              <div className="absolute top-full mt-2 right-0 w-64 bg-[#0e0e1c] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 z-50">
                <div className="p-1">
                  {results.map(h => (
                    <button key={h.id}
                      onMouseDown={() => handleSelect(h.id)}
                      className="flex items-center gap-3 px-3 py-2.5 w-full hover:bg-white/[0.06] rounded-xl text-left transition-colors group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {h.avatar_url && <img src={h.avatar_url} alt={h.name} className="w-9 h-9 rounded-xl object-cover ring-1 ring-white/10" />}
                      <div>
                        <div className="text-sm text-white font-medium group-hover:text-orange-300 transition-colors">{h.name}</div>
                        <div className="text-xs text-gray-500">{h.roles?.join(' · ')}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a16]/98 backdrop-blur-2xl border-t border-white/[0.07]">
        <div className="grid grid-cols-3 h-16">
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href
            return (
              <Link key={item.href} href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 transition-all',
                  active ? 'text-orange-400' : 'text-gray-500'
                )}>
                <div className={cn(
                  'p-1.5 rounded-xl transition-all',
                  active && 'bg-orange-500/15'
                )}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
