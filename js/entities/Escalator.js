// Escalator entity where NPCs queue and exit

class Escalator extends Entity {
    constructor(x, y, capacity = 1) {
        super(x, y);
        this.width = 40;
        this.height = 60;
        this.color = '#3498db';
        this.capacity = capacity; // How many NPCs can exit at once
        this.queue = [];
        this.exitInterval = 2; // seconds between exits
        this.exitTimer = 0;
    }

    addToQueue(npc) {
        if (!this.queue.includes(npc)) {
            this.queue.push(npc);
        }
        return this.queue.indexOf(npc);
    }

    removeFromQueue(npc) {
        const index = this.queue.indexOf(npc);
        if (index !== -1) {
            this.queue.splice(index, 1);
        }
    }

    canExit(npc) {
        const index = this.queue.indexOf(npc);
        if (index === -1) return false;
        
        // Only first few NPCs in queue can exit
        return index < this.capacity && this.exitTimer >= this.exitInterval;
    }

    update(deltaTime) {
        this.exitTimer += deltaTime;
    }

    render(ctx) {
        if (!this.active) return;
        
        // Draw escalator base
        ctx.fillStyle = this.color;
        ctx.fillRect(
            this.x - this.width / 2,
            this.y - this.height / 2,
            this.width,
            this.height
        );
        
        // Draw escalator steps (animated)
        ctx.strokeStyle = '#2980b9';
        ctx.lineWidth = 2;
        const stepCount = 5;
        const stepHeight = this.height / stepCount;
        
        for (let i = 0; i < stepCount; i++) {
            const y = this.y - this.height / 2 + i * stepHeight;
            ctx.beginPath();
            ctx.moveTo(this.x - this.width / 2, y);
            ctx.lineTo(this.x + this.width / 2, y);
            ctx.stroke();
        }
        
        // Draw arrow pointing up
        ctx.fillStyle = '#2ecc71';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.height / 4 - 10);
        ctx.lineTo(this.x - 8, this.y - this.height / 4 + 5);
        ctx.lineTo(this.x + 8, this.y - this.height / 4 + 5);
        ctx.closePath();
        ctx.fill();
        
        // Draw queue count
        if (this.queue.length > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(
                this.queue.length.toString(),
                this.x,
                this.y + this.height / 2 + 20
            );
        }
    }

    getQueueLength() {
        return this.queue.length;
    }
}
