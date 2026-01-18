// NPC (Non-Player Character) class

class NPC extends Entity {
    constructor(x, y, type = 'good') {
        super(x, y);
        this.type = type; // 'good' or 'bad'
        this.width = 15;
        this.height = 15;
        this.speed = type === 'good' ? 30 : 50; // bad NPCs move faster
        this.state = 'walking'; // walking, queuing, exiting
        this.target = null;
        this.queuePosition = null;
        this.exitTime = 0;
        
        // Visual properties
        this.color = type === 'good' ? '#4ecdc4' : '#ff6b6b';
        this.shape = type === 'good' ? 'circle' : 'square';
        
        // AI properties
        this.pathUpdateTimer = 0;
        this.pathUpdateInterval = 0.5; // Update path every 0.5 seconds
    }

    setTarget(target) {
        this.target = target;
    }

    update(deltaTime, escalators, npcs) {
        if (!this.active) return;
        
        this.pathUpdateTimer += deltaTime;
        
        if (this.state === 'walking') {
            this.walkToEscalator(deltaTime, escalators, npcs);
        } else if (this.state === 'queuing') {
            this.waitInQueue(deltaTime);
        } else if (this.state === 'exiting') {
            this.exitPlatform(deltaTime);
        }
    }

    walkToEscalator(deltaTime, escalators, npcs) {
        if (!this.target && escalators.length > 0) {
            // Find nearest escalator
            this.target = escalators.reduce((nearest, esc) => {
                const distToEsc = Utils.distance(this.x, this.y, esc.x, esc.y);
                const distToNearest = nearest ? Utils.distance(this.x, this.y, nearest.x, nearest.y) : Infinity;
                return distToEsc < distToNearest ? esc : nearest;
            }, null);
        }

        if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 5) {
                // Move towards target
                this.x += (dx / dist) * this.speed * deltaTime;
                this.y += (dy / dist) * this.speed * deltaTime;
                
                // Handle cut-in behavior for bad NPCs
                if (this.type === 'bad' && this.pathUpdateTimer >= this.pathUpdateInterval) {
                    this.attemptCutIn(npcs);
                    this.pathUpdateTimer = 0;
                }
            } else {
                // Reached escalator
                this.state = 'queuing';
                this.queuePosition = this.target.addToQueue(this);
            }
        }
    }

    attemptCutIn(npcs) {
        // Bad NPCs try to push past good NPCs
        for (const npc of npcs) {
            if (npc === this || !npc.active) continue;
            if (npc.type === 'good' && Utils.distance(this.x, this.y, npc.x, npc.y) < 30) {
                // Push the good NPC slightly
                const dx = npc.x - this.x;
                const dy = npc.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    npc.x += (dx / dist) * 5;
                    npc.y += (dy / dist) * 5;
                }
            }
        }
    }

    waitInQueue(deltaTime) {
        if (this.target && this.queuePosition !== null) {
            this.exitTime += deltaTime;
            
            // Check if it's time to exit
            if (this.target.canExit(this)) {
                this.state = 'exiting';
            }
        }
    }

    exitPlatform(deltaTime) {
        // Move up (off screen)
        this.y -= 100 * deltaTime;
        
        if (this.y < -50) {
            this.active = false;
        }
    }

    render(ctx) {
        if (!this.active) return;
        
        ctx.fillStyle = this.color;
        
        if (this.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillRect(
                this.x - this.width / 2,
                this.y - this.height / 2,
                this.width,
                this.height
            );
        }
        
        // Draw direction indicator
        if (this.state === 'walking' && this.target) {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(
                    this.x + (dx / dist) * 10,
                    this.y + (dy / dist) * 10
                );
            }
            ctx.stroke();
        }
    }

    remove() {
        this.active = false;
        if (this.target) {
            this.target.removeFromQueue(this);
        }
    }
}
