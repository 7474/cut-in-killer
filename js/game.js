// ゲーム本体：ステージの進行、モブの生成、衝突、得点

class Game {
    constructor(stage, opts = {}) {
        this.stage = stage;
        this.demo = !!opts.demo;
        this.time = 0;
        this.ramp = 0;
        this.score = 0;
        this.order = CK.ORDER.MAX;
        this.combo = 0;
        this.comboTimer = 0;
        this.over = false;
        this.result = null;
        this.crowded = false;
        this.stats = { ko: 0, exits: 0, boards: 0, misfires: 0, escapes: 0, cutIns: 0, maxCombo: 0, carried: 0 };
        this.mobs = [];
        this.effects = new Effects();
        this.hints = [];
        this.seenKinds = new Set(opts.seenKinds || []);
        this.lastTap = null;

        this.tracks = stage.tracks.map((t, i) => {
            const track = Object.assign({}, t);
            track.train = new Train(track, i);
            return track;
        });
        this.escalators = stage.escalators.map(def => new Escalator(def, stage));
        this.doors = [];
        for (const track of this.tracks) {
            for (const y of stage.doors) {
                this.doors.push({ track, y, lines: [[], []], blocker: null });
            }
        }
        this.boarderTimer = 1;
        this.introTimer = this.demo ? 0 : 1.6;
    }

    get remaining() {
        return Math.max(0, this.stage.duration - this.time);
    }

    get platform() {
        return this.stage.platform;
    }

    // ---- 生成 ----

    rollKind() {
        const ratio = U.lerp(this.stage.badRatio[0], this.stage.badRatio[1], this.ramp);
        if (Math.random() >= ratio) return 'good';
        return U.pickWeighted(this.stage.badMix);
    }

    spawnAlighter(train, doorY) {
        const track = train.track;
        const x = track.edge + track.side * (CK.MOB_RADIUS + 1);
        const y = doorY + U.rand(-3, 3);
        // ドアの前がふさがっていたら降りられない
        for (const m of this.mobs) {
            if (m.grounded && U.dist(m.x, m.y, x, y) < CK.MOB_RADIUS * 1.8) return false;
        }
        const mob = new Mob(this.rollKind(), 'exit', x, y);
        mob.door = this.doors.find(d => d.track === track && d.y === doorY);
        mob.vx = track.side * 40;
        mob.facing = track.side > 0 ? 0 : Math.PI;
        this.mobs.push(mob);
        this.introduce(mob);
        return true;
    }

    spawnBoarder() {
        const p = this.platform;
        const stairs = this.stage.stairs;
        const atTop = stairs.y === 'top';
        const x = stairs.cx + U.rand(-12, 12);
        const y = atTop ? p.top + CK.MOB_RADIUS + 1 : p.bottom - CK.MOB_RADIUS - 1;
        const wantBlocker = Math.random() < this.stage.blockerRatio * (0.6 + this.ramp * 0.6);
        let candidates = this.doors.filter(d => d.track.train.state !== 'closing' && d.track.train.state !== 'departing');
        if (wantBlocker) {
            candidates = candidates.filter(d => !d.blocker);
            if (candidates.length === 0) return;
            const door = U.pick(candidates);
            const mob = new Mob('blocker', 'board', x, y);
            this.assignDoor(mob, door);
            mob.setState('toWait');
            this.mobs.push(mob);
            this.introduce(mob);
            return;
        }
        candidates = candidates.filter(d => d.lines[0].length + d.lines[1].length < 6);
        if (candidates.length === 0) return;
        const mob = new Mob('good', 'board', x, y);
        this.assignDoor(mob, U.pick(candidates));
        mob.setState('toWait');
        this.mobs.push(mob);
    }

    // 乗車待ちの位置（ドアの左右の列）を割り当てる
    assignDoor(mob, door) {
        mob.door = door;
        if (mob.kind === 'blocker') {
            door.blocker = mob;
            return;
        }
        const side = door.lines[0].length <= door.lines[1].length ? 0 : 1;
        mob.doorSide = side;
        door.lines[side].push(mob);
    }

    // 迷惑客の種類が初めて出たときに説明ラベルを出す
    introduce(mob) {
        if (this.demo || !mob.bad || this.seenKinds.has(mob.kind)) return;
        this.seenKinds.add(mob.kind);
        this.hints.push({ mob, text: CK.BAD_TYPES[mob.kind].label, t: 0, max: 4.5 });
    }

    // ---- AI から呼ばれる ----

    chooseLane(mob) {
        let best = null;
        let bestScore = Infinity;
        this.escalators.forEach(esc => {
            esc.lanes.forEach((lane, li) => {
                const tail = esc.tail(li);
                const s = U.dist(mob.x, mob.y, tail.x, tail.y) * 0.5 + lane.queue.length * CK.QUEUE_SPACING;
                if (s < bestScore) {
                    bestScore = s;
                    best = { esc, li };
                }
            });
        });
        mob.esc = best.esc;
        mob.lane = best.li;
    }

    waitSpot(mob) {
        const door = mob.door;
        const track = door.track;
        if (mob.kind === 'blocker') {
            return { x: track.edge + track.side * 12, y: door.y };
        }
        const line = door.lines[mob.doorSide];
        const idx = Math.max(0, line.indexOf(mob));
        return {
            x: track.edge + track.side * (13 + idx * 14),
            y: door.y + (mob.doorSide === 0 ? -22 : 22)
        };
    }

    detach(mob) {
        if (mob.esc) mob.esc.remove(mob);
        if (mob.door && mob.role === 'board') {
            for (const line of mob.door.lines) {
                const i = line.indexOf(mob);
                if (i !== -1) line.splice(i, 1);
            }
            if (mob.door.blocker === mob) mob.door.blocker = null;
        }
    }

    onCutIn(mob, lane) {
        this.stats.cutIns++;
        if (this.demo) return;
        this.changeOrder(CK.ORDER.CUT_IN);
        this.effects.text(mob.x, mob.y - 16, '割り込み！', '#ff8a5b', 13);
        Sound.play('cutin');
        lane.queue.slice(1, 5).forEach(m => { m.angry = 3; });
    }

    onExit(mob) {
        if (mob.bad) {
            this.badEscaped(mob, '逃げ切られた…');
        } else {
            this.stats.exits++;
            this.addScore(CK.SCORE.GOOD_EXIT);
            this.changeOrder(CK.ORDER.GOOD_EXIT);
            Sound.play('exit');
        }
    }

    onBoard(mob, train) {
        mob.alive = false;
        this.detach(mob);
        if (mob.bad) {
            if (train.state === 'alighting') {
                this.changeOrder(CK.ORDER.DOOR_RUSH);
                this.effects.text(mob.x, mob.y - 26, '降りる人が先！', '#ffd166', 12);
            }
            this.badEscaped(mob, '乗り込まれた…');
        } else {
            this.stats.boards++;
            this.addScore(CK.SCORE.GOOD_BOARD);
        }
    }

    badEscaped(mob, msg) {
        this.stats.escapes++;
        if (this.demo) return;
        this.addScore(CK.SCORE.BAD_ESCAPE);
        this.changeOrder(CK.ORDER.BAD_ESCAPE);
        this.effects.text(U.clamp(mob.x, 60, CK.W - 60), Math.max(mob.y, this.platform.top + 24), msg, '#ff6b6b', 13, 1.2);
        this.effects.flashScreen('#ff0000', 0.18);
        Sound.play('misfire');
    }

    onExpressWarning(train) {
        if (this.demo) return;
        this.effects.banner('通過列車が参ります', '#ffd166', 2.0, 250, 18);
    }

    // ---- 得点 ----

    addScore(v) {
        if (this.demo) return;
        this.score = Math.max(0, this.score + Math.round(v));
    }

    changeOrder(v) {
        if (this.demo) return;
        this.order = U.clamp(this.order + v, 0, CK.ORDER.MAX);
    }

    // ---- プレイヤーの操作 ----

    // 指の下付近に迷惑客がいればそちらを優先する。
    // 善良な客は体の真上をタップしたときだけ当たる（誤爆しにくくする）
    pickMob(x, y, radius) {
        let bad = null;
        let badD = radius;
        let good = null;
        let goodD = CK.MOB_RADIUS + 3;
        for (const m of this.mobs) {
            if (!m.alive || !(m.grounded || m.state === 'riding')) continue;
            const d = U.dist(x, y, m.x, m.y);
            if (m.bad && d < badD) {
                badD = d;
                bad = m;
            } else if (!m.bad && d < goodD) {
                goodD = d;
                good = m;
            }
        }
        return bad || good;
    }

    // はじいた迷惑客の周囲にいる迷惑客もまとめて吹き飛ばす
    shockwave(mob, dx, dy, speed) {
        for (const m of this.mobs) {
            if (m === mob || !m.bad || !m.alive || !(m.grounded || m.state === 'riding')) continue;
            const ox = m.x - mob.x;
            const oy = m.y - mob.y;
            const d = Math.hypot(ox, oy);
            if (d > CK.SHOCKWAVE_RADIUS) continue;
            this.launch(m, dx + ox / (d || 1) * 0.8, dy + oy / (d || 1) * 0.8, speed * 0.9, 'chain');
        }
        this.effects.ring(mob.x, mob.y, 'rgba(255,214,102,0.9)', CK.SHOCKWAVE_RADIUS + 10, 0.3);
    }

    tap(x, y) {
        if (this.over || this.introTimer > 0) return;
        this.lastTap = { x, y, t: 0 };
        const mob = this.pickMob(x, y, CK.TAP_RADIUS);
        if (!mob) {
            this.effects.ring(x, y, 'rgba(255,255,255,0.6)', 16, 0.25);
            Sound.play('swish');
            return;
        }
        // タップは一番近い線路の方向へはじく（タップ位置からの向きも少し混ぜる）
        const track = this.nearestTrack(mob.x);
        let dx = track ? -track.side : (mob.x - x);
        let dy = U.rand(-0.25, 0.25);
        const ox = mob.x - x;
        const oy = mob.y - y;
        const od = Math.hypot(ox, oy);
        if (od > 3) {
            dx += ox / od * 0.6;
            dy += oy / od * 0.6;
        }
        this.launch(mob, dx, dy, CK.TAP_SPEED, 'tap');
        if (mob.bad) this.shockwave(mob, dx, dy, CK.TAP_SPEED);
    }

    swipe(x0, y0, x1, y1, ms) {
        if (this.over || this.introTimer > 0) return;
        const len = U.dist(x0, y0, x1, y1);
        let mob = this.pickMob(x0, y0, CK.SWIPE_GRAB_RADIUS);
        if (!mob) {
            // スワイプの軌跡に最初に触れたモブ
            let bestT = Infinity;
            for (const m of this.mobs) {
                if (!m.alive || !(m.grounded || m.state === 'riding')) continue;
                const ps = U.pointSegment(m.x, m.y, x0, y0, x1, y1);
                if (ps.d < (m.bad ? 22 : 10) && ps.t < bestT) {
                    bestT = ps.t;
                    mob = m;
                }
            }
        }
        Sound.play('swish');
        if (!mob) return;
        const speed = U.clamp(len / Math.max(ms, 16) * 1000 * 0.9, 480, 1100);
        this.launch(mob, x1 - x0, y1 - y0, speed, 'swipe');
        if (mob.bad) this.shockwave(mob, x1 - x0, y1 - y0, speed);
    }

    nearestTrack(x) {
        let best = null;
        let bestD = Infinity;
        for (const t of this.tracks) {
            const d = Math.abs(t.edge - x);
            if (d < bestD) {
                bestD = d;
                best = t;
            }
        }
        return best;
    }

    launch(mob, dx, dy, speed, cause) {
        const d = Math.hypot(dx, dy) || 1;
        this.detach(mob);
        const wasState = mob.state;
        mob.setState('launched');
        mob.hitSet = new Set([mob]);
        mob.rot = 0;
        mob.spin = (Math.random() < 0.5 ? -1 : 1) * U.rand(10, 18);
        if (!mob.bad) {
            // 善良な客は弱めに転がるだけ（線路には落とさない）
            speed *= 0.45;
        }
        mob.vx = dx / d * speed;
        mob.vy = dy / d * speed;
        mob.vz = 160 + speed * 0.12;
        mob.z = 1;

        const fx = this.effects;
        if (mob.bad) {
            this.stats.ko++;
            this.combo++;
            this.comboTimer = CK.COMBO_WINDOW;
            this.stats.maxCombo = Math.max(this.stats.maxCombo, this.combo);
            let pts = CK.SCORE.KO * Math.min(5, 1 + 0.25 * (this.combo - 1));
            if (cause === 'chain') pts += CK.SCORE.CHAIN;
            if (wasState === 'queued') pts += 20;
            this.addScore(pts);
            this.changeOrder(CK.ORDER.KO);
            fx.burst(mob.x, mob.y, mob.color, 22, 280);
            fx.burst(mob.x, mob.y, '#ffd166', 6, 200);
            fx.ring(mob.x, mob.y, '#ffffff', 44);
            const size = Math.min(26, 15 + this.combo);
            fx.text(mob.x + U.rand(-8, 8), mob.y - 18 - U.rand(0, 12), cause === 'chain' ? `連鎖！+${Math.round(pts)}` : `+${Math.round(pts)}`, cause === 'chain' ? '#ffd166' : '#ffffff', size);
            const praise = CK.COMBO_PRAISE[this.combo];
            if (praise && !this.demo) fx.banner(praise, '#ffd166', 1.2, 300, 28);
            fx.shake(cause === 'chain' ? 6 : 9);
            fx.stop(cause === 'chain' ? 0.04 : 0.08);
            Sound.play(cause === 'chain' ? 'chain' : 'hit');
            if (navigator.vibrate && !this.demo) {
                try { navigator.vibrate(18); } catch (e) { /* 非対応端末 */ }
            }
        } else {
            this.stats.misfires++;
            this.combo = 0;
            this.addScore(CK.SCORE.MISFIRE);
            this.changeOrder(CK.ORDER.MISFIRE);
            fx.burst(mob.x, mob.y, '#9fb3c8', 8, 120);
            fx.text(mob.x, mob.y - 18, '誤爆！', '#ff6b6b', 15);
            fx.flashScreen('#ff0000', 0.25);
            fx.shake(5);
            Sound.play('misfire');
        }
        // 割り込みの瞬間に阻止できたら気持ちよく
        this.hints = this.hints.filter(h => h.mob !== mob);
    }

    // 飛行中：線路・列車・壁との当たり
    checkFlight(mob) {
        const p = this.platform;
        const track = this.tracks.find(t => mob.x >= t.x0 && mob.x < t.x1);
        if (track) {
            if (!mob.bad) {
                // 善良な客はホームの縁で止まる
                mob.x = track.edge + track.side * mob.r;
                mob.vx = 0;
                return;
            }
            const train = track.train;
            if (train.covers(mob.y)) {
                if (train.moving) {
                    mob.setState('carried');
                    mob.carrier = train;
                    mob.attachY = mob.y - train.offset;
                    mob.x = track.edge - track.side * 8;
                    this.stats.carried++;
                    this.bonus(mob, CK.SCORE.TRAIN_CARRY, 'お持ち帰り！', '#ffd166', 18);
                    this.effects.shake(10);
                    Sound.play('splat');
                } else {
                    mob.setState('splat');
                    mob.x = track.edge - track.side * 6;
                    this.bonus(mob, CK.SCORE.WALL, 'ベチャッ', '#ffffff', 14);
                    Sound.play('splat');
                }
                this.effects.burst(mob.x, mob.y, mob.color, 10, 160);
            }
            return;
        }
        // 片面ホームの奥の壁
        const wallRight = !this.tracks.some(t => t.x0 >= p.x1 - 1);
        if (wallRight && mob.x > p.x1 - mob.r) {
            mob.x = p.x1 - mob.r;
            if (mob.vx > 120 && mob.bad && !mob.wallHit) {
                mob.wallHit = true;
                this.bonus(mob, CK.SCORE.WALL, '壁ドン！', '#ffffff', 14);
                this.effects.shake(6);
                Sound.play('splat');
            }
            mob.vx = -mob.vx * 0.4;
        }
        if (mob.x < -20 || mob.x > CK.W + 20 || mob.y < -20 || mob.y > CK.H + 20) {
            mob.setState('gone');
            if (mob.bad) this.bonus(mob, CK.SCORE.TRACK, '場外！', '#ffffff', 13);
        }
        if (!mob.bad) {
            mob.x = U.clamp(mob.x, p.x0 + mob.r, p.x1 - mob.r);
            mob.y = U.clamp(mob.y, p.top + mob.r, p.bottom - mob.r);
        }
    }

    onLand(mob) {
        const track = this.tracks.find(t => mob.x >= t.x0 && mob.x < t.x1);
        if (track && mob.bad) {
            mob.setState('trackfall');
            this.bonus(mob, CK.SCORE.TRACK, '線路送り', '#ffffff', 13);
        } else {
            mob.setState('ko');
            mob.rot = Math.PI / 2;
            // 床に落ちた位置がホームの外ならホーム内に戻す
            const p = this.platform;
            mob.x = U.clamp(mob.x, p.x0 + mob.r, p.x1 - mob.r);
            mob.y = U.clamp(mob.y, p.top + mob.r, p.bottom - mob.r);
        }
    }

    bonus(mob, pts, label, color, size) {
        this.addScore(pts);
        if (this.demo) return;
        this.effects.text(U.clamp(mob.x, 50, CK.W - 50), U.clamp(mob.y - 22, 60, CK.H - 20), `${label} +${pts}`, color, size, 1.1);
    }

    // ---- 更新 ----

    update(dt) {
        if (this.effects.hitStop > 0) {
            this.effects.hitStop -= dt;
            this.effects.update(dt * 0.2);
            return;
        }
        if (this.introTimer > 0) {
            this.introTimer -= dt;
            if (this.introTimer <= 0) Sound.play('start');
        }
        if (this.over) {
            this.effects.update(dt);
            return;
        }
        if (this.introTimer <= 0) this.time += dt;
        this.ramp = U.clamp(this.time / this.stage.duration, 0, 1);

        for (const track of this.tracks) track.train.update(dt, this);
        for (const esc of this.escalators) esc.update(dt);

        if (this.stage.boarderRate > 0) {
            this.boarderTimer -= dt;
            if (this.boarderTimer <= 0) {
                this.spawnBoarder();
                this.boarderTimer = U.rand(0.6, 1.4) / (this.stage.boarderRate * (0.7 + this.ramp * 0.6));
            }
        }

        for (const m of this.mobs) m.update(dt, this);
        this.collide(dt);
        this.collideFlying();
        this.mobs = this.mobs.filter(m => {
            if (!m.alive) this.detach(m);
            return m.alive;
        });

        // コンボ
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) this.combo = 0;
        }

        // 混雑
        let crowd = 0;
        for (const m of this.mobs) if (m.grounded) crowd++;
        this.crowd = crowd;
        this.crowded = crowd > this.stage.crowdCap;
        if (this.crowded) this.changeOrder(-CK.ORDER.CROWD_DRAIN * dt);

        for (const h of this.hints) h.t += dt;
        this.hints = this.hints.filter(h => h.t < h.max && h.mob.alive && h.mob.grounded);
        if (this.lastTap) {
            this.lastTap.t += dt;
            if (this.lastTap.t > 0.3) this.lastTap = null;
        }

        this.effects.update(dt);

        if (!this.demo) {
            if (this.order <= 0) this.finish(false);
            else if (this.time >= this.stage.duration) this.finish(true);
        }
    }

    collide(dt) {
        const p = this.platform;
        const list = this.mobs.filter(m => m.grounded);
        const n = list.length;
        for (let pass = 0; pass < 2; pass++) {
            for (let i = 0; i < n; i++) {
                const a = list[i];
                for (let j = i + 1; j < n; j++) {
                    const b = list[j];
                    const dx = b.x - a.x;
                    const dy = b.y - a.y;
                    const min = a.r + b.r;
                    const d2 = dx * dx + dy * dy;
                    if (d2 >= min * min) continue;
                    const d = Math.sqrt(d2) || 0.01;
                    const nx = dx / d;
                    const ny = dy / d;
                    const overlap = min - d;
                    const ma = a.mass;
                    const mb = b.mass;
                    const wa = mb / (ma + mb);
                    const wb = ma / (ma + mb);
                    a.x -= nx * overlap * wa;
                    a.y -= ny * overlap * wa;
                    b.x += nx * overlap * wb;
                    b.y += ny * overlap * wb;
                    // 正面衝突ですくまないよう、互いに進行方向の右へよける
                    if (pass === 0 && a.vx * b.vx + a.vy * b.vy < 0) {
                        const side = overlap * 0.35;
                        a.x += -ny * side * wa;
                        a.y += nx * side * wa;
                        b.x -= -ny * side * wb;
                        b.y -= nx * side * wb;
                    }
                    if (pass === 0) this.contact(a, b);
                }
            }
        }
        for (const m of list) {
            let x0 = p.x0;
            let x1 = p.x1;
            // 降車直後はドアの中にいてもよい
            if (m.state === 'alight' || m.state === 'boarding') {
                x0 -= 12;
                x1 += 12;
            }
            m.x = U.clamp(m.x, x0 + m.r, x1 - m.r);
            m.y = U.clamp(m.y, p.top + m.r, p.bottom - m.r);
        }
    }

    // 地上のモブ同士の接触イベント
    contact(a, b) {
        for (const [x, y] of [[a, b], [b, a]]) {
            // 歩きスマホが歩いている人にぶつかると転ばせる
            if (x.kind === 'phone' && x.walking && x.bumpCd <= 0 && !y.bad && y.walking) {
                x.bumpCd = 2.5;
                y.setState('fallen');
                this.detach(y);
                y.angry = 2.5;
                if (!this.demo) {
                    this.changeOrder(CK.ORDER.BUMP);
                    this.effects.text(y.x, y.y - 14, 'ドンッ', '#c9b6ff', 12);
                    Sound.play('bump');
                }
            }
            // 割り込み客に押しのけられた人は怒る
            if (x.kind === 'cutter' && x.state === 'cutting' && !y.bad) y.angry = 2;
        }
    }

    // 飛んでいる迷惑客が他の人に当たる
    collideFlying() {
        for (const f of this.mobs) {
            if (f.state !== 'launched' || f.z > 26 || !f.bad) continue;
            const sp = Math.hypot(f.vx, f.vy);
            if (sp < 120) continue;
            for (const m of this.mobs) {
                if (f.hitSet.has(m) || !m.grounded) continue;
                if (U.dist(f.x, f.y, m.x, m.y) > f.r + m.r) continue;
                f.hitSet.add(m);
                if (m.bad) {
                    const nx = (m.x - f.x) / (f.r + m.r);
                    const ny = (m.y - f.y) / (f.r + m.r);
                    this.launch(m, f.vx / sp * 0.7 + nx * 0.5, f.vy / sp * 0.7 + ny * 0.5, sp * 0.85, 'chain');
                    f.vx *= 0.8;
                    f.vy *= 0.8;
                } else {
                    this.detach(m);
                    m.setState('fallen');
                    m.vx = f.vx * 0.2;
                    m.vy = f.vy * 0.2;
                    m.angry = 2;
                    if (!this.demo) {
                        this.effects.text(m.x, m.y - 14, 'とばっちり', '#9fb3c8', 11);
                    }
                    f.vx *= 0.6;
                    f.vy *= 0.6;
                }
            }
        }
    }

    finish(cleared) {
        if (this.over) return;
        this.over = true;
        let orderBonus = 0;
        if (cleared) {
            orderBonus = Math.round(this.order) * 20;
            this.score += orderBonus;
        }
        const ranks = this.stage.ranks;
        let rank = 'C';
        if (cleared) {
            if (this.score >= ranks[0]) rank = 'S';
            else if (this.score >= ranks[1]) rank = 'A';
            else if (this.score >= ranks[2]) rank = 'B';
        } else {
            rank = '-';
        }
        this.result = { cleared, score: this.score, orderBonus, rank, stats: this.stats };
        Sound.play(cleared ? 'clear' : 'fail');
    }
}
