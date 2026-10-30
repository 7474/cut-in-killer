// WebAudio による簡易効果音（音声ファイルは使わない）

const Sound = {
    ctx: null,
    muted: Store.get('muted', false),
    lastPlayed: {},

    // ユーザー操作の中で呼ぶ（モバイルの自動再生制限対策）
    unlock() {
        if (this.ctx) {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            return;
        }
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.35;
        this.master.connect(this.ctx.destination);
    },

    setMuted(m) {
        this.muted = m;
        Store.set('muted', m);
    },

    // 同じ音の連打を抑える
    throttle(name, interval) {
        const now = performance.now();
        if (this.lastPlayed[name] && now - this.lastPlayed[name] < interval) return false;
        this.lastPlayed[name] = now;
        return true;
    },

    ready() {
        return this.ctx && !this.muted;
    },

    tone(freq, dur, type = 'sine', vol = 0.5, slideTo = null, delay = 0) {
        const t = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(g).connect(this.master);
        osc.start(t);
        osc.stop(t + dur + 0.02);
    },

    noise(dur, vol = 0.5, filterFreq = 1200) {
        const t = this.ctx.currentTime;
        const len = Math.floor(this.ctx.sampleRate * dur);
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = filterFreq;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        src.connect(f).connect(g).connect(this.master);
        src.start(t);
    },

    play(name) {
        if (!this.ready()) return;
        switch (name) {
            case 'hit':
                this.noise(0.18, 0.9, 2500);
                this.tone(160, 0.18, 'square', 0.35, 50);
                break;
            case 'chain':
                this.tone(520, 0.12, 'square', 0.25, 900);
                break;
            case 'misfire':
                this.tone(140, 0.35, 'sawtooth', 0.35, 90);
                break;
            case 'splat':
                this.noise(0.3, 0.8, 700);
                break;
            case 'swish':
                if (!this.throttle(name, 60)) return;
                this.noise(0.12, 0.25, 4000);
                break;
            case 'exit':
                if (!this.throttle(name, 140)) return;
                this.tone(1320, 0.08, 'sine', 0.08);
                break;
            case 'cutin':
                if (!this.throttle(name, 250)) return;
                this.tone(880, 0.09, 'square', 0.18);
                this.tone(660, 0.12, 'square', 0.18, null, 0.1);
                break;
            case 'bump':
                if (!this.throttle(name, 200)) return;
                this.tone(220, 0.1, 'triangle', 0.3, 120);
                break;
            case 'chime':
                // 発車メロディ風の短いフレーズ
                [659, 784, 988, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.12, null, i * 0.16));
                break;
            case 'warning':
                if (!this.throttle(name, 400)) return;
                this.tone(1000, 0.15, 'square', 0.12);
                break;
            case 'horn':
                this.tone(440, 0.6, 'sawtooth', 0.12);
                this.tone(554, 0.6, 'sawtooth', 0.1);
                break;
            case 'start':
                [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.15, 'square', 0.12, null, i * 0.09));
                break;
            case 'clear':
                [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.18, null, i * 0.12));
                break;
            case 'fail':
                [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.3, 'sawtooth', 0.12, null, i * 0.18));
                break;
        }
    }
};
