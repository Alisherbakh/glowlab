# GlowLab · ML (mahsulot turini tanish)

Shelf'ga mahsulot qo'shishda rasmdan **turini** (cleanser, toner, serum, moisturizer, sunscreen, lip) taxmin qiluvchi model.
Model **oflayn** ishlaydi: PyTorch → ONNX → ilovada `onnxruntime-node`.

## 1. Datasetlarni yuklash (qo'lda, bir marta)

Ikkala dataset ham Roboflow Universe'da, litsenziya **CC BY 4.0**. Yuklash uchun bepul Roboflow akkaunti kerak.

| Papka nomi (Drive'da) | Dataset | Bizga kerakli sinflar |
|---|---|---|
| `skincare-dataset` | https://universe.roboflow.com/visioncomputer/skincare-dataset | cleanser, brightening-toner, soothing-toner, sunscreen, sunblock |
| `makeup-products-detection` | https://universe.roboflow.com/first-work-nnlbg/makeup-products-detection | serum, lotion, sun block, lip stick, lip gloss, lip balm |

Har bir dataset uchun:
1. Sahifani oching → **Download Dataset** (yoki *Dataset* bo'limida versiyani tanlab *Download*)
2. Format: **COCO** (JSON) → **Download zip to computer**
3. Zip'ni oching va papkani yuqoridagi nom bilan Drive'ga yuklang:

```
MyDrive/glowlab_ml/
└── sources/
    ├── skincare-dataset/
    │   └── (train/ valid/ test/ — ichida rasmlar + _annotations.coco.json)
    └── makeup-products-detection/
        └── (train/ valid/ test/ ...)
```
Papka ichidagi qo'shimcha papkalar (masalan `skincare-dataset.v1i.coco/`) muammo emas — notebook `_annotations.coco.json` fayllarini o'zi qidirib topadi.
Boshqa COCO formatdagi dataset qo'shmoqchi bo'lsangiz, `sources/` ga alohida papka qilib qo'ying va kerak bo'lsa `CLASS_MAP` ni to'ldiring.

## 2. Notebooklar (Google Colab)

| # | Fayl | Nima qiladi | Natija (`MyDrive/glowlab_ml/`) |
|---|------|-------------|------|
| 1 | `01_dataset.ipynb` | Manbalarni tekshirish, kerakli sinflarni ajratish, crop, takroriylarni o'chirish, (ixtiyoriy) Bing bilan to'ldirish, qo'lda ko'rish, 70/15/15 bo'lish | `raw/`, `data/train,val,test/` |
| 2 | `02_train.ipynb` | MobileNetV2 transfer learning (head → fine-tune), class weights | `models/product_classifier.pt`, `classes.json` |
| 3 | `03_evaluate.ipynb` | Test accuracy, confusion matrix, threshold (val'dan), Grad-CAM | `metrics.json`, `confusion_matrix.png`, `gradcam/` |
| 4 | `04_export.ipynb` | ONNX eksport + PyTorch bilan solishtirish | `product_classifier.onnx`, `preprocess.json` |

Ishga tushirish:
1. Drive'da notebook ustida o'ng tugma → **Open with → Google Colaboratory**
2. **Runtime → Change runtime type → T4 GPU** (02 uchun shart)
3. Katakchalarni yuqoridan pastga **Shift+Enter** bilan ishga tushiring (*Run all* emas — 01'da qo'lda ko'rish qadami bor)
4. 01 → 02 → 03 → 04
5. 04 oxirida yuklangan fayllarni `glowlab/resources/models/` ga ko'chiring

## 3. Muhim qoidalar
- Sinflar tartibi `classes.json` da — ilova shuni o'qiydi, qo'lda o'zgartirmang.
- Preprocessing (224, ImageNet mean/std) Python va ilovada **bir xil** bo'lishi shart → `preprocess.json`.
- Ishonch `threshold` dan past → ilova "Ishonchim komil emas" deydi, foydalanuvchi o'zi tanlaydi.
- AI xato qilishi mumkin — natija har doim taklif, foydalanuvchi tasdiqlaydi.
- Datasetlar (`sources/`, `raw/`, `data/`) **GitHub'ga yuklanmaydi**.

## 4. Manbalar (CC BY 4.0 attribution)
- *skincare-dataset* — Roboflow Universe, workspace `visioncomputer`: https://universe.roboflow.com/visioncomputer/skincare-dataset
- *makeup products detection* — Roboflow Universe, workspace `first-work-nnlbg`: https://universe.roboflow.com/first-work-nnlbg/makeup-products-detection
- Biz bu datasetlardan faqat kerakli sinflarni oldik va ramkalarni kesib (crop) classification rasmlariga aylantirdik.
