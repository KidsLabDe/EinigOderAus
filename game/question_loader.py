import os
from game.models import Question

QUESTIONS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "questions")


def list_categories() -> list[str]:
    """Return sorted list of category directory names."""
    categories = []
    for entry in os.scandir(QUESTIONS_DIR):
        if entry.is_dir() and not entry.name.startswith("."):
            categories.append(entry.name)
    return sorted(categories)


def load(category: str | None = None) -> list[Question]:
    """Load questions from markdown files.

    If category is given, load only from that subdirectory.
    Otherwise load from all categories.
    """
    questions = []
    if category:
        cat_dir = os.path.join(QUESTIONS_DIR, category)
        if os.path.isdir(cat_dir):
            questions.extend(_load_from_dir(cat_dir, category))
    else:
        for cat in list_categories():
            cat_dir = os.path.join(QUESTIONS_DIR, cat)
            questions.extend(_load_from_dir(cat_dir, cat))
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
