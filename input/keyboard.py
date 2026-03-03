from game.models import Vote
from input.base import InputHandler

KEY_MAP: dict[str, tuple[int, Vote]] = {
    "1": (1, Vote.JA),
    "2": (1, Vote.NEIN),
    "9": (2, Vote.JA),
    "0": (2, Vote.NEIN),
}


class KeyboardInputHandler(InputHandler):
    def parse(self, raw_input: str) -> tuple[int, Vote] | None:
        return KEY_MAP.get(raw_input)
