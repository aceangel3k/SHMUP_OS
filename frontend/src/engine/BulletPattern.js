/**
 * BulletPattern - Bullet pattern spawning system
 * Maps pattern IDs to spawner functions for enemy/boss bullets
 */

export class BulletPattern {
  constructor(bulletManager) {
    this.bulletManager = bulletManager;
    
    // Pattern spawners
    this.patterns = {
      fan_3: this.spawnFan.bind(this, 3, 30),
      fan_5: this.spawnFan.bind(this, 5, 45),
      fan_7: this.spawnFan.bind(this, 7, 60),
      burst_16: this.spawnBurst.bind(this, 16),
      burst_32: this.spawnBurst.bind(this, 32),
      burst_64: this.spawnBurst.bind(this, 64),
      spiral_single: this.spawnSpiral.bind(this, 1),
      spiral_dual: this.spawnSpiral.bind(this, 2),
      spiral_triple: this.spawnSpiral.bind(this, 3),
      aimed: this.spawnAimed.bind(this),
      ring: this.spawnRing.bind(this, 12),
    };
  }
  
  /**
   * Spawn a pattern by ID
   */
  spawn(patternId, x, y, angle = 0, speed = 200, player = null) {
    const pattern = this.patterns[patternId];
    if (pattern) {
      pattern(x, y, angle, speed, player);
    } else {
      console.warn(`Unknown pattern: ${patternId}`);
    }
  }
  
  /**
   * Fan pattern - N bullets in a spread
   */
  spawnFan(count, spreadAngle, x, y, baseAngle = 0, speed = 200) {
    const angleStep = spreadAngle / (count - 1);
    const startAngle = baseAngle - spreadAngle / 2;
    
    for (let i = 0; i < count; i++) {
      const angle = (startAngle + i * angleStep) * Math.PI / 180;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      
      this.bulletManager.spawn(
        x, y, vx, vy,
        false, // Enemy bullet
        4,     // Radius
        '#FF6B6B', // Red
        10     // Damage
      );
    }
  }
  
  /**
   * Burst pattern - 360° ring of bullets
   */
  spawnBurst(count, x, y, baseAngle = 0, speed = 200) {
    const angleStep = 360 / count;
    
    for (let i = 0; i < count; i++) {
      const angle = (baseAngle + i * angleStep) * Math.PI / 180;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      
      this.bulletManager.spawn(
        x, y, vx, vy,
        false,
        4,
        '#FF6B6B',
        10
      );
    }
  }
  
  /**
   * Spiral pattern - Rotating spiral(s)
   */
  spawnSpiral(arms, x, y, baseAngle = 0, speed = 200) {
    const armAngle = 360 / arms;
    
    for (let i = 0; i < arms; i++) {
      const angle = (baseAngle + i * armAngle) * Math.PI / 180;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      
      this.bulletManager.spawn(
        x, y, vx, vy,
        false,
        4,
        '#FF6B6B',
        10
      );
    }
  }
  
  /**
   * Aimed pattern - Single bullet aimed at player
   */
  spawnAimed(x, y, baseAngle = 0, speed = 250, player = null) {
    if (!player) return;
    
    const playerPos = player.getPosition();
    const dx = playerPos.x - x;
    const dy = playerPos.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 0) {
      const vx = (dx / dist) * speed;
      const vy = (dy / dist) * speed;
      
      this.bulletManager.spawn(
        x, y, vx, vy,
        false,
        5,
        '#FFD700', // Gold for aimed
        15
      );
    }
  }
  
  /**
   * Ring pattern - Circle of bullets
   */
  spawnRing(count, x, y, baseAngle = 0, speed = 150) {
    this.spawnBurst(count, x, y, baseAngle, speed);
  }
  
  /**
   * Get pattern by ID
   */
  getPattern(patternId) {
    return this.patterns[patternId];
  }
}
