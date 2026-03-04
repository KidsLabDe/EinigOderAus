import random
import threading
from typing import Callable

import config
from game.models import GamePhase, GameSession, Vote
from game.question_loader import load


class GameStateMachine:
    """Core game logic — no Flask/SocketIO imports.

    Communicates state changes via the on_state_change callback.
    """

    def __init__(self, on_state_change: Callable[[], None] | None = None):
        self.session = GameSession()
        self.on_state_change = on_state_change
        self._timer: threading.Timer | None = None
        self._timer_lock = threading.Lock()
        self._tick_interval = 1.0

    def start_game(self, category: str | None = None):
        """Load questions and begin the first voting round."""
        self._cancel_timer()
        questions = load(category)
        if not questions:
            return
        random.shuffle(questions)
        self.session = GameSession(questions=questions)
        self._enter_voting()

    def register_vote(self, player_id: int, vote: Vote):
        """Register a player's vote. Evaluate when both have voted."""
        if self.session.phase not in (GamePhase.VOTING, GamePhase.DEBATE):
            return

        player = self._get_player(player_id)
        if player is None:
            return

        # During voting phase, only allow one vote per player
        if self.session.phase == GamePhase.VOTING and player.vote is not None:
            return

        player.vote = vote
        self._broadcast()

        if self.session.both_voted():
            self._evaluate_votes()

    def restart_game(self):
        """Reset to idle state."""
        self._cancel_timer()
        self.session = GameSession()
        self._broadcast()

    def get_state(self) -> dict:
        """Serialize current state for broadcasting.

        Hides individual vote values until both players have voted.
        """
        session = self.session
        both_voted = session.both_voted()

        players = []
        for p in session.players:
            player_data = {
                "id": p.id,
                "name": p.name,
                "has_voted": p.vote is not None,
            }
            if both_voted:
                player_data["vote"] = p.vote.value if p.vote else None
            players.append(player_data)

        question_text = None
        question_number = 0
        total_questions = len(session.questions)
        if session.current_question is not None:
            question_text = session.current_question.text
            question_number = session.current_question_index + 1

        return {
            "phase": session.phase.value,
            "score": session.score,
            "question": question_text,
            "question_number": question_number,
            "total_questions": total_questions,
            "players": players,
            "timer_remaining": round(session.timer_remaining),
            "timer_total": self._current_timer_total(),
        }

    # --- Internal methods ---

    def _get_player(self, player_id: int):
        for p in self.session.players:
            if p.id == player_id:
                return p
        return None

    def _enter_voting(self):
        """Start voting phase with countdown."""
        self.session.phase = GamePhase.VOTING
        self.session.reset_votes()
        self.session.timer_remaining = config.VOTING_TIME
        self._broadcast()
        self._start_countdown(config.VOTING_TIME, self._on_voting_timeout)

    def _enter_debate(self):
        """Start debate phase with 120s countdown."""
        self.session.phase = GamePhase.DEBATE
        self.session.reset_votes()
        self.session.timer_remaining = config.DEBATE_TIME
        self._broadcast()
        self._start_countdown(config.DEBATE_TIME, self._on_debate_timeout)

    def _evaluate_votes(self):
        """Check if votes match and transition accordingly."""
        if self.session.votes_match():
            self._on_agreement()
        else:
            self._on_disagreement()

    def _on_agreement(self):
        """Votes match — score point and advance."""
        self.session.score += 1
        if self.session.has_more_questions():
            self.session.next_question()
            if self.session.phase == GamePhase.DEBATE:
                self._cancel_timer()
            self._enter_voting()
        else:
            self._enter_score_screen()

    def _on_disagreement(self):
        """Votes don't match."""
        if self.session.phase == GamePhase.VOTING:
            # First disagreement — enter debate
            self._cancel_timer()
            self._enter_debate()
        elif self.session.phase == GamePhase.DEBATE:
            # Still disagree during debate — reset votes, timer keeps running
            self.session.reset_votes()
            self._broadcast()

    def _on_voting_timeout(self):
        """Voting time expired — skip to next question or end."""
        if self.session.phase != GamePhase.VOTING:
            return
        if self.session.has_more_questions():
            self.session.next_question()
            self._enter_voting()
        else:
            self._enter_score_screen()

    def _on_debate_timeout(self):
        """Debate time expired — game over."""
        if self.session.phase != GamePhase.DEBATE:
            return
        self.session.phase = GamePhase.GAME_OVER
        self.session.timer_remaining = 0
        self._broadcast()

    def _enter_score_screen(self):
        """All questions done — show final score."""
        self._cancel_timer()
        self.session.phase = GamePhase.SCORE_SCREEN
        self.session.timer_remaining = 0
        self._broadcast()

    def _current_timer_total(self) -> int:
        if self.session.phase == GamePhase.VOTING:
            return config.VOTING_TIME
        elif self.session.phase == GamePhase.DEBATE:
            return config.DEBATE_TIME
        return 0

    # --- Timer management ---

    def _start_countdown(self, seconds: float, on_expire: Callable):
        """Start a ticking countdown that broadcasts every second."""
        self._cancel_timer()
        self.session.timer_remaining = seconds
        self._countdown_target = on_expire
        # Wait one second before first tick (so timer shows full value first)
        self._timer = threading.Timer(self._tick_interval, self._tick)
        self._timer.daemon = True
        self._timer.start()

    def _tick(self):
        """Decrement timer and schedule next tick or fire expiry."""
        with self._timer_lock:
            self.session.timer_remaining -= self._tick_interval
            if self.session.timer_remaining <= 0:
                self.session.timer_remaining = 0
                self._broadcast()
                self._countdown_target()
                return
            self._broadcast()
            self._timer = threading.Timer(self._tick_interval, self._tick)
            self._timer.daemon = True
            self._timer.start()

    def _cancel_timer(self):
        with self._timer_lock:
            if self._timer is not None:
                self._timer.cancel()
                self._timer = None

    def _broadcast(self):
        if self.on_state_change:
            self.on_state_change()
