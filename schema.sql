-- ============================================================
-- 오렌지 라이브커머스 — Cloudflare D1 스키마
-- 적용:  npx wrangler d1 execute orangeliveon --remote --file=./schema.sql
-- ============================================================

-- 방송 편성 -------------------------------------------------
CREATE TABLE IF NOT EXISTS broadcasts (
  id            TEXT PRIMARY KEY,          -- 예: B2610011
  title         TEXT NOT NULL,
  category      TEXT NOT NULL,
  date          TEXT NOT NULL,             -- YYYY-MM-DD (KST)
  start_time    TEXT NOT NULL,             -- HH:MM (KST)
  end_time      TEXT NOT NULL,
  host          TEXT,
  host_role     TEXT,
  seller        TEXT,
  studio        TEXT,
  thumb         TEXT,
  lineup        TEXT,                      -- JSON 배열 문자열
  note          TEXT,
  status        TEXT NOT NULL DEFAULT 'scheduled',  -- scheduled|live|ended|canceled
  is_plan       INTEGER NOT NULL DEFAULT 1,         -- 1이면 계획(미확정)
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_bc_date ON broadcasts(date, start_time);

-- 방송 ↔ 채널 링크 ------------------------------------------
-- 유튜브는 API로 자동 채워지고, 네이버·카카오는 담당자가 등록합니다.
CREATE TABLE IF NOT EXISTS broadcast_channels (
  broadcast_id  TEXT NOT NULL,
  channel       TEXT NOT NULL,             -- naver|youtube|kakao|tiktok
  watch_url     TEXT,
  external_id   TEXT,                      -- 채널 쪽 방송 ID
  source        TEXT NOT NULL DEFAULT 'manual',  -- api|manual
  verified_at   TEXT,                      -- 링크 유효성 확인 시각
  PRIMARY KEY (broadcast_id, channel),
  FOREIGN KEY (broadcast_id) REFERENCES broadcasts(id) ON DELETE CASCADE
);

-- 접수(셀러/브랜드/대관/문의/알림) ---------------------------
CREATE TABLE IF NOT EXISTS leads (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  ref_no        TEXT NOT NULL UNIQUE,      -- SLR-260821-4821
  kind          TEXT NOT NULL,             -- seller|brand|studio|inquiry|notify
  name          TEXT,
  company       TEXT,
  email         TEXT NOT NULL,
  tel           TEXT,
  payload       TEXT NOT NULL,             -- 나머지 항목 JSON
  consent       INTEGER NOT NULL DEFAULT 0,
  marketing     INTEGER NOT NULL DEFAULT 0,
  assigned_to   TEXT,                      -- 담당 팀
  state         TEXT NOT NULL DEFAULT 'received',  -- received|reviewing|done|rejected
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  ip_hash       TEXT                       -- 원문 IP는 저장하지 않습니다
);
CREATE INDEX IF NOT EXISTS idx_leads_kind ON leads(kind, created_at);

-- 방송 알림 구독 --------------------------------------------
CREATE TABLE IF NOT EXISTS subscribers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  tel           TEXT,
  categories    TEXT,                      -- JSON 배열
  marketing     INTEGER NOT NULL DEFAULT 0,
  unsub_token   TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  unsubscribed_at TEXT
);

-- 동기화 로그 -----------------------------------------------
CREATE TABLE IF NOT EXISTS sync_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  channel       TEXT NOT NULL,
  result        TEXT NOT NULL,             -- ok|error
  matched       INTEGER DEFAULT 0,
  message       TEXT,
  ran_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
