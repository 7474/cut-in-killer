// Train entity that brings NPCs to the platform

class Train extends Entity {
    constructor(x, y, arrivalTime) {
        super(x, y);
        this.width = 40;   // Narrow (horizontal, perpendicular to movement)
        
        // Multi-car train configuration
        this.carCount = Utils.randomInt(3, 6); // Random number of cars: 3-6
        this.carLength = 80; // Length of each car (80 pixels each, vs previous fixed 150 total)
        this.carGap = 8; // Gap between cars
        this.WINDOWS_PER_CAR = 3; // Windows per car
        this.DOORS_PER_CAR = 2; // Doors per car
        this.height = this.carCount * this.carLength + (this.carCount - 1) * this.carGap; // Total train length
        
        this.color = '#95a5a6';
        this.state = 'arriving'; // arriving, stopped, departing
        this.arrivalTime = arrivalTime;
        this.stopDuration = 3; // seconds
        this.timer = 0;
        this.targetY = y; // Target Y position (stopped at platform)
        this.startY = y + 200; // Start from bottom (below screen)
        this.y = this.startY;
        this.endY = -this.height / 2 - 10; // Exit completely off top of screen
        this.passengers = [];
        this.hasUnloaded = false;
        this.DOOR_CLEARANCE = 15; // Space between train doors and NPC spawn position
        
        // Calculate durations to maintain consistent speed
        const ARRIVAL_DISTANCE = Math.abs(this.targetY - this.startY);
        const ARRIVAL_DURATION = 1.5; // seconds
        this.TRAIN_SPEED = ARRIVAL_DISTANCE / ARRIVAL_DURATION; // pixels per second
        this.arrivalDuration = ARRIVAL_DURATION;
        this.departingDuration = Math.abs(this.targetY - this.endY) / this.TRAIN_SPEED;
    }

    generatePassengers() {
        const count = Utils.randomInt(5, 15);
        const goodRatio = Utils.randomFloat(0.5, 0.8); // 50-80% good NPCs
        
        for (let i = 0; i < count; i++) {
            const type = Math.random() < goodRatio ? 'good' : 'bad';
            // Spread passengers along the entire train length (all cars)
            const halfHeight = this.height / 2;
            const offsetY = Utils.randomFloat(-halfHeight + 10, halfHeight - 10);
            // NPCs spawn on the platform (to the right of the train when train stops)
            const platformOffset = this.width / 2 + this.DOOR_CLEARANCE;
            const npc = new NPC(this.x + platformOffset, this.y + offsetY, type);
            this.passengers.push(npc);
        }
    }

    update(deltaTime) {
        if (!this.active) return;
        
        this.timer += deltaTime;
        
        if (this.state === 'arriving') {
            // Move train from bottom to platform position
            this.y = Utils.lerp(this.startY, this.targetY, Math.min(this.timer / this.arrivalDuration, 1));
            
            if (this.timer >= this.arrivalDuration) {
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
            // Move train from platform to top (pass through and exit off-screen)
            this.y = Utils.lerp(this.targetY, this.endY, Math.min(this.timer / this.departingDuration, 1));
            
            if (this.timer >= this.departingDuration) {
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
        
        // Calculate starting Y position for first car
        const startY = this.y - this.height / 2;
        
        // Draw each car with gaps
        for (let carIndex = 0; carIndex < this.carCount; carIndex++) {
            const carY = startY + carIndex * (this.carLength + this.carGap);
            
            // Train car body
            ctx.fillStyle = this.color;
            ctx.fillRect(
                this.x - this.width / 2,
                carY,
                this.width,
                this.carLength
            );
            
            // Train windows (arranged vertically along the car)
            ctx.fillStyle = '#34495e';
            const windowCount = this.WINDOWS_PER_CAR;
            const windowWidth = 25;
            const windowHeight = 15;
            const spacing = this.carLength / (windowCount + 1);
            
            for (let i = 0; i < windowCount; i++) {
                ctx.fillRect(
                    this.x - windowWidth / 2,
                    carY + spacing * (i + 1) - windowHeight / 2,
                    windowWidth,
                    windowHeight
                );
            }
            
            // Train doors (when stopped) - on the right side (toward platform)
            if (this.state === 'stopped') {
                ctx.fillStyle = '#2ecc71';
                const doorCount = this.DOORS_PER_CAR;
                const doorSpacing = this.carLength / (doorCount + 1);
                for (let i = 0; i < doorCount; i++) {
                    ctx.fillRect(
                        this.x + this.width / 2 - 2,
                        carY + doorSpacing * (i + 1) - 8,
                        5,
                        16
                    );
                }
            }
            
            // Car connectors (darker rectangles in the gaps) - not for the last car
            if (carIndex < this.carCount - 1) {
                ctx.fillStyle = '#7f8c8d';
                ctx.fillRect(
                    this.x - this.width / 2 + 5,
                    carY + this.carLength,
                    this.width - 10,
                    this.carGap
                );
            }
        }
    }
}
