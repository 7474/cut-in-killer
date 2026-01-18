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
        this.queueOffset = null; // Cache queue position to avoid jittery movement
        
        // Collision constants
        this.PERSONAL_SPACE_MULTIPLIER = 1.5; // Minimum distance = width * this value
        this.AVOIDANCE_FORCE = 30; // Base force for pushing away from other NPCs
        this.ARRIVAL_DISTANCE = 5; // Distance at which NPC is considered to have reached target
        this.QUEUE_DISTANCE = 25; // Distance between NPCs in queue line
        this.QUEUE_WIDTH = 30; // Width of queue area on each side of escalator
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
            // Calculate target position
            let targetX, targetY;
            
            if (this.type === 'good') {
                // Good NPCs: Form a queue line approaching the escalator
                // Cache the queue offset to avoid recalculating every frame
                // This provides stable, non-jittery movement at the cost of
                // not dynamically adjusting position when queue composition changes
                if (!this.queueOffset) {
                    this.queueOffset = this.getQueueLinePosition(npcs);
                }
                targetX = this.target.x + this.queueOffset.x;
                targetY = this.target.y + this.queueOffset.y;
            } else {
                // Bad NPCs: Take shortest path directly to escalator
                targetX = this.target.x;
                targetY = this.target.y;
            }
            
            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > this.ARRIVAL_DISTANCE) {
                // Calculate desired movement
                let moveX = (dx / dist) * this.speed * deltaTime;
                let moveY = (dy / dist) * this.speed * deltaTime;
                
                // Apply collision avoidance
                const avoidance = this.calculateCollisionAvoidance(npcs);
                moveX += avoidance.x * deltaTime;
                moveY += avoidance.y * deltaTime;
                
                // Move towards target
                this.x += moveX;
                this.y += moveY;
                
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

    calculateCollisionAvoidance(npcs) {
        const avoidanceForce = { x: 0, y: 0 };
        const personalSpace = this.width * this.PERSONAL_SPACE_MULTIPLIER;
        
        for (const npc of npcs) {
            if (npc === this || !npc.active || npc.state !== 'walking') continue;
            
            const dist = Utils.distance(this.x, this.y, npc.x, npc.y);
            
            // If too close, push away
            if (dist < personalSpace && dist > 0) {
                const dx = this.x - npc.x;
                const dy = this.y - npc.y;
                const pushStrength = (personalSpace - dist) / personalSpace;
                
                // Bad NPCs are more aggressive: lower avoidance multiplier means they push through more
                // Good NPCs respect personal space: higher multiplier means stronger avoidance
                const avoidanceMultiplier = this.type === 'bad' ? 0.5 : 1.0;
                
                avoidanceForce.x += (dx / dist) * pushStrength * this.AVOIDANCE_FORCE * avoidanceMultiplier;
                avoidanceForce.y += (dy / dist) * pushStrength * this.AVOIDANCE_FORCE * avoidanceMultiplier;
            }
        }
        
        return avoidanceForce;
    }

    getQueueLinePosition(npcs) {
        // Good NPCs should form a line behind others heading to the same escalator
        
        // Calculate our distance once (optimization)
        const myDist = Utils.distance(this.x, this.y, this.target.x, this.target.y);
        
        // Count how many NPCs are ahead of us in line
        let npcsAhead = 0;
        
        for (const npc of npcs) {
            if (npc === this || !npc.active || npc.type !== 'good') continue;
            if (npc.target !== this.target) continue;
            
            // Check if this NPC is closer to the escalator
            const theirDist = Utils.distance(npc.x, npc.y, this.target.x, this.target.y);
            
            if (theirDist < myDist) {
                npcsAhead++;
            }
        }
        
        // Position in queue line extending away from escalator
        // Use a consistent offset based on initial X position relative to escalator
        const xOffsetSign = this.x > this.target.x ? 1 : -1;
        const queueOffset = {
            x: xOffsetSign * (this.QUEUE_WIDTH / 2),
            y: this.QUEUE_DISTANCE * (npcsAhead + 1)
        };
        
        return queueOffset;
    }

    attemptCutIn(npcs) {
        // Bad NPCs try to push past good NPCs
        for (const npc of npcs) {
            if (npc === this || !npc.active) continue;
            
            const dist = Utils.distance(this.x, this.y, npc.x, npc.y);
            
            if (npc.type === 'good' && dist < 30) {
                // Push the good NPC slightly
                const dx = npc.x - this.x;
                const dy = npc.y - this.y;
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
