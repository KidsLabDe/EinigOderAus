// Key config loaded from backend
let validKeys = ['1', '2', '8', '9'];
let resetCombos = [['1', '2'], ['8', '9']]; // P1 or P2 both keys = reset

// Load key config from server
fetch('/api/config')
    .then(r => r.json())
    .then(cfg => {
        const k = cfg.keys;
        validKeys = [k.player1_ja, k.player1_nein, k.player2_ja, k.player2_nein];
        resetCombos = [
            [k.player1_ja, k.player1_nein],
            [k.player2_ja, k.player2_nein],
        ];
    })
    .catch(() => {}); // fallback to defaults

// Track currently held keys and pending keypress
const heldKeys = new Set();
let pendingKey = null;
let pendingTimeout = null;
const COMBO_WINDOW = 150; // ms to wait for second key

function checkResetCombo() {
    return resetCombos.some(combo => combo.every(k => heldKeys.has(k)));
}

function sendKey(key) {
    if (typeof socket !== 'undefined') {
        socket.emit('keypress', { key: key });
    }
}

function sendReset() {
    if (typeof socket !== 'undefined') {
        socket.emit('restart_game', {});
    }
}

document.addEventListener('keydown', (e) => {
    const key = e.key;
    if (!validKeys.includes(key)) return;
    if (heldKeys.has(key)) return; // ignore key repeat

    heldKeys.add(key);

    // Check if reset combo is complete
    if (checkResetCombo()) {
        // Cancel any pending single keypress
        if (pendingTimeout) {
            clearTimeout(pendingTimeout);
            pendingTimeout = null;
            pendingKey = null;
        }
        sendReset();
        return;
    }

    // Delay sending single keypress to allow combo detection
    if (pendingTimeout) {
        clearTimeout(pendingTimeout);
    }
    pendingKey = key;
    pendingTimeout = setTimeout(() => {
        // No combo detected — send the key
        if (pendingKey) {
            sendKey(pendingKey);
            pendingKey = null;
        }
        pendingTimeout = null;
    }, COMBO_WINDOW);
});

document.addEventListener('keyup', (e) => {
    heldKeys.delete(e.key);
});
