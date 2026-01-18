// Train entity that brings NPCs to the platform

class Train extends Entity {
    constructor(x, y, arrivalTime) {
        super(x, y);
        this.width = 40;  // Now narrow (perpendicular to movement)
        this.height = 150; // Now long (in direction of movement)
        this.color = '#95a5a6';
        this.state = 'arriving'; // arriving, stopped, departing
        this.arrivalTime = arrivalTime;
        this.stopDuration = 3; // seconds
        this.timer = 0;
        this.targetX = x; // Target X position (stopped at platform)
        this.startX = x - 200; // Start from left
        this.x = this.startX;
        this.endX = x + 200; // Exit to right
        this.passengers = [];
        this.hasUnloaded = false;
    }

    generatePassengers() {
        const count = Utils.randomInt(5, 15);
        const goodRatio = Utils.randomFloat(0.5, 0.8); // 50-80% good NPCs
        
        for (let i = 0; i < count; i++) {
            const type = Math.random() < goodRatio ? 'good' : 'bad';
            const offsetY = Utils.randomFloat(-50, 50); // Spread along train length
            const npc = new NPC(this.x, this.y + offsetY, type);
            this.passengers.push(npc);
        }
    }

    update(deltaTime) {
        if (!this.active) return;
        
        this.timer += deltaTime;
        
        if (this.state === 'arriving') {
            // Move train from left to platform position
            this.x = Utils.lerp(this.startX, this.targetX, Math.min(this.timer / 1.5, 1));
            
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
            // Move train from platform to right (pass through)
            this.x = Utils.lerp(this.targetX, this.endX, Math.min(this.timer / 1.5, 1));
            
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
        
        // Train body (vertical orientation)
        ctx.fillStyle = this.color;
        ctx.fillRect(
            this.x - this.width / 2,
            this.y - this.height / 2,
            this.width,
            this.height
        );
        
        // Train windows (arranged vertically)
        ctx.fillStyle = '#34495e';
        const windowCount = 5;
        const windowWidth = 25;
        const windowHeight = 20;
        const spacing = this.height / (windowCount + 1);
        
        for (let i = 0; i < windowCount; i++) {
            ctx.fillRect(
                this.x - windowWidth / 2,
                this.y - this.height / 2 + spacing * (i + 1) - windowHeight / 2,
                windowWidth,
                windowHeight
            );
        }
        
        // Train doors (when stopped) - on the right side
        if (this.state === 'stopped') {
            ctx.fillStyle = '#2ecc71';
            const doorCount = 3;
            const doorSpacing = this.height / (doorCount + 1);
            for (let i = 0; i < doorCount; i++) {
                ctx.fillRect(
                    this.x + this.width / 2 - 2,
                    this.y - this.height / 2 + doorSpacing * (i + 1) - 8,
                    5,
                    16
                );
            }
        }
    }
}
