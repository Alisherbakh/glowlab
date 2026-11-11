// Semantik qidiruv natijasi savolga aloqadormi? (toza funksiya → unit test)
// multilingual-e5 masofalari zich joylashgan: ma'nosiz yoki aloqasiz savol ham hamma parchaga ~0.25 masofada bo'ladi.
// Shuning uchun faqat masofa emas, NISBIY FARQ tekshiriladi: eng yaqin parcha o'rtacha (mediana) parchadan
// sezilarli yaqin bo'lsagina savol bilim bazasiga aloqador deb hisoblanadi.

export type ScoredHit<T> = { chunk: T; distance: number }

export type RelevanceOptions = {
  topK: number // Ko'pi bilan nechta parcha qaytariladi
  maxDistance: number // Undan uzoq parcha hech qachon qaytarilmaydi
  minMargin: number // mediana − eng yaqin masofa ≥ shu bo'lishi shart
}

// hits — barcha (yoki ko'p) parchalar, masofa o'sish tartibida
export function selectRelevant<T>(
  hits: ScoredHit<T>[],
  opts: RelevanceOptions
): { chunks: T[]; margin: number } {
  if (hits.length === 0) return { chunks: [], margin: 0 }
  const median = hits[Math.floor(hits.length / 2)].distance
  const margin = median - hits[0].distance
  if (margin < opts.minMargin) return { chunks: [], margin } // Eng yaqini ham boshqalardan ajralib turmaydi
  const chunks = hits
    .slice(0, opts.topK)
    .filter((h) => h.distance <= opts.maxDistance)
    .map((h) => h.chunk)
  return { chunks, margin }
}
