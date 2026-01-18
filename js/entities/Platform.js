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
        
        // Draw platform markings
        ctx.strokeStyle = '#ecf0f1';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        
        // Center line
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height);
        ctx.stroke();
        
        // Safety lines
        ctx.strokeStyle = '#f39c12';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        
        for (const point of this.trainSpawnPoints) {
            ctx.beginPath();
            ctx.moveTo(this.x, point.y);
            ctx.lineTo(this.x + this.width, point.y);
            ctx.stroke();
        }
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
