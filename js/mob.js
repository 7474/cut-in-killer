// ホームを歩く人（モブ）
// kind: good | cutter | phone | blocker
// role: exit（降車してエスカレーターへ） | board（階段から来て列車に乗る）

const GROUND_STATES = new Set(['alight', 'toQueue', 'cutting', 'queued', 'toWait', 'waiting', 'boarding', 'fallen']);

class Mob {
    constructor(kind, role, x, y) {
        this.id = Mob.nextId++;
        this.kind = kind;
        this.role = role;
        this.bad = kind !== 'good';
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.r = CK.MOB_RADIUS;
        const def = CK.BAD_TYPES[kind];
        this.speed = def ? U.rand(def.speed[0], def.speed[1]) : U.rand(42, 54);
        // 割り込み客は普段は普通に歩き、割り込むときだけ急加速する
        this.rushSpeed = this.speed;
        if (kind === 'cutter') this.speed = U.rand(46, 54);
        this.baseMass = def ? def.mass : 1;
        this.color = def ? def.color : U.pick(CK.GOOD_COLORS);
        this.hair = U.pick(['#1d1d1f', '#2f2a26', '#3b2f2f', '#4a4a4a', '#6b4f3a']);
        this.facing = Math.PI / 2;
        this.state = 'alight';
        this.t = 0;
        this.alive = true;
        this.alpha = 1;
        this.scale = 1;
        // 吹っ飛び用
        this.z = 0;
        this.vz = 0;
        this.spin = 0;
        this.rot = 0;
        this.hitSet = null;
        // 演出・AI 用
        this.angry = 0;
        this.bumpCd = 0;
        this.phase = Math.random() * Math.PI * 2;
        this.pause = 0;
        this.rethink = 0;
        this.esc = null;
        this.lane = 0;
        this.door = null;
        this.doorSide = 0;
        this.tx = x;
        this.ty = y;
    }

    setState(state) {
        this.state = state;
        this.t = 0;
    }

    get grounded() {
        return GROUND_STATES.has(this.state);
    }

    get mass() {
        switch (this.state) {
            case 'queued': return this.baseMass * 3;
            case 'waiting': return this.baseMass * 3;
            case 'fallen': return 6;
            default: return this.baseMass;
        }
    }

    get walking() {
        return this.state === 'alight' || this.state === 'toQueue' || this.state === 'cutting' ||
            this.state === 'toWait' || this.state === 'boarding';
    }

    update(dt, game) {
        this.t += dt;
        this.angry = Math.max(0, this.angry - dt);
        this.bumpCd = Math.max(0, this.bumpCd - dt);
        if (this.grounded) {
            this.think(dt, game);
            this.steer(dt);
        } else {
            this.updateAirborne(dt, game);
        }
    }

    // 状態ごとの目的地決定
    think(dt, game) {
        switch (this.state) {
            case 'alight': {
                const track = this.door.track;
                this.tx = track.edge + track.side * 26;
                this.ty = this.door.y;
                if (this.t > 0.9 || Math.abs(this.x - this.tx) < 6) this.decide(game);
                break;
            }
            case 'toQueue': {
                this.rethink -= dt;
                if (this.rethink <= 0 || !this.esc) {
                    this.rethink = 0.8;
                    game.chooseLane(this);
                }
                const tail = this.esc.tail(this.lane);
                this.tx = tail.x;
                this.ty = tail.y;
                // 割り込み客は列の最後尾が見えたところで先頭めがけて突進する
                if (this.kind === 'cutter' && this.esc.lanes[this.lane].queue.length >= 2 &&
                    U.dist(this.x, this.y, tail.x, tail.y) < 80) {
                    this.setState('cutting');
                    break;
                }
                if (U.dist(this.x, this.y, tail.x, tail.y) < 28) {
                    this.esc.lanes[this.lane].queue.push(this);
                    this.setState('queued');
                }
                break;
            }
            case 'cutting': {
                const lane = this.esc.lanes[this.lane];
                const front = this.esc.slot(this.lane, 0);
                this.tx = front.x;
                this.ty = front.y;
                if (U.dist(this.x, this.y, front.x, front.y) < 12) {
                    lane.queue.unshift(this);
                    this.setState('queued');
                    game.onCutIn(this, lane);
                }
                break;
            }
            case 'queued': {
                const lane = this.esc.lanes[this.lane];
                const idx = lane.queue.indexOf(this);
                if (idx === -1) {
                    this.setState('toQueue');
                    break;
                }
                const s = this.esc.slot(this.lane, idx);
                this.tx = s.x;
                this.ty = s.y;
                if (idx === 0 && U.dist(this.x, this.y, s.x, s.y) < 8 && lane.timer >= this.esc.interval) {
                    lane.queue.shift();
                    lane.timer = 0;
                    this.setState('riding');
                    this.x = s.x;
                }
                break;
            }
            case 'toWait': {
                const spot = game.waitSpot(this);
                this.tx = spot.x;
                this.ty = spot.y;
                const train = this.door.track.train;
                if (this.readyToBoard(train)) {
                    this.setState('boarding');
                } else if (U.dist(this.x, this.y, spot.x, spot.y) < 4) {
                    this.setState('waiting');
                }
                break;
            }
            case 'waiting': {
                const spot = game.waitSpot(this);
                this.tx = spot.x;
                this.ty = spot.y;
                if (this.readyToBoard(this.door.track.train)) this.setState('boarding');
                break;
            }
            case 'boarding': {
                const track = this.door.track;
                const train = track.train;
                this.tx = track.edge - track.side * 4;
                this.ty = this.door.y;
                if (!train.doorsOpen) {
                    this.setState('toWait');
                } else if (Math.abs(this.x - track.edge) < 5 && Math.abs(this.y - this.door.y) < 9) {
                    game.onBoard(this, train);
                }
                break;
            }
            case 'fallen':
                this.tx = this.x;
                this.ty = this.y;
                if (this.t > 1.3) this.recover(game);
                break;
        }
    }

    readyToBoard(train) {
        if (this.kind === 'blocker') return train.doorsOpen;
        return train.state === 'boarding';
    }

    decide(game) {
        this.esc = null;
        this.setState('toQueue');
        this.rethink = 0;
    }

    recover(game) {
        if (this.role === 'board') {
            game.assignDoor(this, this.door);
            this.setState('toWait');
        } else {
            this.decide(game);
        }
    }

    steer(dt) {
        if (this.state === 'fallen') {
            this.vx *= Math.exp(-8 * dt);
            this.vy *= Math.exp(-8 * dt);
        } else {
            let dx = this.tx - this.x;
            let dy = this.ty - this.y;
            const d = Math.hypot(dx, dy);
            let speed = this.state === 'cutting' ? this.rushSpeed : this.speed;
            if (this.state === 'queued') speed = Math.max(speed, 40);
            if (d < 10) speed *= d / 10;
            let dvx = 0;
            let dvy = 0;
            if (d > 0.5) {
                dvx = dx / d * speed;
                dvy = dy / d * speed;
            }
            // 歩きスマホ：ふらふら蛇行し、ときどき立ち止まる
            if (this.kind === 'phone' && this.walking) {
                this.pause -= dt;
                if (this.pause < -4 && Math.random() < dt * 0.4) this.pause = U.rand(0.8, 1.6);
                if (this.pause > 0) {
                    dvx = 0;
                    dvy = 0;
                } else if (d > 1) {
                    const wob = Math.sin(this.phase + this.t * 2.2) * 0.9;
                    dvx += -dy / d * speed * wob;
                    dvy += dx / d * speed * wob;
                }
            }
            const k = Math.min(1, dt * 8);
            this.vx += (dvx - this.vx) * k;
            this.vy += (dvy - this.vy) * k;
        }
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (Math.hypot(this.vx, this.vy) > 6 && this.state !== 'fallen') {
            this.facing = Math.atan2(this.vy, this.vx);
        }
    }

    updateAirborne(dt, game) {
        switch (this.state) {
            case 'riding': {
                const esc = this.esc;
                this.x = esc.lanes[this.lane].x;
                this.y -= 45 * dt;
                this.facing = -Math.PI / 2;
                this.scale = U.lerp(0.75, 1, (this.y - esc.top) / (esc.bottom - esc.top));
                if (this.y <= esc.top + 4) {
                    this.alive = false;
                    game.onExit(this);
                }
                break;
            }
            case 'launched': {
                this.x += this.vx * dt;
                this.y += this.vy * dt;
                this.z += this.vz * dt;
                this.vz -= 900 * dt;
                this.rot += this.spin * dt;
                if (this.z <= 0) {
                    this.z = 0;
                    this.vz = Math.abs(this.vz) > 80 ? -this.vz * 0.35 : 0;
                }
                const drag = this.z > 0 ? 0.5 : 3.5;
                this.vx *= Math.exp(-drag * dt);
                this.vy *= Math.exp(-drag * dt);
                game.checkFlight(this);
                if (this.state === 'launched' && this.z === 0 && this.vz === 0 && Math.hypot(this.vx, this.vy) < 40) {
                    game.onLand(this);
                }
                break;
            }
            case 'ko':
                this.vx *= Math.exp(-6 * dt);
                this.vy *= Math.exp(-6 * dt);
                this.x += this.vx * dt;
                this.y += this.vy * dt;
                if (!this.bad && this.t > 1.6) {
                    this.rot = 0;
                    this.recover(game);
                } else if (this.bad && this.t > 1.4) {
                    this.alpha = 1 - (this.t - 1.4) / 0.5;
                    if (this.alpha <= 0) this.alive = false;
                }
                break;
            case 'trackfall':
                this.scale = Math.max(0.4, 1 - this.t * 1.2);
                this.alpha = 1 - this.t / 0.7;
                this.rot += 12 * dt;
                if (this.t > 0.7) this.alive = false;
                break;
            case 'carried': {
                const train = this.carrier;
                this.y = train.offset + this.attachY;
                if (train.state === 'away' || this.y > CK.H + 40) this.alive = false;
                break;
            }
            case 'splat':
                this.y += 18 * dt;
                this.alpha = 1 - this.t / 1.6;
                if (this.t > 1.6) this.alive = false;
                break;
            case 'gone':
                this.alive = false;
                break;
        }
    }
}

Mob.nextId = 1;
