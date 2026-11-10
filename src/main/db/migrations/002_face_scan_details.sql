-- 002: yuz skani uchun qo'shimcha ustunlar (Stage 11)
-- photo_path NOT NULL bo'lib qoladi: rasm saqlanmaydi → '' yoziladi (maxfiylik: faqat raqamlar saqlanadi)
ALTER TABLE face_scans ADD COLUMN texture REAL;      -- 0–1, mayda notekislik
ALTER TABLE face_scans ADD COLUMN evenness REAL;     -- 0–1, rang notekisligi
ALTER TABLE face_scans ADD COLUMN age_range TEXT;    -- Skan paytidagi profil (darajalar shu bo'yicha hisoblanadi)
ALTER TABLE face_scans ADD COLUMN skin_type TEXT;
ALTER TABLE face_scans ADD COLUMN source TEXT;       -- 'photo' | 'camera'
CREATE INDEX IF NOT EXISTS idx_face_scans_created ON face_scans (created_at);
