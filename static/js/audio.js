const AudioManager = {
    _cache: {},
    _unlocked: false,

    /** Unlock audio context on first user interaction (browser autoplay policy) */
    unlock() {
        if (this._unlocked) return;
        this._unlocked = true;
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
        Object.values(this._cache).forEach(a => a.load());
    },

    /** Preload all sound files */
    preload() {
        ['agreement', 'buzzer', 'alarm', 'score', 'transition',
         'voting', 'tick', 'stomp', 'start'].forEach(name => {
            this._cache[name] = new Audio(`/static/audio/${name}.mp3`);
        });
    },

    play(name) {
        if (!this._cache[name]) {
            this._cache[name] = new Audio(`/static/audio/${name}.mp3`);
        }
        const audio = this._cache[name];
        audio.currentTime = 0;
        audio.play().catch(() => {});
    },

    stop(name) {
        if (this._cache[name]) {
            this._cache[name].pause();
            this._cache[name].currentTime = 0;
        }
    },

    agreement()  { this.play('agreement'); },
    buzzer()     { this.play('buzzer'); },
    alarm()      { this.play('alarm'); },
    score()      { this.play('score'); },
    transition() { this.play('transition'); },
    voting()     { this.play('voting'); },
    tick()       { this.play('tick'); },
    stomp()      { this.play('stomp'); },
    start()      { this.play('start'); },
};

// Preload sounds immediately
AudioManager.preload();

// Unlock audio on first user interaction
['keydown', 'mousedown', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, () => AudioManager.unlock(), { once: true });
});
