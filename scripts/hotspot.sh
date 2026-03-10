#!/usr/bin/env bash
# Fallback-Hotspot: Wenn kein WLAN verbunden, Hotspot aufmachen
set -euo pipefail

HOTSPOT_SSID="EinigOderAus"
HOTSPOT_PASS="kidslab"
HOTSPOT_CON="EinigOderAus-Hotspot"
WIFI_DEVICE="wlan0"
MAX_WAIT=5

echo "Warte ${MAX_WAIT}s auf WLAN-Verbindung ..."
waited=0
while [ "$waited" -lt "$MAX_WAIT" ]; do
    # Prüfe ob wlan0 eine IP hat (= verbunden)
    if ip -4 addr show "$WIFI_DEVICE" 2>/dev/null | grep -q "inet "; then
        echo "WLAN verbunden — kein Hotspot nötig."
        exit 0
    fi
    sleep 1
    waited=$((waited + 1))
done

echo "Kein WLAN gefunden — starte Hotspot '$HOTSPOT_SSID' ..."

# Hotspot-Profil anlegen falls nicht vorhanden
if ! nmcli connection show "$HOTSPOT_CON" &>/dev/null; then
    nmcli connection add \
        type wifi \
        ifname "$WIFI_DEVICE" \
        con-name "$HOTSPOT_CON" \
        autoconnect no \
        ssid "$HOTSPOT_SSID" \
        -- \
        wifi.mode ap \
        wifi.band bg \
        wifi.channel 6 \
        ipv4.method shared \
        ipv4.addresses 192.168.4.1/24 \
        wifi-sec.key-mgmt wpa-psk \
        wifi-sec.psk "$HOTSPOT_PASS"
    echo "  Hotspot-Profil '$HOTSPOT_CON' angelegt."
fi

nmcli connection up "$HOTSPOT_CON"
echo "Hotspot aktiv: SSID=$HOTSPOT_SSID, IP=192.168.4.1"
