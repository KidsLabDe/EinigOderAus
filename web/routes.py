from flask import Blueprint, render_template, jsonify
from game.question_loader import list_categories

bp = Blueprint("main", __name__)

# Game state machine is set after app creation
game_machine = None


def init_routes(machine):
    global game_machine
    game_machine = machine


@bp.route("/")
def game():
    return render_template("game.html")


@bp.route("/admin")
def admin():
    return render_template("admin.html")


@bp.route("/api/categories")
def api_categories():
    return jsonify(list_categories())


@bp.route("/api/state")
def api_state():
    if game_machine is None:
        return jsonify({"error": "Game not initialized"}), 500
    return jsonify(game_machine.get_state())
