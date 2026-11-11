// Lokal embedding modeli uchun toza hisob-kitob (Electron va ONNX'ga bog'liq emas → oddiy unit test)

export type EmbedTask = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'

// e5 modellari matn turini prefiks orqali biladi: savol → "query: ", parcha → "passage: "
export function e5Input(text: string, task: EmbedTask): string {
  return (task === 'RETRIEVAL_QUERY' ? 'query: ' : 'passage: ') + text
}

// Model ko'pi bilan maxTokens token oladi. Uzun matn kesiladi, oxirgi maxsus token (</s>) saqlanadi
export function truncateIds(ids: number[], maxTokens: number): number[] {
  if (ids.length <= maxTokens) return ids
  return [...ids.slice(0, maxTokens - 1), ids[ids.length - 1]]
}

// Mean pooling: har bir token vektorining o'rtachasi → bitta matn vektori.
// hidden — [tokens × dim] tekis massiv (bitta matn, padding yo'q)
export function meanPool(hidden: ArrayLike<number>, tokens: number, dim: number): number[] {
  if (tokens <= 0 || hidden.length !== tokens * dim) throw new Error('meanPool: noto‘g‘ri o‘lcham')
  const out = new Array<number>(dim).fill(0)
  for (let t = 0; t < tokens; t++) {
    for (let d = 0; d < dim; d++) out[d] += hidden[t * dim + d]
  }
  return out.map((v) => v / tokens)
}

// Bitta bo'lak → bir nechta hujjat matni: asosiy (en) sarlavha + har bir tarjima sarlavha, matn bir xil.
// Qidiruvda bo'lak masofasi = shu variantlarning eng yaqini (scripts/eval-embeddings.mjs --multi bilan bir xil)
export function documentVariants(title: string, altTitles: string[], text: string): string[] {
  return [title, ...altTitles].map((t) => `${t}\n${text}`)
}
