/**
 * Boss - Boss enemy with multiple phases
 * Handles boss behavior, HP gates, and phase transitions
 */

export class Boss {
  constructor(bossData, x, y, shootCooldownMultiplier = 1.0) {
    // Boss data from JSON
    this.id = bossData.id;
    this.name = bossData.title || bossData.name || 'Boss';
    this.radius = bossData.radius || 40;
    this.hitboxRadius = (bossData.radius || 40) * 1.2; // Hitbox for hits (sprite is 10x, hitbox is 1.2x)
    this.spritePrompt = bossData.sprite_prompt;
    
    // Phases
    this.phases = bossData.phases || [];
    this.currentPhaseIndex = 0;
    this.currentPhase = this.phases[0] || null;
    
    // Calculate total HP from all phases
    this.maxHp = this.phases.reduce((total, phase) => total + (phase.hp || 0), 0);
    this.hp = this.maxHp;
    
    // Position
    this.x = x;
    this.y = y;
    this.startX = x;
    this.startY = y;
    
    // Movement
    this.targetX = x - 200; // Move to this position
    this.targetY = y;
    this.isMovingToPosition = true;
    
    // Vertical panning movement
    this.panSpeed = 80; // pixels per second
    this.panDirection = 1; // 1 = down, -1 = up
    this.panMin = 150; // minimum Y position
    this.panMax = 570; // maximum Y position (720 - 150)
    this.panTime = 0;
    
    // State
    this.active = true;
    this.isDead = false;
    this.isInvulnerable = false;
    
    // Attack timing with difficulty scaling
    this.attackCooldown = 0;
    this.baseAttackCooldown = 2.0;
    this.shootCooldownMultiplier = shootCooldownMultiplier;
    this.patternRotation = 0;
    
    // Shooting at player
    this.shootTimer = 0;
    this.shootCooldown = (1.5 + Math.random() * 0.5) * shootCooldownMultiplier; // 1.5-2.0s, scaled by difficulty
    
    // Visual
    this.color = '#FF00FF'; // Magenta for boss
    this.sprite = bossData.sprite || null; // Loaded sprite image
    this.spriteLoaded = !!bossData.sprite;
    this.damageFlash = 0;
  }
  
  /**
   * Update boss logic
   */
  update(deltaTime, player, bulletPattern, bulletManager = null) {
    if (!this.active) return;
    
    // Move to position
    if (this.isMovingToPosition) {
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 5) {
        this.x += (dx / dist) * 100 * deltaTime;
        this.y += (dy / dist) * 100 * deltaTime;
      } else {
        this.isMovingToPosition = false;
      }
    } else {
      // Vertical panning movement when in position
      this.panTime += deltaTime;
      this.y += this.panSpeed * this.panDirection * deltaTime;
      
      // Reverse direction at boundaries
      if (this.y >= this.panMax) {
        this.y = this.panMax;
        this.panDirection = -1;
      } else if (this.y <= this.panMin) {
        this.y = this.panMin;
        this.panDirection = 1;
      }
    }
    
    // Update pattern rotation
    this.patternRotation += 30 * deltaTime; // 30 degrees per second
    
    // Update attack cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime;
    }
    
    // Attack if cooldown ready
    if (!this.isMovingToPosition && this.attackCooldown <= 0 && this.currentPhase) {
      this.executeAttack(bulletPattern, player);
      this.attackCooldown = (this.currentPhase.cooldown || this.baseAttackCooldown) * this.shootCooldownMultiplier;
    }
    
    // Shoot at player
    if (!this.isMovingToPosition && bulletManager && player) {
      this.shootTimer += deltaTime;
      if (this.shootTimer >= this.shootCooldown) {
        this.shootAtPlayer(player, bulletManager);
        this.shootTimer = 0;
        this.shootCooldown = (1.5 + Math.random() * 0.5) * this.shootCooldownMultiplier;
      }
    }
    
    // Update damage flash
    if (this.damageFlash > 0) {
      this.damageFlash -= deltaTime * 3;
    }
    
    // Check phase transitions
    this.checkPhaseTransition();
  }
  
  /**
   * Execute current phase attack
   */
  executeAttack(bulletPattern, player) {
    if (!this.currentPhase || !this.currentPhase.patterns) return;
    
    for (const patternId of this.currentPhase.patterns) {
      bulletPattern.spawn(
        patternId,
        this.x,
        this.y,
        this.patternRotation,
        200,
        player
      );
    }
  }
  
  /**
   * Shoot aimed bullets at player
   */
  shootAtPlayer(player, bulletManager) {
    if (!player) return;
    
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const angle = Math.atan2(dy, dx);
    
    // Spawn 3 bullets in a small spread aimed at player
    const spreadAngles = [-0.15, 0, 0.15];
    for (const spread of spreadAngles) {
      const finalAngle = angle + spread;
      bulletManager.spawnEnemyBullet(
        this.x,
        this.y,
        Math.cos(finalAngle) * 250,
        Math.sin(finalAngle) * 250,
        this.color
      );
    }
  }
  
  /**
   * Check if should transition to next phase
   */
  checkPhaseTransition() {
    if (!this.currentPhase) return;
    
    const hpPercent = this.hp / this.maxHp;
    const phaseHpThreshold = this.currentPhase.hp_threshold || 0;
    
    if (hpPercent <= phaseHpThreshold && this.currentPhaseIndex < this.phases.length - 1) {
      this.currentPhaseIndex++;
      this.currentPhase = this.phases[this.currentPhaseIndex];
      this.attackCooldown = 0; // Attack immediately on phase change
      console.log(`👹 Boss phase ${this.currentPhaseIndex + 1}: ${this.currentPhase.name}`);
    }
  }
  
  /**
   * Render boss
   */
  render(ctx) {
    if (!this.active) return;
    
    ctx.save();
    
    if (this.sprite && this.spriteLoaded) {
      // Render sprite (10x larger than radius for imposing presence)
      // Sprites are generated facing left, no flip needed
      const spriteSize = this.radius * 10;
      ctx.drawImage(
        this.sprite,
        this.x - spriteSize / 2,
        this.y - spriteSize / 2,
        spriteSize,
        spriteSize
      );
    } else {
      // Render placeholder
      this.renderPlaceholder(ctx);
    }
    
    // Damage flash (only lights up sprite pixels - very bright)
    if (this.damageFlash > 0 && this.sprite && this.spriteLoaded) {
      const spriteSize = this.radius * 10;
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
   * Render placeholder boss sprite
   */
  renderPlaceholder(ctx) {
    // Boss circle
    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Boss name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px "Courier New"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BOSS', this.x, this.y);
  }
  
  /**
   * Render boss HP bar (larger, at top of screen)
   */
  renderHPBar(ctx) {
    const barWidth = 400;
    const barHeight = 20;
    const barX = 1280 / 2 - barWidth / 2;
    const barY = 50;
    
    // Background
    ctx.fillStyle = '#000000';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // HP
    const hpPercent = this.hp / this.maxHp;
    const hpColor = hpPercent > 0.5 ? '#00FF00' : hpPercent > 0.25 ? '#FFFF00' : '#FF0000';
    ctx.fillStyle = hpColor;
    ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
    
    // Border
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    
    // Boss name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px "Courier New"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.name, 1280 / 2, barY - 10);
    
    // HP text
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.ceil(this.hp)} / ${this.maxHp}`, 1280 / 2, barY + barHeight / 2);
  }
  
  /**
   * Take damage
   */
  takeDamage(damage) {
    if (this.isInvulnerable) return false;
    
    this.hp -= damage;
    this.damageFlash = 1.0;
    
    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      this.active = false;
      console.log(`👹 Boss defeated!`);
      return true; // Boss destroyed
    }
    
    return false;
  }
  
  /**
   * Load boss sprite
   */
  loadSprite(imageDataUri) {
    const img = new Image();
    
    img.onload = () => {
      this.sprite = img;
      this.spriteLoaded = true;
    };
    
    img.onerror = () => {
      console.error(`Failed to load boss sprite: ${this.id}`);
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
   * Deactivate boss
   */
  deactivate() {
    this.active = false;
  }
}
