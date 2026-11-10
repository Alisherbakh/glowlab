-- 003: teri kundaligi uchun qo'shimcha ustunlar (Stage 12)
ALTER TABLE diary_entries ADD COLUMN entry_date TEXT;   -- YYYY-MM-DD (foydalanuvchining mahalliy sanasi)
ALTER TABLE diary_entries ADD COLUMN feeling INTEGER;   -- 1–5: teri o'zini qanday his qildi
ALTER TABLE diary_entries ADD COLUMN tags TEXT;         -- JSON massiv: ["breakout","stress"]
ALTER TABLE diary_entries ADD COLUMN updated_at TEXT;
CREATE INDEX IF NOT EXISTS idx_diary_entry_date ON diary_entries (entry_date);
