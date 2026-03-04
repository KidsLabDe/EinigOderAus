const socket = io();

let previousPhase = null;
let categoriesLoaded = false;
let debateUrgentTriggered = false;

// --- Load categories on startup ---
function loadCategories() {
    if (categoriesLoaded) return;
    fetch('/api/categories')
        .then(r => r.json())
        .then(categories => {
            const container = document.getElementById('category-buttons');
            container.innerHTML = '';
            categories.forEach(cat => {
                const btn = document.createElement('button');
                btn.className = 'btn btn-category';
                btn.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
                btn.onclick = () => startGame(cat);
                container.appendChild(btn);
            });
            categoriesLoaded = true;
        });
}

function startGame(category) {
    // Show countdown, then start
    AnimationScenes.gameStart();
    AnimationScenes.countdown(() => {
        socket.emit('start_game', { category: category });
    });
}

function restartGame() {
    socket.emit('restart_game', {});
}

// --- Screen management ---
function showScreen(phase) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById('screen-' + phase);
    if (screen) {
        screen.classList.add('active');
    }
}

// --- Vote indicator helpers ---
function voteIndicator(player, showVotes) {
    if (!player.has_voted) return '⏳';
    if (!showVotes) return '✔';
    return player.vote === 'ja' ? '👍 Ja' : '👎 Nein';
}

function voteClass(player, showVotes) {
    if (!player.has_voted) return '';
    if (!showVotes) return 'voted';
    return player.vote === 'ja' ? 'ja' : 'nein';
}

// --- Handle game state updates ---
socket.on('game_state', (state) => {
    const phase = state.phase;
    const showVotes = state.players.every(p => p.has_voted);

    // Phase transition sounds + animations
    if (previousPhase !== phase) {
        debateUrgentTriggered = false;

        if (phase === 'idle') {
            AnimationScenes.idle();
        } else if (phase === 'voting' && previousPhase === 'idle') {
            AnimationScenes.gameStart();
            setTimeout(() => AnimationScenes.votingEnter(), 600);
        } else if (phase === 'voting' && (previousPhase === 'debate' || previousPhase === 'voting')) {
            AnimationScenes.agreement();
        } else if (phase === 'debate') {
            AnimationScenes.disagreement();
        } else if (phase === 'game_over') {
            AnimationScenes.gameOver();
        } else if (phase === 'score_screen') {
            AnimationScenes.scoreScreen(state.score, state.total_questions);
        }

        // Voting enter for subsequent questions (not first)
        if (phase === 'voting' && previousPhase === 'voting') {
            setTimeout(() => AnimationScenes.votingEnter(), 800);
        }

        if (phase === 'debate') {
            AudioManager.buzzer();
        } else if (phase === 'game_over') {
            AudioManager.alarm();
        } else if (phase === 'voting' && previousPhase === 'debate') {
            AudioManager.agreement();
        } else if (phase === 'voting' && previousPhase === 'voting' && state.score > 0) {
            AudioManager.agreement();
        }

        // Flash effect on agreement during voting transition
        if (phase === 'voting' && previousPhase !== null && previousPhase !== 'idle') {
            const screen = document.getElementById('screen-voting');
            screen.classList.add('flash-agree');
            setTimeout(() => screen.classList.remove('flash-agree'), 600);
        }

        if (phase === 'debate' && previousPhase === 'voting') {
            const screen = document.getElementById('screen-debate');
            screen.classList.add('flash-disagree');
            setTimeout(() => screen.classList.remove('flash-disagree'), 600);
        }
    }

    // Load categories when idle
    if (phase === 'idle') {
        loadCategories();
    }

    showScreen(phase);

    // Update voting screen
    if (phase === 'voting') {
        document.getElementById('question-text').textContent = state.question || '';
        document.getElementById('question-number').textContent =
            `Frage ${state.question_number}/${state.total_questions}`;
        document.getElementById('score-display').textContent = `Punkte: ${state.score}`;
        document.getElementById('timer-label').textContent = `${state.timer_remaining}s`;

        const pct = state.timer_total > 0
            ? (state.timer_remaining / state.timer_total) * 100
            : 0;
        document.getElementById('timer-bar').style.width = pct + '%';

        const p1 = state.players[0];
        const p2 = state.players[1];
        const ind1 = document.getElementById('p1-indicator');
        const ind2 = document.getElementById('p2-indicator');
        ind1.textContent = voteIndicator(p1, showVotes);
        ind2.textContent = voteIndicator(p2, showVotes);
        ind1.className = 'vote-indicator ' + voteClass(p1, showVotes);
        ind2.className = 'vote-indicator ' + voteClass(p2, showVotes);
    }

    // Update debate screen
    if (phase === 'debate') {
        document.getElementById('debate-question-text').textContent = state.question || '';
        document.getElementById('debate-question-number').textContent =
            `Frage ${state.question_number}/${state.total_questions}`;
        document.getElementById('debate-score-display').textContent = `Punkte: ${state.score}`;

        const timerEl = document.getElementById('debate-timer');
        timerEl.textContent = state.timer_remaining;
        timerEl.classList.toggle('urgent', state.timer_remaining <= 10);

        if (state.timer_remaining <= 10 && !debateUrgentTriggered) {
            debateUrgentTriggered = true;
            AnimationScenes.debateUrgent();
        }

        const p1 = state.players[0];
        const p2 = state.players[1];
        const ind1 = document.getElementById('debate-p1-indicator');
        const ind2 = document.getElementById('debate-p2-indicator');
        ind1.textContent = voteIndicator(p1, showVotes);
        ind2.textContent = voteIndicator(p2, showVotes);
        ind1.className = 'vote-indicator ' + voteClass(p1, showVotes);
        ind2.className = 'vote-indicator ' + voteClass(p2, showVotes);
    }

    // Update game over screen
    if (phase === 'game_over') {
        document.getElementById('gameover-score').textContent = state.score;
    }

    // Update score screen
    if (phase === 'score_screen') {
        document.getElementById('final-score').textContent = state.score;
        const total = state.total_questions;
        const msg = state.score === total
            ? 'Perfekt! Ihr seid euch in allem einig!'
            : `${state.score} von ${total} Fragen einig — nicht schlecht!`;
        document.getElementById('score-message').textContent = msg;
    }

    previousPhase = phase;
});

// Load categories on first connect
loadCategories();

// Initialize animation engine
CutoutAnimator.init();
AnimationScenes.preload();
