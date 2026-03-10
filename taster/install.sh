#!/bin/bash
# Installiert die benoetigten CircuitPython-Libraries auf dem Pico via circup.
# Voraussetzung: circup ist installiert (pip install circup) und der Pico ist angeschlossen.

set -e

echo "Installiere CircuitPython-Libraries via circup..."
circup install adafruit_hid neopixel

echo "Fertig! Kopiere taster/code.py als code.py auf den CIRCUITPY-Datentraeger."
