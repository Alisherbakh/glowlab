-- 001_init.sql — GlowLab boshlang'ich jadvallari
-- Eslatma: vektor jadvallari (vec_kb, vec_products) keyinroq sqlite-vec bilan alohida migratsiyada qo'shiladi

-- Teri profili (onboarding so'rovnomasi). Bitta foydalanuvchi → odatda bitta qator
CREATE TABLE IF NOT EXISTS skin_profile (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  age_range   TEXT NOT NULL CHECK (age_range IN ('18-24', '25-34', '35-44', '45+')),         -- Faqat yosh oralig'i (aniq yosh emas)
  skin_type   TEXT NOT NULL CHECK (skin_type IN ('dry', 'oily', 'combination', 'normal', 'sensitive')),
  concerns    TEXT NOT NULL DEFAULT '[]',                                                    -- JSON massiv: ["acne","redness"]
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Mahsulotlar (My Shelf)
CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,                       -- Mahsulot nomi (majburiy)
  brand       TEXT,                                -- Brend (ixtiyoriy)
  category    TEXT,                                -- cream, serum, sunscreen... (classifier to'ldirishi mumkin)
  photo_path  TEXT,                                -- userData/photos/ ichidagi fayl yo'li
  opened_at   TEXT,                                -- Ochilgan sana (YYYY-MM-DD)
  pao_months  INTEGER NOT NULL DEFAULT 12 CHECK (pao_months > 0),   -- Ochilgandan keyin necha oy ishlatiladi
  expires_at  TEXT,                                -- Hisoblangan muddat (service hisoblaydi)
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_expires_at ON products (expires_at);  -- "Muddati yaqin" so'rovlari tez bo'lishi uchun

-- Tarkibiy moddalar (ingredients)
CREATE TABLE IF NOT EXISTS ingredients (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE COLLATE NOCASE,  -- Nomi takrorlanmaydi (katta-kichik harf farqsiz)
  risk_level  TEXT NOT NULL DEFAULT 'unknown' CHECK (risk_level IN ('low', 'medium', 'high', 'unknown')),
  note        TEXT
);

-- Mahsulot ↔ modda bog'lanishi (many-to-many)
CREATE TABLE IF NOT EXISTS product_ingredients (
  product_id    INTEGER NOT NULL REFERENCES products (id) ON DELETE CASCADE,     -- Mahsulot o'chsa, bog'lanish ham o'chadi
  ingredient_id INTEGER NOT NULL REFERENCES ingredients (id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, ingredient_id)                                         -- Bir xil juftlik takrorlanmaydi
);

-- Yorliq (label) tahlillari — Gemini natijalari
CREATE TABLE IF NOT EXISTS label_analyses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER REFERENCES products (id) ON DELETE CASCADE,
  raw_text    TEXT,                                -- AI o'qigan matn
  result_json TEXT NOT NULL,                       -- zod tekshirgan natija (JSON)
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- O'z modelimiz (ONNX) bashoratlari
CREATE TABLE IF NOT EXISTS predictions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  image_path      TEXT NOT NULL,
  top3_json       TEXT NOT NULL,                   -- [{label, score}, ...]
  confidence      REAL NOT NULL,                   -- Eng yuqori ehtimol (0–1)
  user_correction TEXT,                            -- "Noto'g'ri" bosilsa, to'g'ri javob
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Yuz terisi skanlari (OpenCV kuzatuvlari, tashxis emas)
CREATE TABLE IF NOT EXISTS face_scans (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  photo_path    TEXT NOT NULL,
  quality_score REAL NOT NULL,                     -- Quality Gate bahosi
  oiliness      REAL,                              -- 0–1 oralig'idagi ko'rsatkichlar
  redness       REAL,
  spots         REAL,
  dark_circles  REAL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Ertalabki / kechki tartib (routine)
CREATE TABLE IF NOT EXISTS routines (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  slot  TEXT NOT NULL UNIQUE CHECK (slot IN ('AM', 'PM'))
);
INSERT OR IGNORE INTO routines (slot) VALUES ('AM'), ('PM');   -- Ikkala tartib oldindan yaratiladi

CREATE TABLE IF NOT EXISTS routine_steps (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  routine_id  INTEGER NOT NULL REFERENCES routines (id) ON DELETE CASCADE,
  product_id  INTEGER NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  step_order  INTEGER NOT NULL,                    -- Tartib raqami (1, 2, 3...)
  UNIQUE (routine_id, step_order)
);

-- Teri kundaligi
CREATE TABLE IF NOT EXISTS diary_entries (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  face_scan_id  INTEGER REFERENCES face_scans (id) ON DELETE SET NULL,
  note          TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- RAG bilim bazasi matn bo'laklari (vektorlari keyinroq vec_kb'da)
CREATE TABLE IF NOT EXISTS kb_chunks (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  text    TEXT NOT NULL,
  source  TEXT NOT NULL                            -- Manba (javobda ko'rsatiladi)
);

-- Yuborilgan eslatmalar (bir mahsulot uchun takroriy bildirishnoma bo'lmasligi uchun)
CREATE TABLE IF NOT EXISTS reminders_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('soon', 'expired')),
  sent_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (product_id, kind)
);

-- Sozlamalar (til, mavzu...)
CREATE TABLE IF NOT EXISTS settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);
