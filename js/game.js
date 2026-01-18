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
        
        // Entities
        this.platform = null;
        this.escalators = [];
        this.trains = [];
        this.npcs = [];
        this.attack = null;
        
        // Timers
        this.trainTimer = 0;
        this.trainInterval = mapConfig.trainInterval;
        
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
        this.setupPlatform();
        this.setupEscalators();
        this.setupAttack();
        this.setupInput();
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
        
        const hitNPCs = this.attack.use(this.touchX, this.touchY, this.npcs);
        
        if (hitNPCs) {
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
        const scaledX = spawnPoint.x * (this.canvas.width / this.mapConfig.width);
        const scaledY = spawnPoint.y * (this.canvas.height / this.mapConfig.height);
        const train = new Train(scaledX, scaledY, this.time);
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
        
        // Update train spawning
        this.trainTimer += deltaTime;
        if (this.trainTimer >= this.trainInterval) {
            this.spawnTrain();
            this.trainTimer = 0;
        }
        
        // Update entities
        this.escalators.forEach(esc => esc.update(deltaTime));
        
        this.trains = this.trains.filter(train => {
            train.update(deltaTime);
            
            // Get passengers from stopped trains
            const passengers = train.getPassengers();
            this.npcs.push(...passengers);
            
            return train.active;
        });
        
        this.npcs = this.npcs.filter(npc => {
            npc.update(deltaTime, this.escalators, this.npcs, this.platform);
            
            // Check if NPC exited
            if (!npc.active && npc.state === 'exiting') {
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
    }

    updateHUD() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('timer').textContent = 
            Utils.formatTime(Math.max(0, this.gameTime - this.time));
        document.getElementById('current-attack').textContent = 
            this.attack ? this.attack.name : '-';
    }
}
