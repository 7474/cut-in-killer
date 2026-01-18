// Map configurations

const Maps = {
    shinjuku: {
        id: 'shinjuku',
        name: '新宿駅',
        description: 'シンプルな1ホーム構成',
        width: 600,
        height: 800,
        trainSpawnPoints: [
            { x: 300, y: 300 }
        ],
        escalatorPositions: [
            { x: 200, y: 80 },
            { x: 400, y: 80 }
        ],
        trainInterval: 10, // seconds between trains
        gameDuration: 120 // 2 minutes
    },
    
    shibuya: {
        id: 'shibuya',
        name: '渋谷駅',
        description: '混雑する2ホーム構成',
        width: 600,
        height: 800,
        trainSpawnPoints: [
            { x: 300, y: 280 },
            { x: 300, y: 480 }
        ],
        escalatorPositions: [
            { x: 150, y: 80 },
            { x: 300, y: 80 },
            { x: 450, y: 80 }
        ],
        trainInterval: 8,
        gameDuration: 120
    },
    
    tokyo: {
        id: 'tokyo',
        name: '東京駅',
        description: '超高速列車の3ホーム',
        width: 600,
        height: 800,
        trainSpawnPoints: [
            { x: 300, y: 220 },
            { x: 300, y: 400 },
            { x: 300, y: 580 }
        ],
        escalatorPositions: [
            { x: 120, y: 80 },
            { x: 240, y: 80 },
            { x: 360, y: 80 },
            { x: 480, y: 80 }
        ],
        trainInterval: 6,
        gameDuration: 180 // 3 minutes
    }
};

// Get array of all maps
function getAllMaps() {
    return Object.values(Maps);
}

// Get specific map by id
function getMapById(id) {
    return Maps[id] || Maps.shinjuku;
}
