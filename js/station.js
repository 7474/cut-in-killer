// 駅の設備：列車とエスカレーター

// 列車は画面上から下へ進入し、ホーム全体を覆う位置で停車する。
// offset は停車位置からのずれ（負＝まだ上、正＝走り去った後）。
class Train {
    constructor(track, index) {
        this.track = track;
        this.index = index;
        this.state = 'away';
        this.timer = track.first;
        this.offset = Train.FAR_TOP;
        this.kind = 'stop';
        this.patternIndex = 0;
        this.doorOpen = 0;       // 0..1 ドアの開き具合（描画用）
        this.alightQueues = [];  // ドアごとの残り降車人数
        this.alightTimers = [];
        this.speed = 0;          // 現在の移動速度 (px/s) 張り付いたモブの移動に使う
        this.color = index % 2 === 0 ? '#2a9d8f' : '#e9c46a';
    }

    static get FAR_TOP() { return -760; }
    static get FAR_BOTTOM() { return 760; }
    static get LENGTH() { return 720; }

    // 列車の車体が y を覆っているか
    covers(y) {
        if (this.state === 'away' || this.state === 'warning') return false;
        return y >= this.offset - 20 && y <= this.offset + Train.LENGTH - 20;
    }

    get moving() {
        return this.state === 'arriving' || this.state === 'departing' || this.state === 'passing';
    }

    get doorsOpen() {
        return this.state === 'alighting' || this.state === 'boarding';
    }

    setState(state, timer) {
        this.state = state;
        this.timer = timer;
    }

    update(dt, game) {
        const prevOffset = this.offset;
        this.timer -= dt;
        switch (this.state) {
            case 'away':
                this.offset = Train.FAR_TOP;
                if (this.timer <= 0) {
                    const pattern = this.track.pattern;
                    this.kind = pattern[this.patternIndex % pattern.length];
                    this.patternIndex++;
                    this.cycleStart = game.time;
                    if (this.kind === 'express') {
                        this.setState('warning', 2.2);
                        game.onExpressWarning(this);
                    } else {
                        this.setState('arriving', 2.4);
                    }
                }
                break;
            case 'warning':
                if (Math.floor(this.timer * 4) !== Math.floor((this.timer + dt) * 4)) Sound.play('warning');
                if (this.timer <= 0) {
                    this.setState('passing', 1.3);
                    Sound.play('horn');
                }
                break;
            case 'passing': {
                const t = 1 - this.timer / 1.3;
                this.offset = U.lerp(Train.FAR_TOP, Train.FAR_BOTTOM, U.clamp(t, 0, 1));
                if (this.timer <= 0) this.toAway(game);
                break;
            }
            case 'arriving': {
                const t = 1 - this.timer / 2.4;
                this.offset = U.lerp(Train.FAR_TOP, 0, U.easeOutCubic(U.clamp(t, 0, 1)));
                if (this.timer <= 0) {
                    this.offset = 0;
                    this.setState('stopped', 0.5);
                }
                break;
            }
            case 'stopped':
                if (this.timer <= 0) {
                    this.setState('alighting', 99);
                    const [min, max] = game.stage.alightPerDoor;
                    const boost = game.ramp * 1.5;
                    this.alightQueues = game.stage.doors.map(() => U.randInt(min, Math.round(max + boost)));
                    this.alightTimers = game.stage.doors.map(() => U.rand(0.05, 0.4));
                    this.alightDone = 0;
                }
                break;
            case 'alighting': {
                let remaining = 0;
                game.stage.doors.forEach((doorY, i) => {
                    if (this.alightQueues[i] <= 0) return;
                    remaining += this.alightQueues[i];
                    this.alightTimers[i] -= dt;
                    if (this.alightTimers[i] <= 0) {
                        if (game.spawnAlighter(this, doorY)) {
                            this.alightQueues[i]--;
                            this.alightTimers[i] = U.rand(0.38, 0.55);
                        } else {
                            // ドア前がふさがっていて降りられない
                            this.alightTimers[i] = 0.12;
                        }
                    }
                });
                // 何かがドアをふさぎ続けても列車が止まったままにならないようにする
                if (this.timer < 99 - 9) this.alightQueues.fill(0);
                if (remaining === 0) {
                    this.alightDone += dt;
                    if (this.alightDone > 0.8) this.setState('boarding', 3.0);
                }
                break;
            }
            case 'boarding':
                if (this.timer <= 0) {
                    this.setState('closing', 1.2);
                    Sound.play('chime');
                }
                break;
            case 'closing':
                if (this.timer <= 0) this.setState('departing', 2.2);
                break;
            case 'departing': {
                const t = 1 - this.timer / 2.2;
                this.offset = U.lerp(0, Train.FAR_BOTTOM, U.easeInCubic(U.clamp(t, 0, 1)));
                if (this.timer <= 0) this.toAway(game);
                break;
            }
        }
        const opening = this.doorsOpen ? 1 : 0;
        this.doorOpen = U.clamp(this.doorOpen + (opening ? dt : -dt) * 3, 0, 1);
        this.speed = dt > 0 ? (this.offset - prevOffset) / dt : 0;
    }

    toAway(game) {
        this.offset = Train.FAR_TOP;
        // 1 本の周期がおおむね track.interval になるように次の到着までの時間を決める
        this.setState('away', Math.max(1.5, this.track.interval - (game.time - this.cycleStart)));
    }
}

// エスカレーター：2 列（左＝立ち止まり、右＝歩行…という設定だが、ゲーム上はどちらも同じ）
class Escalator {
    constructor(def, stage) {
        this.cx = def.cx;
        this.width = CK.ESCALATOR.width;
        this.top = CK.ESCALATOR.top;
        this.bottom = stage.platform.top;
        this.lanes = [
            { x: this.cx - 8, queue: [], timer: 0 },
            { x: this.cx + 8, queue: [], timer: 0 }
        ];
        this.interval = stage.laneInterval;
        this.stepPhase = 0;
    }

    slot(lane, index) {
        return {
            x: this.lanes[lane].x,
            y: this.bottom + 10 + index * CK.QUEUE_SPACING
        };
    }

    tail(lane) {
        return this.slot(lane, this.lanes[lane].queue.length);
    }

    remove(mob) {
        for (const lane of this.lanes) {
            const i = lane.queue.indexOf(mob);
            if (i !== -1) lane.queue.splice(i, 1);
        }
    }

    update(dt) {
        this.stepPhase = (this.stepPhase + dt * 20) % 8;
        for (const lane of this.lanes) lane.timer += dt;
    }
}
