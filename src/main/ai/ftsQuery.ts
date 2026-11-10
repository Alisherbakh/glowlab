// Foydalanuvchi matnidan xavfsiz FTS5 so'rovi yasaydi.
// FTS5 sintaksisi (", *, NEAR, AND...) foydalanuvchidan kelmaydi: har bir so'z qo'shtirnoq ichida, OR bilan.

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'can', 'do', 'does', 'for', 'how', 'i', 'in', 'is', 'it', 'my',
  'of', 'on', 'or', 'should', 'the', 'to', 'use', 'what', 'when', 'which', 'with', 'you', 'your'
]) // prettier-ignore

const MAX_TERMS = 12

export function buildFtsQuery(text: string): string | null {
  const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [] // Faqat harf va raqamlar
  const terms = [...new Set(words)].filter((w) => w.length >= 2 && !STOPWORDS.has(w))
  if (terms.length === 0) return null
  return terms
    .slice(0, MAX_TERMS)
    .map((w) => `"${w}"`)
    .join(' OR ')
}
