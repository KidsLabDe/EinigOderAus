from flask_socketio import SocketIO
from game.state_machine import GameStateMachine
from input.keyboard import KeyboardInputHandler

socketio: SocketIO | None = None
game_machine: GameStateMachine | None = None
input_handler = KeyboardInputHandler()


def init_socket_events(sio: SocketIO, machine: GameStateMachine):
    global socketio, game_machine
    socketio = sio
    game_machine = machine

    @sio.on("connect")
    def on_connect():
        sio.emit("game_state", machine.get_state())

    @sio.on("keypress")
    def on_keypress(data):
        key = data.get("key", "")
        result = input_handler.parse(key)
        if result is not None:
            player_id, vote = result
            machine.register_vote(player_id, vote)

    @sio.on("start_game")
    def on_start_game(data):
        category = data.get("category")
        machine.start_game(category)

    @sio.on("restart_game")
    def on_restart_game(_data=None):
        machine.restart_game()


def broadcast_state():
    """Called by the state machine on_state_change callback."""
    if socketio is not None and game_machine is not None:
        socketio.emit("game_state", game_machine.get_state())
