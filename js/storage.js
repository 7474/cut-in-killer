// Local storage management for high scores

const Storage = {
    HIGHSCORE_KEY: 'cutinkiller_highscores',

    // Get all high scores
    getHighScores() {
        const data = localStorage.getItem(this.HIGHSCORE_KEY);
        return data ? JSON.parse(data) : {};
    },

    // Get high score for a specific map
    getMapHighScore(mapId) {
        const scores = this.getHighScores();
        return scores[mapId] || 0;
    },

    // Save high score for a map
    saveHighScore(mapId, score) {
        const scores = this.getHighScores();
        const currentHigh = scores[mapId] || 0;
        
        if (score > currentHigh) {
            scores[mapId] = score;
            localStorage.setItem(this.HIGHSCORE_KEY, JSON.stringify(scores));
            return true; // New high score
        }
        
        return false; // Not a new high score
    },

    // Clear all high scores
    clearHighScores() {
        localStorage.removeItem(this.HIGHSCORE_KEY);
    }
};
