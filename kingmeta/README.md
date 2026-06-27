# KingMeta 👑

**王者荣耀英雄数据分析平台** — 每日自动更新的巅峰千强英雄胜率/梯度/趋势分析。

参考站：[pvp.mcxssg.net](https://pvp.mcxssg.net) · 数据来源：公开对局统计

---

## 技术栈

| 层级 | 技术 |
|------|------|
| Frontend | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui 风格 |
| Database | Supabase (Postgres) |
| Charts | Recharts |
| State | Zustand |
| Crawler | Playwright + Axios + Cheerio |
| Deploy | Vercel |
| Cron | Vercel Cron Jobs |

---

## 快速开始

### 1. 克隆 & 安装

```bash
git clone https://github.com/yourname/kingmeta.git
cd kingmeta
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
# 填写 Supabase 相关配置
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CRON_SECRET=your_random_secret
```

### 3. 初始化数据库

在 Supabase 控制台的 SQL Editor 中运行 `sql/schema.sql`

### 4. 首次数据导入

```bash
# 手动触发爬虫（开发环境）
curl http://localhost:3000/api/cron
```

### 5. 启动开发服务器

```bash
npm run dev
# 访问 http://localhost:3000
```

---

## 页面路由

| 路径 | 说明 |
|------|------|
| `/` | 首页 Dashboard（梯度 + 排行榜） |
| `/heroes` | 英雄数据列表（可排序/筛选） |
| `/hero/[id]` | 英雄详情（趋势图/统计） |
| `/tier` | 梯度榜（T0~T4 分组） |

## API

| 端点 | 说明 |
|------|------|
| `GET /api/heroes` | 所有英雄统计，支持 `?role=&mode=` |
| `GET /api/heroes/[id]` | 单英雄详情 + 趋势 |
| `GET /api/rank` | 胜率/出场率/禁用率 Top10 |
| `GET /api/trending` | 近期涨跌幅英雄 |
| `GET /api/search?q=` | 英雄搜索 |
| `GET /api/cron` | 触发爬虫（需 Bearer token） |

---

## 梯度算法

```
tier_score = ban_rate × 0.5 + win_rate × 0.3 + pick_rate × 0.2

T0   ≥ 90% of max_score
T0.5 ≥ 78%
T1   ≥ 65%
T1.5 ≥ 52%
T2   ≥ 40%
T3   ≥ 28%
T4   其他
```

```
meta_score = win_rate × 0.5 + pick_rate × 0.3 + ban_rate × 0.2
```

---

## 部署到 Vercel

```bash
npm install -g vercel
vercel --prod
```

在 Vercel 控制台设置环境变量后，`vercel.json` 中的 Cron Job 将每天 UTC 02:00 自动运行爬虫。

---

## 数据源说明

- 数据抓取自 [pvp.mcxssg.net](https://pvp.mcxssg.net) 公开展示页面
- 仅读取公开可见的对局统计数据，不涉及任何账号/客户端接口
- 数据每日更新，前端读取数据库，不实时爬取
- 本项目为独立第三方工具，与腾讯游戏/天美工作室无关

---

## 目录结构

```
kingmeta/
├── app/
│   ├── page.tsx              # 首页 Dashboard
│   ├── heroes/page.tsx       # 英雄数据列表
│   ├── hero/[id]/page.tsx    # 英雄详情页
│   ├── tier/page.tsx         # 梯度榜
│   └── api/
│       ├── heroes/route.ts
│       ├── heroes/[id]/route.ts
│       ├── rank/route.ts
│       ├── trending/route.ts
│       ├── search/route.ts
│       └── cron/route.ts
├── components/
│   ├── layout/Navbar.tsx
│   ├── heroes/HeroCard.tsx
│   ├── heroes/HeroTable.tsx
│   ├── heroes/TierBadge.tsx
│   ├── charts/StatTrendChart.tsx
│   └── charts/MiniSparkline.tsx
├── crawler/
│   ├── scraper.ts            # 爬虫逻辑
│   └── ingest.ts             # 数据入库
├── lib/
│   ├── supabase.ts
│   ├── utils.ts
│   └── hero-data.ts          # 103 英雄 seed 数据
├── store/index.ts            # Zustand store
├── types/index.ts            # TypeScript 类型
├── sql/schema.sql            # 数据库建表脚本
├── vercel.json               # Cron 配置
└── .env.example
```
