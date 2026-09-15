#!/bin/bash
MODELS_DIR="./public/models"
mkdir -p "$MODELS_DIR"
BASE_URL="https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"

files=(
  "tiny_face_detector_model-weights_manifest.json"
  "tiny_face_detector_model-shard1"
  "face_landmark_68_model-weights_manifest.json"
  "face_landmark_68_model-shard1"
  "face_recognition_model-weights_manifest.json"
  "face_recognition_model-shard1"
  "face_recognition_model-shard2"
)

for file in "${files[@]}"; do
  echo "Downloading $file..."
  curl -sSL "$BASE_URL/$file" -o "$MODELS_DIR/$file"
done
echo "Models downloaded successfully!"
