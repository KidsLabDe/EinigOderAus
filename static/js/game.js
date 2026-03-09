const socket = io();

let previousPhase = null;
let categoriesLoaded = false;
let debateUrgentTriggered = false;
let tickStarted = false;

// Key order for category mapping: P1-Ja, P1-Nein, P2-Ja, P2-Nein
let keyOrder = ['1', '2', '8', '9'];
// Map: key -> action ({type:'category', value:...} or {type:'nav', value:'next'/'back'})
let keyCategoryMap = {};
let allCategories = [];
let categoryPage = 0;
const CATS_PER_PAGE = 3;

// Load key config
fetch('/api/config')
    .then(r => r.json())
    .then(cfg => {
        const k = cfg.keys;
        keyOrder = [k.player1_ja, k.player1_nein, k.player2_ja, k.player2_nein];
    })
    .catch(() => {});

// --- Load categories and build paginated key mapping ---
function loadCategories() {
    fetch('/api/categories')
        .then(r => r.json())
        .then(categories => {
            allCategories = categories;
            categoryPage = 0;
            buildCategoryPage();
            categoriesLoaded = true;
        });
}

function buildCategoryPage() {
    const grid = document.getElementById('category-grid');
    grid.innerHTML = '';
    keyCategoryMap = {};

    const slots = keyOrder.slice(0, 4);
    const totalPages = Math.ceil(allCategories.length / CATS_PER_PAGE);
    const isLastPage = categoryPage >= totalPages - 1;
    const startIdx = categoryPage * CATS_PER_PAGE;
    const pageCats = allCategories.slice(startIdx, startIdx + CATS_PER_PAGE);

    const items = [];

    // Slots 0-2 (keys 1, 2, 8): categories for this page
    for (let i = 0; i < CATS_PER_PAGE; i++) {
        if (i < pageCats.length) {
            items.push({ key: slots[i], label: pageCats[i], action: { type: 'category', value: pageCats[i] } });
        }
    }

    // Fill remaining slots with "Alle" and navigation
    if (isLastPage && totalPages > 1) {
        // Last page of multi-page: "Alle" on next free slot, "Zurück" on key 9
        const alleSlot = slots[pageCats.length < CATS_PER_PAGE ? pageCats.length : 2];
        // If page is full, replace last category slot with Alle
        if (pageCats.length >= CATS_PER_PAGE) items.pop();
        items.push({ key: alleSlot, label: 'Alle Kategorien', action: { type: 'category', value: null } });
        items.push({ key: slots[3], label: '\u25C0 Zurück', action: { type: 'nav', value: 'back' } });
    } else if (isLastPage) {
        // Single page: just "Alle" on key 9
        items.push({ key: slots[3], label: 'Alle Kategorien', action: { type: 'category', value: null } });
    } else {
        // Not last page: "Weiter" on key 9
        items.push({ key: slots[3], label: 'Weiter \u25B6', action: { type: 'nav', value: 'next' } });
    }

    // Build key map
    items.forEach(item => {
        keyCategoryMap[item.key] = item.action;
    });

    // Render grid
    items.forEach(item => {
        const el = document.createElement('div');
        el.className = 'category-option';
        if (item.action.type === 'nav') el.className += ' nav-option';
        el.innerHTML = `<span class="category-key">${item.key}</span><span class="category-label">${item.label}</span>`;
        grid.appendChild(el);
    });

    // Page indicator
    if (totalPages > 1) {
        const indicator = document.createElement('div');
        indicator.className = 'page-indicator';
        indicator.textContent = `Seite ${categoryPage + 1}/${totalPages}`;
        grid.appendChild(indicator);
    }
}

function startGame(category) {
    AudioManager.start();
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
    if (!player.has_voted) return '\u23F3';
    if (!showVotes) return '\u2714';
    return player.vote === 'ja' ? '\uD83D\uDC4D Ja' : '\uD83D\uDC4E Nein';
}

function voteClass(player, showVotes) {
    if (!player.has_voted) return '';
    if (!showVotes) return 'voted';
    return player.vote === 'ja' ? 'ja' : 'nein';
}

// --- Tutorial animation on idle screen ---
function startTutorial() {
    const steps = document.querySelectorAll('.tutorial-step');
    let current = 0;

    function showStep() {
        steps.forEach((s, i) => {
            s.classList.toggle('visible', i === current);
        });
        current = (current + 1) % steps.length;
    }

    showStep();
    setInterval(showStep, 4000);
}

// --- Menu action from server (button press on idle) ---
socket.on('menu_action', (data) => {
    if (data.action === 'select' && data.key) {
        const action = keyCategoryMap[data.key];
        if (!action) return;

        if (action.type === 'nav') {
            if (action.value === 'next') {
                categoryPage++;
            } else {
                categoryPage = 0;
            }
            buildCategoryPage();
        } else if (action.type === 'category') {
            const options = document.querySelectorAll('.category-option');
            options.forEach(opt => {
                const keyLabel = opt.querySelector('.category-key');
                if (keyLabel && keyLabel.textContent === data.key) {
                    opt.classList.add('selected');
                }
            });
            startGame(action.value);
        }
    }
});

// --- Handle game state updates ---
socket.on('game_state', (state) => {
    const phase = state.phase;
    const showVotes = state.players.every(p => p.has_voted);

    // Phase transition sounds + animations
    if (previousPhase !== phase) {
        debateUrgentTriggered = false;
        tickStarted = false;
        AudioManager.stop('tick');

        if (phase === 'idle') {
            AnimationScenes.idle();
        } else if (phase === 'transition') {
            if (state.transition_reason === 'agreement') {
                // After agreement: thumbs-up first, then machine
                AnimationScenes.agreement();
                AudioManager.agreement();
                setTimeout(() => {
                    AnimationScenes.transition(state.timer_total);
                    AudioManager.transition();
                }, 1800);
            } else {
                // First question or timeout: machine directly
                AnimationScenes.transition(state.timer_total);
                AudioManager.transition();
            }
        } else if (phase === 'voting') {
            CutoutAnimator.clearAll();
            setTimeout(() => AnimationScenes.votingEnter(), 200);
            AudioManager.voting();
        } else if (phase === 'debate') {
            AnimationScenes.disagreement();
            AudioManager.buzzer();
        } else if (phase === 'game_over') {
            AnimationScenes.gameOver();
            AudioManager.alarm();
            // Stomp sound when foot drops (2s delay matches animation)
            setTimeout(() => AudioManager.stomp(), 2000);
        } else if (phase === 'score_screen') {
            AnimationScenes.scoreScreen(state.score, state.total_questions);
            AudioManager.score();
        }

        // Flash effects
        if (phase === 'voting' && previousPhase === 'transition' && state.transition_reason === 'agreement') {
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

    // Tick sound: 6s long, start once at 6 seconds remaining
    if ((phase === 'voting' || phase === 'debate') && state.timer_remaining === 6 && !tickStarted) {
        tickStarted = true;
        AudioManager.tick();
    }

    // Load categories when idle
    if (phase === 'idle') {
        loadCategories();
        document.querySelectorAll('.category-option.selected').forEach(
            el => el.classList.remove('selected')
        );
    }

    showScreen(phase);

    // Update transition screen
    if (phase === 'transition') {
        document.getElementById('transition-question-number').textContent =
            `Frage ${state.question_number}/${state.total_questions}`;
        document.getElementById('transition-score-display').textContent =
            state.score > 0 ? `Punkte: ${state.score}` : '';
    }

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
        const agreements = state.agreements;
        const msg = agreements === total
            ? 'Perfekt! Ihr seid euch in allem einig!'
            : `${agreements} von ${total} Fragen einig \u2014 ${state.score} Punkte!`;
        document.getElementById('score-message').textContent = msg;
    }

    previousPhase = phase;
});

// Load categories on first connect
loadCategories();

// Initialize animation engine
CutoutAnimator.init();
AnimationScenes.preload();

// Start tutorial animation
startTutorial();
