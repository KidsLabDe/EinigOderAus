from dataclasses import dataclass, field
from enum import Enum


class GamePhase(Enum):
    IDLE = "idle"
    TRANSITION = "transition"
    VOTING = "voting"
    EVALUATING = "evaluating"
    DEBATE = "debate"
    GAME_OVER = "game_over"
    SCORE_SCREEN = "score_screen"


class Vote(Enum):
    JA = "ja"
    NEIN = "nein"


class GameMode(Enum):
    TWO_PLAYERS = "two_players"
    TWO_TEAMS = "two_teams"
    MODERATED = "moderated"


@dataclass
class Player:
    id: int
    name: str
    vote: Vote | None = None

    def reset_vote(self):
        self.vote = None


@dataclass
class Question:
    text: str
    category: str


@dataclass
class GameSession:
    mode: GameMode = GameMode.TWO_PLAYERS
    phase: GamePhase = GamePhase.IDLE
    score: int = 0
    agreements: int = 0
    current_question_index: int = 0
    questions: list[Question] = field(default_factory=list)
    players: list[Player] = field(default_factory=lambda: [
        Player(id=1, name="Spieler 1"),
        Player(id=2, name="Spieler 2"),
    ])
    timer_remaining: float = 0

    @property
    def current_question(self) -> Question | None:
        if 0 <= self.current_question_index < len(self.questions):
            return self.questions[self.current_question_index]
        return None

    def reset_votes(self):
        for player in self.players:
            player.reset_vote()

    def both_voted(self) -> bool:
        return all(p.vote is not None for p in self.players)

    def votes_match(self) -> bool:
        return self.players[0].vote == self.players[1].vote

    def has_more_questions(self) -> bool:
        return self.current_question_index < len(self.questions) - 1

    def next_question(self):
        self.current_question_index += 1
        self.reset_votes()
