#!/usr/bin/env bash
# One-shot Vercel deploy for orbis-hackathon-starter.
# Run from this folder:  bash deploy.sh
set -euo pipefail

V="npx --yes vercel@latest"

echo "→ linking project (first run will ask you to log in / pick a scope)"
$V link --yes

echo "→ pushing env vars from .env.local"
for k in REACTOR_API_KEY GEMINI_API_KEY; do
  val=$(grep -E "^${k}=" .env.local | cut -d= -f2- | tr -d '\r')
  if [ -z "$val" ]; then echo "  ! $k missing from .env.local"; exit 1; fi
  for env in production preview development; do
    printf '%s' "$val" | $V env rm "$k" "$env" --yes >/dev/null 2>&1 || true
    printf '%s' "$val" | $V env add "$k" "$env" >/dev/null
  done
  echo "  ✓ $k"
done

echo "→ deploying to production"
$V --prod
