// 画面遷移、入力、メインループ

const App = {
    game: null,
    stageIndex: 0,
    paused: false,
    seenKinds: [],

    init() {
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new Renderer(this.canvas);
        this.screens = {
            title: document.getElementById('title-screen'),
            howto: document.getElementById('howto-screen'),
            pause: document.getElementById('pause-screen'),
            result: document.getElementById('result-screen')
        };
        this.pauseBtn = document.getElementById('pause-btn');

        this.buildStageList();
        this.bindUi();
        this.bindInput();
        window.addEventListener('resize', () => this.renderer.resize());
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isPlaying()) this.pause();
        });

        this.startDemo();
        this.last = performance.now();
        requestAnimationFrame(t => this.loop(t));
    },

    isPlaying() {
        return this.game && !this.game.demo && !this.game.over;
    },

    show(name) {
        for (const [key, el] of Object.entries(this.screens)) {
            el.classList.toggle('active', key === name);
        }
        this.pauseBtn.classList.toggle('active', name === null);
    },

    buildStageList() {
        const list = document.getElementById('stage-list');
        list.innerHTML = '';
        CK.STAGES.forEach((stage, i) => {
            const best = Store.get(`best:${stage.id}`, null);
            const btn = document.createElement('button');
            btn.className = 'stage-btn';
            btn.innerHTML = `
                <span class="stage-name">${stage.name}</span>
                <span class="stage-sub">${stage.subtitle}</span>
                <span class="stage-best">${best ? `BEST ${best.score}<b class="rank rank-${best.rank}">${best.rank}</b>` : '未プレイ'}</span>`;
            btn.addEventListener('click', () => {
                Sound.unlock();
                this.start(i);
            });
            list.appendChild(btn);
        });
    },

    bindUi() {
        const soundBtn = document.getElementById('sound-btn');
        const updateSound = () => {
            soundBtn.textContent = Sound.muted ? '🔇 サウンド OFF' : '🔊 サウンド ON';
        };
        updateSound();
        soundBtn.addEventListener('click', () => {
            Sound.unlock();
            Sound.setMuted(!Sound.muted);
            updateSound();
        });
        document.getElementById('howto-btn').addEventListener('click', () => this.show('howto'));
        document.getElementById('howto-close').addEventListener('click', () => this.show('title'));
        this.pauseBtn.addEventListener('click', () => this.pause());
        document.getElementById('resume-btn').addEventListener('click', () => this.resume());
        document.getElementById('quit-btn').addEventListener('click', () => this.toTitle());
        document.getElementById('retry-btn').addEventListener('click', () => this.start(this.stageIndex));
        document.getElementById('next-btn').addEventListener('click', () => this.start(this.stageIndex + 1));
        document.getElementById('title-btn').addEventListener('click', () => this.toTitle());
    },

    // 1 本指操作：タップ＝線路側へはじく、スワイプ＝その方向へ飛ばす
    bindInput() {
        let start = null;
        const c = this.canvas;
        c.addEventListener('pointerdown', e => {
            if (!this.isPlaying() || this.paused) return;
            e.preventDefault();
            Sound.unlock();
            const p = this.renderer.toLogical(e.clientX, e.clientY);
            start = { x: p.x, y: p.y, t: performance.now(), id: e.pointerId };
        });
        c.addEventListener('pointerup', e => {
            if (!start || e.pointerId !== start.id) return;
            e.preventDefault();
            const p = this.renderer.toLogical(e.clientX, e.clientY);
            const ms = performance.now() - start.t;
            const len = U.dist(start.x, start.y, p.x, p.y);
            if (len < 14) {
                this.game.tap(start.x, start.y);
            } else {
                this.game.swipe(start.x, start.y, p.x, p.y, ms);
            }
            start = null;
        });
        c.addEventListener('pointercancel', () => { start = null; });
        c.addEventListener('contextmenu', e => e.preventDefault());
    },

    startDemo() {
        this.game = new Game(CK.STAGES[0], { demo: true });
        // タイトル背景をにぎやかにするため少し進めておく
        for (let i = 0; i < 600; i++) this.game.update(1 / 60);
        this.show('title');
    },

    start(index) {
        this.stageIndex = Math.min(index, CK.STAGES.length - 1);
        this.paused = false;
        this.game = new Game(CK.STAGES[this.stageIndex], { seenKinds: this.seenKinds });
        this.resultShown = false;
        this.show(null);
    },

    pause() {
        if (!this.isPlaying()) return;
        this.paused = true;
        this.show('pause');
    },

    resume() {
        this.paused = false;
        this.last = performance.now();
        this.show(null);
    },

    toTitle() {
        this.paused = false;
        this.buildStageList();
        this.startDemo();
    },

    showResult() {
        const g = this.game;
        const r = g.result;
        this.seenKinds = Array.from(g.seenKinds);
        const stage = g.stage;
        const key = `best:${stage.id}`;
        const best = Store.get(key, null);
        let isBest = false;
        if (r.cleared && (!best || r.score > best.score)) {
            Store.set(key, { score: r.score, rank: r.rank });
            isBest = true;
        }
        document.getElementById('result-title').textContent = r.cleared ? '業務終了！' : 'ホーム騒然…';
        document.getElementById('result-title').className = r.cleared ? 'clear' : 'fail';
        document.getElementById('result-stage').textContent = stage.name;
        document.getElementById('result-score').textContent = r.score;
        const rankEl = document.getElementById('result-rank');
        rankEl.textContent = r.rank;
        rankEl.className = `rank big rank-${r.rank}`;
        document.getElementById('result-best').textContent = isBest ? 'ハイスコア更新！' : best ? `ベスト ${best.score}` : '';
        const s = r.stats;
        const rows = [
            ['迷惑客 排除', `${s.ko} 人`],
            ['最大コンボ', `${s.maxCombo}`],
            ['お持ち帰り（列車）', `${s.carried} 人`],
            ['無事に改札へ', `${s.exits} 人`],
            ['逃げられた迷惑客', `${s.escapes} 人`],
            ['誤爆', `${s.misfires} 回`]
        ];
        if (r.cleared) rows.push(['平穏ボーナス', `+${r.orderBonus}`]);
        document.getElementById('result-stats').innerHTML = rows
            .map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('');
        document.getElementById('next-btn').style.display =
            r.cleared && this.stageIndex < CK.STAGES.length - 1 ? '' : 'none';
        this.show('result');
    },

    loop(now) {
        const dt = Math.min(0.033, (now - this.last) / 1000);
        this.last = now;
        if (this.game && !this.paused) {
            this.game.update(dt);
            if (this.game.over && !this.resultShown) {
                this.resultShown = true;
                // 結果画面の前に少しだけ余韻
                setTimeout(() => this.showResult(), 900);
            }
        }
        if (this.game) this.renderer.draw(this.game);
        requestAnimationFrame(t => this.loop(t));
    }
};

window.addEventListener('DOMContentLoaded', () => App.init());
