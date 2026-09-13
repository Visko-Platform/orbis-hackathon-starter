#!/usr/bin/env bash
# Is the GEMINI_API_KEY in .env.local actually good? Run: bash check-key.sh
set -euo pipefail
KEY=$(grep -E '^GEMINI_API_KEY=' .env.local | cut -d= -f2- | tr -d '\r"'"'"' ')
[ -n "$KEY" ] || { echo "no GEMINI_API_KEY in .env.local"; exit 1; }

code=$(curl -s -o /tmp/gemkey.json -w '%{http_code}' \
  -H "x-goog-api-key: $KEY" \
  "https://generativelanguage.googleapis.com/v1beta/models")

if [ "$code" = "200" ]; then
  echo "✓ key works (models endpoint OK)"
else
  echo "✗ key rejected — HTTP $code"
  sed -n '1,12p' /tmp/gemkey.json
  exit 1
fi

# and the exact model read-to-me uses
code=$(curl -s -o /tmp/gemtts.json -w '%{http_code}' -X POST \
  -H "x-goog-api-key: $KEY" -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"hello little one"}]}],"generationConfig":{"responseModalities":["AUDIO"],"speechConfig":{"voiceConfig":{"prebuiltVoiceConfig":{"voiceName":"Leda"}}}}}' \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent")
if [ "$code" = "200" ]; then
  echo "✓ TTS model available (read to me will work)"
else
  echo "✗ TTS call failed — HTTP $code"
  sed -n '1,12p' /tmp/gemtts.json
fi
