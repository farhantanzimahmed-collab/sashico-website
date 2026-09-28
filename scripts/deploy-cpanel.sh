#!/usr/bin/env bash
# Build Sashico as a Next.js standalone server and deploy it to the cPanel
# (CloudLinux Passenger) Node.js app at ~/sashico-app on the hosting server.
#
# Usage:  ./scripts/deploy-cpanel.sh
#
# Runtime secrets live only on the server in ~/sashico-app/env.json (never
# uploaded by this script). NEXT_PUBLIC_* values are baked in at build time.
set -euo pipefail

SSH_HOST="sashicon@131.153.48.114"
SSH_KEY="$HOME/.ssh/sashico_cpanel"
REMOTE_APP="sashico-app"
SITE_URL="https://sashico.net"

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
STAGE="$ROOT/.deploy/app"
SSH=(ssh -i "$SSH_KEY" -o BatchMode=yes "$SSH_HOST")

echo "▸ Building (NEXT_PUBLIC_APP_URL=$SITE_URL)…"
# Explicit env beats .env.local (which points at localhost for dev)
NEXT_PUBLIC_APP_URL="$SITE_URL" NEXT_PUBLIC_SITE_NAME="Sashico" npx next build

echo "▸ Staging bundle…"
rm -rf "$ROOT/.deploy" && mkdir -p "$STAGE"
cp -R .next/standalone/. "$STAGE/"
cp -R public "$STAGE/public"
mkdir -p "$STAGE/.next" && cp -R .next/static "$STAGE/.next/static"
rm -rf "$STAGE/.env" "$STAGE"/.env.* "$STAGE/.next/cache"

# The build machine is macOS — replace every traced copy of sharp (top-level and
# Next's own nested one) with a complete linux-x64 install of the same version.
# Tracing only copies part of sharp, and each copy needs its matching @img binaries.
find "$STAGE/node_modules" -type d -path "*/@img/sharp-*darwin*" -prune -exec rm -rf {} +
find "$STAGE/node_modules" -path "*/sharp/package.json" -not -path "*/sharp/*/sharp/*" | while IFS= read -r SHARP_PKG; do
  SHARP_VER=$(node -p "require('$SHARP_PKG').version")
  DEST_NM="$(dirname "$(dirname "$SHARP_PKG")")"
  TMP_SHARP="$ROOT/.deploy/sharp-linux-$SHARP_VER"
  if [ ! -d "$TMP_SHARP/node_modules" ]; then
    mkdir -p "$TMP_SHARP" && (cd "$TMP_SHARP" && npm init -y >/dev/null &&
      npm install --silent --os=linux --cpu=x64 --libc=glibc "sharp@$SHARP_VER" >/dev/null)
  fi
  cp -R "$TMP_SHARP"/node_modules/. "$DEST_NM/"
  echo "  sharp $SHARP_VER (linux-x64) → ${DEST_NM#$STAGE/}"
done

# Passenger entry point: load server-side secrets, then start Next's server
cat > "$STAGE/app.js" <<'EOF'
const fs = require("fs");
const path = require("path");
const envFile = path.join(__dirname, "env.json");
if (fs.existsSync(envFile)) {
  for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(envFile, "utf8")))) {
    if (process.env[k] === undefined) process.env[k] = String(v);
  }
}
process.env.NODE_ENV = "production";
process.env.HOSTNAME = process.env.HOSTNAME || "127.0.0.1";
require("./server.js");
EOF

echo "▸ Uploading…"
COPYFILE_DISABLE=1 tar --no-xattrs -C "$STAGE" -czf "$ROOT/.deploy/app.tgz" .
"${SSH[@]}" "rm -rf ~/${REMOTE_APP}-staging && mkdir -p ~/${REMOTE_APP}-staging"
"${SSH[@]}" "tar -xzf - -C ~/${REMOTE_APP}-staging" < "$ROOT/.deploy/app.tgz"

echo "▸ Swapping release and restarting…"
"${SSH[@]}" bash -s <<EOF
set -e
cd ~
if [ -d $REMOTE_APP ]; then
  cp -p $REMOTE_APP/env.json ${REMOTE_APP}-staging/env.json 2>/dev/null || true
  # Keep only optimised images — cached pages/data from the old build would serve stale content
  [ -d $REMOTE_APP/.next/cache/images ] && mkdir -p ${REMOTE_APP}-staging/.next/cache && cp -R $REMOTE_APP/.next/cache/images ${REMOTE_APP}-staging/.next/cache/images || true
  rm -rf ${REMOTE_APP}-prev && mv $REMOTE_APP ${REMOTE_APP}-prev
fi
mv ${REMOTE_APP}-staging $REMOTE_APP
mkdir -p $REMOTE_APP/tmp && touch $REMOTE_APP/tmp/restart.txt
cloudlinux-selector restart --json --interpreter nodejs --app-root $REMOTE_APP </dev/null >/dev/null 2>&1 || true
# Let Apache serve static assets straight from the docroot (bypasses Node on the
# 1-CPU plan). Cache/gzip headers for these live in ~/public_html/.htaccess.
mkdir -p ~/public_html/_next && ln -sfn ~/$REMOTE_APP/.next/static ~/public_html/_next/static
for f in ~/$REMOTE_APP/public/*; do ln -sfn "\$f" ~/public_html/"\$(basename "\$f")"; done
find ~/public_html -maxdepth 1 -xtype l -delete
rm -rf ${REMOTE_APP}-prev/.next/cache
EOF

rm -rf "$ROOT/.deploy"
echo "✓ Deployed. Checking $SITE_URL …"
curl -s -o /dev/null -w "  HTTP %{http_code} in %{time_total}s\n" --max-time 60 "$SITE_URL" || true
