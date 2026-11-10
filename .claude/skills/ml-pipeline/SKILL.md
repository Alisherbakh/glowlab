---
name: ml-pipeline
description: Use when working on GlowLab's ml/ Colab notebooks — product image dataset, MobileNetV2 transfer learning, evaluation, and ONNX export for onnxruntime-node.
---

# ML Pipeline (product classifier)

Notebooks in `ml/`, run on Google Colab (GPU). Uzbek line comments for beginners.

## 01_dataset.ipynb
- Classes (draft, 6–8): cream, serum, sunscreen, cleanser, toner, lip, (mask, eye_cream)
- Collect 150–200 images per class (e.g. bing-image-downloader); class mapping to merge similar ones
  (e.g. lipstick + lip_gloss → lip).
- Clean: remove broken/duplicate/irrelevant images; convert RGBA/P → RGB.
- Split train / val / test (e.g. 70/15/15), save to Google Drive.

## 02_train.ipynb
- `torchvision.models.mobilenet_v2(weights=...)`, freeze backbone, replace classifier with `len(CLASSES)` outputs.
- Augmentation on train only; same normalization (ImageNet mean/std) everywhere.
- Training loop, track val accuracy, save best `state_dict`.
- Keep `CLASSES` order fixed and save it as `classes.json`.

## 03_evaluate.ipynb
- Test accuracy, per-class accuracy, confusion matrix (matplotlib).
- Grad-CAM examples → images for the AI Lab page.
- Choose confidence threshold from validation results.

## 04_export.ipynb
- `model.eval()`; `torch.onnx.export(model, dummy_input[1,3,224,224], "product_classifier.onnx",
  input_names=["input"], output_names=["logits"], dynamic_axes={"input": {0: "batch"}})`
- Verify with `onnxruntime` in Python: same top-1 as PyTorch on a few test images.
- Copy `product_classifier.onnx` + `classes.json` to `resources/models/`.

## In the app (Stage 10)
- `onnxruntime-node` in main process; preprocess exactly like training (resize 224, RGB, normalize).
- softmax → top-3; below threshold → "Not sure".
