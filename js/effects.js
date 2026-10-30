// 演出：パーティクル、浮かぶ文字、波紋、画面揺れ、ヒットストップ

class Effects {
    constructor() {
        this.particles = [];
        this.texts = [];
        this.rings = [];
        this.banners = [];
        this.shakeAmp = 0;
        this.hitStop = 0;
        this.flash = 0;
        this.flashColor = '#fff';
    }

    burst(x, y, color, count = 12, power = 160) {
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = U.rand(power * 0.3, power);
            this.particles.push({
                x, y,
                vx: Math.cos(a) * s,
                vy: Math.sin(a) * s,
                life: U.rand(0.3, 0.6),
                max: 0.6,
                size: U.rand(2, 4.5),
                color: Math.random() < 0.3 ? '#ffffff' : color,
                square: Math.random() < 0.5,
                rot: Math.random() * 6
            });
        }
    }

    ring(x, y, color, maxR = 40, life = 0.35) {
        this.rings.push({ x, y, color, maxR, life, max: life });
    }

    text(x, y, str, color = '#fff', size = 14, life = 0.9) {
        this.texts.push({ x, y, str, color, size, life, max: life });
    }

    // 画面中央付近に大きく出すメッセージ
    banner(str, color = '#fff', life = 1.6, y = 300, size = 26) {
        this.banners.push({ str, color, life, max: life, y, size });
    }

    shake(amp) {
        this.shakeAmp = Math.max(this.shakeAmp, amp);
    }

    stop(sec) {
        this.hitStop = Math.max(this.hitStop, sec);
    }

    flashScreen(color, amount = 0.35) {
        this.flash = amount;
        this.flashColor = color;
    }

    update(dt) {
        for (const p of this.particles) {
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= Math.exp(-4 * dt);
            p.vy *= Math.exp(-4 * dt);
            p.rot += dt * 8;
        }
        this.particles = this.particles.filter(p => p.life > 0);
        for (const t of this.texts) {
            t.life -= dt;
            t.y -= 28 * dt;
        }
        this.texts = this.texts.filter(t => t.life > 0);
        for (const r of this.rings) r.life -= dt;
        this.rings = this.rings.filter(r => r.life > 0);
        for (const b of this.banners) b.life -= dt;
        this.banners = this.banners.filter(b => b.life > 0);
        this.shakeAmp *= Math.exp(-10 * dt);
        if (this.shakeAmp < 0.2) this.shakeAmp = 0;
        this.flash = Math.max(0, this.flash - dt * 1.5);
    }
}
