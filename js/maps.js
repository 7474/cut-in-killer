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
            { x: 450, y: 80 },  // Right platform exit (first)
            { x: 450, y: 140 }  // Right platform exit (second, stacked vertically for capacity)
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
            { x: 270, y: 80 },   // Center-left exit (moved from track edge)
            { x: 300, y: 80 },   // Center exit
            { x: 330, y: 80 }    // Center-right exit (moved from track edge)
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
            { x: 375, y: 80 },   // Platform between tracks 2 & 3 (first exit)
            { x: 375, y: 140 },  // Platform between tracks 2 & 3 (second exit, stacked vertically for capacity)
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
