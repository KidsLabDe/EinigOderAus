#!/usr/bin/env bash
# Einig oder Aus! — Raspberry Pi Kiosk-Installation
# Einmal auf dem Pi ausführen: bash scripts/install.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE_NAME="einig-oder-aus"
CURRENT_USER="$(whoami)"

echo "=== Einig oder Aus! — Installation ==="
echo "Repo:  $REPO_DIR"
echo "User:  $CURRENT_USER"
echo ""

# --- System-Pakete ---
echo "→ System-Pakete installieren ..."
sudo apt-get update -qq
sudo apt-get install -y -qq wtype curl

# --- uv installieren ---
if ! command -v uv &>/dev/null; then
    echo "→ uv installieren ..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.local/bin:$PATH"
fi
echo "→ uv: $(uv --version)"

# --- Python-Dependencies ---
echo "→ Python-Dependencies installieren ..."
cd "$REPO_DIR"
uv sync

# --- game_config.json: debug auf false ---
echo "→ Debug-Modus deaktivieren ..."
CONFIG="$REPO_DIR/game_config.json"
if command -v python3 &>/dev/null; then
    python3 -c "
import json
with open('$CONFIG') as f:
    cfg = json.load(f)
cfg['server']['debug'] = False
with open('$CONFIG', 'w') as f:
    json.dump(cfg, f, indent=2, ensure_ascii=False)
    f.write('\n')
print('  debug =', cfg['server']['debug'])
"
fi

# --- systemd-Service ---
echo "→ systemd-Service installieren ..."
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}@.service"
sudo cp "$REPO_DIR/scripts/einig-oder-aus.service" "$SERVICE_FILE"
sudo systemctl daemon-reload
sudo systemctl enable "${SERVICE_NAME}@${CURRENT_USER}.service"
sudo systemctl start "${SERVICE_NAME}@${CURRENT_USER}.service" || true
echo "  Service: ${SERVICE_NAME}@${CURRENT_USER}"

# --- Hotspot-Service ---
echo "→ Fallback-Hotspot-Service installieren ..."
HOTSPOT_SERVICE="/etc/systemd/system/einig-hotspot@.service"
sudo cp "$REPO_DIR/scripts/einig-hotspot.service" "$HOTSPOT_SERVICE"
chmod +x "$REPO_DIR/scripts/hotspot.sh"
sudo systemctl daemon-reload
sudo systemctl enable "einig-hotspot@${CURRENT_USER}.service"
echo "  Hotspot-Service aktiviert (startet bei fehlendem WLAN)"

# --- kiosk.sh ausführbar machen ---
chmod +x "$REPO_DIR/scripts/kiosk.sh"

# --- Wayfire Autostart ---
echo "→ Wayfire Autostart konfigurieren ..."
WAYFIRE_INI="$HOME/.config/wayfire.ini"

if [ ! -f "$WAYFIRE_INI" ]; then
    mkdir -p "$(dirname "$WAYFIRE_INI")"
    touch "$WAYFIRE_INI"
fi

KIOSK_LINE="einig_oder_aus = bash $REPO_DIR/scripts/kiosk.sh"

if grep -q "einig_oder_aus" "$WAYFIRE_INI" 2>/dev/null; then
    echo "  Wayfire-Eintrag existiert bereits."
else
    # [autostart]-Sektion hinzufügen oder ergänzen
    if grep -q "^\[autostart\]" "$WAYFIRE_INI"; then
        # Eintrag unter existierende [autostart]-Sektion
        sed -i "/^\[autostart\]/a $KIOSK_LINE" "$WAYFIRE_INI"
    else
        printf '\n[autostart]\n%s\n' "$KIOSK_LINE" >> "$WAYFIRE_INI"
    fi
    echo "  Wayfire-Autostart eingetragen."
fi

# --- Bildschirmschoner deaktivieren ---
echo "→ Bildschirmschoner deaktivieren ..."
WAYFIRE_IDLE="[idle]
dpms_timeout = -1
screensaver_timeout = -1"

if grep -q "^\[idle\]" "$WAYFIRE_INI"; then
    echo "  [idle]-Sektion existiert bereits — bitte manuell prüfen."
else
    printf '\n%s\n' "$WAYFIRE_IDLE" >> "$WAYFIRE_INI"
    echo "  DPMS/Screensaver deaktiviert."
fi

echo ""
echo "=== Installation abgeschlossen ==="
echo "Neustart empfohlen: sudo reboot"
