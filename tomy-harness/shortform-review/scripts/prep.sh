#!/bin/bash
# 릴스 준비(다운로드·메타·장면·받아쓰기)를 차례로 처리한다. 사용: bash prep.sh <임시폴더> <릴스ID> [릴스ID ...]
# 받아쓰기 모델을 여러 에이전트가 동시에 올리면 CPU가 막히므로, 준비는 이 스크립트로 순차 처리하고 분석만 병렬로 나눈다.
P="$LOCALAPPDATA/Microsoft/WinGet/Packages"
export PATH="$(ls -d "$P"/Gyan.FFmpeg_*/ffmpeg-*/bin 2>/dev/null | head -1):$(ls -d "$P"/yt-dlp.yt-dlp_* 2>/dev/null | head -1):$PATH"
K="$(cd "$(dirname "$0")" && pwd)"; OUT="$1"; shift
mkdir -p "$OUT"; ST="$OUT/prep_status.txt"
for id in "$@"; do
  D="$OUT/$id"; mkdir -p "$D"; cd "$D" || continue
  [ -f reel.mp4 ] || yt-dlp --write-info-json --write-comments -o "reel.%(ext)s" "https://www.instagram.com/reel/$id/" > dl.log 2>&1
  if [ ! -f reel.mp4 ]; then echo "$id FAIL $(grep -i error dl.log | tail -1)" | tee -a "$ST"; continue; fi
  python -I "$K/meta.py" reel.info.json meta.txt > /dev/null
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 reel.mp4)
  iv=$(python -c "print(max(0.5, round($dur/18, 2)))")
  echo "duration_ffprobe: $dur / sheet_interval: $iv" >> meta.txt
  ffmpeg -loglevel error -y -i reel.mp4 -vf "fps=1/$iv,scale=270:-1,tile=6x3" -frames:v 1 sheet.jpg
  ffmpeg -loglevel error -y -i reel.mp4 -vf "fps=2,scale=360:-1" -t 3 hook_%02d.jpg
  python -I "$K/transcribe.py" reel.mp4 > transcript.txt 2> transcribe.err
  echo "$id OK dur=$dur" | tee -a "$ST"
done
echo ALLDONE >> "$ST"
