// 描画：真上から見たホームをフラットな図形で描く

const COLORS = {
    bg: '#23272e',
    wall: '#363c46',
    floor: '#cfcabe',
    floorLine: 'rgba(0,0,0,0.05)',
    edge: '#f4f1ea',
    tactile: '#f2c230',
    ballast: '#57504a',
    sleeper: '#7a6552',
    rail: '#c3c9d1',
    escFrame: '#5d6672',
    escStep: '#8a939e',
    rubber: '#1f2328',
    sign: '#1d3557',
    skin: '#f1c9a5',
    text: '#ffffff',
    shadow: 'rgba(0,0,0,0.22)'
};

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.scale = 1;
        this.dpr = 1;
        this.staticCanvas = null;
        this.staticKey = '';
        this.resize();
    }

    resize() {
        const parent = document.getElementById('game-container');
        const cw = parent.clientWidth;
        const ch = parent.clientHeight;
        this.scale = Math.min(cw / CK.W, ch / CK.H);
        this.dpr = Math.min(window.devicePixelRatio || 1, 3);
        const w = Math.round(CK.W * this.scale);
        const h = Math.round(CK.H * this.scale);
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.canvas.width = Math.round(w * this.dpr);
        this.canvas.height = Math.round(h * this.dpr);
        this.staticKey = '';
    }

    // 画面座標 → 論理座標
    toLogical(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (clientX - rect.left) / rect.width * CK.W,
            y: (clientY - rect.top) / rect.height * CK.H
        };
    }

    draw(game) {
        const ctx = this.ctx;
        const k = this.scale * this.dpr;
        ctx.setTransform(k, 0, 0, k, 0, 0);
        this.ensureStatic(game);

        ctx.save();
        const fx = game.effects;
        if (fx.shakeAmp > 0) {
            ctx.translate(U.rand(-fx.shakeAmp, fx.shakeAmp), U.rand(-fx.shakeAmp, fx.shakeAmp));
        }
        ctx.drawImage(this.staticCanvas, 0, 0, CK.W, CK.H);
        this.drawEscalators(ctx, game);
        this.drawWarnings(ctx, game);
        this.drawTrains(ctx, game);
        this.drawMobs(ctx, game);
        this.drawEffects(ctx, fx);
        this.drawHints(ctx, game);
        if (game.lastTap) {
            const t = game.lastTap.t / 0.3;
            ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - t)})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(game.lastTap.x, game.lastTap.y, 6 + t * 14, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();

        if (fx.flash > 0) {
            ctx.globalAlpha = fx.flash;
            ctx.fillStyle = fx.flashColor;
            ctx.fillRect(0, 0, CK.W, CK.H);
            ctx.globalAlpha = 1;
        }
        if (!game.demo) {
            this.drawHud(ctx, game);
            this.drawBanners(ctx, fx);
            if (game.introTimer > 0) this.drawIntro(ctx, game);
        }
    }

    // ---- 静的な背景（ステージとサイズが変わったときだけ描き直す） ----

    ensureStatic(game) {
        const key = `${game.stage.id}:${this.canvas.width}`;
        if (this.staticKey === key) return;
        this.staticKey = key;
        const c = document.createElement('canvas');
        c.width = this.canvas.width;
        c.height = this.canvas.height;
        const ctx = c.getContext('2d');
        const k = this.scale * this.dpr;
        ctx.setTransform(k, 0, 0, k, 0, 0);
        this.drawStatic(ctx, game);
        this.staticCanvas = c;
    }

    drawStatic(ctx, game) {
        const stage = game.stage;
        const p = stage.platform;
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, CK.W, CK.H);

        for (const t of game.tracks) this.drawTrack(ctx, t);

        // ホーム床
        ctx.fillStyle = COLORS.floor;
        ctx.fillRect(p.x0, p.top, p.x1 - p.x0, p.bottom - p.top);
        ctx.strokeStyle = COLORS.floorLine;
        ctx.lineWidth = 1;
        for (let x = p.x0; x < p.x1; x += 24) {
            ctx.beginPath();
            ctx.moveTo(x, p.top);
            ctx.lineTo(x, p.bottom);
            ctx.stroke();
        }
        for (let y = p.top; y < p.bottom; y += 24) {
            ctx.beginPath();
            ctx.moveTo(p.x0, y);
            ctx.lineTo(p.x1, y);
            ctx.stroke();
        }

        // ホームの縁と点字ブロック、乗車位置の目印
        for (const t of game.tracks) {
            const s = t.side;
            ctx.fillStyle = COLORS.edge;
            ctx.fillRect(s > 0 ? t.edge : t.edge - 4, p.top, 4, p.bottom - p.top);
            const tx = t.edge + s * 22;
            ctx.fillStyle = COLORS.tactile;
            ctx.fillRect(s > 0 ? tx : tx - 6, p.top, 6, p.bottom - p.top);
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            for (let y = p.top + 3; y < p.bottom; y += 5) {
                ctx.fillRect((s > 0 ? tx : tx - 6) + 1.5, y, 3, 1.5);
            }
            for (const dy of stage.doors) {
                ctx.fillStyle = 'rgba(46, 160, 67, 0.55)';
                for (const side of [-1, 1]) {
                    const y = dy + side * 22;
                    for (let i = 0; i < 3; i++) {
                        const x = t.edge + s * (12 + i * 14);
                        ctx.beginPath();
                        ctx.moveTo(x - s * 4, y - 4);
                        ctx.lineTo(x + s * 4, y);
                        ctx.lineTo(x - s * 4, y + 4);
                        ctx.closePath();
                        ctx.fill();
                    }
                }
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.fillRect(s > 0 ? t.edge + 6 : t.edge - 26, dy - 1, 20, 2);
            }
        }

        // エスカレーター待ちの誘導線
        for (const esc of game.escalators) {
            ctx.strokeStyle = 'rgba(29,53,87,0.25)';
            ctx.setLineDash([4, 4]);
            ctx.lineWidth = 1.5;
            for (const lane of esc.lanes) {
                ctx.beginPath();
                ctx.moveTo(lane.x, esc.bottom + 4);
                ctx.lineTo(lane.x, esc.bottom + 120);
                ctx.stroke();
            }
            ctx.setLineDash([]);
        }

        // 上の壁
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(p.x0, 0, p.x1 - p.x0, p.top);
        if (p.bottom < CK.H) ctx.fillRect(p.x0, p.bottom, p.x1 - p.x0, CK.H - p.bottom);
        // 片面ホームの奥の壁
        if (!game.tracks.some(t => t.x0 >= p.x1 - 1)) {
            ctx.fillStyle = COLORS.wall;
            ctx.fillRect(p.x1, 0, CK.W - p.x1, CK.H);
            ctx.fillStyle = '#4b5361';
            for (let y = 170; y < CK.H; y += 150) ctx.fillRect(p.x1 + 2, y, 6, 60);
        }

        // 階段（乗車客が来る）
        const st = stage.stairs;
        const sy0 = st.y === 'top' ? CK.ESCALATOR.top : p.bottom;
        const sy1 = st.y === 'top' ? p.top : CK.H;
        ctx.fillStyle = '#9aa1ab';
        ctx.fillRect(st.cx - 22, sy0, 44, sy1 - sy0);
        ctx.fillStyle = '#7b828c';
        for (let y = sy0 + 4; y < sy1; y += 8) ctx.fillRect(st.cx - 22, y, 44, 3);
        ctx.fillStyle = COLORS.rubber;
        ctx.fillRect(st.cx - 24, sy0, 2, sy1 - sy0);
        ctx.fillRect(st.cx + 22, sy0, 2, sy1 - sy0);
        this.label(ctx, st.cx, st.y === 'top' ? sy0 + 14 : sy1 - 12, '階段', 9);

        // エスカレーター枠（段の動きは drawEscalators で描く）
        for (const esc of game.escalators) {
            ctx.fillStyle = COLORS.rubber;
            ctx.fillRect(esc.cx - esc.width / 2 - 3, esc.top, esc.width + 6, esc.bottom - esc.top);
        }
    }

    drawTrack(ctx, t) {
        ctx.fillStyle = COLORS.ballast;
        ctx.fillRect(t.x0, 0, t.x1 - t.x0, CK.H);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        for (let i = 0; i < 260; i++) {
            const x = t.x0 + ((i * 37) % (t.x1 - t.x0));
            const y = (i * 53) % CK.H;
            ctx.fillRect(x, y, 2, 2);
        }
        const r0 = t.x0 + 20;
        const r1 = t.x1 - 20;
        ctx.fillStyle = COLORS.sleeper;
        for (let y = 4; y < CK.H; y += 14) ctx.fillRect(r0 - 8, y, r1 - r0 + 16, 6);
        ctx.fillStyle = COLORS.rail;
        ctx.fillRect(r0 - 2, 0, 4, CK.H);
        ctx.fillRect(r1 - 2, 0, 4, CK.H);
        // ホーム下の影
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(t.side > 0 ? t.edge - 8 : t.edge, 0, 8, CK.H);
    }

    drawEscalators(ctx, game) {
        for (const esc of game.escalators) {
            const x0 = esc.cx - esc.width / 2;
            ctx.save();
            ctx.beginPath();
            ctx.rect(x0, esc.top, esc.width, esc.bottom - esc.top);
            ctx.clip();
            ctx.fillStyle = COLORS.escFrame;
            ctx.fillRect(x0, esc.top, esc.width, esc.bottom - esc.top);
            ctx.fillStyle = COLORS.escStep;
            for (let y = esc.bottom - esc.stepPhase; y > esc.top - 8; y -= 8) {
                ctx.fillRect(x0, y, esc.width, 2);
            }
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.fillRect(esc.cx - 0.5, esc.top, 1, esc.bottom - esc.top);
            ctx.restore();
            // 上り矢印
            ctx.fillStyle = '#7bd389';
            ctx.beginPath();
            ctx.moveTo(esc.cx, esc.bottom - 10);
            ctx.lineTo(esc.cx - 5, esc.bottom - 3);
            ctx.lineTo(esc.cx + 5, esc.bottom - 3);
            ctx.closePath();
            ctx.fill();
        }
        // 「出口」表示
        for (const esc of game.escalators) {
            this.label(ctx, esc.cx, esc.top + 10, '出口', 9, '#f4d35e');
        }
    }

    drawWarnings(ctx, game) {
        const blink = Math.floor(performance.now() / 180) % 2 === 0;
        for (const t of game.tracks) {
            if (t.train.state !== 'warning' || !blink) continue;
            ctx.fillStyle = 'rgba(255, 140, 0, 0.55)';
            ctx.fillRect(t.side > 0 ? t.edge : t.edge - 6, game.platform.top, 6, game.platform.bottom - game.platform.top);
        }
    }

    drawTrains(ctx, game) {
        for (const t of game.tracks) {
            const tr = t.train;
            if (tr.state === 'away' || tr.state === 'warning') continue;
            const x0 = t.x0 + 6;
            const w = t.x1 - t.x0 - 12;
            const top = tr.offset - 20;
            const bottom = tr.offset + Train.LENGTH - 20;
            if (bottom < 0 || top > CK.H) continue;
            const express = tr.kind === 'express';
            // 車体
            ctx.fillStyle = express ? '#f1f3f5' : '#d9dee4';
            this.roundRect(ctx, x0, top, w, bottom - top, 10);
            ctx.fill();
            // 屋根の機器
            ctx.fillStyle = 'rgba(0,0,0,0.08)';
            ctx.fillRect(x0 + w / 2 - 6, top + 10, 12, bottom - top - 20);
            // 帯
            ctx.fillStyle = express ? '#1d4e89' : tr.color;
            const stripeX = t.side > 0 ? x0 + w - 8 : x0 + 2;
            ctx.fillRect(stripeX, top + 6, 6, bottom - top - 12);
            // 連結部
            ctx.fillStyle = '#5a6068';
            for (let y = tr.offset + 150; y < bottom - 20; y += 220) ctx.fillRect(x0, y, w, 3);
            // ドア
            const doorX = t.side > 0 ? x0 + w - 3 : x0 - 1;
            for (const dy of game.stage.doors) {
                const y = dy + tr.offset;
                if (y < -20 || y > CK.H + 20) continue;
                const open = tr.doorOpen * 9;
                ctx.fillStyle = '#9aa3ad';
                ctx.fillRect(doorX, y - 12, 4, 24);
                if (open > 0.5) {
                    ctx.fillStyle = '#3b4048';
                    ctx.fillRect(doorX - 1, y - open, 6, open * 2);
                }
            }
            // 先頭（下側）のライト
            ctx.fillStyle = '#fff6c2';
            ctx.fillRect(x0 + 6, bottom - 6, 8, 4);
            ctx.fillRect(x0 + w - 14, bottom - 6, 8, 4);
            if (tr.moving && Math.abs(tr.speed) > 300) {
                ctx.strokeStyle = 'rgba(255,255,255,0.5)';
                ctx.lineWidth = 1;
                for (let i = 0; i < 6; i++) {
                    const lx = x0 + 6 + Math.random() * (w - 12);
                    const ly = Math.random() * CK.H;
                    ctx.beginPath();
                    ctx.moveTo(lx, ly);
                    ctx.lineTo(lx, ly - 40);
                    ctx.stroke();
                }
            }
        }
    }

    // ---- モブ ----

    drawMobs(ctx, game) {
        const ground = [];
        const air = [];
        for (const m of game.mobs) {
            if (m.state === 'launched' || m.state === 'carried' || m.state === 'splat') air.push(m);
            else ground.push(m);
        }
        ground.sort((a, b) => a.y - b.y);
        for (const m of ground) this.drawMob(ctx, m);
        for (const m of air) this.drawMob(ctx, m);
    }

    drawMob(ctx, m) {
        const r = m.r;
        ctx.save();
        ctx.globalAlpha = U.clamp(m.alpha, 0, 1);
        // 影
        if (m.state !== 'trackfall' && m.state !== 'carried' && m.state !== 'splat') {
            ctx.fillStyle = COLORS.shadow;
            ctx.beginPath();
            const sr = r * (1 - Math.min(m.z, 80) / 200);
            ctx.ellipse(m.x + 1.5, m.y + 2, sr * 1.1, sr * 0.9, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.translate(m.x, m.y - m.z * 0.6);
        const s = m.scale * (1 + Math.min(m.z, 120) / 160);
        ctx.scale(s, s);

        const lying = m.state === 'ko' || m.state === 'fallen';
        const tumbling = m.state === 'launched' || m.state === 'trackfall' || m.state === 'carried' || m.state === 'splat';
        ctx.save();
        ctx.rotate(tumbling ? m.rot : lying ? (m.rot || 0) + m.facing : m.facing);

        // 割り込み中の赤いオーラ
        if (m.kind === 'cutter' && m.state === 'cutting') {
            ctx.fillStyle = `rgba(255,70,40,${0.25 + 0.15 * Math.sin(performance.now() / 80)})`;
            ctx.beginPath();
            ctx.arc(0, 0, r * 1.9, 0, Math.PI * 2);
            ctx.fill();
            // 勢いの線
            ctx.strokeStyle = 'rgba(255,255,255,0.7)';
            ctx.lineWidth = 1.2;
            for (const oy of [-4, 0, 4]) {
                ctx.beginPath();
                ctx.moveTo(-r * 1.4, oy);
                ctx.lineTo(-r * 2.4, oy);
                ctx.stroke();
            }
        }

        // リュック
        if (m.kind === 'blocker') {
            ctx.fillStyle = '#4e3b2c';
            this.roundRect(ctx, -r * 1.35, -r * 0.8, r * 0.8, r * 1.6, 2);
            ctx.fill();
        }

        // 胴体（肩幅方向が y）
        const bodyRx = lying ? r * 1.4 : r * 0.72;
        const bodyRy = m.kind === 'blocker' ? r * 1.3 : r * 1.12;
        ctx.fillStyle = m.color;
        ctx.beginPath();
        ctx.ellipse(lying ? -r * 0.5 : 0, 0, bodyRx, bodyRy, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // スマホの光
        if (m.kind === 'phone' && !lying) {
            ctx.fillStyle = 'rgba(125, 249, 255, 0.35)';
            ctx.beginPath();
            ctx.arc(r * 1.2, 0, r * 0.9, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#7df9ff';
            ctx.fillRect(r * 0.85, -2.2, 3, 4.4);
        }

        // 頭（前側に顔の肌色を少し見せる）
        const hx = lying ? r * 0.9 : 0;
        ctx.fillStyle = COLORS.skin;
        ctx.beginPath();
        ctx.arc(hx + r * 0.16, 0, r * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = m.hair;
        ctx.beginPath();
        ctx.arc(hx - r * 0.06, 0, r * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 頭上の記号
        if (m.state === 'ko' || m.state === 'fallen') this.drawStars(ctx, r);
        if (m.angry > 0 && !m.bad) this.drawAnger(ctx, r);
        if (m.kind === 'blocker' && m.state === 'waiting') this.drawExclaim(ctx, r, '#ffb703');
        ctx.restore();
    }

    drawStars(ctx, r) {
        const t = performance.now() / 300;
        ctx.fillStyle = '#ffd166';
        for (let i = 0; i < 3; i++) {
            const a = t + i * 2.1;
            const x = Math.cos(a) * r * 1.2;
            const y = -r * 1.4 + Math.sin(a) * r * 0.4;
            ctx.beginPath();
            ctx.arc(x, y, 1.6, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // 怒りマーク（十字の血管）
    drawAnger(ctx, r) {
        const x = r * 0.8;
        const y = -r * 1.6;
        ctx.strokeStyle = '#ff3b3b';
        ctx.lineWidth = 1.6;
        for (let i = 0; i < 4; i++) {
            const a = i * Math.PI / 2 + Math.PI / 4;
            ctx.beginPath();
            ctx.arc(x + Math.cos(a) * 3.2, y + Math.sin(a) * 3.2, 2, a + Math.PI * 0.5, a + Math.PI * 1.5);
            ctx.stroke();
        }
    }

    drawExclaim(ctx, r, color) {
        ctx.fillStyle = color;
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', 0, -r * 1.5);
    }

    // ---- 演出 ----

    drawEffects(ctx, fx) {
        for (const r of fx.rings) {
            const t = 1 - r.life / r.max;
            ctx.strokeStyle = r.color;
            ctx.globalAlpha = 1 - t;
            ctx.lineWidth = 3 * (1 - t) + 1;
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.maxR * U.easeOutCubic(t), 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        for (const p of fx.particles) {
            ctx.globalAlpha = U.clamp(p.life / p.max, 0, 1);
            ctx.fillStyle = p.color;
            if (p.square) {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                ctx.restore();
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
        for (const t of fx.texts) {
            const a = U.clamp(t.life / t.max * 1.5, 0, 1);
            const pop = 1 + Math.max(0, (t.life - t.max + 0.12) / 0.12) * 0.4;
            this.outlined(ctx, t.str, t.x, t.y, Math.round(t.size * pop), t.color, a);
        }
    }

    drawBanners(ctx, fx) {
        for (const b of fx.banners) {
            const t = 1 - b.life / b.max;
            const a = t < 0.15 ? t / 0.15 : t > 0.8 ? (1 - t) / 0.2 : 1;
            ctx.globalAlpha = a * 0.75;
            ctx.fillStyle = '#000';
            ctx.fillRect(0, b.y - b.size, CK.W, b.size * 1.6);
            ctx.globalAlpha = 1;
            this.outlined(ctx, b.str, CK.W / 2, b.y + b.size * 0.3, b.size, b.color, a);
        }
    }

    drawHints(ctx, game) {
        for (const h of game.hints) {
            const m = h.mob;
            const pulse = (h.t * 2) % 1;
            ctx.strokeStyle = `rgba(255,214,102,${1 - pulse})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.r + 4 + pulse * 14, 0, Math.PI * 2);
            ctx.stroke();
            const y = m.y - 30;
            const text = `${h.text}！ タップで排除`;
            ctx.font = 'bold 11px sans-serif';
            const w = ctx.measureText(text).width + 12;
            const x = U.clamp(m.x, w / 2 + 4, CK.W - w / 2 - 4);
            ctx.fillStyle = 'rgba(20,20,20,0.85)';
            this.roundRect(ctx, x - w / 2, y - 10, w, 18, 6);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(m.x - 4, y + 8);
            ctx.lineTo(m.x + 4, y + 8);
            ctx.lineTo(m.x, y + 14);
            ctx.fill();
            ctx.fillStyle = '#ffd166';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, x, y);
        }
    }

    drawHud(ctx, game) {
        const H = CK.HUD_HEIGHT;
        ctx.fillStyle = 'rgba(15,18,22,0.82)';
        ctx.fillRect(0, 0, CK.W, H);
        ctx.textBaseline = 'middle';
        // スコア
        ctx.textAlign = 'left';
        ctx.fillStyle = '#9aa5b1';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText('SCORE', 10, 12);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 17px sans-serif';
        ctx.fillText(String(game.score), 10, 28);
        // 残り時間
        const rem = Math.ceil(game.remaining);
        const mm = Math.floor(rem / 60);
        const ss = String(rem % 60).padStart(2, '0');
        ctx.textAlign = 'center';
        ctx.fillStyle = rem <= 10 ? '#ff6b6b' : '#fff';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(`${mm}:${ss}`, CK.W / 2, 21);
        // 平穏度
        const bx = 228;
        const bw = 86;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#9aa5b1';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText('ホームの平穏', bx, 12);
        ctx.fillStyle = '#3a414b';
        ctx.fillRect(bx, 22, bw, 9);
        const ratio = game.order / CK.ORDER.MAX;
        ctx.fillStyle = ratio > 0.5 ? '#52b788' : ratio > 0.25 ? '#f4a261' : '#e63946';
        ctx.fillRect(bx, 22, bw * ratio, 9);
        // コンボ
        if (game.combo >= 2) {
            this.outlined(ctx, `${game.combo} COMBO`, CK.W / 2, CK.H - 52, 18, '#ffd166', U.clamp(game.comboTimer, 0, 1));
        }
        // 混雑警告
        if (game.crowded && Math.floor(performance.now() / 300) % 2 === 0) {
            this.outlined(ctx, '混雑しています！', CK.W / 2, CK.H - 24, 15, '#ff6b6b', 1);
        }
    }

    drawIntro(ctx, game) {
        const a = U.clamp(game.introTimer / 0.4, 0, 1);
        ctx.globalAlpha = 0.6 * a;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 230, CK.W, 110);
        ctx.globalAlpha = 1;
        this.outlined(ctx, game.stage.name, CK.W / 2, 268, 30, '#fff', a);
        this.outlined(ctx, '割り込む奴らを はじき飛ばせ！', CK.W / 2, 310, 16, '#ffd166', a);
    }

    // ---- 小物 ----

    label(ctx, x, y, text, size, color = '#ffffff') {
        ctx.font = `bold ${size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const w = ctx.measureText(text).width + 8;
        ctx.fillStyle = COLORS.sign;
        this.roundRect(ctx, x - w / 2, y - size * 0.75, w, size * 1.5, 3);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.fillText(text, x, y + 0.5);
    }

    outlined(ctx, text, x, y, size, color, alpha = 1) {
        ctx.globalAlpha = alpha;
        ctx.font = `900 ${size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(3, size / 4);
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.strokeText(text, x, y);
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
        ctx.globalAlpha = 1;
    }

    roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
}
