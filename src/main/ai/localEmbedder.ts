// RAG uchun oflayn embedding: multilingual-e5-base (ONNX int8) + onnxruntime-node.
// Savol va parchalar kompyuterdan chiqmaydi, API kalit kerak emas. Model: resources/models/embedding/
// (yarn fetch:models). O'zbek, koreys va ingliz savollari inglizcha parchalarga moslanadi.
import { readFile } from 'fs/promises'
import { join } from 'path'
import { Tokenizer } from '@huggingface/tokenizers'
import * as ort from 'onnxruntime-node'
import type { AnalyzeErrorCode } from '../../shared/analysis'
import { e5Input, meanPool, truncateIds, type EmbedTask } from './embeddingMath'
import { getModelDir } from './modelDir'

export const LOCAL_EMBEDDING_MODEL = 'intfloat/multilingual-e5-base' // kb_meta'da shu nom saqlanadi
export const LOCAL_EMBEDDING_DIMENSIONS = 768
const MAX_TOKENS = 512 // Model chegarasi

type LoadedModel = { tokenizer: Tokenizer; session: ort.InferenceSession }

let loading: Promise<LoadedModel | null> | null = null // Model faqat bir marta yuklanadi

async function loadModel(): Promise<LoadedModel | null> {
  try {
    const dir = join(getModelDir(), 'embedding')
    const [modelBytes, tokenizerText, configText] = await Promise.all([
      readFile(join(dir, 'model_quantized.onnx')),
      readFile(join(dir, 'tokenizer.json'), 'utf8'),
      readFile(join(dir, 'tokenizer_config.json'), 'utf8')
    ])
    const tokenizer = new Tokenizer(JSON.parse(tokenizerText), JSON.parse(configText))
    const session = await ort.InferenceSession.create(modelBytes)
    return { tokenizer, session }
  } catch (err) {
    // Model yo'q (yarn fetch:models qilinmagan) yoki buzilgan → semantik qidiruv o'chadi, FTS5 ishlaydi
    console.error('[embed] model not available:', err)
    return null
  }
}

function getModel(): Promise<LoadedModel | null> {
  if (!loading) {
    loading = loadModel().then((m) => {
      if (!m) loading = null // Keyingi urinishda qayta yuklashga harakat qiladi
      return m
    })
  }
  return loading
}

async function embedOne(model: LoadedModel, text: string): Promise<number[]> {
  const ids = truncateIds(model.tokenizer.encode(text).ids, MAX_TOKENS)
  const shape = [1, ids.length]
  const tensor = (values: number[]): ort.Tensor =>
    new ort.Tensor(
      'int64',
      BigInt64Array.from(values, (v) => BigInt(v)),
      shape
    )
  const feeds: Record<string, ort.Tensor> = {}
  for (const name of model.session.inputNames) {
    if (name === 'input_ids') feeds[name] = tensor(ids)
    else if (name === 'attention_mask')
      feeds[name] = tensor(ids.map(() => 1)) // Bitta matn → padding yo'q
    else if (name === 'token_type_ids') feeds[name] = tensor(ids.map(() => 0))
  }
  const out = await model.session.run(feeds)
  const hidden = out[model.session.outputNames[0]] // last_hidden_state: [1, tokens, 768]
  const [, tokens, dim] = hidden.dims
  if (dim !== LOCAL_EMBEDDING_DIMENSIONS) throw new Error(`[embed] kutilmagan o'lcham: ${dim}`)
  return meanPool(hidden.data as Float32Array, tokens, dim) // Normallashtirish chaqiruvchida (kb.service)
}

// kb.service'dagi Embedder bilan bir xil shakl
export async function embedTextsLocal(
  texts: string[],
  task: EmbedTask
): Promise<{ ok: true; vectors: number[][] } | { ok: false; code: AnalyzeErrorCode }> {
  const model = await getModel()
  if (!model) return { ok: false, code: 'unknown' }
  try {
    const vectors: number[][] = []
    for (const text of texts) vectors.push(await embedOne(model, e5Input(text, task)))
    return { ok: true, vectors }
  } catch (err) {
    console.error('[embed] failed:', err)
    return { ok: false, code: 'unknown' }
  }
}
