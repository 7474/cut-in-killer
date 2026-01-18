// Laser beam attack - line attack

class Laser extends Attack {
    constructor() {
        super();
        this.name = 'Laser';
        this.cooldown = 1.5;
        this.width = 20;
        this.length = 600;
        this.duration = 0.5;
        this.beams = [];
    }

    execute(x, y, npcs) {
        const hitNPCs = [];
        
        // Create laser beam going up (towards escalators)
        for (const npc of npcs) {
            if (!npc.active) continue;
            
            // Check if NPC is in the laser beam path
            if (Math.abs(npc.x - x) <= this.width / 2 && npc.y < y) {
                npc.remove();
                hitNPCs.push(npc);
            }
        }
        
        // Add visual effect
        this.beams.push({
            x: x,
            y: y,
            width: this.width,
            length: this.length,
            duration: this.duration,
            timer: 0
        });
        
        return hitNPCs;
    }

    update(deltaTime) {
        super.update(deltaTime);
        
        // Update visual effects
        this.beams = this.beams.filter(beam => {
            beam.timer += deltaTime;
            return beam.timer < beam.duration;
        });
    }

    render(ctx) {
        for (const beam of this.beams) {
            const alpha = 1 - (beam.timer / beam.duration);
            const currentLength = (beam.timer / beam.duration) * beam.length;
            
            // Outer glow
            ctx.fillStyle = `rgba(255, 107, 107, ${alpha * 0.3})`;
            ctx.fillRect(
                beam.x - beam.width,
                beam.y - currentLength,
                beam.width * 2,
                currentLength
            );
            
            // Core beam
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fillRect(
                beam.x - beam.width / 2,
                beam.y - currentLength,
                beam.width,
                currentLength
            );
            
            // Inner bright core
            ctx.fillStyle = `rgba(78, 205, 196, ${alpha})`;
            ctx.fillRect(
                beam.x - beam.width / 4,
                beam.y - currentLength,
                beam.width / 2,
                currentLength
            );
        }
    }
}
