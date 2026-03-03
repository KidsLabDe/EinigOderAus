# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Einig oder Aus! — Die Demokratiemaschine** is an interactive physical installation by KidsLab gGmbH (Augsburg). Two players stand at opposing voting stations and answer yes/no questions. If they agree, they score a point. If they disagree, a 2-minute debate timer starts — they must reach consensus or the game ends.

Inspired by Adam J. Scarborough's "The Democracy Machine!", targeted at ages 10+.

## Tech Stack

- **Backend:** Python (Flask + Flask-SocketIO) — serves everything: game UI, admin UI, API, static files
- **Frontend:** Vanilla HTML/CSS/JS with WebSocket for real-time game state
- **Package manager:** uv
- **Display:** Full-screen Chromium kiosk mode on Raspberry Pi — HTML/CSS handles all visuals including video playback (`<video>` tag)
- **Target platform:** Raspberry Pi (runs standalone, no internet required)

## Architecture

Single-app monolith — Python serves the game UI, admin UI, and API from one process. Communication between backend game logic and browser frontend via WebSocket (Socket.IO).

### Input Abstraction

Button input is abstracted so the hardware layer can be swapped. During development, keyboard keys are used:
- **Player 1:** `1` = Ja, `2` = Nein
- **Player 2:** `9` = Ja, `0` = Nein

Later replaced with GPIO, USB arcade encoders, or ESP32 wireless — the game logic doesn't care about the input source.

## Game Logic

```
START → Show question → 10s voting window
MATCH → +1 point → next question
MISMATCH → buzzer → 120s debate phase (re-vote anytime)
  → Agreement before 0 → +1 point → next question
  → No consensus at 0 → Game Over
END → Show score → option to restart
```

## Modes

1. **Two players** (default)
2. **Two teams** (groups behind each station, internal consensus first)
3. **Moderated** (manual question selection, commentary — for stage events)

## Question Management

- Questions stored as **Markdown files** in the repo, organized by category
- Categories: general, school/everyday (10–14), society/politics (14–18), topic-specific
- A **web-based admin UI** for creating/editing questions, which commits changes to git
- On startup, the game lets you **choose which question set** to use
- Always clear yes/no questions with no correct answer

## Style

- Video interludes in Monty Python / Terry Gilliam style
- Heavy bass audio design

## Hardware (Physical)

- **Two voting stations (Podien):** each with a green (Ja) and red (Nein) button, optional LED/display feedback
- **Central display:** screen or projector
- **Audio:** buzzer (disagreement), alarm (time up), positive sound (agreement)
- **Controller:** Raspberry Pi
- **Portable:** setup under 15 minutes, fits in two transport boxes

## Open Technical Decisions

- Housing material for stations (wood, plastic, 3D print)
- Display type (monitor, TV, projector)
- Button connection method (GPIO, USB encoders, ESP32 wireless)
- Multilingual support (DE/EN)

## Language

Project documentation is in German. Code comments and variable names may be in German or English — follow whatever convention is established once development begins.
