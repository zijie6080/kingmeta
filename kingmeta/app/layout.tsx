import type { Metadata, Viewport } from 'next'
import './globals.css'
import Navbar from '@/components/layout/Navbar'

export const metadata: Metadata = {
  title: 'KingMeta – 王者荣耀英雄数据分析',
  description: '实时追踪王者荣耀巅峰千强英雄胜率、梯度评分、出装推荐，数据来源 pvp.mcxssg.net。',
  keywords: ['王者荣耀', '英雄数据', '胜率', '梯度', 'KingMeta', '巅峰千强', '出装推荐'],
  openGraph: {
    title: 'KingMeta – 王者荣耀数据站',
    description: '巅峰千强实时梯度 · 完整英雄数据',
    siteName: 'KingMeta',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#080810',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-[#080810] text-white min-h-screen">
        <Navbar />
        <main className="pt-14 pb-20 md:pb-8">
          {children}
        </main>
      </body>
    </html>
  )
}
