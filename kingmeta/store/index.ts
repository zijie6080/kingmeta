import { create } from 'zustand'
import type { HeroWithStats, HeroRole, GameMode } from '@/types'

interface KingMetaStore {
  // Filter state
  selectedRole: HeroRole
  selectedMode: GameMode
  searchQuery: string

  // Data
  heroes: HeroWithStats[]
  isLoading: boolean
  lastUpdated: string | null

  // Actions
  setRole: (role: HeroRole) => void
  setMode: (mode: GameMode) => void
  setSearch: (q: string) => void
  setHeroes: (heroes: HeroWithStats[]) => void
  setLoading: (v: boolean) => void
  setLastUpdated: (d: string) => void
}

export const useStore = create<KingMetaStore>((set) => ({
  selectedRole: '全部分路',
  selectedMode: '巅峰千强',
  searchQuery: '',
  heroes: [],
  isLoading: false,
  lastUpdated: null,

  setRole: (role) => set({ selectedRole: role }),
  setMode: (mode) => set({ selectedMode: mode }),
  setSearch: (searchQuery) => set({ searchQuery }),
  setHeroes: (heroes) => set({ heroes }),
  setLoading: (isLoading) => set({ isLoading }),
  setLastUpdated: (lastUpdated) => set({ lastUpdated }),
}))
