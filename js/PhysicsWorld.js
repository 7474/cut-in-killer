// PhysicsWorld - Wrapper for Matter.js physics engine

class PhysicsWorld {
    constructor(width, height) {
        // Check if Matter.js is available
        if (typeof Matter === 'undefined') {
            throw new Error('Matter.js library is not loaded. Please ensure matter.min.js is included before PhysicsWorld.js');
        }
        
        this.width = width;
        this.height = height;
        
        // Physics constants
        this.REPULSION_DISTANCE_THRESHOLD = 100; // Distance threshold for repulsion force
        this.MOVE_FORCE_MULTIPLIER = 0.1; // Force multiplier for movement
        this.MIN_DISTANCE_THRESHOLD = 1; // Minimum distance to prevent division by zero
        
        // Create Matter.js engine
        this.engine = Matter.Engine.create({
            gravity: { x: 0, y: 0 }, // Top-down view, no gravity
            enableSleeping: false // Keep all bodies active for responsiveness
        });
        
        this.world = this.engine.world;
        
        // Create boundaries (invisible walls)
        this.createBoundaries();
        
        // Track entities and their physics bodies
        this.entityBodyMap = new Map(); // body -> entity
        this.bodyEntityMap = new Map(); // entity -> body
        
        // Physics constants
        this.TIME_STEP = 1000 / 60; // 60 FPS in milliseconds
    }
    
    createBoundaries() {
        const thickness = 100;
        const options = { isStatic: true, friction: 0, restitution: 0.5 };
        
        // Top wall
        const top = Matter.Bodies.rectangle(
            this.width / 2, -thickness / 2,
            this.width, thickness,
            options
        );
        
        // Bottom wall
        const bottom = Matter.Bodies.rectangle(
            this.width / 2, this.height + thickness / 2,
            this.width, thickness,
            options
        );
        
        // Left wall
        const left = Matter.Bodies.rectangle(
            -thickness / 2, this.height / 2,
            thickness, this.height,
            options
        );
        
        // Right wall
        const right = Matter.Bodies.rectangle(
            this.width + thickness / 2, this.height / 2,
            thickness, this.height,
            options
        );
        
        Matter.World.add(this.world, [top, bottom, left, right]);
    }
    
    createCircleBody(x, y, radius, options = {}) {
        const defaultOptions = {
            friction: 0.1,
            frictionAir: 0.3, // High air friction for damping
            restitution: 0.3,
            density: 0.001,
            inertia: 1e10 // Very large value to effectively prevent rotation
        };
        
        const body = Matter.Bodies.circle(x, y, radius, {
            ...defaultOptions,
            ...options
        });
        
        Matter.World.add(this.world, body);
        return body;
    }
    
    createRectangleBody(x, y, width, height, options = {}) {
        const defaultOptions = {
            friction: 0.1,
            frictionAir: 0.3,
            restitution: 0.3,
            density: 0.001,
            inertia: 1e10 // Very large value to effectively prevent rotation
        };
        
        const body = Matter.Bodies.rectangle(x, y, width, height, {
            ...defaultOptions,
            ...options
        });
        
        Matter.World.add(this.world, body);
        return body;
    }
    
    createStaticBody(x, y, width, height) {
        const body = Matter.Bodies.rectangle(x, y, width, height, {
            isStatic: true,
            friction: 0,
            restitution: 0.3
        });
        
        Matter.World.add(this.world, body);
        return body;
    }
    
    removeBody(body) {
        if (body) {
            Matter.World.remove(this.world, body);
            
            // Clean up mappings
            const entity = this.entityBodyMap.get(body);
            if (entity) {
                this.entityBodyMap.delete(body);
                this.bodyEntityMap.delete(entity);
            }
        }
    }
    
    registerEntity(entity, body) {
        this.entityBodyMap.set(body, entity);
        this.bodyEntityMap.set(entity, body);
    }
    
    unregisterEntity(entity) {
        const body = this.bodyEntityMap.get(entity);
        if (body) {
            this.entityBodyMap.delete(body);
            this.bodyEntityMap.delete(entity);
        }
    }
    
    getBody(entity) {
        return this.bodyEntityMap.get(entity);
    }
    
    getEntity(body) {
        return this.entityBodyMap.get(body);
    }
    
    applyForce(body, force) {
        Matter.Body.applyForce(body, body.position, force);
    }
    
    applyImpulse(body, impulse) {
        // Impulse is an instantaneous force
        Matter.Body.applyForce(body, body.position, impulse);
    }
    
    setVelocity(body, velocity) {
        Matter.Body.setVelocity(body, velocity);
    }
    
    setPosition(body, x, y) {
        Matter.Body.setPosition(body, { x, y });
    }
    
    // Apply force towards a target position (for NPC pathfinding)
    moveTowards(body, targetX, targetY, speed) {
        // Guard against invalid input
        if (!body || !body.position || isNaN(targetX) || isNaN(targetY) || isNaN(speed)) {
            return;
        }
        
        // Guard against NaN positions
        if (isNaN(body.position.x) || isNaN(body.position.y)) {
            return;
        }
        
        const dx = targetX - body.position.x;
        const dy = targetY - body.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0 && isFinite(dist)) {
            // Calculate desired velocity
            const desiredVelX = (dx / dist) * speed;
            const desiredVelY = (dy / dist) * speed;
            
            // Calculate force needed to reach desired velocity
            const forceX = (desiredVelX - body.velocity.x) * body.mass * this.MOVE_FORCE_MULTIPLIER;
            const forceY = (desiredVelY - body.velocity.y) * body.mass * this.MOVE_FORCE_MULTIPLIER;
            
            // Guard against NaN forces
            if (isFinite(forceX) && isFinite(forceY)) {
                Matter.Body.applyForce(body, body.position, {
                    x: forceX,
                    y: forceY
                });
            }
        }
    }
    
    // Apply repulsion force between bodies (for crowd avoidance)
    applyRepulsion(body1, body2, strength) {
        // Guard against invalid input or NaN positions
        if (!body1 || !body2 || !body1.position || !body2.position) {
            return;
        }
        
        if (isNaN(body1.position.x) || isNaN(body1.position.y) || 
            isNaN(body2.position.x) || isNaN(body2.position.y)) {
            return;
        }
        
        const dx = body1.position.x - body2.position.x;
        const dy = body1.position.y - body2.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0 && dist < this.REPULSION_DISTANCE_THRESHOLD && isFinite(dist)) {
            const force = strength / (dist * dist); // Inverse square law
            const fx = (dx / dist) * force * body1.mass;
            const fy = (dy / dist) * force * body1.mass;
            
            // Guard against NaN or infinite forces
            if (isFinite(fx) && isFinite(fy)) {
                Matter.Body.applyForce(body1, body1.position, { x: fx, y: fy });
            }
        }
    }
    
    update(deltaTime) {
        // Update physics engine with fixed timestep to prevent numerical instability
        // Matter.js expects milliseconds, and works best with consistent small steps
        const FIXED_TIMESTEP = 16.667; // 60 FPS in milliseconds
        const deltaMs = deltaTime * 1000;
        
        // If deltaTime is very large (e.g., first frame, tab was inactive), 
        // only update with a single fixed timestep to prevent instability
        if (deltaMs > FIXED_TIMESTEP * 2) {
            Matter.Engine.update(this.engine, FIXED_TIMESTEP);
        } else {
            // Normal case: clamp to max timestep
            const clampedDelta = Math.min(deltaMs, FIXED_TIMESTEP);
            Matter.Engine.update(this.engine, clampedDelta);
        }
    }
    
    clear() {
        // Remove all bodies except boundaries
        Matter.World.clear(this.world, false);
        this.entityBodyMap.clear();
        this.bodyEntityMap.clear();
        
        // Recreate boundaries
        this.createBoundaries();
    }
    
    // Debug rendering
    renderDebug(ctx) {
        const bodies = Matter.Composite.allBodies(this.world);
        
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1;
        
        for (const body of bodies) {
            if (body.isStatic) continue; // Don't draw boundaries
            
            const vertices = body.vertices;
            ctx.beginPath();
            ctx.moveTo(vertices[0].x, vertices[0].y);
            
            for (let i = 1; i < vertices.length; i++) {
                ctx.lineTo(vertices[i].x, vertices[i].y);
            }
            
            ctx.closePath();
            ctx.stroke();
            
            // Draw velocity vector
            ctx.strokeStyle = '#ff0000';
            ctx.beginPath();
            ctx.moveTo(body.position.x, body.position.y);
            ctx.lineTo(
                body.position.x + body.velocity.x * 10,
                body.position.y + body.velocity.y * 10
            );
            ctx.stroke();
        }
    }
}
