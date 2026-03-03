const AudioManager = {
    _cache: {},

    play(name) {
        if (!this._cache[name]) {
            this._cache[name] = new Audio(`/static/audio/${name}.mp3`);
        }
        const audio = this._cache[name];
        audio.currentTime = 0;
        audio.play().catch(() => {});
    },

    agreement() { this.play('agreement'); },
    buzzer()    { this.play('buzzer'); },
    alarm()     { this.play('alarm'); },
};
