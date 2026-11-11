/* eslint-disable @typescript-eslint/explicit-function-return-type -- oddiy JS skript (.mjs), tur yozib bo'lmaydi */
// Embedding modellarini RAG bilim bazasida solishtiradi (ilova kodi ishlatilmaydi).
// Lokal model:  node scripts/eval-embeddings.mjs --local <model papkasi> [--prefix e5]
// Gemini:       GEMINI_API_KEY=... node scripts/eval-embeddings.mjs --gemini
// Model papkasida: model_quantized.onnx, tokenizer.json, tokenizer_config.json
import { readFileSync } from 'fs'
import { createRequire } from 'module'
import { join } from 'path'

const require = createRequire(import.meta.url)
// Tokenizer paketi hali loyihada bo'lmasa, EVAL_DEPS papkasidan olinadi
const depsRequire = process.env.EVAL_DEPS
  ? createRequire(join(process.env.EVAL_DEPS, 'x.js'))
  : require

// Savol → to'g'ri javob bo'lishi mumkin bo'lgan parchalar (kb.json id). Bo'sh ro'yxat = aloqasiz savol
const QUESTIONS = [
  { lang: 'en', q: 'How much sunscreen should I put on my face?', ok: ['sunscreen-basics'] },
  {
    lang: 'en',
    q: 'How often should I reapply sunscreen at the beach?',
    ok: ['sunscreen-reapply']
  },
  { lang: 'en', q: 'How do I test a new cream before using it on my face?', ok: ['patch-test'] },
  { lang: 'en', q: 'How do I start using retinol without irritation?', ok: ['retinoid-how'] },
  { lang: 'en', q: 'What triggers rosacea flare-ups?', ok: ['rosacea-triggers'] },
  { lang: 'en', q: 'How long does it take for dark spots to fade?', ok: ['dark-spots-time'] },
  { lang: 'en', q: 'What are the warning signs of melanoma?', ok: ['melanoma-abcde'] },
  { lang: 'en', q: 'Do cosmetics expire?', ok: ['cosmetic-shelf-life'] },
  { lang: 'uz', q: 'Yuzimni kuniga necha marta yuvishim kerak?', ok: ['face-washing-frequency'] },
  {
    lang: 'uz',
    q: 'Quruq teri uchun qanday namlantiruvchi krem tanlash kerak?',
    ok: ['moisturizer-by-type', 'dry-skin-ingredients', 'dry-skin-bathing']
  },
  {
    lang: 'uz',
    q: "Yog'li teri uchun qanday pardoz vositalari mos?",
    ok: ['oily-skin-habits', 'oily-skin-care']
  },
  { lang: 'uz', q: "Husnbuzarga qarshi dori qancha vaqtda ta'sir qiladi?", ok: ['acne-patience'] },
  {
    lang: 'uz',
    q: "Salitsil kislotadan foydalanganda nimalarga e'tibor berish kerak?",
    ok: ['bha-salicylic']
  },
  { lang: 'uz', q: 'Glikol kislota terini quyoshga sezgir qiladimi?', ok: ['aha-sun'] },
  { lang: 'uz', q: 'Tarkibdagi ingredientlar qanday tartibda yoziladi?', ok: ['ingredient-order'] },
  {
    lang: 'uz',
    q: 'Ertalab va kechqurun mahsulotlarni qaysi tartibda surtish kerak?',
    ok: ['routine-order']
  },
  { lang: 'ko', q: '선크림은 얼마나 자주 다시 발라야 하나요?', ok: ['sunscreen-reapply'] },
  { lang: 'ko', q: '레티놀이 뭐예요?', ok: ['retinoid-what'] },
  {
    lang: 'ko',
    q: '민감한 피부에 맞는 보습제는 어떻게 고르나요?',
    ok: ['sensitive-skin-moisturizer', 'moisturizer-by-type']
  },
  { lang: 'ko', q: '여드름을 악화시키는 습관은 무엇인가요?', ok: ['acne-habits'] },
  { lang: 'ko', q: '주사(로사세아) 피부에는 어떤 제품을 써야 하나요?', ok: ['rosacea-skin-care'] },
  { lang: 'ko', q: '기미를 옅게 하려면 어떤 성분이 좋나요?', ok: ['dark-spots-ingredients'] },
  { lang: 'ko', q: '세안은 어떻게 하는 게 좋나요?', ok: ['face-washing'] },
  { lang: 'ko', q: '건강한 피부를 위한 생활 습관은?', ok: ['healthy-habits'] },
  { lang: 'en', q: 'What is the capital of France?', ok: [] },
  { lang: 'uz', q: 'Fransiyaning poytaxti qaysi?', ok: [] },
  { lang: 'en', q: 'How do I change a car tire?', ok: [] },
  { lang: 'uz', q: 'Bugun ob-havo qanday?', ok: [] },
  { lang: 'ko', q: '김치찌개는 어떻게 만드나요?', ok: [] },
  { lang: 'uz', q: "Python'da ro'yxatni qanday saralash mumkin?", ok: [] }
]

function normalize(v) {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1
  return v.map((x) => x / n)
}

// Cosine masofa = 1 − cos (sqlite-vec bilan bir xil)
function distance(a, b) {
  let dot = 0
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i]
  return 1 - dot
}

// Lokal ONNX model: tokenizer → onnxruntime → mean pooling → normalize
async function localEmbedder(dir, prefix) {
  const ort = require('onnxruntime-node')
  const { Tokenizer } = depsRequire('@huggingface/tokenizers')
  const tokenizer = new Tokenizer(
    JSON.parse(readFileSync(join(dir, 'tokenizer.json'), 'utf8')),
    JSON.parse(readFileSync(join(dir, 'tokenizer_config.json'), 'utf8'))
  )
  const session = await ort.InferenceSession.create(join(dir, 'model_quantized.onnx'))
  const MAX_TOKENS = 512 // Model chegarasi: undan uzun matn kesiladi

  async function embedOne(text) {
    let ids = tokenizer.encode(text).ids
    if (ids.length > MAX_TOKENS) ids = [...ids.slice(0, MAX_TOKENS - 1), ids[ids.length - 1]] // Oxirgi maxsus token saqlanadi
    const shape = [1, ids.length]
    const feeds = {}
    const big = (arr) => new ort.Tensor('int64', BigInt64Array.from(arr.map(BigInt)), shape)
    for (const name of session.inputNames) {
      if (name === 'input_ids') feeds[name] = big(ids)
      else if (name === 'attention_mask') feeds[name] = big(ids.map(() => 1))
      else if (name === 'token_type_ids') feeds[name] = big(ids.map(() => 0))
    }
    const out = await session.run(feeds)
    const hidden = out[session.outputNames[0]] // [1, tokens, dim]
    const [, tokens, dim] = hidden.dims
    const mean = new Array(dim).fill(0)
    for (let t = 0; t < tokens; t++)
      for (let d = 0; d < dim; d++) mean[d] += hidden.data[t * dim + d] / tokens
    return normalize(mean)
  }

  return {
    name: dir.split('/').pop(),
    async embed(texts, task) {
      const tag = prefix === 'e5' ? (task === 'RETRIEVAL_QUERY' ? 'query: ' : 'passage: ') : ''
      const vectors = []
      for (const t of texts) vectors.push(await embedOne(tag + t))
      return vectors
    }
  }
}

// Gemini (ilovadagi hozirgi model va sozlamalar)
async function geminiEmbedder() {
  const key = process.env.GEMINI_API_KEY?.trim()
  if (!key) throw new Error('GEMINI_API_KEY berilmagan')
  const { GoogleGenAI } = await import('@google/genai')
  const ai = new GoogleGenAI({ apiKey: key })
  return {
    name: 'gemini-embedding-001',
    async embed(texts, task) {
      const vectors = []
      for (let i = 0; i < texts.length; i += 20) {
        const res = await ai.models.embedContent({
          model: 'gemini-embedding-001',
          contents: texts.slice(i, i + 20),
          config: { taskType: task, outputDimensionality: 768 }
        })
        for (const e of res.embeddings) vectors.push(normalize(e.values))
      }
      return vectors
    }
  }
}

async function main() {
  const args = process.argv.slice(2)
  const kb = JSON.parse(readFileSync(new URL('../resources/kb/kb.json', import.meta.url), 'utf8'))
  const embedder = args.includes('--gemini')
    ? await geminiEmbedder()
    : await localEmbedder(
        args[args.indexOf('--local') + 1],
        args.includes('--prefix') ? args[args.indexOf('--prefix') + 1] : ''
      )

  const t0 = Date.now()
  const docs = await embedder.embed(
    kb.chunks.map((c) => `${c.title}\n${c.text}`),
    'RETRIEVAL_DOCUMENT'
  )
  const docMs = Date.now() - t0
  const t1 = Date.now()
  const queries = await embedder.embed(
    QUESTIONS.map((x) => x.q),
    'RETRIEVAL_QUERY'
  )
  const queryMs = (Date.now() - t1) / QUESTIONS.length

  const rows = QUESTIONS.map((x, i) => {
    const ranked = kb.chunks
      .map((c, j) => ({ id: c.id, d: distance(queries[i], docs[j]) }))
      .sort((a, b) => a.d - b.d)
    const top4 = ranked.slice(0, 4)
    return {
      ...x,
      // Nisbiy farq (ilovadagi ai/relevance.ts bilan bir xil): mediana − eng yaqin masofa
      margin: ranked[Math.floor(ranked.length / 2)].d - ranked[0].d,
      top1: ranked[0],
      hit1: x.ok.includes(ranked[0].id),
      hit4: top4.some((h) => x.ok.includes(h.id)),
      bestOk: x.ok.length
        ? Math.min(...ranked.filter((h) => x.ok.includes(h.id)).map((h) => h.d))
        : null
    }
  })

  const related = rows.filter((r) => r.ok.length)
  const unrelated = rows.filter((r) => !r.ok.length)
  console.log(`\n=== ${embedder.name} ===`)
  console.log(`hujjatlar: ${docMs} ms (26 ta) · savol: ${queryMs.toFixed(0)} ms`)
  for (const lang of ['en', 'uz', 'ko']) {
    const r = related.filter((x) => x.lang === lang)
    console.log(
      `${lang}: top-1 ${r.filter((x) => x.hit1).length}/${r.length} · top-4 ${r.filter((x) => x.hit4).length}/${r.length}`
    )
  }
  console.log(
    `JAMI: top-1 ${related.filter((x) => x.hit1).length}/${related.length} · top-4 ${related.filter((x) => x.hit4).length}/${related.length}`
  )

  // Chegara: to'g'ri parcha masofasi va aloqasiz savolning eng yaqin parchasi masofasi
  const okD = related.map((r) => r.bestOk).sort((a, b) => a - b)
  const badD = unrelated.map((r) => r.top1.d).sort((a, b) => a - b)
  console.log(`to'g'ri parcha masofasi: ${okD[0].toFixed(3)} … ${okD[okD.length - 1].toFixed(3)}`)
  console.log(
    `aloqasiz savol (eng yaqin): ${badD[0].toFixed(3)} … ${badD[badD.length - 1].toFixed(3)}`
  )
  // Nisbiy farq filtri: savol o'tadimi (margin ≥ m)?
  let bestM = { m: 0, score: -1 }
  for (let m = 0; m <= 0.2; m += 0.001) {
    const kept = related.filter((r) => r.margin >= m).length
    const rejected = unrelated.filter((r) => r.margin < m).length
    if (kept + rejected > bestM.score) bestM = { m, score: kept + rejected, kept, rejected }
  }
  console.log(
    `eng yaxshi nisbiy farq ≈ ${bestM.m.toFixed(3)}: mos ${bestM.kept}/${related.length} o'tadi, aloqasiz ${bestM.rejected}/${unrelated.length} rad etiladi`
  )
  let best = { t: 0, score: -1 }
  for (let t = 0.05; t <= 0.8; t += 0.005) {
    const kept = related.filter((r) => r.bestOk <= t).length
    const rejected = unrelated.filter((r) => r.top1.d > t).length
    const score = kept + rejected
    if (score > best.score) best = { t, score, kept, rejected }
  }
  console.log(
    `eng yaxshi chegara ≈ ${best.t.toFixed(3)}: mos ${best.kept}/${related.length} saqlanadi, aloqasiz ${best.rejected}/${unrelated.length} rad etiladi`
  )

  if (args.includes('--verbose')) {
    for (const r of rows) {
      console.log(
        `${r.hit1 ? '✓' : r.hit4 ? '~' : r.ok.length ? '✗' : '·'} [${r.lang}] ${r.top1.d.toFixed(3)} ${r.top1.id}  ← ${r.q}`
      )
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
