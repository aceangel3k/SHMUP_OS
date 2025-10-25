/**
 * BombSystem - Bomb mechanic with visual effects
 * Clears enemy bullets and damages enemies
 */

export class BombSystem {
  constructor(bulletManager) {
    this.bulletManager = bulletManager;
    
    // Bomb state
    this.isActive = false;
    this.duration = 0.5; // 500ms
    this.timer = 0;
    this.radius = 0;
    this.maxRadius = 800;
    
    // Visual
    this.color = '#FF00D1';
    this.alpha = 1.0;
  }
  
  /**
   * Activate bomb
   */
  activate() {
    if (this.isActive) return false;
    
    this.isActive = true;
    this.timer = 0;
    this.radius = 0;
    this.alpha = 1.0;
    
    // Clear all enemy bullets
    this.bulletManager.clearEnemyBullets();
    
    return true;
  }
  
  /**
   * Update bomb animation
   */
  update(deltaTime) {
    if (!this.isActive) return;
    
    this.timer += deltaTime;
    
    // Expand radius
    const progress = this.timer / this.duration;
    this.radius = this.maxRadius * progress;
    this.alpha = 1.0 - progress;
    
    // Deactivate when done
    if (this.timer >= this.duration) {
      this.isActive = false;
    }
  }
  
  /**
   * Render bomb effect
   */
  render(ctx, playerX, playerY) {
    if (!this.isActive) return;
    
    ctx.save();
    
    // Expanding circle
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.globalAlpha = this.alpha;
    ctx.beginPath();
    ctx.arc(playerX, playerY, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Inner glow
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = this.alpha * 0.5;
    ctx.beginPath();
    ctx.arc(playerX, playerY, this.radius * 0.8, 0, Math.PI * 2);
    ctx.stroke();
    
    // Flash effect
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.alpha * 0.2;
    ctx.beginPath();
    ctx.arc(playerX, playerY, this.radius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
  
  /**
   * Check if bomb is active
   */
  isActiveBomb() {
    return this.isActive;
  }
  
  /**
   * Get bomb damage radius (for enemy damage)
   */
  getDamageRadius() {
    return this.isActive ? this.radius : 0;
  }
  
  /**
   * Reset bomb
   */
  reset() {
    this.isActive = false;
    this.timer = 0;
    this.radius = 0;
  }
}
