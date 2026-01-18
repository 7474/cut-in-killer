// Map configurations

const Maps = {
    shinjuku: {
        id: 'shinjuku',
        name: '新宿駅',
        description: 'シンプルな単線ホーム',
        width: 600,
        height: 800,
        // Single track - train arrives from bottom, platform on right side
        trainSpawnPoints: [
            { x: 250, y: 650 }  // Center-left, lower part of screen
        ],
        escalatorPositions: [
            { x: 360, y: 80 },  // Right platform exit (left)
            { x: 500, y: 80 }   // Right platform exit (right)
        ],
        trainInterval: 10, // seconds between trains
        gameDuration: 120 // 2 minutes
    },
    
    shibuya: {
        id: 'shibuya',
        name: '渋谷駅',
        description: '複線島式ホーム（2線）',
        width: 600,
        height: 800,
        // Island platform - two tracks with platform in center
        trainSpawnPoints: [
            { x: 200, y: 650 },  // Left track
            { x: 400, y: 650 }   // Right track
        ],
        escalatorPositions: [
            { x: 255, y: 80 },   // Center-left exit
            { x: 305, y: 80 },   // Center exit
            { x: 355, y: 80 }    // Center-right exit
        ],
        trainInterval: 8,
        gameDuration: 120
    },
    
    tokyo: {
        id: 'tokyo',
        name: '東京駅',
        description: '大型島式ホーム（3線）',
        width: 600,
        height: 800,
        // Large island platform with 3 tracks
        trainSpawnPoints: [
            { x: 150, y: 650 },  // Left track
            { x: 300, y: 650 },  // Center track
            { x: 450, y: 650 }   // Right track
        ],
        escalatorPositions: [
            { x: 60, y: 80 },    // Left platform exit
            { x: 225, y: 80 },   // Platform between tracks 1 & 2
            { x: 355, y: 80 },   // Platform between tracks 2 & 3 (left)
            { x: 405, y: 80 },   // Platform between tracks 2 & 3 (right)
            { x: 540, y: 80 }    // Right platform exit
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
