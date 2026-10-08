"""릴스 음성 받아쓰기. 사용: python -I transcribe.py <영상파일>

faster-whisper가 쓰는 av 라이브러리 버전이 안 맞아 직접 디코딩이 실패하므로,
ffmpeg로 음성을 먼저 뽑아 배열로 넘긴다. 모델은 첫 실행 때만 내려받는다(수 GB, 약 2분 반).
"""
import subprocess
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

import numpy as np
from faster_whisper import WhisperModel

raw = subprocess.run(
  ['ffmpeg', '-loglevel', 'error', '-i', sys.argv[1], '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'],
  capture_output=True,
).stdout
audio = np.frombuffer(raw, dtype=np.float32)

t = time.time()
model = WhisperModel('large-v3-turbo', device='cpu', compute_type='int8')
print('load', round(time.time() - t, 1), flush=True)

t = time.time()
segments, info = model.transcribe(audio, vad_filter=True)
print('lang', info.language, 'dur', round(info.duration, 1))
for s in segments:
  print(f'[{s.start:.1f}-{s.end:.1f}] {s.text}')
print('transcribe', round(time.time() - t, 1))
