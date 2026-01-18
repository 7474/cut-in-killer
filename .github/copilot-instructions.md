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
- **Black Humor welcomed** - Exaggerated consequences are encouraged (e.g., mobs blown off platform onto train tracks and hit by passing trains)
- **Cathartic outcomes** - Satisfying visual and behavioral feedback when eliminating badly-behaved NPCs
- **Comedic timing** - Behaviors should feel natural but allow for humorous exaggeration

## Project Overview

Cut-in Killer (カットインキラー) is a casual web-based game set on a Tokyo subway platform. Players help well-behaved NPCs (blue circles) exit safely via escalators while eliminating badly-behaved NPCs (red squares) who try to cut in line.

## Tech Stack

- **HTML5 Canvas** for rendering
- **Vanilla JavaScript** (ES6+ classes) for game logic
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
│   ├── entities/
│   │   ├── Entity.js      # Base entity class with collision detection
│   │   ├── NPC.js         # NPCs with AI, pathfinding, queue behavior
│   │   ├── Train.js       # Train spawning NPCs
│   │   ├── Platform.js    # Platform rendering
│   │   └── Escalator.js   # Escalator with queue management
│   └── attacks/
│       ├── Attack.js      # Base attack class with cooldown
│       ├── BodySlam.js    # Small area instant attack (0.5s cooldown)
│       ├── Laser.js       # Line attack (1.5s cooldown)
│       └── Bomb.js        # Large area delayed attack (3s cooldown, 1s delay)
```

### Class Hierarchy

- **Entity** (base class)
  - NPC (good/bad types with AI)
  - Train (spawns NPCs)
  - Platform (static rendering)
  - Escalator (queue management)

- **Attack** (base class)
  - BodySlam (instant circle attack)
  - Laser (line-based attack)
  - Bomb (delayed circle attack)

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
    constructor(x, y) {
        super(x, y);
        // Initialize properties
    }
    
    update(deltaTime) {
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
    
    execute(x, y, npcs) {
        // Return array of hit NPCs
        return hitNpcs;
    }
}
```

## Game Mechanics

### NPC Behavior

- **Good NPCs** (青い円):
  - Move at 30 units/sec
  - Form orderly queues at escalators
  - Respect personal space (1.5x width multiplier)
  - Queue offset cached to prevent jittery movement
  - Worth +5 points when exiting, -5 if hit by player

- **Bad NPCs** (赤い四角):
  - Move at 50 units/sec (faster)
  - Take direct path to escalators
  - Attempt to cut in line (push good NPCs)
  - Lower collision avoidance (0.5x vs 1.0x)
  - Worth +10 points when eliminated, -10 if they exit

### Collision System

- **Collision detection**: AABB (Axis-Aligned Bounding Box) via `getBounds()` and `collidesWith()`
- **Collision avoidance**: NPCs calculate avoidance forces when too close
- **Personal space**: Minimum distance = `width * PERSONAL_SPACE_MULTIPLIER`
- **Queue behavior**: NPCs maintain `QUEUE_DISTANCE` (25 units) spacing

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
2. **Collision optimization**: Use distance checks before expensive AABB checks
3. **Path updates**: NPCs update paths every 0.5 seconds, not every frame
4. **Queue caching**: Queue positions cached to reduce recalculations
5. **Entity pooling**: Entities marked `active = false` instead of removed

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

## When Adding Features

1. **New entities**: Extend `Entity` class, implement `update()` and `render()`
2. **New attacks**: Extend `Attack` class, implement `execute()`, set cooldown
3. **New maps**: Add to `Maps` object in `maps.js`, follow existing structure
4. **New mechanics**: Keep game loop in `game.js`, use delta time for timing
5. **UI changes**: Update `index.html` and `styles/main.css`, wire events in `main.js`

## Security Considerations

- No server-side code - all client-side
- LocalStorage only for game data (no sensitive info)
- No external dependencies or CDNs
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
    
    execute(x, y, npcs) {
        const hitNpcs = [];
        
        for (const npc of npcs) {
            if (!npc.active) continue;
            
            const dist = Utils.distance(x, y, npc.x, npc.y);
            if (dist <= this.radius) {
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
