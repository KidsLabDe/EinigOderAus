#!/usr/bin/env -S uv run
"""
Generiert alle Cutout-Bilder für "Einig oder Aus!" via OpenAI DALL-E API.

Usage:
    export OPENAI_API_KEY="sk-..."
    python scripts/generate_images.py [--dry-run] [--only NAME]

    --dry-run   Zeigt nur die Prompts an, ohne API-Calls
    --only NAME Generiert nur ein bestimmtes Bild (z.B. "announcer")
"""

import os
import sys
import argparse
import time
from pathlib import Path

try:
    from openai import OpenAI
except ImportError:
    print("openai package nicht installiert. Bitte: pip install openai")
    sys.exit(1)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CUTOUTS_DIR = PROJECT_ROOT / "static" / "img" / "cutouts"

STYLE_SUFFIX = """
STYLE:
surreal vintage photo collage character,
victorian carnival aesthetic,
giant head tiny body,
bizarre proportions,
paper cut-out animation style,
grotesque but funny,
19th century engraved black and white head,
bright flat color clothing,
circus ringmaster style,
cut paper outline,
collage texture,
mix of engraving illustration and bold flat colors,
high contrast,
isolated character,
transparent background"""

# --- Bild-Definitionen ---

IMAGES = [
    # === Characters ===
    {
        "name": "announcer",
        "path": "characters/announcer.png",
        "size": "1024x1024",
        "prompt": f"""Showmaster / carnival announcer, full body character,
pose: standing center stage, arms spread wide gesturing dramatically,
holding: a golden microphone in one hand,
expression: huge theatrical grin, eyebrows raised, mouth open mid-announcement,
{STYLE_SUFFIX}""",
    },
    {
        "name": "figure-thinking-left",
        "path": "characters/figure-thinking-left.png",
        "size": "1024x1024",
        "prompt": f"""Thinking philosopher character, full body character,
pose: standing, body angled slightly left, looking to the right, chin resting on hand,
holding: nothing,
expression: puzzled, one eyebrow raised, lips pursed in deep thought,
{STYLE_SUFFIX}""",
    },
    {
        "name": "figure-thinking-right",
        "path": "characters/figure-thinking-right.png",
        "size": "1024x1024",
        "prompt": f"""Thinking philosopher character, full body character,
pose: standing, body angled slightly right, looking to the left, chin resting on hand,
holding: nothing,
expression: puzzled, one eyebrow raised, lips pursed in deep thought,
{STYLE_SUFFIX}""",
    },
    {
        "name": "figure-arguing-left",
        "path": "characters/figure-arguing-left.png",
        "size": "1024x1024",
        "prompt": f"""Angry debater character, full body character,
pose: leaning forward aggressively, pointing finger to the right, body facing right,
holding: nothing,
expression: furious, red face, veins popping, mouth wide open yelling,
{STYLE_SUFFIX}""",
    },
    {
        "name": "figure-arguing-right",
        "path": "characters/figure-arguing-right.png",
        "size": "1024x1024",
        "prompt": f"""Angry debater character, full body character,
pose: leaning forward aggressively, pointing finger to the left, body facing left,
holding: nothing,
expression: furious, red face, veins popping, mouth wide open yelling,
{STYLE_SUFFIX}""",
    },
    {
        "name": "figure-cheering-left",
        "path": "characters/figure-cheering-left.png",
        "size": "1024x1024",
        "prompt": f"""Celebrating jubilant character, full body character,
pose: jumping with both arms raised high in victory, body facing right,
holding: nothing,
expression: ecstatic joy, huge open smile, eyes squeezed shut with happiness,
{STYLE_SUFFIX}""",
    },
    {
        "name": "figure-cheering-right",
        "path": "characters/figure-cheering-right.png",
        "size": "1024x1024",
        "prompt": f"""Celebrating jubilant character, full body character,
pose: jumping with both arms raised high in victory, body facing left,
holding: nothing,
expression: ecstatic joy, huge open smile, eyes squeezed shut with happiness,
{STYLE_SUFFIX}""",
    },
    # === Objects ===
    {
        "name": "thumbs-up",
        "path": "objects/thumbs-up.png",
        "size": "1024x1024",
        "prompt": f"""A single disembodied hand giving a thumbs up gesture,
vintage engraved illustration style,
bold flat colors,
collage cut-out look,
high contrast,
isolated object,
transparent background""",
    },
    {
        "name": "gavel",
        "path": "objects/gavel.png",
        "size": "1024x1024",
        "prompt": f"""A wooden judge's gavel / mallet,
vintage engraved illustration style,
bold flat colors,
collage cut-out look,
high contrast,
isolated object,
transparent background""",
    },
    {
        "name": "trophy",
        "path": "objects/trophy.png",
        "size": "1024x1024",
        "prompt": f"""A golden victory trophy / cup with handles,
vintage engraved illustration style,
bold flat colors,
collage cut-out look,
high contrast,
isolated object,
transparent background""",
    },
    # === Decorative ===
    {
        "name": "curtain-left",
        "path": "decorative/curtain-left.png",
        "size": "1024x1792",
        "prompt": """Left half of a red draped theater curtain,
heavy velvet fabric with golden tassels,
hanging from top, draped to the left side,
vintage theatrical style,
rich deep red color,
collage cut-out look,
high contrast,
isolated on transparent background""",
    },
    {
        "name": "curtain-right",
        "path": "decorative/curtain-right.png",
        "size": "1024x1792",
        "prompt": """Right half of a red draped theater curtain,
heavy velvet fabric with golden tassels,
hanging from top, draped to the right side,
vintage theatrical style,
rich deep red color,
collage cut-out look,
high contrast,
isolated on transparent background""",
    },
    {
        "name": "foot",
        "path": "decorative/foot.png",
        "size": "1024x1024",
        "prompt": f"""A giant bare foot seen from below stomping downward, Monty Python style,
surreal absurd humor,
vintage engraved illustration style,
bold flat skin color,
collage cut-out look,
high contrast,
isolated on transparent background""",
    },
]


def generate_image(client: OpenAI, image_def: dict, dry_run: bool = False) -> bool:
    """Generiert ein einzelnes Bild und speichert es."""
    name = image_def["name"]
    output_path = CUTOUTS_DIR / image_def["path"]
    prompt = image_def["prompt"]
    size = image_def["size"]

    print(f"\n{'='*60}")
    print(f"  {name}")
    print(f"  -> {output_path.relative_to(PROJECT_ROOT)}")
    print(f"  Size: {size}")
    print(f"{'='*60}")

    if dry_run:
        print(f"  PROMPT:\n{prompt}\n")
        return True

    if output_path.exists():
        print(f"  SKIP: Datei existiert bereits. Lösche sie zum Neugenerieren.")
        return True

    output_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        response = client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size=size,
            quality="hd",
            n=1,
            response_format="url",
        )

        image_url = response.data[0].url
        revised_prompt = response.data[0].revised_prompt
        print(f"  Revised prompt: {revised_prompt[:100]}...")

        # Bild herunterladen
        import urllib.request
        urllib.request.urlretrieve(image_url, str(output_path))
        print(f"  OK: Gespeichert!")
        return True

    except Exception as e:
        print(f"  FEHLER: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Generiert Cutout-Bilder via DALL-E 3")
    parser.add_argument("--dry-run", action="store_true", help="Nur Prompts anzeigen")
    parser.add_argument("--only", type=str, help="Nur ein bestimmtes Bild generieren")
    parser.add_argument("--force", action="store_true", help="Existierende Bilder überschreiben")
    args = parser.parse_args()

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key and not args.dry_run:
        print("Fehler: OPENAI_API_KEY nicht gesetzt!")
        print("  export OPENAI_API_KEY='sk-...'")
        sys.exit(1)

    client = OpenAI(api_key=api_key) if not args.dry_run else None

    images_to_generate = IMAGES
    if args.only:
        images_to_generate = [img for img in IMAGES if img["name"] == args.only]
        if not images_to_generate:
            print(f"Bild '{args.only}' nicht gefunden. Verfügbar:")
            for img in IMAGES:
                print(f"  - {img['name']}")
            sys.exit(1)

    if args.force:
        for img in images_to_generate:
            p = CUTOUTS_DIR / img["path"]
            if p.exists():
                p.unlink()
                print(f"  Gelöscht: {p.relative_to(PROJECT_ROOT)}")

    print(f"Generiere {len(images_to_generate)} Bilder...")
    success = 0
    failed = 0

    for img in images_to_generate:
        if generate_image(client, img, dry_run=args.dry_run):
            success += 1
        else:
            failed += 1
        # Rate limit: DALL-E 3 erlaubt ~5 req/min
        if not args.dry_run and img != images_to_generate[-1]:
            print("  Warte 15s (Rate Limit)...")
            time.sleep(15)

    print(f"\n{'='*60}")
    print(f"  Fertig! {success} OK, {failed} Fehler")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
