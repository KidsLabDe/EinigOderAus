# Konsensomat — Die Demokratiemaschine

## Technisches Konzept (v0.1)

---

## Überblick

Die Installation besteht aus zwei physischen Abstimmstationen und einer zentralen Anzeigeeinheit. Die Stationen stehen sich gegenüber, sodass die Spielenden Blickkontakt haben — das ist kein Zufall, sondern Teil des Konzepts: Demokratie ist ein menschlicher Prozess.

---

## Komponenten

### 1. Zwei Abstimmstationen (Podien)

Jede Station enthält:

- einen **Ja-Knopf** (grün)
- einen **Nein-Knopf** (rot)
- optional: ein kleines Display oder LED-Feedback zur Bestätigung der eigenen Eingabe

Die Podien sind physisch robust genug für den Einsatz bei Schulveranstaltungen und Events. Design und Beschriftung folgen der KidsLab-CI.

### 2. Zentrale Anzeigeeinheit

Ein gut sichtbarer Bildschirm (oder Projektion), der allen Anwesenden — nicht nur den Spielenden — zeigt:

- die aktuelle Frage
- den Status (Abstimmung läuft / Debatte läuft / Ergebnis)
- den Countdown-Timer während der Debattephase
- den Punktestand

### 3. Akustisches Feedback

- ein Buzzer-Sound bei Meinungsverschiedenheit (Debatte beginnt)
- ein Alarmsound bei Ablauf der Zeit (Game Over)
- ein positiver Sound bei Einigung

### 4. Steuerungseinheit

Ein zentrales Gerät (Raspberry Pi oder vergleichbar) verbindet Knöpfe, Display und Audio und läuft die Spiellogik.

---

## Spiellogik

```
START
  → Frage wird angezeigt
  → Beide Spieler haben 10 Sekunden zum Abstimmen (Ja/Nein)

AUSWERTUNG
  → Beide gleich  →  1 Punkt  →  nächste Frage
  → Unterschiedlich  →  Buzzer  →  Debattenphase (120 Sekunden)

DEBATTENPHASE
  → Timer läuft sichtbar herunter
  → Spieler diskutieren frei
  → Jederzeit: erneute Abstimmung möglich
  → Einigung vor Ablauf  →  1 Punkt  →  nächste Frage
  → Kein Konsens bei 0  →  Game Over

ENDE
  → Punktestand wird angezeigt
  → Möglichkeit zum Neustart
```

---

## Fragenverwaltung

Fragen werden in einer einfachen Textdatei oder Datenbank gepflegt und können je nach Veranstaltung ausgetauscht werden. Geplante Fragenkategorien:

- **Allgemein** (für alle Altersgruppen)
- **Schule & Alltag** (10–14 Jahre)
- **Gesellschaft & Politik** (14–18 Jahre)
- **Themenspezifisch** (z.B. Klimaschutz, Digitalisierung — je nach Event)

Die Fragen sind immer als klare Ja/Nein-Fragen formuliert, laden aber zur Diskussion ein. Keine Fangfragen, keine richtige Antwort.

---

## Betriebsmodi

**Modus 1: Zwei Einzelspieler**
Der Standardmodus. Zwei Personen stehen an den Podien.

**Modus 2: Zwei Teams**
Mehrere Personen stehen hinter jedem Podium und einigen sich intern, bevor sie abstimmen. Erhöht die Komplexität und macht die Installation für Schulklassen interessant.

**Modus 3: Moderiert**
Eine Moderation (z.B. KidsLab-Mitarbeiter) wählt Fragen manuell aus und kommentiert — geeignet für größere Bühnenformate.

---

## Look & Feel

- Videos als "Zwischenschnitt" - im Style von Monty Python / Terry Gilliam
- Sound - Bass, Bass, die leute wollen Bass!

## Transportabilität

Die Installation ist für den mobilen Einsatz konzipiert:

- alle Komponenten passen in zwei handliche Transportboxen
- Aufbauzeit unter 15 Minuten
- läuft autark (kein Internet erforderlich)
- Stromversorgung über normale Steckdose

---

## Offene Punkte für die Umsetzung

- Gehäusematerial und -form der Podien (Holz? Kunststoff? 3D-Druck?)
- Displaygröße und -typ (Monitor, TV, Beamer?)
- Microcontroller vs. Einplatinencomputer
- Verkabelung vs. Funk zwischen Podien und Zentrale
- Softwarestack (Python? Web-basiert?)
- Mehrsprachigkeit (DE/EN für internationale Events)≈
