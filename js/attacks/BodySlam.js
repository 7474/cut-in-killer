// Body slam attack - small area push/damage

class BodySlam extends Attack {
    constructor() {
        super();
        this.name = 'BodySlam';
        this.cooldown = 0.5;
        this.radius = 50;
        this.duration = 0.3;
        this.effects = [];
    }

    execute(x, y, npcs) {
        const hitNPCs = [];
        
        for (const npc of npcs) {
            if (!npc.active) continue;
            
            const dist = Utils.distance(x, y, npc.x, npc.y);
            if (dist <= this.radius) {
                npc.remove();
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
