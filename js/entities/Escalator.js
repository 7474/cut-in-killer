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
        
        // Entrance restriction - only allow entry from bottom
        this.entranceDirection = 'bottom'; // bottom, top, left, right
        this.entranceZoneHeight = 80; // Zone height from which NPCs can enter
        this.entranceZoneWidth = this.width + 40; // Zone width (escalator width + buffer)
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
    
    isInEntranceZone(npcX, npcY) {
        // Check if NPC is in the valid entrance zone (bottom only)
        // NPCs must be below the escalator and within the entrance zone
        
        const relativeX = npcX - this.x;
        const relativeY = npcY - this.y;
        
        switch (this.entranceDirection) {
            case 'bottom':
                // NPC must be below the escalator (positive Y) and within horizontal bounds
                return relativeY > this.height / 2 && 
                       relativeY < this.height / 2 + this.entranceZoneHeight &&
                       Math.abs(relativeX) < this.entranceZoneWidth / 2;
            case 'top':
                return relativeY < -this.height / 2 && 
                       relativeY > -this.height / 2 - this.entranceZoneHeight &&
                       Math.abs(relativeX) < this.entranceZoneWidth / 2;
            case 'left':
                return relativeX < -this.width / 2 && 
                       relativeX > -this.width / 2 - this.entranceZoneHeight &&
                       Math.abs(relativeY) < this.entranceZoneWidth / 2;
            case 'right':
                return relativeX > this.width / 2 && 
                       relativeX < this.width / 2 + this.entranceZoneHeight &&
                       Math.abs(relativeY) < this.entranceZoneWidth / 2;
            default:
                return true; // No restriction if direction is invalid
        }
    }

    update(deltaTime) {
        this.exitTimer += deltaTime;
    }

    render(ctx) {
        if (!this.active) return;
        
        // Draw entrance zone (semi-transparent) for debugging
        if (this.entranceDirection === 'bottom') {
            ctx.fillStyle = 'rgba(46, 204, 113, 0.15)'; // Light green transparent
            ctx.fillRect(
                this.x - this.entranceZoneWidth / 2,
                this.y + this.height / 2,
                this.entranceZoneWidth,
                this.entranceZoneHeight
            );
        }
        
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
