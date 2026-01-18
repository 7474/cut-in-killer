// Platform/Map entity

class Platform extends Entity {
    constructor(config) {
        super(config.x || 0, config.y || 0);
        this.width = config.width || 600;
        this.height = config.height || 800;
        this.color = '#7f8c8d';
        this.trainSpawnPoints = config.trainSpawnPoints || [];
        this.escalatorPositions = config.escalatorPositions || [];
    }

    render(ctx) {
        // Draw platform base
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw track areas (darker) for each train spawn point
        ctx.fillStyle = '#5a6266'; // Darker color for tracks
        for (const point of this.trainSpawnPoints) {
            // Draw track area - a horizontal strip where trains run
            const trackWidth = 60; // Width of track area
            ctx.fillRect(
                this.x,
                point.y - trackWidth / 2,
                this.width,
                trackWidth
            );
        }
        
        // Draw platform edge lines (yellow safety lines)
        ctx.strokeStyle = '#f39c12';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        
        for (const point of this.trainSpawnPoints) {
            const trackWidth = 60;
            // Upper edge of track
            ctx.beginPath();
            ctx.moveTo(this.x, point.y - trackWidth / 2);
            ctx.lineTo(this.x + this.width, point.y - trackWidth / 2);
            ctx.stroke();
            
            // Lower edge of track
            ctx.beginPath();
            ctx.moveTo(this.x, point.y + trackWidth / 2);
            ctx.lineTo(this.x + this.width, point.y + trackWidth / 2);
            ctx.stroke();
        }
        
        // Draw center line on platform (not on tracks)
        ctx.strokeStyle = '#ecf0f1';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    getTrainSpawnPoint(index = 0) {
        if (this.trainSpawnPoints.length === 0) {
            return { x: this.x + this.width / 2, y: this.y + 100 };
        }
        const point = this.trainSpawnPoints[index % this.trainSpawnPoints.length];
        return { x: this.x + this.width / 2, y: point.y };
    }

    getEscalatorPositions() {
        return this.escalatorPositions.map(pos => ({
            x: this.x + pos.x,
            y: this.y + pos.y
        }));
    }
}
