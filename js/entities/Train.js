// Train entity that brings NPCs to the platform

class Train extends Entity {
    constructor(x, y, arrivalTime) {
        super(x, y);
        this.width = 150;  // Long (horizontal, across the track)
        this.height = 40;  // Narrow (vertical, along movement direction)
        this.color = '#95a5a6';
        this.state = 'arriving'; // arriving, stopped, departing
        this.arrivalTime = arrivalTime;
        this.stopDuration = 3; // seconds
        this.timer = 0;
        this.targetY = y; // Target Y position (stopped at platform)
        this.startY = y + 200; // Start from bottom (below screen)
        this.y = this.startY;
        this.endY = y - 200; // Exit to top
        this.passengers = [];
        this.hasUnloaded = false;
        this.DOOR_CLEARANCE = 15; // Space between train doors and NPC spawn position
    }

    generatePassengers() {
        const count = Utils.randomInt(5, 15);
        const goodRatio = Utils.randomFloat(0.5, 0.8); // 50-80% good NPCs
        
        for (let i = 0; i < count; i++) {
            const type = Math.random() < goodRatio ? 'good' : 'bad';
            const offsetX = Utils.randomFloat(-50, 50); // Spread along train length
            // NPCs spawn on the platform (above the train when train stops)
            const platformOffset = this.height / 2 + this.DOOR_CLEARANCE;
            const npc = new NPC(this.x + offsetX, this.y - platformOffset, type);
            this.passengers.push(npc);
        }
    }

    update(deltaTime) {
        if (!this.active) return;
        
        this.timer += deltaTime;
        
        if (this.state === 'arriving') {
            // Move train from bottom to platform position
            this.y = Utils.lerp(this.startY, this.targetY, Math.min(this.timer / 1.5, 1));
            
            if (this.timer >= 1.5) {
                this.state = 'stopped';
                this.timer = 0;
                
                if (!this.hasUnloaded) {
                    this.generatePassengers();
                    this.hasUnloaded = true;
                }
            }
        } else if (this.state === 'stopped') {
            if (this.timer >= this.stopDuration) {
                this.state = 'departing';
                this.timer = 0;
            }
        } else if (this.state === 'departing') {
            // Move train from platform to top (pass through)
            this.y = Utils.lerp(this.targetY, this.endY, Math.min(this.timer / 1.5, 1));
            
            if (this.timer >= 1.5) {
                this.active = false;
            }
        }
    }

    getPassengers() {
        if (this.state === 'stopped' && this.hasUnloaded) {
            const passengers = this.passengers;
            this.passengers = [];
            return passengers;
        }
        return [];
    }

    render(ctx) {
        if (!this.active) return;
        
        // Train body (wide horizontally, moving vertically)
        ctx.fillStyle = this.color;
        ctx.fillRect(
            this.x - this.width / 2,
            this.y - this.height / 2,
            this.width,
            this.height
        );
        
        // Train windows (arranged horizontally along the width)
        ctx.fillStyle = '#34495e';
        const windowCount = 5;
        const windowWidth = 20;
        const windowHeight = 25;
        const spacing = this.width / (windowCount + 1);
        
        for (let i = 0; i < windowCount; i++) {
            ctx.fillRect(
                this.x - this.width / 2 + spacing * (i + 1) - windowWidth / 2,
                this.y - windowHeight / 2,
                windowWidth,
                windowHeight
            );
        }
        
        // Train doors (when stopped) - on the top side (toward platform)
        if (this.state === 'stopped') {
            ctx.fillStyle = '#2ecc71';
            const doorCount = 3;
            const doorSpacing = this.width / (doorCount + 1);
            for (let i = 0; i < doorCount; i++) {
                ctx.fillRect(
                    this.x - this.width / 2 + doorSpacing * (i + 1) - 8,
                    this.y - this.height / 2 - 2,
                    16,
                    5
                );
            }
        }
    }
}
