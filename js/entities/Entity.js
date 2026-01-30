// Base entity class

class Entity {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.color = '#ffffff';
        this.active = true;
        
        // Physics integration
        this.physicsBody = null;
        this.usePhysics = false;
    }
    
    setPhysicsBody(body, physicsWorld) {
        this.physicsBody = body;
        this.usePhysics = true;
        if (physicsWorld) {
            physicsWorld.registerEntity(this, body);
        }
    }
    
    syncFromPhysics() {
        if (this.physicsBody && this.usePhysics) {
            // Check for NaN or invalid positions
            const bodyX = this.physicsBody.position.x;
            const bodyY = this.physicsBody.position.y;
            
            if (isNaN(bodyX) || isNaN(bodyY) || !isFinite(bodyX) || !isFinite(bodyY)) {
                // Physics body has invalid position - keep last known good position
                // and stop physics updates to prevent further corruption
                console.warn('Entity physics body has invalid position, disabling physics');
                this.usePhysics = false;
                return;
            }
            
            this.x = bodyX;
            this.y = bodyY;
        }
    }
    
    syncToPhysics() {
        if (this.physicsBody && this.usePhysics && typeof Matter !== 'undefined') {
            Matter.Body.setPosition(this.physicsBody, { x: this.x, y: this.y });
        }
    }

    update(deltaTime) {
        // Sync position from physics if using physics
        if (this.usePhysics) {
            this.syncFromPhysics();
        }
        // Override in subclasses
    }

    render(ctx) {
        if (!this.active) return;
        
        ctx.fillStyle = this.color;
        ctx.fillRect(
            this.x - this.width / 2,
            this.y - this.height / 2,
            this.width,
            this.height
        );
    }

    getBounds() {
        return {
            left: this.x - this.width / 2,
            right: this.x + this.width / 2,
            top: this.y - this.height / 2,
            bottom: this.y + this.height / 2
        };
    }

    collidesWith(other) {
        const bounds1 = this.getBounds();
        const bounds2 = other.getBounds();
        
        return !(bounds1.right < bounds2.left ||
                bounds1.left > bounds2.right ||
                bounds1.bottom < bounds2.top ||
                bounds1.top > bounds2.bottom);
    }
    
    destroy(physicsWorld) {
        this.active = false;
        if (this.physicsBody && physicsWorld) {
            physicsWorld.removeBody(this.physicsBody);
            this.physicsBody = null;
        }
    }
}
