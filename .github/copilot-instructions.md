# Cut-in Killer - GitHub Copilot Instructions

## Core Concept ⭐

**This is the most important section - always keep these principles in mind:**

1. **Mobile-First Casual Game** - Designed specifically for smartphones in portrait orientation
2. **Satisfying Catharsis** - The core emotion is the satisfaction of blowing away annoying mobs from everyday life (割り込みをする行儀の悪いモブ)
3. **Single-Finger Operation** - All gameplay must be achievable with one finger (tap/touch only)

## Design Philosophy

### Visual Design
- **Flat and Abstract** - Use simple geometric shapes and flat colors
- **Minimalist approach** - Avoid realistic textures or complex graphics
- **Clear visual hierarchy** - Game elements should be instantly recognizable

### Behavioral Design
- **Realistic foundation** - Base behaviors on real-world physics and movement patterns
- **Black Humor welcome** - Exaggerated consequences are encouraged (e.g., mobs blown off platform onto train tracks and hit by passing trains)
- **Cathartic outcomes** - Satisfying visual and behavioral feedback when eliminating badly-behaved NPCs
- **Comedic timing** - Behaviors should feel natural but allow for humorous exaggeration

## Project Overview

Cut-in Killer (カットインキラー) is a casual web-based game set on a Tokyo subway platform. Players help well-behaved NPCs (blue circles) exit safely via escalators while eliminating badly-behaved NPCs (red squares) who try to cut in line.

## Tech Stack

- **HTML5 Canvas** for rendering
- **Vanilla JavaScript** (ES6+ classes) for game logic
- **Matter.js v0.20.0** for 2D physics simulation
- **CSS3** for UI/UX
- **LocalStorage** for high score persistence
- **No frameworks or build tools** - pure client-side application
- **Visual Style** - Flat design with simple geometric shapes (circles for good NPCs, squares for bad NPCs)

## Code Architecture

### File Structure

```
cut-in-killer/
├── index.html              # Main entry point
├── styles/
│   └── main.css           # All styling
├── js/
│   ├── main.js            # Application controller, menu/UI logic
│   ├── game.js            # Main game loop, canvas management
│   ├── maps.js            # Map configurations (Shinjuku, Shibuya, Tokyo)
│   ├── storage.js         # LocalStorage wrapper for high scores
│   ├── utils.js           # Utility functions (distance, random, etc.)
│   ├── matter.min.js      # Matter.js physics engine (v0.20.0)
│   ├── PhysicsWorld.js    # Wrapper for Matter.js engine with game-specific helpers
│   ├── entities/
│   │   ├── Entity.js      # Base entity class with physics body lifecycle
│   │   ├── NPC.js         # NPCs with physics-based AI and behavior
│   │   ├── Train.js       # Train spawning NPCs
│   │   ├── Platform.js    # Platform rendering
│   │   └── Escalator.js   # Escalator with queue management
│   └── attacks/
│       ├── Attack.js      # Base attack class with cooldown
│       ├── BodySlam.js    # Small area instant attack with radial impulse
│       ├── Laser.js       # Line attack with directional force
│       └── Bomb.js        # Large area delayed attack with explosive force
```

### Class Hierarchy

- **PhysicsWorld** (Matter.js wrapper)
  - Manages physics engine and bodies
  - Provides helper methods for forces and movement
  - Handles body registration and cleanup

- **Entity** (base class)
  - Integrates with PhysicsWorld for physics bodies
  - Syncs position between physics and rendering
  - NPC (good/bad types with physics-based AI)
  - Train (spawns NPCs)
  - Platform (static rendering)
  - Escalator (queue management)

- **Attack** (base class)
  - Applies physics impulses before eliminating NPCs
  - BodySlam (instant radial impulse)
  - Laser (directional force along beam)
  - Bomb (delayed explosive force)

## Coding Conventions

### JavaScript Style

1. **ES6 Classes**: Use ES6 class syntax, not prototype-based inheritance
2. **Constants**: Use UPPER_CASE for constants (e.g., `PERSONAL_SPACE_MULTIPLIER`, `QUEUE_DISTANCE`)
3. **Naming**:
   - Classes: PascalCase (e.g., `NPC`, `BodySlam`)
   - Methods/variables: camelCase (e.g., `walkToEscalator`, `cooldownTimer`)
   - Config objects: camelCase keys (e.g., `trainInterval`, `gameDuration`)
4. **Comments**: Brief single-line comments for complex logic; avoid obvious comments
5. **Semicolons**: Code uses semicolons consistently - always include semicolons

### Entity Pattern

All game entities follow this pattern:
```javascript
class MyEntity extends Entity {
    constructor(x, y, physicsWorld = null) {
        super(x, y);
        // Initialize properties
        
        // Initialize physics body if physics world is provided
        if (physicsWorld) {
            this.initPhysics(physicsWorld);
        }
    }
    
    initPhysics(physicsWorld) {
        // Create and configure physics body
        this.physicsBody = physicsWorld.createCircleBody(this.x, this.y, radius);
        this.setPhysicsBody(this.physicsBody, physicsWorld);
    }
    
    update(deltaTime, ...otherParams, physicsWorld) {
        // Sync position from physics first
        this.syncFromPhysics();
        
        // Update logic called every frame
    }
    
    render(ctx) {
        // Canvas rendering
    }
}
```

### Attack Pattern

All attacks follow this pattern:
```javascript
class MyAttack extends Attack {
    constructor() {
        super();
        this.name = 'Attack Name';
        this.cooldown = 1.0; // seconds
    }
    
    execute(x, y, npcs, physicsWorld) {
        const hitNpcs = [];
        
        for (const npc of npcs) {
            if (!npc.active) continue;
            
            // Check if NPC is in range
            const dist = Utils.distance(x, y, npc.x, npc.y);
            if (dist <= this.radius) {
                // Apply physics impulse before removing
                if (npc.physicsBody && physicsWorld) {
                    const angle = Math.atan2(npc.y - y, npc.x - x);
                    const force = 0.005; // Adjust based on attack
                    physicsWorld.applyImpulse(npc.physicsBody, {
                        x: Math.cos(angle) * force,
                        y: Math.sin(angle) * force
                    });
                }
                hitNpcs.push(npc);
            }
        }
        
        return hitNpcs;
    }
}
```

## Game Mechanics

### NPC Behavior

- **Good NPCs** (青い円):
  - Base movement speed: 30 units/sec
  - Form orderly queues at escalators
  - Physics body: Circular with standard density (0.001)
  - Higher repulsion strength (800) - avoid crowding more actively
  - Movement via physics forces using `physicsWorld.moveTowards()`
  - Worth +5 points when exiting, -5 if hit by player

- **Bad NPCs** (赤い四角):
  - Base movement speed: 50 units/sec (faster)
  - Take direct path to escalators (cut in line)
  - Physics body: Rectangular with 1.5x density (0.0015) - feel "heavier"
  - Lower repulsion strength (400) - push through crowds
  - Higher move force multiplier (0.8 vs 0.5) - more aggressive pushing
  - Apply cut-in forces to nearby good NPCs when approaching escalators
  - Worth +10 points when eliminated, -10 if they exit

### Physics-Based Movement

Instead of direct position manipulation, NPCs use physics forces:
- **Steering forces**: `physicsWorld.moveTowards()` calculates and applies forces toward target
- **Repulsion forces**: Inverse-square law repulsion when NPCs are too close (< 100 units)
- **Cut-in behavior**: Bad NPCs apply directional push forces to good NPCs ahead of them
- **Natural acceleration/deceleration**: Physics engine handles velocity changes smoothly
- **Emergent crowding**: Complex group behaviors emerge from simple force rules

### Collision System

- **Physics engine**: Matter.js handles all collision detection and response automatically
- **Physics bodies**: NPCs have circular (good) or rectangular (bad) collision bodies
- **Body registration**: `PhysicsWorld` maintains bidirectional mappings between entities and bodies
- **Collision boundaries**: Invisible static walls keep NPCs within the game area
- **Collision response**: Configured via friction, restitution, and density properties
- **Personal space**: Maintained through repulsion forces rather than manual spacing
- **Legacy AABB methods**: `getBounds()` and `collidesWith()` retained for attack hit detection

### Map Configuration

Maps defined in `Maps` object with:
- `id`, `name`, `description`: Identification
- `width`, `height`: Canvas dimensions
- `trainSpawnPoints`: Array of {x, y} for train spawning
- `escalatorPositions`: Array of {x, y} for escalator placement
- `trainInterval`: Seconds between train arrivals
- `gameDuration`: Total game time in seconds

## Performance Considerations

1. **60 FPS target**: Game loop uses `requestAnimationFrame` with delta time
2. **Physics updates**: Matter.js engine updates at consistent timestep (deltaTime * 1000ms)
3. **High inertia**: Bodies configured with very high inertia (1e10) to prevent rotation without expensive constraints
4. **Air friction**: High frictionAir (0.3-0.4) provides natural damping without manual velocity capping
5. **Path updates**: NPCs update pathfinding every 0.5 seconds, not every frame
6. **Repulsion optimization**: Distance checks before applying inverse-square repulsion forces
7. **Entity pooling**: Entities marked `active = false` instead of removed
8. **Physics body cleanup**: `PhysicsWorld.removeBody()` properly cleans up Matter.js bodies and mappings

## Mobile/Touch Support

**CRITICAL: This is a mobile-first game designed for portrait smartphone usage**

- Canvas sized to fit viewport: `Math.min(config.width, window.innerWidth)`
- Touch events handled in `setupInput()` method
- Viewport meta tag prevents zooming: `user-scalable=no`
- Touch coordinates mapped to canvas coordinates
- **All gameplay must work with single-finger touch operation**
- Portrait orientation is the primary target (600x800 canvas)

## Browser Compatibility

- Target: Chrome/Edge (primary), Firefox, Safari
- Use standard Canvas API (no vendor prefixes)
- LocalStorage with fallback if unavailable
- No ES modules - uses global namespace and script tags in order
- **Matter.js dependency**: Requires Matter.js v0.20.0 to be loaded before game code

## Physics Engine Integration

### Matter.js Setup

The game uses Matter.js v0.20.0 for realistic 2D physics simulation. The `PhysicsWorld` class wraps the Matter.js engine with game-specific functionality.

**Key Configuration:**
- **Zero gravity**: `{ x: 0, y: 0 }` for top-down view
- **No sleeping**: `enableSleeping: false` keeps all bodies active
- **High air friction**: 0.3-0.4 for natural damping
- **Large inertia**: 1e10 to prevent body rotation
- **Boundaries**: Static walls keep entities in bounds

### Physics Constants

Important constants in `PhysicsWorld`:
```javascript
REPULSION_DISTANCE_THRESHOLD = 100  // Distance for repulsion forces
MOVE_FORCE_MULTIPLIER = 0.1         // Steering force strength
```

Important constants in `NPC`:
```javascript
PERSONAL_SPACE = 25                  // Minimum distance from others
REPULSION_STRENGTH = 800 (good)      // Crowd avoidance force
                   = 400 (bad)
CUT_IN_FORCE_MULTIPLIER = 0.002      // Push force for bad NPCs
CUT_IN_DISTANCE_THRESHOLD = 40       // Range for cut-in behavior
```

### Safety Checks

Always check if Matter.js is available before using physics:
```javascript
if (typeof Matter === 'undefined') {
    throw new Error('Matter.js library is not loaded');
}
```

The game degrades gracefully if physics fails to initialize.

## Japanese Language

- UI text in Japanese (メニュー画面, ゲームオーバー, etc.)
- Comments can be in English or Japanese
- Variable/function names in English only

## Testing Approach

- Manual testing via browser (no automated tests currently)
- **ALWAYS test on mobile devices or use mobile emulation for touch interactions**
- Verify high scores persist via LocalStorage
- Check 60 FPS performance with many NPCs

### Taking Screenshots

**When taking screenshots of UI changes, ALWAYS use mobile device emulation:**
1. Open Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M / Cmd+Shift+M)
3. Select a mobile device (e.g., iPhone 12 Pro, Pixel 5) or set custom dimensions to 600x800
4. Ensure portrait orientation
5. Then take the screenshot to show the mobile experience

This is crucial because the game is designed for smartphone portrait mode.

## Common Patterns

### Delta Time Usage
```javascript
update(deltaTime) {
    this.x += this.speed * deltaTime; // speed is units per second
    this.timer += deltaTime; // accumulate time
}
```

### Canvas Rendering
```javascript
render(ctx) {
    if (!this.active) return;
    ctx.fillStyle = this.color;
    // Draw at center: x - width/2, y - height/2
}
```

### Distance Calculations
```javascript
const dist = Utils.distance(x1, y1, x2, y2); // Use utility
```

### Physics Body Creation
```javascript
// In entity constructor or initPhysics method
initPhysics(physicsWorld) {
    // Circle body for good NPCs
    this.physicsBody = physicsWorld.createCircleBody(
        this.x, this.y, radius,
        { density: 0.001, frictionAir: 0.4 }
    );
    
    // Rectangle body for bad NPCs
    this.physicsBody = physicsWorld.createRectangleBody(
        this.x, this.y, width, height,
        { density: 0.0015, frictionAir: 0.4 }
    );
    
    this.setPhysicsBody(this.physicsBody, physicsWorld);
}
```

### Physics-Based Movement
```javascript
update(deltaTime, ...params, physicsWorld) {
    // Always sync from physics first
    this.syncFromPhysics();
    
    // Apply steering force toward target
    if (this.target && this.physicsBody) {
        physicsWorld.moveTowards(
            this.physicsBody,
            this.target.x,
            this.target.y,
            this.speed
        );
    }
    
    // Apply repulsion from nearby NPCs
    for (const other of nearbyNpcs) {
        physicsWorld.applyRepulsion(
            this.physicsBody,
            other.physicsBody,
            this.REPULSION_STRENGTH
        );
    }
}
```

### Applying Physics Forces
```javascript
// Apply impulse (instantaneous force)
physicsWorld.applyImpulse(body, { x: forceX, y: forceY });

// Apply continuous force
physicsWorld.applyForce(body, { x: forceX, y: forceY });

// Set velocity directly (use sparingly)
physicsWorld.setVelocity(body, { x: velX, y: velY });
```

### Entity Cleanup
```javascript
destroy(physicsWorld) {
    this.active = false;
    if (this.physicsBody && physicsWorld) {
        physicsWorld.removeBody(this.physicsBody);
        this.physicsBody = null;
    }
}
```

## When Adding Features

1. **New entities**: Extend `Entity` class, implement `update()` and `render()`, add `initPhysics()` if using physics
2. **New attacks**: Extend `Attack` class, implement `execute()` with physics impulses, set cooldown
3. **New maps**: Add to `Maps` object in `maps.js`, follow existing structure
4. **New mechanics**: Keep game loop in `game.js`, use delta time for timing, pass `physicsWorld` as parameter
5. **UI changes**: Update `index.html` and `styles/main.css`, wire events in `main.js`
6. **Physics tuning**: Adjust constants in `PhysicsWorld` and entity classes, test with many NPCs

## Security Considerations

- No server-side code - all client-side
- LocalStorage only for game data (no sensitive info)
- Matter.js loaded from local file (js/matter.min.js), not CDN
- No user-generated content

## DO's and DON'Ts

### DO:
- ✅ **ALWAYS keep the core concept in mind: mobile-first, single-finger, cathartic mob-blasting**
- ✅ **ALWAYS use mobile device emulation when taking screenshots**
- ✅ Use flat, abstract visual design with simple geometric shapes
- ✅ Allow for black humor and exaggerated consequences in behaviors
- ✅ Maintain realistic base physics while adding comedic exaggeration
- ✅ Use ES6 classes with extends
- ✅ Use `deltaTime` for all time-based calculations
- ✅ Call `super()` first in constructors
- ✅ Check `this.active` before updating/rendering
- ✅ Use Utils functions for math operations
- ✅ Add Japanese text for UI elements
- ✅ Test on mobile/touch devices or emulators
- ✅ Design for portrait orientation (600x800)
- ✅ Use physics forces for movement instead of direct position manipulation
- ✅ Always sync from physics with `syncFromPhysics()` at start of update
- ✅ Pass `physicsWorld` parameter through update and execute methods
- ✅ Apply physics impulses in attacks for satisfying feedback
- ✅ Clean up physics bodies with `removeBody()` when destroying entities

### DON'T:
- ❌ **Break the single-finger operation principle**
- ❌ **Forget this is a mobile-first game**
- ❌ Add realistic textures or complex 3D graphics
- ❌ Make behaviors overly serious or realistic without humor
- ❌ Add external libraries without strong justification
- ❌ Use frameworks (React, Vue, etc.)
- ❌ Add build tools unless absolutely necessary
- ❌ Break the entity/attack inheritance patterns
- ❌ Hardcode timing values (use deltaTime)
- ❌ Modify existing class APIs without reviewing all usages
- ❌ Add automated tests that require build setup
- ❌ Add features requiring multi-touch or keyboard-only input
- ❌ Manipulate entity positions directly when using physics (use forces instead)
- ❌ Forget to check if Matter.js is loaded before using physics features
- ❌ Remove physics bodies without using `physicsWorld.removeBody()`

## Example: Adding a New Attack

```javascript
// js/attacks/MyNewAttack.js
class MyNewAttack extends Attack {
    constructor() {
        super();
        this.name = 'New Attack';
        this.cooldown = 2.0; // 2 seconds
        this.radius = 60; // Attack radius
    }
    
    execute(x, y, npcs, physicsWorld) {
        const hitNpcs = [];
        
        for (const npc of npcs) {
            if (!npc.active) continue;
            
            const dist = Utils.distance(x, y, npc.x, npc.y);
            if (dist <= this.radius) {
                // Apply physics impulse before removing NPC
                if (npc.physicsBody && physicsWorld) {
                    const angle = Math.atan2(npc.y - y, npc.x - x);
                    const forceMagnitude = 0.005 * (1 - dist / this.radius); // Stronger closer to center
                    physicsWorld.applyImpulse(npc.physicsBody, {
                        x: Math.cos(angle) * forceMagnitude,
                        y: Math.sin(angle) * forceMagnitude
                    });
                }
                hitNpcs.push(npc);
            }
        }
        
        return hitNpcs;
    }
    
    render(ctx, x, y) {
        // Visual effect
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
    }
}
```

Then add to `main.js` attack selection and `game.js` attack instantiation.
