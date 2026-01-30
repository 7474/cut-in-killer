// Base attack class

class Attack {
    constructor() {
        this.name = 'Attack';
        this.cooldown = 1; // seconds
        this.cooldownTimer = 0;
        this.active = false;
    }

    canUse() {
        return this.cooldownTimer <= 0;
    }

    use(x, y, npcs, physicsWorld = null) {
        if (!this.canUse()) return null;
        
        this.cooldownTimer = this.cooldown;
        return this.execute(x, y, npcs, physicsWorld);
    }

    execute(x, y, npcs, physicsWorld = null) {
        // Override in subclasses
        return [];
    }

    update(deltaTime) {
        if (this.cooldownTimer > 0) {
            this.cooldownTimer -= deltaTime;
        }
    }

    render(ctx) {
        // Override in subclasses if attack has visual effect
    }

    getCooldownPercent() {
        return Math.max(0, 1 - (this.cooldownTimer / this.cooldown));
    }
}
