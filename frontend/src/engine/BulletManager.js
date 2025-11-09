/**
 * BulletManager - Bullet pooling and management
 * Handles player and enemy bullets with object pooling for performance
 */

export class BulletManager {
  constructor(poolSize = 1000) {
    this.poolSize = poolSize;
    this.bullets = [];
    
    // Initialize object pool
    for (let i = 0; i < poolSize; i++) {
      this.bullets.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 3,
        color: '#00FFD1',
        isPlayerBullet: true,
        damage: 10,
      });
    }
    
    // Stats
    this.activeCount = 0;
  }
  
  /**
   * Spawn a bullet from the pool
   */
  spawn(x, y, vx, vy, isPlayerBullet = true, radius = 3, color = '#00FFD1', damage = 10) {
    // Find inactive bullet
    for (let i = 0; i < this.poolSize; i++) {
      const bullet = this.bullets[i];
      if (!bullet.active) {
        bullet.active = true;
        bullet.x = x;
        bullet.y = y;
        bullet.vx = vx;
        bullet.vy = vy;
        bullet.radius = radius;
        bullet.color = color;
        bullet.isPlayerBullet = isPlayerBullet;
        bullet.damage = damage;
        bullet.hitCount = 0; // Reset hit counter
        this.activeCount++;
        return bullet;
      }
    }
    
    // Pool exhausted
    return null;
  }
  
  /**
   * Deactivate a bullet
   */
  deactivate(bullet) {
    if (bullet.active) {
      bullet.active = false;
      this.activeCount--;
    }
  }
  
  /**
   * Update all active bullets
   */
  update(deltaTime, width, height) {
    for (let i = 0; i < this.poolSize; i++) {
      const bullet = this.bullets[i];
      
      if (!bullet.active) continue;
      
      // Update position
      bullet.x += bullet.vx * deltaTime;
      bullet.y += bullet.vy * deltaTime;
      
      // Deactivate if off-screen
      if (bullet.x < -50 || bullet.x > width + 50 ||
          bullet.y < -50 || bullet.y > height + 50) {
        this.deactivate(bullet);
      }
    }
  }
  
  /**
   * Render all active bullets
   */
  render(ctx) {
    if (!ctx) {
      console.error('BulletManager.render: No context provided!');
      return;
    }
    
    // Force reset context state before rendering bullets
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    for (let i = 0; i < this.poolSize; i++) {
      const bullet = this.bullets[i];
      
      if (!bullet.active) continue;
      
      ctx.save();
      
      if (bullet.isPlayerBullet) {
        // Enhanced player bullet rendering with maximum visibility
        // Using bright yellow/white with dark outline for contrast against any background
        
        // Dark outer shadow for contrast
        ctx.fillStyle = '#000000';
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius + 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Bright yellow glow
        ctx.fillStyle = '#FFFF00';
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius + 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Core bullet (bright yellow-white)
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#FFFF66';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Dark outline for definition
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Bright white center dot
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = 1.0;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Enemy bullets - maximum visibility with bright colors
        // Ensure color is never too dark or transparent
        const bulletColor = bullet.color || '#FF6B6B';
        
        // Large outer glow for visibility
        ctx.shadowColor = bulletColor;
        ctx.shadowBlur = 8;
        ctx.fillStyle = bulletColor;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius + 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Reset shadow
        ctx.shadowBlur = 0;
        
        // Main bullet with bright color
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = bulletColor;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Bright white outline for definition
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Bright white center for maximum visibility
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = 1.0;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    }
    
    // Ensure context is fully reset after rendering all bullets
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
  }
  
  /**
   * Spawn enemy bullet (convenience method)
   */
  spawnEnemyBullet(x, y, vx, vy, color = '#FF6B6B') {
    return this.spawn(x, y, vx, vy, false, 4, color, 10);
  }
  
  /**
   * Get all active bullets
   */
  getActiveBullets() {
    return this.bullets.filter(b => b.active);
  }
  
  /**
   * Get active player bullets
   */
  getPlayerBullets() {
    return this.bullets.filter(b => b.active && b.isPlayerBullet);
  }
  
  /**
   * Get active enemy bullets
   */
  getEnemyBullets() {
    return this.bullets.filter(b => b.active && !b.isPlayerBullet);
  }
  
  /**
   * Clear all bullets (for bomb)
   */
  clearAll() {
    for (let i = 0; i < this.poolSize; i++) {
      if (this.bullets[i].active) {
        this.deactivate(this.bullets[i]);
      }
    }
  }
  
  /**
   * Clear enemy bullets only (for bomb)
   */
  clearEnemyBullets() {
    for (let i = 0; i < this.poolSize; i++) {
      const bullet = this.bullets[i];
      if (bullet.active && !bullet.isPlayerBullet) {
        this.deactivate(bullet);
      }
    }
  }
  
  /**
   * Get active bullet count
   */
  getActiveCount() {
    return this.activeCount;
  }
  
  /**
   * Reset all bullets
   */
  reset() {
    this.clearAll();
  }
}
