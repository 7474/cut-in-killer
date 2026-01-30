// Body slam attack - small area push/damage

class BodySlam extends Attack {
    constructor() {
        super();
        this.name = 'BodySlam';
        this.cooldown = 0.5;
        this.radius = 50;
        this.duration = 0.3;
        this.effects = [];
        this.IMPULSE_STRENGTH = 0.015; // Physics impulse strength
        this.MIN_DISTANCE_THRESHOLD = 1; // Minimum distance to prevent division by zero
    }

    execute(x, y, npcs, physicsWorld = null) {
        const hitNPCs = [];
        const hasMatter = typeof Matter !== 'undefined';
        
        for (const npc of npcs) {
            if (!npc.active) continue;
            
            const dist = Utils.distance(x, y, npc.x, npc.y);
            if (dist <= this.radius) {
                // Apply radial impulse if physics enabled
                if (hasMatter && physicsWorld && npc.physicsBody) {
                    const dx = npc.x - x;
                    const dy = npc.y - y;
                    const normalizedDist = Math.max(dist, this.MIN_DISTANCE_THRESHOLD);
                    const force = this.IMPULSE_STRENGTH / (normalizedDist / this.radius);
                    
                    const impulse = {
                        x: (dx / normalizedDist) * force * npc.physicsBody.mass,
                        y: (dy / normalizedDist) * force * npc.physicsBody.mass
                    };
                    
                    Matter.Body.applyForce(npc.physicsBody, npc.physicsBody.position, impulse);
                }
                
                npc.remove(physicsWorld);
                hitNPCs.push(npc);
            }
        }
        
        // Add visual effect
        this.effects.push({
            x: x,
            y: y,
            radius: 0,
            maxRadius: this.radius,
            duration: this.duration,
            timer: 0
        });
        
        return hitNPCs;
    }

    update(deltaTime) {
        super.update(deltaTime);
        
        // Update visual effects
        this.effects = this.effects.filter(effect => {
            effect.timer += deltaTime;
            effect.radius = (effect.timer / effect.duration) * effect.maxRadius;
            return effect.timer < effect.duration;
        });
    }

    render(ctx) {
        for (const effect of this.effects) {
            const alpha = 1 - (effect.timer / effect.duration);
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Inner ring
            ctx.strokeStyle = `rgba(255, 107, 107, ${alpha})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, effect.radius * 0.7, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}
