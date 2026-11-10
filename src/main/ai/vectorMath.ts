// Vektor matematikasi (embedding'lar uchun). Toza funksiyalar — Electron'siz test qilinadi

// L2 normallashtirish: uzunligi 1 bo'lgan vektor. Shunda cosine = oddiy skalyar ko'paytma
export function normalize(values: ArrayLike<number>): Float32Array {
  let sum = 0
  for (let i = 0; i < values.length; i++) sum += values[i] * values[i]
  const len = Math.sqrt(sum)
  const out = new Float32Array(values.length)
  if (len === 0) return out // Nol vektor → nol (bo'lishda NaN chiqmasin)
  for (let i = 0; i < values.length; i++) out[i] = values[i] / len
  return out
}

// Cosine o'xshashlik: 1 = bir xil yo'nalish, 0 = bog'liq emas, −1 = qarama-qarshi
export function cosineSimilarity(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (a.length !== b.length) throw new Error('Vector length mismatch')
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}
