-- 004_kb_search.sql — RAG bilim bazasi: qo'shimcha ustunlar, oflayn matn qidiruvi (FTS5) va holat jadvali
-- Eslatma: vektor jadvali (vec_kb) bu yerda emas — u sqlite-vec kengaytmasi yuklangandan keyin kodda yaratiladi.
-- Sabab: kengaytma yuklanmasa ham migratsiya (va butun ilova) ishlashda davom etishi kerak.

ALTER TABLE kb_chunks ADD COLUMN slug TEXT;                     -- kb.json'dagi barqaror id ("sunscreen-basics")
ALTER TABLE kb_chunks ADD COLUMN title TEXT NOT NULL DEFAULT '';
ALTER TABLE kb_chunks ADD COLUMN url TEXT NOT NULL DEFAULT '';  -- Manba sahifasi (foydalanuvchiga ko'rsatiladi)
CREATE UNIQUE INDEX IF NOT EXISTS idx_kb_chunks_slug ON kb_chunks (slug);

-- Oflayn qidiruv: kb_chunks matnidan FTS5 indeks (kontent kb_chunks'da, bu yerda faqat indeks)
CREATE VIRTUAL TABLE IF NOT EXISTS kb_fts USING fts5(
  title,
  text,
  content = 'kb_chunks',
  content_rowid = 'id',
  tokenize = 'porter unicode61'                                 -- "washing" ↔ "wash" kabi so'z o'zaklari mos keladi
);

-- Bilim bazasi holati: kb.json xeshi, embedding modeli va o'lchami (o'zgarsa qayta hisoblanadi)
CREATE TABLE IF NOT EXISTS kb_meta (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);
