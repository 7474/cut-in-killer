// Main game logic

class Game {
    constructor(canvas, mapConfig, attackType) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.mapConfig = mapConfig;
        this.attackType = attackType;
        
        // Game state
        this.running = false;
        this.score = 0;
        this.time = 0;
        this.gameTime = mapConfig.gameDuration;
        
        // Physics world
        this.physicsWorld = null;
        
        // Entities
        this.platform = null;
        this.escalators = [];
        this.trains = [];
        this.npcs = [];
        this.attack = null;
        
        // Timers
        this.trainTimer = 0;
        this.trainInterval = mapConfig.trainInterval;
        
        // Throughput metrics for debugging/balancing
        this.metrics = {
            totalSpawned: 0,      // Total NPCs spawned
            totalExited: 0,       // Total NPCs that exited via escalator
            totalEliminated: 0,   // Total NPCs eliminated by player
            spawnRate: 0,         // NPCs spawned per second
            exitRate: 0,          // NPCs exited per second
            measurementStartTime: 30, // Time (seconds from game start) when we start measuring steady state
            measurementDuration: 30,  // Measure over 30 seconds after initial spawn period
            spawnedDuringMeasurement: 0,
            exitedDuringMeasurement: 0,
            eliminatedDuringMeasurement: 0
        };
        
        // Input
        this.touchActive = false;
        this.touchX = 0;
        this.touchY = 0;
        
        // Animation
        this.lastTime = 0;
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupPhysics();
        this.setupPlatform();
        this.setupEscalators();
        this.setupAttack();
        this.setupInput();
    }
    
    setupPhysics() {
        this.physicsWorld = new PhysicsWorld(this.canvas.width, this.canvas.height);
    }

    setupCanvas() {
        this.canvas.width = Math.min(this.mapConfig.width, window.innerWidth);
        this.canvas.height = Math.min(this.mapConfig.height, window.innerHeight - 80);
    }

    setupPlatform() {
        this.platform = new Platform({
            x: 0,
            y: 0,
            width: this.canvas.width,
            height: this.canvas.height,
            trainSpawnPoints: this.mapConfig.trainSpawnPoints.map(p => ({
                x: p.x * (this.canvas.width / this.mapConfig.width),
                y: p.y * (this.canvas.height / this.mapConfig.height)
            })),
            escalatorPositions: this.mapConfig.escalatorPositions
        });
    }

    setupEscalators() {
        const positions = this.platform.getEscalatorPositions();
        for (const pos of positions) {
            const scaledX = pos.x * (this.canvas.width / this.mapConfig.width);
            const scaledY = pos.y * (this.canvas.height / this.mapConfig.height);
            this.escalators.push(new Escalator(scaledX, scaledY));
        }
    }

    setupAttack() {
        switch (this.attackType) {
            case 'bodyslam':
                this.attack = new BodySlam();
                break;
            case 'laser':
                this.attack = new Laser();
                break;
            case 'bomb':
                this.attack = new Bomb();
                break;
            default:
                this.attack = new BodySlam();
        }
    }

    setupInput() {
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            // Scale coordinates from CSS size to canvas internal size
            this.touchX = (touch.clientX - rect.left) * (this.canvas.width / rect.width);
            this.touchY = (touch.clientY - rect.top) * (this.canvas.height / rect.height);
            this.touchActive = true;
            this.handleAttack();
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            // Scale coordinates from CSS size to canvas internal size
            this.touchX = (touch.clientX - rect.left) * (this.canvas.width / rect.width);
            this.touchY = (touch.clientY - rect.top) * (this.canvas.height / rect.height);
        });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.touchActive = false;
        });

        // Mouse events for desktop testing
        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            // Scale coordinates from CSS size to canvas internal size
            this.touchX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            this.touchY = (e.clientY - rect.top) * (this.canvas.height / rect.height);
            this.touchActive = true;
            this.handleAttack();
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.touchActive) {
                const rect = this.canvas.getBoundingClientRect();
                // Scale coordinates from CSS size to canvas internal size
                this.touchX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
                this.touchY = (e.clientY - rect.top) * (this.canvas.height / rect.height);
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.touchActive = false;
        });
    }

    handleAttack() {
        if (!this.running) return;
        
        const hitNPCs = this.attack.use(this.touchX, this.touchY, this.npcs, this.physicsWorld);
        
        if (hitNPCs) {
            // Track eliminations
            this.metrics.totalEliminated += hitNPCs.length;
            
            // Track eliminations during measurement period
            if (this.time >= this.metrics.measurementStartTime && 
                this.time < this.metrics.measurementStartTime + this.metrics.measurementDuration) {
                this.metrics.eliminatedDuringMeasurement += hitNPCs.length;
            }
            
            // Calculate score changes
            for (const npc of hitNPCs) {
                if (npc.type === 'bad') {
                    this.score += 10; // Good! Hit a bad NPC
                } else {
                    this.score -= 5; // Bad! Hit a good NPC
                }
            }
            this.updateHUD();
        }
    }

    spawnTrain() {
        const spawnPoint = this.platform.getTrainSpawnPoint(this.trains.length);
        // Spawn points are already scaled when platform is created, no need to scale again
        const train = new Train(spawnPoint.x, spawnPoint.y, this.time);
        this.trains.push(train);
    }

    start() {
        this.running = true;
        this.score = 0;
        this.time = 0;
        this.trainTimer = 0;
        this.trains = [];
        this.npcs = [];
        this.lastTime = performance.now();
        
        // Reset metrics
        this.metrics = {
            totalSpawned: 0,
            totalExited: 0,
            totalEliminated: 0,
            spawnRate: 0,
            exitRate: 0,
            measurementStartTime: 30, // Start measuring after 30 seconds (allow time for NPCs to reach escalator)
            measurementDuration: 30,
            spawnedDuringMeasurement: 0,
            exitedDuringMeasurement: 0,
            eliminatedDuringMeasurement: 0
        };
        
        // Spawn first train immediately
        this.spawnTrain();
        
        this.updateHUD();
        this.gameLoop();
    }

    stop() {
        this.running = false;
        return {
            score: this.score,
            mapId: this.mapConfig.id
        };
    }

    gameLoop() {
        if (!this.running) return;

        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.render();

        requestAnimationFrame(() => this.gameLoop());
    }

    update(deltaTime) {
        this.time += deltaTime;
        
        // Check game over
        if (this.time >= this.gameTime) {
            this.running = false;
            window.gameInstance.onGameOver(this.stop());
            return;
        }
        
        // Log metrics at end of measurement period (once)
        const measurementEndTime = this.metrics.measurementStartTime + this.metrics.measurementDuration;
        if (this.time >= measurementEndTime && this.time - deltaTime < measurementEndTime) {
            // Calculate rates
            this.metrics.spawnRate = this.metrics.spawnedDuringMeasurement / this.metrics.measurementDuration;
            this.metrics.exitRate = this.metrics.exitedDuringMeasurement / this.metrics.measurementDuration;
            const eliminationRate = this.metrics.eliminatedDuringMeasurement / this.metrics.measurementDuration;
            
            // Count NPCs by state
            const stateCount = { walking: 0, queuing: 0, exiting: 0 };
            this.npcs.forEach(npc => {
                if (npc.active) stateCount[npc.state]++;
            });
            
            console.log('=== NPC Throughput Metrics (Steady State) ===');
            console.log(`Measurement period: ${this.metrics.measurementStartTime}s - ${measurementEndTime}s`);
            console.log(`Total spawned: ${this.metrics.totalSpawned} NPCs`);
            console.log(`During measurement: ${this.metrics.spawnedDuringMeasurement} spawned, ${this.metrics.exitedDuringMeasurement} exited, ${this.metrics.eliminatedDuringMeasurement} eliminated`);
            console.log(`Spawn rate: ${this.metrics.spawnRate.toFixed(2)} NPCs/s`);
            console.log(`Exit rate: ${this.metrics.exitRate.toFixed(2)} NPCs/s`);
            console.log(`Elimination rate: ${eliminationRate.toFixed(2)} NPCs/s`);
            console.log(`Total accounted: ${(this.metrics.exitRate + eliminationRate).toFixed(2)} NPCs/s`);
            console.log(`Balance: ${(this.metrics.exitRate + eliminationRate - this.metrics.spawnRate).toFixed(2)} NPCs/s (should be close to 0 for steady state)`);
            console.log(`Current NPC count: ${this.npcs.length} (walking: ${stateCount.walking}, queuing: ${stateCount.queuing}, exiting: ${stateCount.exiting})`);
            console.log(`Escalator queue length: ${this.escalators.map(e => e.queue.length).join(', ')}`);
            console.log('==========================================');
        }
        
        // Update physics world
        if (this.physicsWorld) {
            this.physicsWorld.update(deltaTime);
        }
        
        // Update train spawning
        this.trainTimer += deltaTime;
        if (this.trainTimer >= this.trainInterval) {
            this.spawnTrain();
            this.trainTimer = 0;
        }
        
        // Update entities
        this.escalators.forEach(esc => esc.update(deltaTime));
        
        this.trains = this.trains.filter(train => {
            train.update(deltaTime, this.physicsWorld);
            
            // Get passengers from stopped trains
            const passengers = train.getPassengers();
            if (passengers.length > 0) {
                this.npcs.push(...passengers);
                this.metrics.totalSpawned += passengers.length;
                
                // Track spawns during measurement period
                if (this.time >= this.metrics.measurementStartTime && 
                    this.time < this.metrics.measurementStartTime + this.metrics.measurementDuration) {
                    this.metrics.spawnedDuringMeasurement += passengers.length;
                }
            }
            
            return train.active;
        });
        
        this.npcs = this.npcs.filter(npc => {
            npc.update(deltaTime, this.escalators, this.npcs, this.platform, this.physicsWorld);
            
            // Check if NPC exited
            if (!npc.active && npc.state === 'exiting') {
                this.metrics.totalExited++;
                
                // Track exits during measurement period
                if (this.time >= this.metrics.measurementStartTime && 
                    this.time < this.metrics.measurementStartTime + this.metrics.measurementDuration) {
                    this.metrics.exitedDuringMeasurement++;
                }
                
                if (npc.type === 'good') {
                    this.score += 5; // Good NPC exited safely
                } else {
                    this.score -= 10; // Bad NPC got away
                }
            }
            
            return npc.active;
        });
        
        // Update attack
        if (this.attack) {
            this.attack.update(deltaTime);
        }
        
        this.updateHUD();
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = '#34495e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render entities
        this.platform.render(this.ctx);
        this.escalators.forEach(esc => esc.render(this.ctx));
        this.trains.forEach(train => train.render(this.ctx));
        this.npcs.forEach(npc => npc.render(this.ctx));
        
        // Render attack effects
        if (this.attack) {
            this.attack.render(this.ctx);
        }
        
        // Render touch indicator
        if (this.touchActive && this.attack) {
            const cooldownPercent = this.attack.getCooldownPercent();
            this.ctx.strokeStyle = cooldownPercent >= 1 ? '#2ecc71' : '#e74c3c';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(this.touchX, this.touchY, 20, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Cooldown indicator
            if (cooldownPercent < 1) {
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                this.ctx.beginPath();
                this.ctx.moveTo(this.touchX, this.touchY);
                this.ctx.arc(
                    this.touchX, this.touchY, 20,
                    -Math.PI / 2,
                    -Math.PI / 2 + Math.PI * 2 * cooldownPercent
                );
                this.ctx.lineTo(this.touchX, this.touchY);
                this.ctx.fill();
            }
        }
        
        // Render permanent cooldown indicator in bottom left corner
        this.renderCooldownIndicator();
    }
    
    renderCooldownIndicator() {
        if (!this.attack) return;
        
        const cooldownPercent = this.attack.getCooldownPercent();
        const radius = 35;
        const x = radius + 20;
        const y = this.canvas.height - radius - 20;
        
        // Background circle (dark)
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Border circle
        this.ctx.strokeStyle = cooldownPercent >= 1 ? '#2ecc71' : '#e74c3c';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Cooldown fill (pie chart style)
        if (cooldownPercent < 1) {
            this.ctx.fillStyle = 'rgba(231, 76, 60, 0.5)';
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.arc(
                x, y, radius,
                -Math.PI / 2,
                -Math.PI / 2 + Math.PI * 2 * cooldownPercent
            );
            this.ctx.lineTo(x, y);
            this.ctx.fill();
        } else {
            // Ready indicator - full green fill
            this.ctx.fillStyle = 'rgba(46, 204, 113, 0.5)';
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Text in center showing percentage or ready status
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        if (cooldownPercent >= 1) {
            this.ctx.fillText('準備OK', x, y);
        } else {
            const remainingTime = this.attack.cooldownTimer;
            this.ctx.fillText(remainingTime.toFixed(1), x, y);
        }
    }

    updateHUD() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('timer').textContent = 
            Utils.formatTime(Math.max(0, this.gameTime - this.time));
        document.getElementById('current-attack').textContent = 
            this.attack ? this.attack.name : '-';
    }
}
