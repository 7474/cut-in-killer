// NPC (Non-Player Character) class

class NPC extends Entity {
    constructor(x, y, type = 'good') {
        super(x, y);
        this.type = type; // 'good' or 'bad'
        this.width = 15;
        this.height = 15;
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
        
        // Physics properties
        this.velocity = { x: 0, y: 0 };
        this.acceleration = { x: 0, y: 0 };
        this.mass = type === 'good' ? 1.0 : 1.2; // Bad NPCs are slightly heavier
        this.maxSpeed = type === 'good' ? 30 : 50; // bad NPCs move faster
        this.maxForce = type === 'good' ? 200 : 300; // Maximum steering force
        
        // Physics constants
        this.FRICTION = 0.85; // Velocity damping (0 = no movement, 1 = no friction)
        this.PERSONAL_SPACE_MULTIPLIER = 2.5; // Minimum distance = width * this value
        this.SEPARATION_FORCE = 150; // Force for pushing away from other NPCs
        this.ARRIVAL_DISTANCE = 5; // Distance at which NPC is considered to have reached target
        this.ARRIVAL_RADIUS = 50; // Distance at which NPC starts to slow down
        this.QUEUE_DISTANCE = 25; // Distance between NPCs in queue line
        this.QUEUE_WIDTH = 40; // Width of queue area on each side of escalator
        this.GAP_CLOSE_THRESHOLD = 35; // Distance threshold to detect a gap ahead
        this.GAP_CLOSE_SPEED = 20; // Speed at which NPCs close gaps in the queue
        this.FADE_DURATION = 0.5; // Duration of fade-out animation in seconds
        this.COLLISION_DAMPING = 0.5; // How much velocity is retained after collision (0 = stop, 1 = elastic)
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
                    this.pathUpdateTimer = 0;  // Reset timer after updating
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
                // Reset acceleration for this frame
                this.acceleration = { x: 0, y: 0 };
                
                // Apply seek force (attraction to target)
                const seekForce = this.seek(targetX, targetY, dist);
                this.applyForce(seekForce);
                
                // Apply separation force (repulsion from other NPCs)
                const separationForce = this.separate(npcs);
                this.applyForce(separationForce);
                
                // Apply track avoidance force if platform info is available
                if (platform) {
                    const trackAvoidance = this.avoidTracksForce(platform);
                    this.applyForce(trackAvoidance);
                }
                
                // Update velocity based on acceleration
                this.velocity.x += this.acceleration.x * deltaTime;
                this.velocity.y += this.acceleration.y * deltaTime;
                
                // Apply friction
                this.velocity.x *= this.FRICTION;
                this.velocity.y *= this.FRICTION;
                
                // Limit velocity to max speed
                const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
                if (speed > this.maxSpeed) {
                    this.velocity.x = (this.velocity.x / speed) * this.maxSpeed;
                    this.velocity.y = (this.velocity.y / speed) * this.maxSpeed;
                }
                
                // Update position
                this.x += this.velocity.x * deltaTime;
                this.y += this.velocity.y * deltaTime;
                
                // Handle collisions with other NPCs
                this.handleCollisions(npcs);
                
                // Handle cut-in behavior for bad NPCs
                if (this.type === 'bad' && this.pathUpdateTimer >= this.pathUpdateInterval) {
                    this.attemptCutIn(npcs);
                    this.pathUpdateTimer = 0;
                }
            } else {
                // Reached escalator - stop movement
                this.velocity = { x: 0, y: 0 };
                this.state = 'queuing';
                this.queuePosition = this.target.addToQueue(this);
            }
        }
    }

    seek(targetX, targetY, dist) {
        // Calculate desired velocity to reach target
        const desired = {
            x: (targetX - this.x) / dist * this.maxSpeed,
            y: (targetY - this.y) / dist * this.maxSpeed
        };
        
        // Apply arrival behavior - slow down as we approach target
        if (dist < this.ARRIVAL_RADIUS) {
            const m = dist / this.ARRIVAL_RADIUS;
            desired.x *= m;
            desired.y *= m;
        }
        
        // Steering force = desired - current velocity
        const steer = {
            x: desired.x - this.velocity.x,
            y: desired.y - this.velocity.y
        };
        
        // Limit steering force
        const steerMag = Math.sqrt(steer.x * steer.x + steer.y * steer.y);
        if (steerMag > this.maxForce) {
            steer.x = (steer.x / steerMag) * this.maxForce;
            steer.y = (steer.y / steerMag) * this.maxForce;
        }
        
        return steer;
    }

    separate(npcs) {
        // Separation force to avoid crowding
        const desiredSeparation = this.width * this.PERSONAL_SPACE_MULTIPLIER;
        const steer = { x: 0, y: 0 };
        let count = 0;
        
        for (const npc of npcs) {
            if (npc === this || !npc.active || npc.state !== 'walking') continue;
            
            const dist = Utils.distance(this.x, this.y, npc.x, npc.y);
            
            if (dist > 0 && dist < desiredSeparation) {
                // Calculate vector pointing away from neighbor
                const diff = {
                    x: this.x - npc.x,
                    y: this.y - npc.y
                };
                
                // Weight by distance (closer = stronger force)
                const weight = 1.0 - (dist / desiredSeparation);
                diff.x = (diff.x / dist) * weight;
                diff.y = (diff.y / dist) * weight;
                
                steer.x += diff.x;
                steer.y += diff.y;
                count++;
            }
        }
        
        if (count > 0) {
            steer.x /= count;
            steer.y /= count;
        }
        
        const mag = Math.sqrt(steer.x * steer.x + steer.y * steer.y);
        if (mag > 0) {
            // Implement Reynolds: Steering = Desired - Velocity
            steer.x = (steer.x / mag) * this.maxSpeed - this.velocity.x;
            steer.y = (steer.y / mag) * this.maxSpeed - this.velocity.y;
            
            // Apply separation force multiplier
            // Bad NPCs are more aggressive: lower multiplier means less separation
            // Good NPCs respect personal space: higher multiplier means stronger separation
            const separationMultiplier = this.type === 'bad' ? 0.6 : 1.0;
            steer.x *= separationMultiplier;
            steer.y *= separationMultiplier;
        }
        
        return steer;
    }

    applyForce(force) {
        // F = ma, so a = F/m
        this.acceleration.x += force.x / this.mass;
        this.acceleration.y += force.y / this.mass;
    }

    avoidTracksForce(platform) {
        // Generate a force to avoid track areas
        const trackAreas = platform.getTrackAreas();
        const avoidForce = { x: 0, y: 0 };
        
        for (const track of trackAreas) {
            // Check if we're near or in a track area
            if (this.y >= track.minY - 30 && this.y <= track.maxY + 30) {
                // Determine which side of the track is closer
                const distToTop = Math.abs(this.y - track.minY);
                const distToBottom = Math.abs(this.y - track.maxY);
                
                // Apply strong repulsion force away from track
                const repulsionStrength = 500;
                
                if (this.y >= track.minY && this.y <= track.maxY) {
                    // Inside track - push towards nearest edge
                    if (distToTop < distToBottom) {
                        avoidForce.y -= repulsionStrength;
                    } else {
                        avoidForce.y += repulsionStrength;
                    }
                } else if (this.y < track.minY && distToTop < 30) {
                    // Above track, getting close - push up
                    const proximity = 1.0 - (distToTop / 30);
                    avoidForce.y -= repulsionStrength * proximity;
                } else if (this.y > track.maxY && distToBottom < 30) {
                    // Below track, getting close - push down
                    const proximity = 1.0 - (distToBottom / 30);
                    avoidForce.y += repulsionStrength * proximity;
                }
                break;
            }
        }
        
        return avoidForce;
    }

    handleCollisions(npcs) {
        // Handle collisions with impulse-based resolution
        const minDistance = this.width * this.PERSONAL_SPACE_MULTIPLIER;
        
        for (const npc of npcs) {
            if (npc === this || !npc.active || npc.state !== 'walking') continue;
            
            // Only handle each collision pair once (avoid double processing)
            // Use a consistent ordering based on object identity
            if (this > npc) continue;
            
            const dx = npc.x - this.x;
            const dy = npc.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Check for collision
            if (dist < minDistance && dist > 0.1) {
                // Calculate collision normal
                const nx = dx / dist;
                const ny = dy / dist;
                
                // Calculate relative velocity
                const relVelX = npc.velocity.x - this.velocity.x;
                const relVelY = npc.velocity.y - this.velocity.y;
                
                // Calculate relative velocity in collision normal direction
                const velAlongNormal = relVelX * nx + relVelY * ny;
                
                // Don't resolve if velocities are separating
                if (velAlongNormal > 0) continue;
                
                // Calculate restitution (bounciness)
                const restitution = this.COLLISION_DAMPING;
                
                // Calculate impulse scalar
                const impulseScalar = -(1 + restitution) * velAlongNormal;
                const totalMass = this.mass + npc.mass;
                const impulse = impulseScalar / totalMass;
                
                // Apply impulse to velocities
                this.velocity.x -= impulse * npc.mass * nx;
                this.velocity.y -= impulse * npc.mass * ny;
                npc.velocity.x += impulse * this.mass * nx;
                npc.velocity.y += impulse * this.mass * ny;
                
                // Positional correction to prevent overlap
                const overlap = minDistance - dist;
                const correctionPercent = 0.5; // How much to correct (split 50/50)
                const correction = overlap * correctionPercent;
                
                this.x -= correction * nx;
                this.y -= correction * ny;
                npc.x += correction * nx;
                npc.y += correction * ny;
            }
        }
    }

    getQueueLinePosition(npcs) {
        // Good NPCs should form a straight line directly behind the escalator
        
        // Calculate our distance once (optimization)
        const myDist = Utils.distance(this.x, this.y, this.target.x, this.target.y);
        
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
        // Bad NPCs try to push past good NPCs using physics
        for (const npc of npcs) {
            if (npc === this || !npc.active) continue;
            
            const dist = Utils.distance(this.x, this.y, npc.x, npc.y);
            
            if (npc.type === 'good' && dist < 30) {
                // Apply a pushing force to the good NPC
                const dx = npc.x - this.x;
                const dy = npc.y - this.y;
                if (dist > 0) {
                    const pushForce = 100; // Force magnitude
                    const forceX = (dx / dist) * pushForce;
                    const forceY = (dy / dist) * pushForce;
                    
                    // Apply force to the good NPC (they get pushed)
                    npc.applyForce({ x: forceX, y: forceY });
                }
            }
        }
    }

    findNPCAhead() {
        // Find the NPC directly ahead in the queue
        if (!this.target || this.queuePosition === null) return null;
        
        // Look for NPCs in the same queue (targeting same escalator)
        // that are one position ahead
        const targetPosition = this.queuePosition - 1;
        
        if (targetPosition < 0) return null; // We're first in queue
        
        // Directly access the NPC at the target position
        if (targetPosition < this.target.queue.length) {
            return this.target.queue[targetPosition];
        }
        
        return null;
    }

    waitInQueue(deltaTime) {
        if (this.target && this.queuePosition !== null) {
            this.exitTime += deltaTime;
            
            // Gradually slow down velocity while queuing
            this.velocity.x *= 0.9;
            this.velocity.y *= 0.9;
            
            // For good NPCs: Close gaps in the queue to allow bad NPCs to cut in
            if (this.type === 'good') {
                const npcAhead = this.findNPCAhead();
                
                if (npcAhead) {
                    // Calculate distance to NPC ahead
                    const distAhead = Utils.distance(this.x, this.y, npcAhead.x, npcAhead.y);
                    
                    // If there's a gap larger than threshold, close it
                    if (distAhead > this.GAP_CLOSE_THRESHOLD) {
                        // Move toward the NPC ahead
                        const dx = npcAhead.x - this.x;
                        const dy = npcAhead.y - this.y;
                        const moveDistance = this.GAP_CLOSE_SPEED * deltaTime;
                        
                        this.x += (dx / distAhead) * moveDistance;
                        this.y += (dy / distAhead) * moveDistance;
                    }
                } else {
                    // No NPC ahead, move toward first queue position (below escalator)
                    const firstQueueX = this.target.x;
                    const firstQueueY = this.target.y + this.QUEUE_DISTANCE;
                    const distToQueuePos = Utils.distance(this.x, this.y, firstQueueX, firstQueueY);
                    
                    if (distToQueuePos > this.ARRIVAL_DISTANCE) {  // Use same threshold as walking arrival
                        const dx = firstQueueX - this.x;
                        const dy = firstQueueY - this.y;
                        const moveDistance = this.GAP_CLOSE_SPEED * deltaTime;
                        
                        this.x += (dx / distToQueuePos) * moveDistance;
                        this.y += (dy / distToQueuePos) * moveDistance;
                    }
                }
            }
            
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
        // Fade out instead of moving off screen
        // NPCs are moving to another floor, so they should fade out quickly
        this.opacity -= deltaTime / this.FADE_DURATION;
        
        if (this.opacity <= 0) {
            this.opacity = 0;
            this.active = false;
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

    remove() {
        this.active = false;
        this.velocity = { x: 0, y: 0 };
        if (this.target) {
            this.target.removeFromQueue(this);
        }
    }
}
