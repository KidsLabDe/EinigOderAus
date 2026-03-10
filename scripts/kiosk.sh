#!/usr/bin/env bash
# Chromium Kiosk Launcher — wartet auf Flask-Server, dann Vollbild
set -euo pipefail

URL="http://localhost:5001"
MAX_WAIT=60

echo "Warte auf Server ($URL) ..."
waited=0
until curl --silent --fail --output /dev/null "$URL"; do
    sleep 1
    waited=$((waited + 1))
    if [ "$waited" -ge "$MAX_WAIT" ]; then
        echo "Server nicht erreichbar nach ${MAX_WAIT}s — Abbruch."
        exit 1
    fi
done
echo "Server erreichbar nach ${waited}s."

exec chromium \
    --kiosk \
    --noerrdialogs \
    --disable-infobars \
    --no-first-run \
    --disable-translate \
    --disable-features=TranslateUI \
    --check-for-update-interval=31536000 \
    --enable-features=UseOzonePlatform \
    --ozone-platform=wayland \
    "$URL"
