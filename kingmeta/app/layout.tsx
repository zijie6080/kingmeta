import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/layout/Navbar'

export const metadata: Metadata = {
  title: 'KingMeta – 王者荣耀英雄数据分析平台',
  description: '王者荣耀巅峰千强英雄胜率、出场率、禁用率、梯度分析。每日自动更新，数据来源公开对局。',
  keywords: '王者荣耀,英雄数据,胜率,禁用率,梯度,KingMeta',
  openGraph: {
    title: 'KingMeta – 王者荣耀英雄数据分析',
    description: '每日更新的王者荣耀巅峰千强英雄强度分析',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-[#0a0a0f]">
        <Navbar />
        <main className="pt-14">{children}</main>
      </body>
    </html>
  )
}
