from abc import ABC, abstractmethod
from game.models import Vote


class InputHandler(ABC):
    """Abstract input handler — maps raw input to (player_id, vote)."""

    @abstractmethod
    def parse(self, raw_input: str) -> tuple[int, Vote] | None:
        """Parse raw input and return (player_id, vote) or None if invalid."""
        ...
