'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Search, Zap, Menu, X } from 'lucide-react'
import { useState, useRef } from 'react'

const NAV_ITEMS = [
  { href: '/', label: '首页' },
  { href: '/heroes', label: '数据' },
  { href: '/tier', label: '梯度' },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<{ id: string; name: string; avatar_url?: string; roles?: string[] }[]>([])
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null as unknown as ReturnType<typeof setTimeout>)

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
    }, 300)
  }

  const handleSelect = (id: string) => {
    router.push(`/hero/${id}`)
    setOpen(false)
    setSearch('')
    setMenuOpen(false)
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#0a0a0f]/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto h-full px-4 flex items-center gap-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5 font-bold text-lg shrink-0" onClick={() => setMenuOpen(false)}>
            <Zap className="w-5 h-5 text-orange-400 fill-orange-400" />
            <span className="text-white">King</span><span className="text-orange-400">Meta</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1 ml-2">
            {NAV_ITEMS.map(item => (
              <Link key={item.href} href={item.href}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
                  pathname === item.href
                    ? 'bg-orange-500/15 text-orange-400'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.06]'
                )}>
                {item.label}
              </Link>
            ))}
          </div>

          {/* Search */}
          <div className="relative ml-auto">
            <div className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-1.5 w-40 md:w-52">
              <Search className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <input
                type="text" placeholder="搜索英雄…" value={search}
                onChange={e => handleSearch(e.target.value)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                className="bg-transparent text-sm text-white placeholder-gray-600 outline-none flex-1 min-w-0"
              />
            </div>
            {open && results.length > 0 && (
              <div className="absolute top-full mt-2 right-0 w-60 bg-[#111118] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
                {results.map(h => (
                  <button key={h.id}
                    onMouseDown={() => handleSelect(h.id)}
                    className="flex items-center gap-3 px-3 py-2.5 w-full hover:bg-white/[0.06] text-left transition-colors">
                    {h.avatar_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={h.avatar_url} alt={h.name} className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10" />
                    )}
                    <div>
                      <div className="text-sm text-white font-medium">{h.name}</div>
                      <div className="text-xs text-gray-500">{h.roles?.join(' / ')}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-1.5 text-gray-400 hover:text-white transition-colors"
            onClick={() => setMenuOpen(v => !v)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 pt-14" onClick={() => setMenuOpen(false)}>
          <div className="bg-[#0d0d14] border-b border-white/[0.06] px-4 py-3 flex flex-col gap-1"
            onClick={e => e.stopPropagation()}>
            {NAV_ITEMS.map(item => (
              <Link key={item.href} href={item.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  'px-4 py-3 rounded-xl text-base font-medium transition-all',
                  pathname === item.href
                    ? 'bg-orange-500/15 text-orange-400'
                    : 'text-gray-300 hover:bg-white/[0.06]'
                )}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
