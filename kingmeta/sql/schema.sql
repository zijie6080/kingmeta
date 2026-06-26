-- KingMeta Database Schema
-- Run this in your Supabase SQL editor

-- =========================================
-- Table: heroes (static hero info)
-- =========================================
CREATE TABLE IF NOT EXISTS heroes (
  id          TEXT PRIMARY KEY,           -- hero_id from pvp.qq.com e.g. "508"
  name        TEXT NOT NULL,
  alias       TEXT,                       -- short name
  avatar_url  TEXT,
  roles       TEXT[],                     -- ["发育路","游走"]
  difficulty  INT DEFAULT 1,             -- 1-3
  is_new      BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_heroes_roles ON heroes USING GIN(roles);

-- =========================================
-- Table: hero_stats (daily stats snapshot)
-- =========================================
CREATE TABLE IF NOT EXISTS hero_stats (
  id          BIGSERIAL PRIMARY KEY,
  hero_id     TEXT NOT NULL REFERENCES heroes(id) ON DELETE CASCADE,
  stat_date   DATE NOT NULL,
  rank_no     INT,                        -- position in leaderboard
  win_rate    NUMERIC(5,2),              -- 52.3
  pick_rate   NUMERIC(5,2),              -- 10.4
  ban_rate    NUMERIC(5,2),              -- 87.2
  bp_rate     NUMERIC(5,2),              -- 97.6
  team_rate   NUMERIC(5,2),             -- 参团率
  dmg_share   NUMERIC(5,2),             -- 输出占比
  dmg_per_min NUMERIC(10,2),
  tank_share  NUMERIC(5,2),             -- 承伤占比
  tank_per_min NUMERIC(10,2),
  gold_per_min NUMERIC(10,2),
  medal_rate  NUMERIC(5,2),             -- 拿牌率
  tier        TEXT CHECK(tier IN ('T0','T0.5','T1','T1.5','T2','T3','T4')),
  meta_score  NUMERIC(6,2),
  game_mode   TEXT DEFAULT '巅峰千强',
  version     TEXT,
  source      TEXT DEFAULT 'pvp.mcxssg.net',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hero_id, stat_date, game_mode)
);

CREATE INDEX IF NOT EXISTS idx_hero_stats_hero_id    ON hero_stats(hero_id);
CREATE INDEX IF NOT EXISTS idx_hero_stats_stat_date  ON hero_stats(stat_date DESC);
CREATE INDEX IF NOT EXISTS idx_hero_stats_tier       ON hero_stats(tier);
CREATE INDEX IF NOT EXISTS idx_hero_stats_win_rate   ON hero_stats(win_rate DESC);
CREATE INDEX IF NOT EXISTS idx_hero_stats_pick_rate  ON hero_stats(pick_rate DESC);
CREATE INDEX IF NOT EXISTS idx_hero_stats_ban_rate   ON hero_stats(ban_rate DESC);
CREATE INDEX IF NOT EXISTS idx_hero_stats_meta_score ON hero_stats(meta_score DESC);

-- =========================================
-- Table: hero_builds (recommended items)
-- =========================================
CREATE TABLE IF NOT EXISTS hero_builds (
  id          BIGSERIAL PRIMARY KEY,
  hero_id     TEXT NOT NULL REFERENCES heroes(id) ON DELETE CASCADE,
  build_date  DATE NOT NULL,
  items       JSONB,                     -- [{name, icon, order}]
  runes       JSONB,                     -- [{name, icon}]
  win_rate    NUMERIC(5,2),
  game_mode   TEXT DEFAULT '巅峰千强',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hero_id, build_date, game_mode)
);

CREATE INDEX IF NOT EXISTS idx_hero_builds_hero_id ON hero_builds(hero_id);

-- =========================================
-- Table: updates (version/crawl log)
-- =========================================
CREATE TABLE IF NOT EXISTS updates (
  id          BIGSERIAL PRIMARY KEY,
  version     TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  status      TEXT DEFAULT 'success',    -- success | failed | partial
  hero_count  INT DEFAULT 0,
  notes       TEXT
);

-- =========================================
-- Table: crawl_logs (detailed run logs)
-- =========================================
CREATE TABLE IF NOT EXISTS crawl_logs (
  id          BIGSERIAL PRIMARY KEY,
  run_at      TIMESTAMPTZ DEFAULT NOW(),
  status      TEXT,
  duration_ms INT,
  heroes_updated INT,
  errors      TEXT[],
  meta        JSONB
);

-- =========================================
-- View: latest_stats (convenience view)
-- =========================================
CREATE OR REPLACE VIEW latest_stats AS
SELECT 
  hs.*,
  h.name,
  h.alias,
  h.avatar_url,
  h.roles,
  h.difficulty,
  h.is_new
FROM hero_stats hs
JOIN heroes h ON h.id = hs.hero_id
WHERE hs.stat_date = (
  SELECT MAX(stat_date) FROM hero_stats WHERE game_mode = hs.game_mode
);

-- =========================================
-- Enable Row Level Security (public read)
-- =========================================
ALTER TABLE heroes ENABLE ROW LEVEL SECURITY;
ALTER TABLE hero_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE hero_builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read heroes" ON heroes FOR SELECT USING (true);
CREATE POLICY "Public read hero_stats" ON hero_stats FOR SELECT USING (true);
CREATE POLICY "Public read hero_builds" ON hero_builds FOR SELECT USING (true);
CREATE POLICY "Public read updates" ON updates FOR SELECT USING (true);
