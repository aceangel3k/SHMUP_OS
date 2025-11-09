/**
 * Player - Player ship with movement and controls
 * Handles player position, movement, and input
 */

import { GAME_CONFIG } from '../config';

export class Player {
  constructor(x, y) {
    // Position
    this.x = x || 100;
    this.y = y || GAME_CONFIG.RENDER_HEIGHT / 2;
    
    // Movement
    this.speed = GAME_CONFIG.PLAYER_SPEED;
    this.slowSpeed = GAME_CONFIG.PLAYER_SLOW_SPEED;
    this.isSlow = false;
    
    // Collision
    this.radius = 8; // Hitbox radius (small for gameplay)
    this.spriteRadius = 107; // Visual sprite radius (2/3 of 160)
    
    // Bounds
    this.minX = 20;
    this.maxX = GAME_CONFIG.RENDER_WIDTH - 20;
    this.minY = 20;
    this.maxY = GAME_CONFIG.RENDER_HEIGHT - 20;
    
    // Input state
    this.input = {
      up: false,
      down: false,
      left: false,
      right: false,
      fire: false,
      bomb: false,
      slow: false,
    };
    
    // Visual
    this.color = '#00FFD1';
    this.sprite = null;
    this.spriteLoaded = false;
    
    // Invulnerability and flash
    this.isInvulnerable = false;
    this.flashTimer = 0;
  }
  
  /**
   * Update player position based on input
   */
  update(deltaTime) {
    // Update flash timer (strobe effect - very fast)
    if (this.isInvulnerable) {
      this.flashTimer += deltaTime * 20; // Flash frequency (doubled for strobe)
    }
    
    // Determine current speed
    const currentSpeed = this.input.slow ? this.slowSpeed : this.speed;
    
    // Calculate movement
    let dx = 0;
    let dy = 0;
    
    if (this.input.up) dy -= 1;
    if (this.input.down) dy += 1;
    if (this.input.left) dx -= 1;
    if (this.input.right) dx += 1;
    
    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;
    }
    
    // Apply movement
    this.x += dx * currentSpeed * deltaTime;
    this.y += dy * currentSpeed * deltaTime;
    
    // Clamp to bounds
    this.x = Math.max(this.minX, Math.min(this.maxX, this.x));
    this.y = Math.max(this.minY, Math.min(this.maxY, this.y));
    
    // Update slow mode flag
    this.isSlow = this.input.slow;
  }
  
  /**
   * Render player sprite
   */
  render(ctx) {
    ctx.save();
    
    // Strobe flash effect during invulnerability
    if (this.isInvulnerable) {
      const flashVisible = Math.floor(this.flashTimer) % 2 === 0;
      if (!flashVisible) {
        ctx.restore();
        return; // Skip rendering to create strobe effect
      }
      // Full opacity for strobe effect (no transparency)
    }
    
    if (this.sprite && this.spriteLoaded) {
      // Render sprite image
      ctx.drawImage(
        this.sprite,
        this.x - this.spriteRadius,
        this.y - this.spriteRadius,
        this.spriteRadius * 2,
        this.spriteRadius * 2
      );
    } else {
      // Render placeholder triangle
      this.renderPlaceholder(ctx);
    }
    
    // Render hitboxes in slow mode
    if (this.isSlow) {
      // Render pickup hitbox (full-size) - semi-transparent cyan
      ctx.strokeStyle = '#00D4FF';
      ctx.fillStyle = '#00D4FF20';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.spriteRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Render damage hitbox (single pixel) - bright red dot
      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.arc(this.x, this.y, 2, 0, Math.PI * 2); // Small visible dot for the single-pixel hitbox
      ctx.fill();
    }
    
    ctx.restore();
  }
  
  /**
   * Render placeholder sprite (triangle)
   */
  renderPlaceholder(ctx) {
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    
    // Draw triangle pointing right
    ctx.beginPath();
    ctx.moveTo(this.x + this.spriteRadius, this.y);
    ctx.lineTo(this.x - this.spriteRadius, this.y - this.spriteRadius);
    ctx.lineTo(this.x - this.spriteRadius, this.y + this.spriteRadius);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Draw core dot
    ctx.fillStyle = '#FF00D1';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  
  /**
   * Set invulnerability state
   */
  setInvulnerable(invulnerable) {
    this.isInvulnerable = invulnerable;
    if (!invulnerable) {
      this.flashTimer = 0;
    }
  }
  
  /**
   * Set input state
   */
  setInput(key, value) {
    if (this.input.hasOwnProperty(key)) {
      this.input[key] = value;
    }
  }
  
  /**
   * Set player sprite (from Image object)
   */
  setSprite(imageObject) {
    if (imageObject && imageObject instanceof Image) {
      this.sprite = imageObject;
      this.spriteLoaded = true;
      console.log('✅ Player sprite set');
    }
  }
  
  /**
   * Load player sprite (from data URI)
   */
  loadSprite(imageDataUri) {
    const img = new Image();
    
    img.onload = () => {
      this.sprite = img;
      this.spriteLoaded = true;
    };
    
    img.onerror = () => {
      console.error('Failed to load player sprite');
      this.spriteLoaded = false;
    };
    
    img.src = imageDataUri;
  }
  
  /**
   * Reset player position
   */
  reset() {
    this.x = 100;
    this.y = GAME_CONFIG.RENDER_HEIGHT / 2;
    this.isSlow = false;
  }
  
  /**
   * Get position
   */
  getPosition() {
    return { x: this.x, y: this.y };
  }
  
  /**
   * Get hitbox for collision detection
   */
  getHitbox() {
    return {
      x: this.x,
      y: this.y,
      radius: this.radius,
    };
  }
  
  /**
   * Get pickup hitbox (full-size for easier collection)
   */
  getPickupHitbox() {
    return {
      x: this.x,
      y: this.y,
      radius: this.spriteRadius, // Use full sprite radius for pickups
    };
  }
  
  /**
   * Get damage hitbox (single pixel for precise gameplay)
   */
  getDamageHitbox() {
    return {
      x: this.x,
      y: this.y,
      radius: 0.5, // Single pixel center point
    };
  }
}
