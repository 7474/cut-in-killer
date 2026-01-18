// Platform/Map entity

class Platform extends Entity {
    constructor(config) {
        super(config.x || 0, config.y || 0);
        this.width = config.width || 600;
        this.height = config.height || 800;
        this.color = '#7f8c8d';
        this.trainSpawnPoints = config.trainSpawnPoints || [];
        this.escalatorPositions = config.escalatorPositions || [];
        this.trackWidth = 60; // Width of track area
    }

    drawRailroadSleepers(ctx, point) {
        // Sleepers (railroad ties) - horizontal bars across vertical track
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 1;
        const sleeperCount = 20;
        for (let i = 0; i < sleeperCount; i++) {
            const y = this.y + (this.height / sleeperCount) * i;
            ctx.beginPath();
            ctx.moveTo(point.x - 20, y);
            ctx.lineTo(point.x + 20, y);
            ctx.stroke();
        }
    }

    render(ctx) {
        // Draw platform areas (lighter gray - where passengers walk)
        ctx.fillStyle = '#95a5a6'; // Lighter color for platforms
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw track areas (darker - where trains run) - vertical tracks
        ctx.fillStyle = '#4a5256'; // Darker color for tracks
        for (const point of this.trainSpawnPoints) {
            ctx.fillRect(
                point.x - this.trackWidth / 2,
                this.y,
                this.trackWidth,
                this.height
            );
        }
        
        // Draw railroad tracks (two parallel lines on each track running vertically)
        ctx.strokeStyle = '#34495e';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        
        for (const point of this.trainSpawnPoints) {
            // Left rail
            ctx.beginPath();
            ctx.moveTo(point.x - 12, this.y);
            ctx.lineTo(point.x - 12, this.y + this.height);
            ctx.stroke();
            
            // Right rail
            ctx.beginPath();
            ctx.moveTo(point.x + 12, this.y);
            ctx.lineTo(point.x + 12, this.y + this.height);
            ctx.stroke();
            
            // Draw sleepers
            this.drawRailroadSleepers(ctx, point);
        }
        
        // Draw platform edge lines (yellow safety lines) between platforms and tracks
        ctx.strokeStyle = '#f39c12';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        
        for (const point of this.trainSpawnPoints) {
            // Left platform edge (left of track)
            ctx.beginPath();
            ctx.moveTo(point.x - this.trackWidth / 2, this.y);
            ctx.lineTo(point.x - this.trackWidth / 2, this.y + this.height);
            ctx.stroke();
            
            // Right platform edge (right of track)
            ctx.beginPath();
            ctx.moveTo(point.x + this.trackWidth / 2, this.y);
            ctx.lineTo(point.x + this.trackWidth / 2, this.y + this.height);
            ctx.stroke();
        }
        
        ctx.setLineDash([]);
    }

    getTrainSpawnPoint(index = 0) {
        if (this.trainSpawnPoints.length === 0) {
            return { x: this.x + this.width / 2, y: this.y + this.height - 100 };
        }
        const point = this.trainSpawnPoints[index % this.trainSpawnPoints.length];
        return { x: point.x, y: this.y + this.height - 100 };
    }

    getEscalatorPositions() {
        return this.escalatorPositions.map(pos => ({
            x: this.x + pos.x,
            y: this.y + pos.y
        }));
    }

    getTrackAreas() {
        // Returns array of track area bounds for collision detection (vertical tracks)
        return this.trainSpawnPoints.map(point => ({
            minX: point.x - this.trackWidth / 2,
            maxX: point.x + this.trackWidth / 2,
            centerX: point.x
        }));
    }

    isOnTrack(x, y) {
        // Check if a position is on a track area (vertical tracks)
        for (const point of this.trainSpawnPoints) {
            const minX = point.x - this.trackWidth / 2;
            const maxX = point.x + this.trackWidth / 2;
            if (x >= minX && x <= maxX) {
                return true;
            }
        }
        return false;
    }
}
