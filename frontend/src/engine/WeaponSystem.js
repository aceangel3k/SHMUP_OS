/**
 * WeaponSystem - Player weapon management
 * Handles firing rate, weapon types, and bullet spawning
 */

export class WeaponSystem {
  constructor(bulletManager, weaponData, bulletColor = '#00FFD1') {
    this.bulletManager = bulletManager;
    
    // Weapon stats from game data
    this.fireRate = weaponData?.fire_rate || 10; // Bullets per second
    this.projectileSpeed = weaponData?.projectile_speed || 800;
    this.damage = weaponData?.damage || 10;
    this.spreadAngle = weaponData?.spread_angle || 0; // Degrees
    this.bulletCount = weaponData?.bullet_count || 1;
    
    // Fire rate timing
    this.fireInterval = 1 / this.fireRate; // Seconds between shots
    this.timeSinceLastShot = 0;
    
    // Visual (use theme color)
    this.bulletColor = bulletColor;
    this.bulletRadius = 4;
    
    // Sound callback
    this.onFireSound = null;
  }
  
  /**
   * Update weapon system (handle firing)
   */
  update(deltaTime, player, isFiring) {
    this.timeSinceLastShot += deltaTime;
    
    if (isFiring && this.timeSinceLastShot >= this.fireInterval) {
      this.fire(player);
      this.timeSinceLastShot = 0;
    }
  }
  
  /**
   * Fire weapon from player position
   */
  fire(player) {
    const pos = player.getPosition();
    
    // Play sound effect
    if (this.onFireSound) {
      this.onFireSound();
    }
    
    if (this.bulletCount === 1) {
      // Single shot
      this.bulletManager.spawn(
        pos.x + 20, // Offset to front of ship
        pos.y,
        this.projectileSpeed,
        0,
        true,
        this.bulletRadius,
        this.bulletColor,
        this.damage
      );
    } else {
      // Multi-shot spread
      const angleStep = this.spreadAngle / (this.bulletCount - 1);
      const startAngle = -this.spreadAngle / 2;
      
      for (let i = 0; i < this.bulletCount; i++) {
        const angle = (startAngle + i * angleStep) * Math.PI / 180;
        const vx = Math.cos(angle) * this.projectileSpeed;
        const vy = Math.sin(angle) * this.projectileSpeed;
        
        this.bulletManager.spawn(
          pos.x + 20,
          pos.y,
          vx,
          vy,
          true,
          this.bulletRadius,
          this.bulletColor,
          this.damage
        );
      }
    }
  }
  
  /**
   * Upgrade weapon (increase fire rate or spread)
   */
  upgrade(level) {
    switch (level) {
      case 1:
        this.fireRate = 10;
        this.bulletCount = 1;
        break;
      case 2:
        this.fireRate = 12;
        this.bulletCount = 1;
        break;
      case 3:
        this.fireRate = 12;
        this.bulletCount = 2;
        this.spreadAngle = 10;
        break;
      case 4:
        this.fireRate = 15;
        this.bulletCount = 3;
        this.spreadAngle = 15;
        break;
      case 5:
        this.fireRate = 20;
        this.bulletCount = 3;
        this.spreadAngle = 20;
        break;
    }
    
    this.fireInterval = 1 / this.fireRate;
  }
  
  /**
   * Reset weapon to default
   */
  reset() {
    this.timeSinceLastShot = 0;
  }
}
