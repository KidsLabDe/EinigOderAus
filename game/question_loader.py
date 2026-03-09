import os
import re
from game.models import Question

QUESTIONS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "questions")


def list_categories() -> list[str]:
    """Return sorted list of all category names (from catalogs and directories)."""
    categories = set()

    # Catalog files (*.md directly in questions/)
    for entry in os.scandir(QUESTIONS_DIR):
        if entry.is_file() and entry.name.endswith(".md"):
            categories.update(_parse_catalog_categories(entry.path))

    # Directory-based categories
    for entry in os.scandir(QUESTIONS_DIR):
        if entry.is_dir() and not entry.name.startswith("."):
            categories.add(entry.name)

    return sorted(categories)


def load(category: str | None = None) -> list[Question]:
    """Load questions, optionally filtered by category.

    Searches both catalog files (single .md with ### headers) and
    directory-based question files.
    """
    questions = []

    # Catalog files
    for entry in os.scandir(QUESTIONS_DIR):
        if entry.is_file() and entry.name.endswith(".md"):
            questions.extend(_parse_catalog(entry.path, category))

    # Directory-based
    if category:
        cat_dir = os.path.join(QUESTIONS_DIR, category)
        if os.path.isdir(cat_dir):
            questions.extend(_load_from_dir(cat_dir, category))
    else:
        for cat in sorted(e.name for e in os.scandir(QUESTIONS_DIR)
                          if e.is_dir() and not e.name.startswith(".")):
            cat_dir = os.path.join(QUESTIONS_DIR, cat)
            questions.extend(_load_from_dir(cat_dir, cat))

    return questions


def _parse_catalog_categories(filepath: str) -> list[str]:
    """Extract category names (## headers) from a catalog file."""
    categories = []
    with open(filepath, encoding="utf-8") as f:
        for line in f:
            m = re.match(r"^##\s+(?:\d+\.\s+)?(.+)$", line.strip())
            if m:
                categories.append(m.group(1).strip())
    return categories


def _parse_catalog(filepath: str, category: str | None = None) -> list[Question]:
    """Parse a catalog file with ## Category headers and numbered questions."""
    questions = []
    current_cat = None

    with open(filepath, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            # Match ## headers like "## 1. Alltag & Gesellschaft" or "## Alltag"
            hdr = re.match(r"^##\s+(?:\d+\.\s+)?(.+)$", line)
            if hdr:
                current_cat = hdr.group(1).strip()
                continue
            if current_cat is None:
                continue
            # Match numbered questions: "1. Question text?"
            m = re.match(r"^\d+\.\s+(.+\?)$", line)
            if m:
                if category is None or category == current_cat:
                    questions.append(Question(text=m.group(1), category=current_cat))

    return questions


def _load_from_dir(directory: str, category: str) -> list[Question]:
    """Parse all .md files in a directory for questions."""
    questions = []
    for entry in sorted(os.scandir(directory), key=lambda e: e.name):
        if entry.is_file() and entry.name.endswith(".md"):
            questions.extend(_parse_md(entry.path, category))
    return questions


def _parse_md(filepath: str, category: str) -> list[Question]:
    """Extract questions from a markdown file.

    Questions are lines starting with '- ' and ending with '?'.
    """
    questions = []
    with open(filepath, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("- ") and line.endswith("?"):
                text = line[2:].strip()
                questions.append(Question(text=text, category=category))
    return questions
