// Map configurations

const Maps = {
    shinjuku: {
        id: 'shinjuku',
        name: '新宿駅',
        description: 'シンプルな1ホーム構成',
        width: 600,
        height: 800,
        trainSpawnPoints: [
            { x: 300, y: 200 }
        ],
        escalatorPositions: [
            { x: 200, y: 50 },
            { x: 400, y: 50 }
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
            { x: 300, y: 200 },
            { x: 300, y: 400 }
        ],
        escalatorPositions: [
            { x: 150, y: 50 },
            { x: 300, y: 50 },
            { x: 450, y: 50 }
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
            { x: 300, y: 150 },
            { x: 300, y: 350 },
            { x: 300, y: 550 }
        ],
        escalatorPositions: [
            { x: 120, y: 50 },
            { x: 240, y: 50 },
            { x: 360, y: 50 },
            { x: 480, y: 50 }
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
