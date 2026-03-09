import config
from game.models import Vote
from input.base import InputHandler

VOTE_MAP = {"ja": Vote.JA, "nein": Vote.NEIN}


class KeyboardInputHandler(InputHandler):
    def parse(self, raw_input: str) -> tuple[int, Vote] | None:
        mapping = config.key_map()
        result = mapping.get(raw_input)
        if result is None:
            return None
        player_id, vote_str = result
        return player_id, VOTE_MAP[vote_str]

    def valid_keys(self) -> list[str]:
        """Return list of all configured key strings."""
        return list(config.key_map().keys())
