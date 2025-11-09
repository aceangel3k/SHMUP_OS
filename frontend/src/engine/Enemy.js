/**
 * Enemy - Enemy ship with HP, movement, and AI
 * Handles enemy behavior and rendering
 */

export class Enemy {
  constructor(enemyData, x, y, path = 'straight', bulletPattern = null, shootCooldownMultiplier = 1.0) {
    // Enemy data from JSON
    this.id = enemyData.id;
    this.name = enemyData.name;
    this.maxHp = enemyData.hp;
    this.hp = enemyData.hp;
    this.speed = enemyData.speed * 100; // Convert to px/s
    this.radius = enemyData.radius;
    this.hitboxRadius = enemyData.radius * 1.2; // Hitbox for hits (sprite is 11x, hitbox is 1.2x)
    this.spritePrompt = enemyData.sprite_prompt;
    
    // Position
    this.x = x;
    this.y = y;
    this.startX = x;
    this.startY = y;
    
    // Movement
    this.path = path;
    this.pathTime = 0;
    
    // State
    this.active = true;
    this.isDead = false;
    
    // Visual
    this.color = '#FF6B6B'; // Red for enemies
    this.sprite = enemyData.sprite || null; // Loaded sprite image
    this.spriteLoaded = !!enemyData.sprite;
    
    // Damage flash
    this.damageFlash = 0;
    
    // Shooting
    this.bulletPattern = bulletPattern;
    this.shootTimer = 0;
    this.shootCooldown = (1.5 + Math.random()) * shootCooldownMultiplier; // Random cooldown 1.5-2.5s, scaled by difficulty
    
    // Lifetime tracking to prevent stuck enemies (more generous timeout)
    this.maxLifetime = 45; // 45 seconds max lifetime - increased to allow natural gameplay
    this.creationTime = Date.now();
    this.waveCompleted = false; // Track if this enemy was from a completed wave
  }
  
  /**
   * Update enemy position and state
   */
  update(deltaTime, player, pathFunctions, bulletManager = null) {
    if (!this.active) return;
    
    this.pathTime += deltaTime;
    
    // Execute path function
    if (pathFunctions[this.path]) {
      pathFunctions[this.path](this, this.pathTime, player);
    }
    
    // Update damage flash
    if (this.damageFlash > 0) {
      this.damageFlash -= deltaTime * 3;
    }
    
    // Shooting logic
    if (bulletManager && this.bulletPattern && this.x < 1200) {
      this.shootTimer += deltaTime;
      if (this.shootTimer >= this.shootCooldown) {
        this.shoot(bulletManager, player);
        this.shootTimer = 0;
      }
    }
    
    // Deactivate if off-screen (left side primarily, with generous timeout for stuck ones)
    if (
      this.x < -100 || // Left side - natural exit
      this.y < -200 || // Top side (far off-screen)
      this.y > 920 || // Bottom side (far off-screen)
      (Date.now() - this.creationTime) > this.maxLifetime * 1000 // Timeout for truly stuck enemies
    ) {
      this.active = false;
    }
  }
  
  /**
   * Render enemy
   */
  render(ctx) {
    if (!this.active) return;
    
    ctx.save();
    
    if (this.sprite && this.spriteLoaded) {
      // Render sprite image (11x larger than radius for visibility)
      // Sprites are generated facing left, no flip needed
      const spriteSize = this.radius * 11;
      ctx.drawImage(
        this.sprite,
        this.x - spriteSize / 2,
        this.y - spriteSize / 2,
        spriteSize,
        spriteSize
      );
    } else {
      // Render placeholder circle
      this.renderPlaceholder(ctx);
    }
    
    // Damage flash (only lights up sprite pixels - very bright)
    if (this.damageFlash > 0 && this.sprite && this.spriteLoaded) {
      const spriteSize = this.radius * 11;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter'; // Additive blend to brighten sprite
      ctx.globalAlpha = this.damageFlash;
      // Draw sprite multiple times for intense brightness
      for (let i = 0; i < 3; i++) {
        ctx.drawImage(
          this.sprite,
          this.x - spriteSize / 2,
          this.y - spriteSize / 2,
          spriteSize,
          spriteSize
        );
      }
      ctx.restore();
    }
    
    // Render HP bar (after damage flash so it's always visible)
    this.renderHPBar(ctx);
    
    ctx.restore();
  }
  
  /**
   * Render placeholder sprite
   */
  renderPlaceholder(ctx) {
    // Enemy circle
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Enemy ID letter
    ctx.fillStyle = '#000000';
    ctx.font = `${this.radius}px "Courier New"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.id[0].toUpperCase(), this.x, this.y);
  }
  
  /**
   * Render HP bar above enemy
   */
  renderHPBar(ctx) {
    const spriteSize = this.radius * 11; // Match sprite size
    const barWidth = spriteSize * 0.8; // 80% of sprite width
    const barHeight = 6;
    const barY = this.y - spriteSize / 2 - 12; // Above sprite
    
    // Background
    ctx.fillStyle = '#000000';
    ctx.fillRect(this.x - barWidth / 2, barY, barWidth, barHeight);
    
    // HP
    const hpPercent = this.hp / this.maxHp;
    const hpColor = hpPercent > 0.5 ? '#00FF00' : hpPercent > 0.25 ? '#FFFF00' : '#FF0000';
    ctx.fillStyle = hpColor;
    ctx.fillRect(this.x - barWidth / 2, barY, barWidth * hpPercent, barHeight);
    
    // Border
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x - barWidth / 2, barY, barWidth, barHeight);
  }
  
  /**
   * Shoot bullets at player
   */
  shoot(bulletManager, player) {
    if (!this.bulletPattern) return;
    
    // Simple aimed shot at player
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const angle = Math.atan2(dy, dx);
    
    // Spawn 3 bullets in a small spread
    const spreadAngles = [-0.2, 0, 0.2];
    for (const spread of spreadAngles) {
      const finalAngle = angle + spread;
      bulletManager.spawnEnemyBullet(
        this.x,
        this.y,
        Math.cos(finalAngle) * 300,
        Math.sin(finalAngle) * 300,
        this.color
      );
    }
  }
  
  /**
   * Take damage
   */
  takeDamage(damage) {
    this.hp -= damage;
    this.damageFlash = 1.0;
    
    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      this.active = false;
      return true; // Enemy destroyed
    }
    
    return false;
  }
  
  /**
   * Load enemy sprite
   */
  loadSprite(imageDataUri) {
    const img = new Image();
    
    img.onload = () => {
      this.sprite = img;
      this.spriteLoaded = true;
    };
    
    img.onerror = () => {
      console.error(`Failed to load enemy sprite: ${this.id}`);
      this.spriteLoaded = false;
    };
    
    img.src = imageDataUri;
  }
  
  /**
   * Get position
   */
  getPosition() {
    return { x: this.x, y: this.y };
  }
  
  /**
   * Check if active
   */
  isActive() {
    return this.active;
  }
  
  /**
   * Deactivate enemy
   */
  deactivate() {
    this.active = false;
  }
}
