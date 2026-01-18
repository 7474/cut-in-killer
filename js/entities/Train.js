// Train entity that brings NPCs to the platform

class Train extends Entity {
    constructor(x, y, arrivalTime) {
        super(x, y);
        this.width = 100;
        this.height = 40;
        this.color = '#95a5a6';
        this.state = 'arriving'; // arriving, stopped, departing
        this.arrivalTime = arrivalTime;
        this.stopDuration = 3; // seconds
        this.timer = 0;
        this.targetY = y;
        this.startY = y - 200;
        this.y = this.startY;
        this.passengers = [];
        this.hasUnloaded = false;
    }

    generatePassengers() {
        const count = Utils.randomInt(5, 15);
        const goodRatio = Utils.randomFloat(0.5, 0.8); // 50-80% good NPCs
        
        for (let i = 0; i < count; i++) {
            const type = Math.random() < goodRatio ? 'good' : 'bad';
            const offsetX = Utils.randomFloat(-30, 30);
            const npc = new NPC(this.x + offsetX, this.y, type);
            this.passengers.push(npc);
        }
    }

    update(deltaTime) {
        if (!this.active) return;
        
        this.timer += deltaTime;
        
        if (this.state === 'arriving') {
            // Move train into position
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
            // Move train out of view
            this.y = Utils.lerp(this.targetY, this.startY, Math.min(this.timer / 1.5, 1));
            
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
        
        // Train body
        ctx.fillStyle = this.color;
        ctx.fillRect(
            this.x - this.width / 2,
            this.y - this.height / 2,
            this.width,
            this.height
        );
        
        // Train windows
        ctx.fillStyle = '#34495e';
        const windowCount = 3;
        const windowWidth = 20;
        const windowHeight = 15;
        const spacing = this.width / (windowCount + 1);
        
        for (let i = 0; i < windowCount; i++) {
            ctx.fillRect(
                this.x - this.width / 2 + spacing * (i + 1) - windowWidth / 2,
                this.y - windowHeight / 2,
                windowWidth,
                windowHeight
            );
        }
        
        // Train doors (when stopped)
        if (this.state === 'stopped') {
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(
                this.x - 5,
                this.y + this.height / 2 - 5,
                10,
                5
            );
        }
    }
}
