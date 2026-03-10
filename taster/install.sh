#!/bin/bash
# Installiert die benoetigten CircuitPython-Libraries auf dem Pico via circup.
# Voraussetzung: circup ist installiert (pip install circup) und der Pico ist angeschlossen.

set -e

echo "Installiere CircuitPython-Libraries via circup..."
circup install adafruit_hid neopixel

# --- udev-Regel: CIRCUITPY-Drive nicht automounten auf dem Pi ---
UDEV_RULE='/etc/udev/rules.d/99-ignore-circuitpy.rules'
if [ ! -f "$UDEV_RULE" ]; then
    echo "Installiere udev-Regel um CIRCUITPY-Automount zu unterdruecken..."
    sudo tee "$UDEV_RULE" > /dev/null << 'UDEV'
# CircuitPython CIRCUITPY-Drive nicht automounten
ENV{ID_FS_LABEL}=="CIRCUITPY", ENV{UDISKS_IGNORE}="1"
UDEV
    sudo udevadm control --reload-rules
    echo "udev-Regel installiert."
else
    echo "udev-Regel bereits vorhanden, ueberspringe."
fi

echo "Fertig! Kopiere taster/code.py als code.py auf den CIRCUITPY-Datentraeger."
