#!/usr/bin/env bash
# Deploy Cutline to Cloudflare Workers with a production D1 database and secrets.
# One-time:  npx wrangler login
# Then:      npm run deploy
set -euo pipefail
cd "$(dirname "$0")/.."
W="node ./node_modules/wrangler/bin/wrangler.js"
CFG="dist/server/wrangler.json"
DB_NAME="${CUTLINE_D1_NAME:-cutline-db}"

echo "▶ Building Worker + client"
npm run build

echo "▶ Ensuring D1 database '$DB_NAME' exists"
if ! $W d1 info "$DB_NAME" >/dev/null 2>&1; then
  $W d1 create "$DB_NAME"
fi
DB_ID=$($W d1 info "$DB_NAME" --json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log(j.uuid||j.id)})')
echo "   D1 id: $DB_ID"

node -e '
const fs=require("fs");const p=process.argv[1];const j=JSON.parse(fs.readFileSync(p,"utf8"));
j.d1_databases=[{binding:"DB",database_name:process.argv[2],database_id:process.argv[3]}];
fs.writeFileSync(p,JSON.stringify(j));' "$CFG" "$DB_NAME" "$DB_ID"

echo "▶ Applying schema (safe to re-run)"
$W d1 execute "$DB_NAME" --remote --config "$CFG" --file drizzle/0000_magical_sway.sql -y >/dev/null 2>&1 \
  || echo "   schema already applied (or partially) — continuing"

echo "▶ Deploying Worker"
$W deploy --config "$CFG"

if [ -f .env.local ]; then
  echo "▶ Pushing secrets from .env.local"
  for k in REACTOR_API_KEY NEBIUS_API_KEY LIVE_ACCESS_CODE REACTOR_MODEL NEBIUS_MODEL SHARED_REACTOR_HOURLY_LIMIT SHARED_NEBIUS_HOURLY_LIMIT; do
    v=$(grep -E "^$k=" .env.local | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//')
    if [ -n "$v" ]; then printf '%s' "$v" | $W secret put "$k" --config "$CFG" >/dev/null && echo "   set $k"; fi
  done
fi
echo "✅ Done. Your public URL is printed above (https://cutline.<account>.workers.dev)."
