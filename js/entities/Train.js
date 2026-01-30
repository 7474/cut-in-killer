// Train entity that brings NPCs to the platform

class Train extends Entity {
    constructor(x, y, arrivalTime) {
        super(x, y);
        this.width = 40;   // Narrow (horizontal, perpendicular to movement)
        
        // Multi-car train configuration constants
        // Trains should occupy most of the platform vertically (like real trains)
        const MIN_CARS = 8;
        const MAX_CARS = 10;
        const CAR_LENGTH = 60; // Length of each car
        const CAR_GAP = 8;
        
        this.carCount = Utils.randomInt(MIN_CARS, MAX_CARS); // Random number of cars
        this.carLength = CAR_LENGTH; // Length of each car
        this.carGap = CAR_GAP; // Gap between cars
        this.WINDOWS_PER_CAR = 3; // Windows per car
        this.DOORS_PER_CAR = 2; // Doors per car
        this.height = this.carCount * this.carLength + (this.carCount - 1) * this.carGap; // Total train length
        
        this.color = '#95a5a6';
        this.state = 'arriving'; // arriving, stopped, departing
        this.arrivalTime = arrivalTime;
        this.stopDuration = 3; // seconds
        this.timer = 0;
        // Position train to stop near platform end (top), like real trains
        // Train center positioned so the front is near escalators (y=80-100 area)
        const PLATFORM_TOP_MARGIN = 120; // Space from top of screen to front of train
        this.targetY = PLATFORM_TOP_MARGIN + this.height / 2; // Target Y position (stopped at platform)
        this.startY = y + 200; // Start from bottom (below screen, y comes from spawn point)
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

    generatePassengers(physicsWorld = null) {
        const count = Utils.randomInt(5, 15);
        const goodRatio = Utils.randomFloat(0.5, 0.8); // 50-80% good NPCs
        
        // Calculate all door positions
        const doorPositions = this.getDoorPositions();
        
        for (let i = 0; i < count; i++) {
            const type = Math.random() < goodRatio ? 'good' : 'bad';
            
            // Select a random door position
            const doorPos = doorPositions[Math.floor(Math.random() * doorPositions.length)];
            
            // NPCs spawn on the platform (to the right of the train when train stops)
            // Position them near the selected door with slight horizontal spread
            const platformOffset = this.width / 2 + this.DOOR_CLEARANCE;
            const horizontalSpread = Utils.randomFloat(0, 30); // Add 0-30 pixels horizontal spread
            const npc = new NPC(this.x + platformOffset + horizontalSpread, doorPos, type, physicsWorld);
            this.passengers.push(npc);
        }
    }
    
    getDoorPositions() {
        // Calculate Y positions of all doors on the train
        const doorPositions = [];
        const startY = this.y - this.height / 2;
        
        for (let carIndex = 0; carIndex < this.carCount; carIndex++) {
            const carY = startY + carIndex * (this.carLength + this.carGap);
            const doorSpacing = this.carLength / (this.DOORS_PER_CAR + 1);
            
            for (let doorIndex = 0; doorIndex < this.DOORS_PER_CAR; doorIndex++) {
                const doorY = carY + doorSpacing * (doorIndex + 1);
                doorPositions.push(doorY);
            }
        }
        
        return doorPositions;
    }

    update(deltaTime, physicsWorld = null) {
        if (!this.active) return;
        
        this.timer += deltaTime;
        
        if (this.state === 'arriving') {
            // Move train from bottom to platform position
            this.y = Utils.lerp(this.startY, this.targetY, Math.min(this.timer / this.arrivalDuration, 1));
            
            if (this.timer >= this.arrivalDuration) {
                this.state = 'stopped';
                this.timer = 0;
                
                if (!this.hasUnloaded) {
                    this.generatePassengers(null); // Disable physics for now to fix display issue
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
