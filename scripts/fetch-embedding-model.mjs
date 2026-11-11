/* eslint-disable @typescript-eslint/explicit-function-return-type -- oddiy JS skript (.mjs), tur yozib bo'lmaydi */
// RAG embedding modelini Hugging Face'dan yuklaydi → resources/models/embedding/
// Ishlatish: yarn fetch:models   (model 279 MB → GitHub'ga yuklanmaydi, .gitignore'da)
// Model: intfloat/multilingual-e5-base (MIT), ONNX int8 versiyasi Xenova/multilingual-e5-base
import { createHash } from 'crypto'
import { createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync } from 'fs'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { fileURLToPath } from 'url'

const REPO = 'Xenova/multilingual-e5-base'
const REVISION = '1ec9243030a27d1a115d5c340572074c125b58b2' // Aniq commit: model jimgina o'zgarib qolmaydi
const OUT_DIR = fileURLToPath(new URL('../resources/models/embedding/', import.meta.url))

// Fayl → kutilgan hajm va SHA-256 (Hugging Face API'dan olingan)
const FILES = [
  {
    path: 'onnx/model_quantized.onnx',
    name: 'model_quantized.onnx',
    size: 278647662,
    sha256: 'df7a9a29309e3ad491e1783adf8baee710262cc06079c7cbab63c630277fac94'
  },
  {
    path: 'tokenizer.json',
    name: 'tokenizer.json',
    size: 17082660,
    sha256: '62c24cdc13d4c9952d63718d6c9fa4c287974249e16b7ade6d5a85e7bbb75626'
  },
  {
    path: 'tokenizer_config.json',
    name: 'tokenizer_config.json',
    size: 418,
    sha256: 'efb5c0d09722e5fe59a462cd2a9976ee216d55b037597d997cd3fe833216da15'
  }
]

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}

async function download(f) {
  const target = OUT_DIR + f.name
  if (existsSync(target) && sha256(target) === f.sha256) {
    console.log(`✓ ${f.name} (bor)`)
    return
  }
  const url = `https://huggingface.co/${REPO}/resolve/${REVISION}/${f.path}`
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`${f.name}: HTTP ${res.status}`)
  const tmp = target + '.part' // Yarim yuklangan fayl asl nom bilan qolmasin
  await pipeline(Readable.fromWeb(res.body), createWriteStream(tmp))
  const got = sha256(tmp)
  if (got !== f.sha256) {
    rmSync(tmp)
    throw new Error(`${f.name}: SHA-256 mos emas (${got})`)
  }
  renameSync(tmp, target)
  console.log(`✓ ${f.name} (${(f.size / 1e6).toFixed(1)} MB)`)
}

mkdirSync(OUT_DIR, { recursive: true })
for (const f of FILES) await download(f)
console.log(`Tayyor: ${OUT_DIR}`)
