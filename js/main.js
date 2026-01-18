// Main application controller

window.gameInstance = {
    currentGame: null,
    selectedMap: null,
    selectedAttack: 'bodyslam',
    
    init() {
        this.setupMenuScreen();
        this.setupEventListeners();
        this.showScreen('menu-screen');
    },
    
    setupMenuScreen() {
        // Populate map list
        const mapList = document.getElementById('map-list');
        mapList.innerHTML = '';
        
        const maps = getAllMaps();
        maps.forEach((map, index) => {
            const mapItem = document.createElement('div');
            mapItem.className = 'map-item';
            if (index === 0) {
                mapItem.classList.add('selected');
                this.selectedMap = map.id;
            }
            mapItem.dataset.mapId = map.id;
            
            const highScore = Storage.getMapHighScore(map.id);
            
            mapItem.innerHTML = `
                <h3>${map.name}</h3>
                <p>${map.description}</p>
                <div class="highscore">ハイスコア: ${highScore}</div>
            `;
            
            mapItem.addEventListener('click', () => {
                document.querySelectorAll('.map-item').forEach(item => {
                    item.classList.remove('selected');
                });
                mapItem.classList.add('selected');
                this.selectedMap = map.id;
            });
            
            mapList.appendChild(mapItem);
        });
    },
    
    setupEventListeners() {
        // Attack selection
        document.querySelectorAll('.attack-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.attack-btn').forEach(b => {
                    b.classList.remove('selected');
                });
                btn.classList.add('selected');
                this.selectedAttack = btn.dataset.attack;
            });
        });
        
        // Select first attack by default
        document.querySelector('.attack-btn').classList.add('selected');
        
        // Start button
        document.getElementById('start-btn').addEventListener('click', () => {
            this.startGame();
        });
        
        // Restart button
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.startGame();
        });
        
        // Menu button
        document.getElementById('menu-btn').addEventListener('click', () => {
            this.setupMenuScreen(); // Refresh high scores
            this.showScreen('menu-screen');
        });
    },
    
    startGame() {
        const mapConfig = getMapById(this.selectedMap);
        const canvas = document.getElementById('game-canvas');
        
        this.currentGame = new Game(canvas, mapConfig, this.selectedAttack);
        this.showScreen('game-screen');
        
        // Small delay to ensure screen is shown
        setTimeout(() => {
            this.currentGame.start();
        }, 100);
    },
    
    onGameOver(result) {
        // Check for high score
        const isNewHighScore = Storage.saveHighScore(result.mapId, result.score);
        
        // Update game over screen
        document.getElementById('final-score').textContent = result.score;
        
        const highScoreMsg = document.getElementById('highscore-msg');
        if (isNewHighScore) {
            highScoreMsg.textContent = '🎉 新記録達成！ 🎉';
            highScoreMsg.style.display = 'block';
        } else {
            const currentHigh = Storage.getMapHighScore(result.mapId);
            highScoreMsg.textContent = `ハイスコア: ${currentHigh}`;
            highScoreMsg.style.display = 'block';
        }
        
        this.showScreen('gameover-screen');
    },
    
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.gameInstance.init();
    });
} else {
    window.gameInstance.init();
}
