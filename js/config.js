// ゲーム全体の定数とステージ定義
// 座標系は 360x640 の論理ピクセル（縦画面）。描画時に画面サイズへ拡大縮小する。

const CK = {};

CK.W = 360;
CK.H = 640;

CK.MOB_RADIUS = 7.5;
CK.TAP_RADIUS = 22;
CK.SWIPE_GRAB_RADIUS = 26;
CK.QUEUE_SPACING = 15;
CK.COMBO_WINDOW = 2.5;

// 平穏度（ライフ）の増減
CK.ORDER = {
    MAX: 100,
    CUT_IN: -3,          // 割り込みが列に入った瞬間
    BAD_ESCAPE: -8,      // 迷惑客がそのまま出ていった／乗っていった
    DOOR_RUSH: -5,       // 降りる人より先に乗り込んだ
    BUMP: -2,            // 歩きスマホが人にぶつかって転ばせた
    MISFIRE: -10,        // 善良な客をはじき飛ばしてしまった
    COLLATERAL: -1,      // 飛ばした迷惑客が善良な客を巻き込んだ
    GOOD_EXIT: 0.6,      // 善良な客が無事に改札へ
    CROWD_DRAIN: 3       // 混雑超過時の毎秒減少量
};

CK.SCORE = {
    GOOD_EXIT: 10,
    GOOD_BOARD: 5,
    KO: 100,
    CHAIN: 80,
    TRACK: 50,
    WALL: 30,
    TRAIN_CARRY: 200,
    MISFIRE: -150,
    BAD_ESCAPE: -50
};

// 迷惑客の種類
CK.BAD_TYPES = {
    cutter: { label: '割り込み客', color: '#e4572e', speed: [84, 96], mass: 5 },
    phone: { label: '歩きスマホ', color: '#8e6cc9', speed: [18, 24], mass: 1.4 },
    blocker: { label: 'ドア前陣取り', color: '#b5835a', speed: [40, 48], mass: 8 }
};

CK.GOOD_COLORS = ['#3d5a80', '#5c677d', '#7d8597', '#2b2d42', '#4f6d7a', '#6c757d', '#8fa3b0', '#8d99ae'];

// ステージ定義
// tracks[].edge: ホームの縁の x 座標、side: ホームが線路から見てどちら側か (+1=右, -1=左)
CK.STAGES = [
    {
        id: 'shinjuku',
        name: '新宿駅',
        subtitle: '片面ホーム・まずは基本',
        duration: 90,
        platform: { x0: 84, x1: 350, top: 128, bottom: 640 },
        escalators: [{ cx: 230 }],
        stairs: { cx: 300, y: 'top' },
        tracks: [
            { x0: 0, x1: 84, edge: 84, side: 1, first: 1.5, interval: 15, pattern: ['stop'] }
        ],
        doors: [205, 315, 425, 535],
        alightPerDoor: [3, 6],
        badRatio: [0.14, 0.28],
        badMix: { cutter: 1 },
        boarderRate: 0.25,
        blockerRatio: 0,
        laneInterval: 1.15,
        crowdCap: 45,
        ranks: [7000, 4500, 2000]
    },
    {
        id: 'shibuya',
        name: '渋谷駅',
        subtitle: '島式ホーム・歩きスマホ出現',
        duration: 90,
        platform: { x0: 84, x1: 276, top: 128, bottom: 640 },
        escalators: [{ cx: 150 }],
        stairs: { cx: 228, y: 'top' },
        tracks: [
            { x0: 0, x1: 84, edge: 84, side: 1, first: 1.5, interval: 14, pattern: ['stop'] },
            { x0: 276, x1: 360, edge: 276, side: -1, first: 8.5, interval: 14, pattern: ['stop'] }
        ],
        doors: [205, 315, 425, 535],
        alightPerDoor: [3, 5],
        badRatio: [0.16, 0.3],
        badMix: { cutter: 0.6, phone: 0.4 },
        boarderRate: 0.45,
        blockerRatio: 0.18,
        laneInterval: 1.0,
        crowdCap: 55,
        ranks: [14000, 9000, 4000]
    },
    {
        id: 'tokyo',
        name: '東京駅',
        subtitle: '通過列車あり・総力戦',
        duration: 120,
        platform: { x0: 84, x1: 276, top: 128, bottom: 596 },
        escalators: [{ cx: 128 }, { cx: 232 }],
        stairs: { cx: 180, y: 'bottom' },
        tracks: [
            { x0: 0, x1: 84, edge: 84, side: 1, first: 1.5, interval: 13, pattern: ['stop'] },
            { x0: 276, x1: 360, edge: 276, side: -1, first: 6, interval: 9, pattern: ['express', 'stop'] }
        ],
        doors: [205, 315, 425, 535],
        alightPerDoor: [3, 6],
        badRatio: [0.18, 0.32],
        badMix: { cutter: 0.5, phone: 0.5 },
        boarderRate: 0.5,
        blockerRatio: 0.2,
        laneInterval: 1.3,
        crowdCap: 60,
        ranks: [20000, 13000, 6000]
    }
];

CK.ESCALATOR = { width: 34, top: 44 };
CK.HUD_HEIGHT = 40;
