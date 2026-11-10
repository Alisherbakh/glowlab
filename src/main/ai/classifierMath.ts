// Klassifikator uchun sof hisob-kitob (Electron/ONNX'siz) → alohida test qilish oson

// RGB baytlar (HWC: piksel ketma-ket R,G,B) → NCHW float32, PyTorch'dagi
// ToTensor() + Normalize(mean, std) bilan aynan bir xil: (x / 255 - mean) / std
export function rgbToNchw(
  rgb: Uint8Array,
  size: number,
  mean: readonly number[],
  std: readonly number[]
): Float32Array {
  const plane = size * size // Bitta kanal (masalan faqat R) uzunligi
  if (rgb.length !== plane * 3) throw new Error(`Expected ${plane * 3} bytes, got ${rgb.length}`)
  const out = new Float32Array(plane * 3)
  for (let i = 0; i < plane; i++) {
    for (let c = 0; c < 3; c++) {
      out[c * plane + i] = (rgb[i * 3 + c] / 255 - mean[c]) / std[c] // Kanal bo'yicha joylaymiz
    }
  }
  return out
}

// Logits → ehtimollar (yig'indisi 1). Katta sonlarda toshib ketmasligi uchun max ayiriladi
export function softmax(logits: readonly number[]): number[] {
  const max = Math.max(...logits)
  const exps = logits.map((v) => Math.exp(v - max))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map((v) => v / sum)
}

// Eng ehtimolli n ta javob (kamayish tartibida)
export function topK<T>(
  labels: readonly T[],
  probs: readonly number[],
  k: number
): { label: T; p: number }[] {
  return labels
    .map((label, i) => ({ label, p: probs[i] }))
    .sort((a, b) => b.p - a.p)
    .slice(0, k)
}
