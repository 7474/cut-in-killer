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
        this.PERSONAL_SPACE_MULTIPLIER = 2.5; // Minimum distance = width * this value (increased from 1.5 to prevent overlap)
        this.AVOIDANCE_FORCE = 60; // Base force for pushing away from other NPCs (increased from 30 for stronger separation)
        this.ARRIVAL_DISTANCE = 5; // Distance at which NPC is considered to have reached target
        this.QUEUE_DISTANCE = 10; // Distance between NPCs in queue line
        this.QUEUE_WIDTH = 40; // Width of queue area on each side of escalator (increased from 30 for wider spacing)
    }

    setTarget(target) {
        this.target = target;
    }

    update(deltaTime, escalators, npcs, platform) {
        if (!this.active) return;
        
        this.pathUpdateTimer += deltaTime;
        
        if (this.state === 'walking') {
            this.walkToEscalator(deltaTime, escalators, npcs, platform);
        } else if (this.state === 'queuing') {
            this.waitInQueue(deltaTime);
        } else if (this.state === 'exiting') {
            this.exitPlatform(deltaTime);
        }
    }

    walkToEscalator(deltaTime, escalators, npcs, platform) {
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
                // Update queue offset periodically to reflect changing queue composition
                if (!this.queueOffset || this.pathUpdateTimer >= this.pathUpdateInterval) {
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
                
                // Apply track avoidance if platform info is available
                if (platform) {
                    const trackAvoidance = this.avoidTracks(platform, moveX, moveY);
                    moveX = trackAvoidance.x;
                    moveY = trackAvoidance.y;
                }
                
                // Move towards target
                this.x += moveX;
                this.y += moveY;
                
                // Enforce minimum spacing to prevent overlap
                this.enforceMinimumSpacing(npcs);
                
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

    avoidTracks(platform, moveX, moveY) {
        // Avoid walking on track areas - stay on platforms
        const newY = this.y + moveY;
        const trackAreas = platform.getTrackAreas();
        
        for (const track of trackAreas) {
            // Check if we're about to enter or are in a track area
            if (newY >= track.minY && newY <= track.maxY) {
                // We're in or entering a track area - redirect movement
                
                // Determine which side of the track is closer
                const distToTop = Math.abs(this.y - track.minY);
                const distToBottom = Math.abs(this.y - track.maxY);
                
                // If already on track, push towards nearest edge
                if (this.y >= track.minY && this.y <= track.maxY) {
                    if (distToTop < distToBottom) {
                        // Push towards top (away from track, negative Y direction)
                        moveY = Math.min(moveY, track.minY - this.y - 2);
                    } else {
                        // Push towards bottom (away from track, positive Y direction)
                        moveY = Math.max(moveY, track.maxY - this.y + 2);
                    }
                } else {
                    // Prevent entering track - stop Y movement
                    if (newY > this.y && newY >= track.minY) {
                        // Moving down into track - stop at top edge
                        moveY = Math.max(0, track.minY - this.y - 1);
                    } else if (newY < this.y && newY <= track.maxY) {
                        // Moving up into track - stop at bottom edge
                        moveY = Math.min(0, track.maxY - this.y + 1);
                    }
                }
                break;
            }
        }
        
        return { x: moveX, y: moveY };
    }

    getQueueLinePosition(npcs) {
        // Good NPCs should form a straight line directly behind the escalator
        
        // Count how many NPCs are already in line for this escalator
        // This includes both NPCs walking to the escalator and those already queuing
        let npcsAhead = 0;
        
        for (const npc of npcs) {
            if (npc === this || !npc.active || npc.type !== 'good') continue;
            if (npc.target !== this.target) continue;
            
            // Count NPCs that are closer to the escalator OR already in queue
            if (npc.state === 'queuing') {
                // NPCs already queuing are always ahead
                npcsAhead++;
            } else if (npc.state === 'walking') {
                // For walking NPCs, check distance
                const myDist = Utils.distance(this.x, this.y, this.target.x, this.target.y);
                const theirDist = Utils.distance(npc.x, npc.y, this.target.x, this.target.y);
                
                if (theirDist < myDist) {
                    npcsAhead++;
                }
            }
        }
        
        // Position in a straight line directly behind the escalator
        // No X offset - everyone lines up at the same X position as the escalator
        const queueOffset = {
            x: 0,  // Directly in line with escalator
            y: this.QUEUE_DISTANCE * (npcsAhead + 1)  // Extend line downward
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

    enforceMinimumSpacing(npcs) {
        // Ensure NPCs don't get too close to each other
        const minSpacing = this.width * this.PERSONAL_SPACE_MULTIPLIER;
        
        for (const npc of npcs) {
            if (npc === this || !npc.active || npc.state !== 'walking') continue;
            
            const dist = Utils.distance(this.x, this.y, npc.x, npc.y);
            
            // If too close, push them apart equally
            // Skip if distance is too small to avoid division issues
            if (dist < minSpacing && dist > 0.1) {
                const overlap = minSpacing - dist;
                const dx = this.x - npc.x;
                const dy = this.y - npc.y;
                const pushDistance = overlap / 2;
                
                // Normalize and push both NPCs away from each other
                const normalizedDx = dx / dist;
                const normalizedDy = dy / dist;
                
                this.x += normalizedDx * pushDistance;
                this.y += normalizedDy * pushDistance;
                
                npc.x -= normalizedDx * pushDistance;
                npc.y -= normalizedDy * pushDistance;
            }
        }
    }

    waitInQueue(deltaTime) {
        if (this.target && this.queuePosition !== null) {
            this.exitTime += deltaTime;
            
            // Check if it's time to exit
            if (this.target.canExit(this)) {
                this.state = 'exiting';
                // Remove from queue and reset escalator timer
                this.target.removeFromQueue(this);
                this.target.exitTimer = 0;
                this.queuePosition = null;
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
