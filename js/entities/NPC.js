// NPC (Non-Player Character) class

class NPC extends Entity {
    constructor(x, y, type = 'good', physicsWorld = null) {
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
        this.opacity = 1.0; // Opacity for fade-out effect
        
        // AI properties
        this.pathUpdateTimer = 0;
        this.pathUpdateInterval = 0.5; // Update path every 0.5 seconds
        this.queueOffset = null; // Cache queue position to avoid jittery movement
        
        // Physics constants
        this.ARRIVAL_DISTANCE = 5; // Distance at which NPC is considered to have reached target
        this.QUEUE_DISTANCE = 25; // Distance between NPCs in queue line
        this.QUEUE_WIDTH = 40; // Width of queue area on each side of escalator
        this.GAP_CLOSE_THRESHOLD = 35; // Distance threshold to detect a gap ahead
        this.GAP_CLOSE_SPEED = 20; // Speed at which NPCs close gaps in the queue
        this.FADE_DURATION = 0.5; // Duration of fade-out animation in seconds
        
        // Physics-based movement
        this.MOVE_FORCE_MULTIPLIER = type === 'bad' ? 0.8 : 0.5; // Bad NPCs push harder
        this.PERSONAL_SPACE = 25; // Minimum distance to maintain from others
        this.REPULSION_STRENGTH = type === 'good' ? 800 : 400; // Good NPCs avoid more
        this.CUT_IN_FORCE_MULTIPLIER = 0.002; // Force multiplier for cut-in behavior
        this.CUT_IN_DISTANCE_THRESHOLD = 40; // Distance threshold for cut-in attempts
        
        // Initialize physics body
        if (physicsWorld) {
            this.initPhysics(physicsWorld);
        }
    }
    
    initPhysics(physicsWorld) {
        // Create physics body based on shape
        if (this.shape === 'circle') {
            this.physicsBody = physicsWorld.createCircleBody(
                this.x, this.y, this.width / 2,
                {
                    frictionAir: 0.4, // Higher damping for realistic movement
                    density: this.type === 'bad' ? 0.0015 : 0.001, // Bad NPCs are "heavier"
                    restitution: 0.2
                }
            );
        } else {
            this.physicsBody = physicsWorld.createRectangleBody(
                this.x, this.y, this.width, this.height,
                {
                    frictionAir: 0.4,
                    density: this.type === 'bad' ? 0.0015 : 0.001,
                    restitution: 0.2
                }
            );
        }
        
        this.setPhysicsBody(this.physicsBody, physicsWorld);
    }

    setTarget(target) {
        this.target = target;
    }

    update(deltaTime, escalators, npcs, platform, physicsWorld) {
        if (!this.active) return;
        
        // Sync position from physics
        this.syncFromPhysics();
        
        this.pathUpdateTimer += deltaTime;
        
        if (this.state === 'walking') {
            this.walkToEscalator(deltaTime, escalators, npcs, platform, physicsWorld);
        } else if (this.state === 'queuing') {
            this.waitInQueue(deltaTime, physicsWorld);
        } else if (this.state === 'exiting') {
            this.exitPlatform(deltaTime, physicsWorld);
        }
    }

    walkToEscalator(deltaTime, escalators, npcs, platform, physicsWorld) {
        if (!this.target && escalators.length > 0) {
            // Find nearest escalator
            this.target = escalators.reduce((nearest, esc) => {
                const distToEsc = Utils.distance(this.x, this.y, esc.x, esc.y);
                const distToNearest = nearest ? Utils.distance(this.x, this.y, nearest.x, nearest.y) : Infinity;
                return distToEsc < distToNearest ? esc : nearest;
            }, null);
        }

        if (this.target && physicsWorld) {
            // Calculate target position
            let targetX, targetY;
            
            if (this.type === 'good') {
                // Good NPCs: Form a queue line approaching the escalator
                if (!this.queueOffset || this.pathUpdateTimer >= this.pathUpdateInterval) {
                    this.queueOffset = this.getQueueLinePosition(npcs);
                    this.pathUpdateTimer = 0;
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
                // Use physics to move towards target
                physicsWorld.moveTowards(this.physicsBody, targetX, targetY, this.speed);
                
                // Apply crowd avoidance forces
                this.applyCrowdAvoidance(npcs, physicsWorld);
                
                // Handle cut-in behavior for bad NPCs
                if (this.type === 'bad' && this.pathUpdateTimer >= this.pathUpdateInterval) {
                    this.attemptCutIn(npcs, physicsWorld);
                    this.pathUpdateTimer = 0;
                }
            } else {
                // Reached escalator
                this.state = 'queuing';
                this.queuePosition = this.target.addToQueue(this);
                
                // Stop physics movement
                if (this.physicsBody && typeof Matter !== 'undefined') {
                    Matter.Body.setVelocity(this.physicsBody, { x: 0, y: 0 });
                }
            }
        }
    }
    
    applyCrowdAvoidance(npcs, physicsWorld) {
        if (!this.physicsBody) return;
        
        for (const npc of npcs) {
            if (npc === this || !npc.active || !npc.physicsBody) continue;
            if (npc.state !== 'walking') continue;
            
            const dist = Utils.distance(this.x, this.y, npc.x, npc.y);
            
            // Apply repulsion if too close
            if (dist < this.PERSONAL_SPACE) {
                physicsWorld.applyRepulsion(
                    this.physicsBody,
                    npc.physicsBody,
                    this.REPULSION_STRENGTH
                );
            }
        }
    }

    getQueueLinePosition(npcs) {
        // Good NPCs should form a straight line directly behind the escalator
        
        // Calculate our distance once (optimization)
        const myDist = Utils.distance(this.x, this.y, this.target.x, this.target.y);
        
        // Count how many NPCs are already in line for this escalator
        let npcsAhead = 0;
        
        for (const npc of npcs) {
            if (npc === this || !npc.active || npc.type !== 'good') continue;
            if (npc.target !== this.target) continue;
            
            // Count NPCs that are closer to the escalator OR already in queue
            if (npc.state === 'queuing') {
                npcsAhead++;
            } else if (npc.state === 'walking') {
                const theirDist = Utils.distance(npc.x, npc.y, this.target.x, this.target.y);
                if (theirDist < myDist) {
                    npcsAhead++;
                }
            }
        }
        
        // Position in a straight line directly behind the escalator
        const queueOffset = {
            x: 0,
            y: this.QUEUE_DISTANCE * (npcsAhead + 1)
        };
        
        return queueOffset;
    }

    attemptCutIn(npcs, physicsWorld) {
        if (!this.physicsBody || !physicsWorld) return;
        if (typeof Matter === 'undefined') return;
        
        // Bad NPCs apply pushing force to nearby good NPCs
        for (const npc of npcs) {
            if (npc === this || !npc.active || !npc.physicsBody) continue;
            
            const dist = Utils.distance(this.x, this.y, npc.x, npc.y);
            
            if (npc.type === 'good' && dist < this.CUT_IN_DISTANCE_THRESHOLD) {
                // Push the good NPC
                const dx = npc.x - this.x;
                const dy = npc.y - this.y;
                if (dist > 0) {
                    const pushForce = {
                        x: (dx / dist) * this.CUT_IN_FORCE_MULTIPLIER * this.physicsBody.mass,
                        y: (dy / dist) * this.CUT_IN_FORCE_MULTIPLIER * this.physicsBody.mass
                    };
                    Matter.Body.applyForce(npc.physicsBody, npc.physicsBody.position, pushForce);
                }
            }
        }
    }

    findNPCAhead() {
        // Find the NPC directly ahead in the queue
        if (!this.target || this.queuePosition === null) return null;
        
        const targetPosition = this.queuePosition - 1;
        
        if (targetPosition < 0) return null;
        
        if (targetPosition < this.target.queue.length) {
            return this.target.queue[targetPosition];
        }
        
        return null;
    }

    waitInQueue(deltaTime, physicsWorld) {
        if (this.target && this.queuePosition !== null) {
            this.exitTime += deltaTime;
            
            // For good NPCs: Close gaps in the queue
            if (this.type === 'good' && physicsWorld) {
                const npcAhead = this.findNPCAhead();
                
                if (npcAhead) {
                    const distAhead = Utils.distance(this.x, this.y, npcAhead.x, npcAhead.y);
                    
                    if (distAhead > this.GAP_CLOSE_THRESHOLD) {
                        // Use physics to move toward NPC ahead
                        physicsWorld.moveTowards(
                            this.physicsBody,
                            npcAhead.x,
                            npcAhead.y,
                            this.GAP_CLOSE_SPEED
                        );
                    } else {
                        // Stop movement when close enough
                        if (typeof Matter !== 'undefined') {
                            Matter.Body.setVelocity(this.physicsBody, { x: 0, y: 0 });
                        }
                    }
                } else {
                    // No NPC ahead, move toward first queue position
                    const firstQueueX = this.target.x;
                    const firstQueueY = this.target.y + this.QUEUE_DISTANCE;
                    const distToQueuePos = Utils.distance(this.x, this.y, firstQueueX, firstQueueY);
                    
                    if (distToQueuePos > this.ARRIVAL_DISTANCE) {
                        physicsWorld.moveTowards(
                            this.physicsBody,
                            firstQueueX,
                            firstQueueY,
                            this.GAP_CLOSE_SPEED
                        );
                    } else {
                        if (typeof Matter !== 'undefined') {
                            Matter.Body.setVelocity(this.physicsBody, { x: 0, y: 0 });
                        }
                    }
                }
            }
            
            // Check if it's time to exit
            if (this.target.canExit(this)) {
                this.state = 'exiting';
                this.target.removeFromQueue(this);
                this.target.exitTimer = 0;
                this.queuePosition = null;
            }
        }
    }

    exitPlatform(deltaTime, physicsWorld) {
        // Fade out instead of moving off screen
        this.opacity -= deltaTime / this.FADE_DURATION;
        
        if (this.opacity <= 0) {
            this.opacity = 0;
            this.destroy(physicsWorld);
        }
    }

    render(ctx) {
        if (!this.active) return;
        
        // Apply opacity for fade-out effect
        ctx.save();
        ctx.globalAlpha = this.opacity;
        
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
        
        ctx.restore();
    }

    remove(physicsWorld) {
        this.destroy(physicsWorld);
        if (this.target) {
            this.target.removeFromQueue(this);
        }
    }
}

