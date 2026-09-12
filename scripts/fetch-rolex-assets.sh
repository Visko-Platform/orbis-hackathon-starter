#!/usr/bin/env bash
# Downloads the Rolex campaign raster assets listed in public/brands/SOURCES.md
# from Rolex's own media CDN, then verifies each file's media type.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
dest="$root/public/brands/rolex"
user_agent="Mozilla/5.0"
mkdir -p "$dest"

fetch() {
  local name="$1" url="$2" expected="$3"
  local file="$dest/$name"
  curl -fsSL -A "$user_agent" --max-time 90 "$url" -o "$file"
  local actual
  actual="$(file -b --mime-type "$file")"
  if [ "$actual" != "$expected" ]; then
    echo "error: $name is $actual, expected $expected" >&2
    rm -f "$file"
    exit 1
  fi
  echo "ok  $name  ($actual, $(wc -c < "$file" | tr -d ' ') bytes)"
}

fetch submariner.png \
  "https://media.rolex.com/image/upload/q_auto/f_png/c_limit,w_1200/v1/catalogue/2025/upright-c/m126610ln-0001" \
  image/png
fetch datejust.png \
  "https://media.rolex.com/image/upload/q_auto/f_png/c_limit,w_1200/v1/catalogue/2025/upright-c/m126334-0014" \
  image/png
fetch submariner-campaign.jpg \
  "https://media.rolex.com/image/upload/q_auto/f_jpg/c_limit,w_1920/v1/rolexcom/094398bf1f99/collection/professional-watches/share/professional-watches-submariner-share" \
  image/jpeg
fetch submariner-back.png \
  "https://media.rolex.com/image/upload/c_limit,w_1200/q_auto,f_png/v1/a677b2c664f6/catalogue/2026/360/50897-51546/50897-51546--125" \
  image/png
fetch datejust-back.png \
  "https://media.rolex.com/image/upload/c_limit,w_1200/q_auto,f_png/v1/a677b2c664f6/catalogue/2026/360/50640-50653/50640-50653--125" \
  image/png
fetch submariner-clasp-open.jpg \
  "https://media.rolex.com/image/upload/q_auto/f_jpg/c_limit,w_1600/v1/rolexcom/watchmaking/features/watchmaking-cards/bracelets/glidelock/watchmaking-features-bracelets-glidelock-clasp_glidelock_2301_002f_rvb" \
  image/jpeg
fetch datejust-clasp-open.jpg \
  "https://media.rolex.com/image/upload/q_auto/f_jpg/c_limit,w_1600/v1/rolexcom/watchmaking/features/watchmaking-cards/bracelets/oysterclasp/watchmaking-features-bracelets-oysterclasp-cover-still-ooh" \
  image/jpeg

echo "Rolex assets are in $dest"
