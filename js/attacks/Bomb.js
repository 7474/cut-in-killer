// Bomb attack - large area damage with delay

class Bomb extends Attack {
    constructor() {
        super();
        this.name = 'Bomb';
        this.cooldown = 3;
        this.radius = 80;
        this.fuseTime = 1; // 1 second fuse
        this.explosionDuration = 0.5;
        this.bombs = [];
        this.EXPLOSION_FORCE = 0.03; // Explosive force strength
        this.MIN_DISTANCE_THRESHOLD = 1; // Minimum distance to prevent division by zero
    }

    execute(x, y, npcs, physicsWorld = null) {
        // Place bomb with fuse
        this.bombs.push({
            x: x,
            y: y,
            radius: this.radius,
            fuseTimer: 0,
            fuseTime: this.fuseTime,
            state: 'fuse', // fuse, exploding
            explosionTimer: 0,
            npcs: npcs, // Reference to check on explosion
            physicsWorld: physicsWorld
        });
        
        return []; // No immediate hits
    }

    update(deltaTime) {
        super.update(deltaTime);
        
        // Update bombs
        this.bombs = this.bombs.filter(bomb => {
            if (bomb.state === 'fuse') {
                bomb.fuseTimer += deltaTime;
                
                if (bomb.fuseTimer >= bomb.fuseTime) {
                    bomb.state = 'exploding';
                    this.explode(bomb);
                }
                return true;
            } else if (bomb.state === 'exploding') {
                bomb.explosionTimer += deltaTime;
                return bomb.explosionTimer < this.explosionDuration;
            }
            return false;
        });
    }

    explode(bomb) {
        const hasMatter = typeof Matter !== 'undefined';
        
        // Hit all NPCs in radius with explosive force
        for (const npc of bomb.npcs) {
            if (!npc.active) continue;
            
            const dist = Utils.distance(bomb.x, bomb.y, npc.x, npc.y);
            if (dist <= bomb.radius) {
                // Apply radial explosive force if physics enabled
                if (hasMatter && bomb.physicsWorld && npc.physicsBody) {
                    const dx = npc.x - bomb.x;
                    const dy = npc.y - bomb.y;
                    const normalizedDist = Math.max(dist, this.MIN_DISTANCE_THRESHOLD);
                    
                    // Stronger force at center, weaker at edges
                    const forceMagnitude = this.EXPLOSION_FORCE * (1 - dist / bomb.radius);
                    
                    const force = {
                        x: (dx / normalizedDist) * forceMagnitude * npc.physicsBody.mass,
                        y: (dy / normalizedDist) * forceMagnitude * npc.physicsBody.mass
                    };
                    
                    Matter.Body.applyForce(npc.physicsBody, npc.physicsBody.position, force);
                }
                
                npc.remove(bomb.physicsWorld);
            }
        }
    }

    render(ctx) {
        for (const bomb of this.bombs) {
            if (bomb.state === 'fuse') {
                // Draw bomb with pulsing fuse
                const pulseScale = 1 + Math.sin(bomb.fuseTimer * 10) * 0.2;
                const fuseProgress = bomb.fuseTimer / bomb.fuseTime;
                
                // Bomb body
                ctx.fillStyle = '#2c3e50';
                ctx.beginPath();
                ctx.arc(bomb.x, bomb.y, 10 * pulseScale, 0, Math.PI * 2);
                ctx.fill();
                
                // Fuse
                ctx.strokeStyle = fuseProgress > 0.7 ? '#e74c3c' : '#f39c12';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(bomb.x, bomb.y - 10 * pulseScale);
                ctx.lineTo(bomb.x, bomb.y - 20 * pulseScale);
                ctx.stroke();
                
                // Danger radius indicator
                ctx.strokeStyle = `rgba(231, 76, 60, ${fuseProgress * 0.5})`;
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.arc(bomb.x, bomb.y, bomb.radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                
            } else if (bomb.state === 'exploding') {
                // Draw explosion
                const progress = bomb.explosionTimer / this.explosionDuration;
                const currentRadius = bomb.radius * progress;
                const alpha = 1 - progress;
                
                // Outer ring
                ctx.strokeStyle = `rgba(255, 107, 107, ${alpha})`;
                ctx.lineWidth = 10;
                ctx.beginPath();
                ctx.arc(bomb.x, bomb.y, currentRadius, 0, Math.PI * 2);
                ctx.stroke();
                
                // Middle ring
                ctx.strokeStyle = `rgba(255, 165, 0, ${alpha})`;
                ctx.lineWidth = 8;
                ctx.beginPath();
                ctx.arc(bomb.x, bomb.y, currentRadius * 0.7, 0, Math.PI * 2);
                ctx.stroke();
                
                // Inner core
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.beginPath();
                ctx.arc(bomb.x, bomb.y, currentRadius * 0.3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}
