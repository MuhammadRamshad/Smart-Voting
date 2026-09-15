face-api.js Weight Files Directory
---------------------------------
For automatic full-model offline inference, weight shards should be placed in this folder:
- tiny_face_detector_model-weights_manifest.json
- tiny_face_detector_model-shard1
- face_landmark_68_model-weights_manifest.json
- face_landmark_68_model-shard1
- face_recognition_model-weights_manifest.json
- face_recognition_model-shard1
- face_recognition_model-shard2

Run bash web/scripts/download-models.sh to fetch them automatically.
