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
        // Sleepers (railroad ties)
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 1;
        const sleeperCount = 15;
        for (let i = 0; i < sleeperCount; i++) {
            const x = this.x + (this.width / sleeperCount) * i;
            ctx.beginPath();
            ctx.moveTo(x, point.y - 20);
            ctx.lineTo(x, point.y + 20);
            ctx.stroke();
        }
    }

    render(ctx) {
        // Draw platform areas (lighter gray - where passengers walk)
        ctx.fillStyle = '#95a5a6'; // Lighter color for platforms
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw track areas (darker - where trains run)
        ctx.fillStyle = '#4a5256'; // Darker color for tracks
        for (const point of this.trainSpawnPoints) {
            ctx.fillRect(
                this.x,
                point.y - this.trackWidth / 2,
                this.width,
                this.trackWidth
            );
        }
        
        // Draw railroad tracks (two parallel lines on each track)
        ctx.strokeStyle = '#34495e';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        
        for (const point of this.trainSpawnPoints) {
            // Left rail
            ctx.beginPath();
            ctx.moveTo(this.x, point.y - 12);
            ctx.lineTo(this.x + this.width, point.y - 12);
            ctx.stroke();
            
            // Right rail
            ctx.beginPath();
            ctx.moveTo(this.x, point.y + 12);
            ctx.lineTo(this.x + this.width, point.y + 12);
            ctx.stroke();
            
            // Draw sleepers
            this.drawRailroadSleepers(ctx, point);
        }
        
        // Draw platform edge lines (yellow safety lines) between platforms and tracks
        ctx.strokeStyle = '#f39c12';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        
        for (const point of this.trainSpawnPoints) {
            // Upper platform edge (above track)
            ctx.beginPath();
            ctx.moveTo(this.x, point.y - this.trackWidth / 2);
            ctx.lineTo(this.x + this.width, point.y - this.trackWidth / 2);
            ctx.stroke();
            
            // Lower platform edge (below track)
            ctx.beginPath();
            ctx.moveTo(this.x, point.y + this.trackWidth / 2);
            ctx.lineTo(this.x + this.width, point.y + this.trackWidth / 2);
            ctx.stroke();
        }
        
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
