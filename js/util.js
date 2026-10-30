// 汎用ユーティリティ

const U = {
    rand(min, max) {
        return min + Math.random() * (max - min);
    },
    randInt(min, max) {
        return Math.floor(U.rand(min, max + 1));
    },
    pick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    },
    // { key: weight } から重み付きで 1 つ選ぶ
    pickWeighted(weights) {
        const entries = Object.entries(weights);
        let total = 0;
        for (const [, w] of entries) total += w;
        let r = Math.random() * total;
        for (const [k, w] of entries) {
            r -= w;
            if (r <= 0) return k;
        }
        return entries[entries.length - 1][0];
    },
    clamp(v, min, max) {
        return v < min ? min : v > max ? max : v;
    },
    lerp(a, b, t) {
        return a + (b - a) * t;
    },
    dist(ax, ay, bx, by) {
        return Math.hypot(bx - ax, by - ay);
    },
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    },
    easeInCubic(t) {
        return t * t * t;
    },
    // 点 (px,py) と線分 (ax,ay)-(bx,by) の距離と線分上の位置 t
    pointSegment(px, py, ax, ay, bx, by) {
        const dx = bx - ax;
        const dy = by - ay;
        const len2 = dx * dx + dy * dy || 1;
        const t = U.clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
        return { d: U.dist(px, py, ax + dx * t, ay + dy * t), t };
    }
};

// localStorage は使えない環境（プライベートモード等）があるので必ず例外を握りつぶす
const Store = {
    KEY: 'cut-in-killer:v2',
    load() {
        try {
            return JSON.parse(localStorage.getItem(Store.KEY)) || {};
        } catch (e) {
            return {};
        }
    },
    save(data) {
        try {
            localStorage.setItem(Store.KEY, JSON.stringify(data));
        } catch (e) {
            // 保存できなくてもゲームは続行する
        }
    },
    get(key, fallback) {
        const v = Store.load()[key];
        return v === undefined ? fallback : v;
    },
    set(key, value) {
        const data = Store.load();
        data[key] = value;
        Store.save(data);
    }
};
