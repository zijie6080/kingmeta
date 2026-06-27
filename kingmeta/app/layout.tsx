import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/layout/Navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'KingMeta – 王者荣耀英雄数据分析平台',
  description: '实时追踪王者荣耀巅峰千强英雄胜率、出场率、禁用率，提供梯度榜单与版本趋势分析。',
  keywords: ['王者荣耀', '英雄数据', '胜率', '梯度', 'KingMeta', '巅峰千强'],
  openGraph: {
    title: 'KingMeta – 王者荣耀英雄数据',
    description: '实时巅峰千强数据 · 每日自动更新',
    siteName: 'KingMeta',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0f',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.className} bg-[#0a0a0f] text-white min-h-screen`}>
        <Navbar />
        {/* pt-14: below fixed navbar; pb-6: bottom breathing room on mobile */}
        <main className="pt-14 pb-6">
          {children}
        </main>
      </body>
    </html>
  )
}
