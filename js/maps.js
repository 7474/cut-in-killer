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
            { x: 430, y: 400 }   // Right platform exit (center)
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
            { x: 270, y: 400 },   // Center-left exit
            { x: 330, y: 400 }    // Center-right exit
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
            { x: 60, y: 400 },    // Left platform exit (center)
            { x: 225, y: 400 },   // Platform between tracks 1 & 2 (center)
            { x: 380, y: 400 }    // Platform between tracks 2 & 3 (center)
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
