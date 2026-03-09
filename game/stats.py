"""Simple JSON-based statistics tracking."""

import json
import os
import threading
from datetime import datetime

STATS_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "stats.json")

_lock = threading.Lock()


def _ensure_dir():
    os.makedirs(os.path.dirname(STATS_PATH), exist_ok=True)


def _default_stats() -> dict:
    return {
        "games_played": 0,
        "games_completed": 0,
        "games_over": 0,
        "total_questions_asked": 0,
        "total_agreements": 0,
        "total_disagreements": 0,
        "total_timeouts": 0,
        "question_stats": {},
        "sessions": [],
    }


def load() -> dict:
    _ensure_dir()
    if not os.path.exists(STATS_PATH):
        return _default_stats()
    with open(STATS_PATH, encoding="utf-8") as f:
        return json.load(f)


def save(stats: dict):
    _ensure_dir()
    with open(STATS_PATH, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)
        f.write("\n")


def record_game_start():
    with _lock:
        stats = load()
        stats["games_played"] += 1
        save(stats)


def record_agreement(question_text: str):
    with _lock:
        stats = load()
        stats["total_agreements"] += 1
        q = stats["question_stats"].setdefault(question_text, {"asked": 0, "agreed": 0, "disagreed": 0, "timed_out": 0})
        q["agreed"] += 1
        save(stats)


def record_disagreement(question_text: str):
    with _lock:
        stats = load()
        stats["total_disagreements"] += 1
        q = stats["question_stats"].setdefault(question_text, {"asked": 0, "agreed": 0, "disagreed": 0, "timed_out": 0})
        q["disagreed"] += 1
        save(stats)


def record_question_asked(question_text: str):
    with _lock:
        stats = load()
        stats["total_questions_asked"] += 1
        q = stats["question_stats"].setdefault(question_text, {"asked": 0, "agreed": 0, "disagreed": 0, "timed_out": 0})
        q["asked"] += 1
        save(stats)


def record_timeout(question_text: str):
    with _lock:
        stats = load()
        stats["total_timeouts"] += 1
        q = stats["question_stats"].setdefault(question_text, {"asked": 0, "agreed": 0, "disagreed": 0, "timed_out": 0})
        q["timed_out"] += 1
        save(stats)


def record_game_end(score: int, total: int, category: str | None, completed: bool):
    with _lock:
        stats = load()
        if completed:
            stats["games_completed"] += 1
        else:
            stats["games_over"] += 1
        stats["sessions"].append({
            "timestamp": datetime.now().isoformat(),
            "score": score,
            "total": total,
            "category": category or "alle",
            "completed": completed,
        })
        # Keep only last 200 sessions
        stats["sessions"] = stats["sessions"][-200:]
        save(stats)


def reset():
    with _lock:
        save(_default_stats())


def summary() -> dict:
    """Return a condensed summary for the admin UI."""
    stats = load()
    total_votes = stats["total_agreements"] + stats["total_disagreements"]
    agreement_rate = (stats["total_agreements"] / total_votes * 100) if total_votes > 0 else 0

    # Top 5 most controversial questions (lowest agreement rate)
    controversial = []
    for text, q in stats["question_stats"].items():
        if q["asked"] >= 2:
            total = q["agreed"] + q["disagreed"]
            rate = (q["agreed"] / total * 100) if total > 0 else 50
            controversial.append({"text": text, "rate": round(rate), "asked": q["asked"]})
    controversial.sort(key=lambda x: x["rate"])

    # Recent sessions
    recent = list(reversed(stats["sessions"][-10:]))

    return {
        "games_played": stats["games_played"],
        "games_completed": stats["games_completed"],
        "games_over": stats["games_over"],
        "total_questions_asked": stats["total_questions_asked"],
        "agreement_rate": round(agreement_rate, 1),
        "total_agreements": stats["total_agreements"],
        "total_disagreements": stats["total_disagreements"],
        "total_timeouts": stats["total_timeouts"],
        "controversial_questions": controversial[:5],
        "recent_sessions": recent,
    }
