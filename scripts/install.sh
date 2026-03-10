#!/usr/bin/env bash
# Konsensomat — Raspberry Pi Kiosk-Installation
# Einmal auf dem Pi ausführen: bash scripts/install.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE_NAME="einig-oder-aus"
CURRENT_USER="$(whoami)"

echo "=== Konsensomat — Installation ==="
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

# --- Alte Template-Services aufräumen (vor v9828dbf) ---
for OLD_SVC in "einig-oder-aus@${CURRENT_USER}.service" "einig-hotspot@${CURRENT_USER}.service"; do
    if systemctl list-unit-files "$OLD_SVC" &>/dev/null && [ -f "/etc/systemd/system/${OLD_SVC%%@*}@.service" ]; then
        echo "→ Alten Service $OLD_SVC entfernen ..."
        sudo systemctl stop "$OLD_SVC" 2>/dev/null || true
        sudo systemctl disable "$OLD_SVC" 2>/dev/null || true
        sudo rm -f "/etc/systemd/system/${OLD_SVC%%@*}@.service"
    fi
done

# --- systemd-Service ---
echo "→ systemd-Service installieren ..."
UV_PATH="$(command -v uv)"
USER_HOME="$(eval echo "~$CURRENT_USER")"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
sed -e "s|__REPO_DIR__|$REPO_DIR|g" -e "s|__USER__|$CURRENT_USER|g" -e "s|__UV_PATH__|$UV_PATH|g" -e "s|__HOME__|$USER_HOME|g" "$REPO_DIR/scripts/einig-oder-aus.service" | sudo tee "$SERVICE_FILE" >/dev/null
sudo systemctl daemon-reload
sudo systemctl enable "${SERVICE_NAME}.service"
sudo systemctl start "${SERVICE_NAME}.service" || true
echo "  Service: ${SERVICE_NAME}"

# --- Hotspot-Service ---
echo "→ Fallback-Hotspot-Service installieren ..."
HOTSPOT_SERVICE="/etc/systemd/system/einig-hotspot.service"
sed -e "s|__REPO_DIR__|$REPO_DIR|g" -e "s|__USER__|$CURRENT_USER|g" "$REPO_DIR/scripts/einig-hotspot.service" | sudo tee "$HOTSPOT_SERVICE" >/dev/null
chmod +x "$REPO_DIR/scripts/hotspot.sh"
sudo systemctl daemon-reload
sudo systemctl enable "einig-hotspot.service"
echo "  Hotspot-Service aktiviert (startet bei fehlendem WLAN)"

# --- kiosk.sh ausführbar machen ---
chmod +x "$REPO_DIR/scripts/kiosk.sh"

# --- Desktop Autostart (labwc) ---
echo "→ Desktop-Autostart konfigurieren ..."
LABWC_DIR="$HOME/.config/labwc"
LABWC_AUTOSTART="$LABWC_DIR/autostart"
KIOSK_CMD="bash $REPO_DIR/scripts/kiosk.sh &"

mkdir -p "$LABWC_DIR"

if [ -f "$LABWC_AUTOSTART" ] && grep -q "kiosk.sh" "$LABWC_AUTOSTART" 2>/dev/null; then
    echo "  labwc-Autostart existiert bereits."
else
    echo "$KIOSK_CMD" >> "$LABWC_AUTOSTART"
    echo "  labwc-Autostart eingetragen."
fi

# --- Bildschirmschoner deaktivieren ---
echo "→ Bildschirmschoner deaktivieren ..."
LABWC_ENV="$LABWC_DIR/environment"
if [ -f "$LABWC_ENV" ] && grep -q "DPMS" "$LABWC_ENV" 2>/dev/null; then
    echo "  Bereits konfiguriert."
else
    # Disable screen blanking via wlr-randr after compositor starts
    BLANK_CMD="wlr-randr 2>/dev/null; xset s off -dpms 2>/dev/null &"
    if ! grep -q "xset" "$LABWC_AUTOSTART" 2>/dev/null; then
        echo "$BLANK_CMD" >> "$LABWC_AUTOSTART"
    fi
    echo "  Bildschirmschoner deaktiviert."
fi

echo ""
echo "=== Installation abgeschlossen ==="
echo "Neustart empfohlen: sudo reboot"
