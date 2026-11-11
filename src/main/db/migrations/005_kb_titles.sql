-- 005_kb_titles.sql — bilim bazasi bo'laklariga o'zbekcha / koreyscha sarlavhalar (ko'p tilli semantik qidiruv uchun)
-- Har bir sarlavha alohida vektor bo'ladi: savol qaysi tilda bo'lsa, o'sha tildagi sarlavhaga yaqinroq tushadi

ALTER TABLE kb_chunks ADD COLUMN alt_titles TEXT NOT NULL DEFAULT '[]';  -- JSON massiv: ["uz sarlavha", "ko sarlavha"]
