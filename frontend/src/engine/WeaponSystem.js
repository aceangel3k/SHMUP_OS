/**
 * WeaponSystem - Player weapon management
 * Handles firing rate, weapon types, and bullet spawning
 */

export class WeaponSystem {
  constructor(bulletManager, weaponData, bulletColor = '#00FFD1') {
    this.bulletManager = bulletManager;
    
    // Store original weapon data for proper damage calculation
    this.weaponData = weaponData || {};
    
    // Weapon stats from game data
    this.fireRate = this.weaponData.fire_rate || 10; // Bullets per second
    this.projectileSpeed = this.weaponData.projectile_speed || 800;
    this.damage = this.weaponData.damage || 10;
    this.spreadAngle = this.weaponData.spread_angle || 0; // Degrees
    this.bulletCount = this.weaponData.bullet_count || 1;
    
    // Fire rate timing
    this.fireInterval = 1 / this.fireRate; // Seconds between shots
    this.timeSinceLastShot = 0;
    
    // Visual (use theme color)
    this.bulletColor = bulletColor;
    this.bulletRadius = 4;
    
    // Sound callback
    this.onFireSound = null;
    
    // Finite weapon system - charge management
    this.maxCharge = 100;
    this.charge = 100; // Start with full charge
    this.chargeDrainRate = 2; // Charge drained per second while firing
    this.chargeRegenRate = 0.5; // Charge regenerated per second when not firing
    this.currentPowerLevel = 1; // Track current power level for degradation
    this.lastPowerLevel = 1; // Track last level to detect changes
    this.powerLevelTimeout = 0; // Timeout before power degradation
    this.maxPowerLevelTime = 15; // Maximum time at highest level before degradation
  }
  
  /**
   * Update weapon system (handle firing and charge management)
   */
  update(deltaTime, player, isFiring) {
    this.timeSinceLastShot += deltaTime;
    
    // Handle charge management for all power levels > 1
    if (this.currentPowerLevel > 1) {
      this.updateCharge(deltaTime, isFiring);
      
      // Handle power level degradation
      this.updatePowerLevel(deltaTime);
    }
    
    // Parasitic drain for all power levels (even idle) to encourage engagement
    if (this.currentPowerLevel > 1) {
      const parasiticDrain = this.currentPowerLevel === 2 ? 1.0 : 1.5; // Higher drain for higher levels
      this.charge = Math.max(0, this.charge - parasiticDrain * deltaTime);
    }
    
    // Only fire if we have charge (or power level 1 which doesn't use charge)
    const canFire = this.currentPowerLevel === 1 || this.charge > 0;
    
    if (isFiring && this.timeSinceLastShot >= this.fireInterval && canFire) {
      this.fire(player);
      this.timeSinceLastShot = 0;
      
      // Only drain charge when firing at power levels > 1
      if (this.currentPowerLevel > 1) {
        this.charge = Math.max(0, this.charge - this.chargeDrainRate * this.fireInterval);
      }
    }
  }
  
  /**
   * Update weapon charge (drain when firing, minimal regen, parasitic drain)
   * Applies to power levels > 1
   */
  updateCharge(deltaTime, isFiring) {
    if (isFiring && this.charge > 0) {
      // Drain charge while firing
      this.charge = Math.max(0, this.charge - this.chargeDrainRate * deltaTime);
    } else if (!isFiring && this.charge < this.maxCharge) {
      // Very slow regen when not firing (compensates for parasitic drain at low levels)
      const regenRate = this.currentPowerLevel === 2 ? 0.8 : 0.5; // Level 2 regens slightly faster
      this.charge = Math.min(this.maxCharge, this.charge + regenRate * deltaTime);
    }
  }
  
  /**
   * Update power level with degradation system
   * Degrades based on charge depletion and time overuse
   */
  updatePowerLevel(deltaTime) {
    if (this.currentPowerLevel > 1) {
      // Track time at current power level
      this.powerLevelTimeout += deltaTime;
      
      // If charge is completely depleted, immediately degrade to next level
      if (this.charge <= 0) {
        const oldLevel = this.currentPowerLevel;
        this.currentPowerLevel = Math.max(1, this.currentPowerLevel - 1);
        this.powerLevelTimeout = 0;
        this.charge = 100; // Refill charge after degradation
        this.upgrade(this.currentPowerLevel); // Apply new stats
        
        // Force immediate charge update to prevent UI lag
        if (this.onPowerLevelChange) {
          this.onPowerLevelChange(this.currentPowerLevel);
        }
        
        console.log(`⚡ Weapon degraded from level ${oldLevel} to level ${this.currentPowerLevel} due to charge depletion! Charge refilled to 100%`);
        return;
      }
      
      // Also degrade based on time at max power levels
      if (this.currentPowerLevel === 5 && this.powerLevelTimeout >= this.maxPowerLevelTime) {
        const oldLevel = this.currentPowerLevel;
        this.currentPowerLevel = 4;
        this.powerLevelTimeout = 0;
        this.charge = 100; // Refill charge after degradation
        this.upgrade(this.currentPowerLevel); // Apply new stats
        if (this.onPowerLevelChange) {
          this.onPowerLevelChange(this.currentPowerLevel);
        }
        console.log(`⚡ Weapon degraded from level ${oldLevel} to level ${this.currentPowerLevel} due to overuse! Charge refilled to 100%`);
      }
      // Progressive degradation for other levels
      else if (this.currentPowerLevel === 4 && this.powerLevelTimeout >= this.maxPowerLevelTime * 1.5) {
        const oldLevel = this.currentPowerLevel;
        this.currentPowerLevel = 3;
        this.powerLevelTimeout = 0;
        this.charge = 100; // Refill charge after degradation
        this.upgrade(this.currentPowerLevel);
        if (this.onPowerLevelChange) {
          this.onPowerLevelChange(this.currentPowerLevel);
        }
        console.log(`⚡ Weapon degraded from level ${oldLevel} to level ${this.currentPowerLevel} due to overuse! Charge refilled to 100%`);
      }
      else if (this.currentPowerLevel === 3 && this.powerLevelTimeout >= this.maxPowerLevelTime * 2) {
        const oldLevel = this.currentPowerLevel;
        this.currentPowerLevel = 2;
        this.powerLevelTimeout = 0;
        this.charge = 100; // Refill charge after degradation
        this.upgrade(this.currentPowerLevel);
        if (this.onPowerLevelChange) {
          this.onPowerLevelChange(this.currentPowerLevel);
        }
        console.log(`⚡ Weapon degraded from level ${oldLevel} to level ${this.currentPowerLevel} due to overuse! Charge refilled to 100%`);
      }
      else if (this.currentPowerLevel === 2 && this.powerLevelTimeout >= this.maxPowerLevelTime * 2.5) {
        const oldLevel = this.currentPowerLevel;
        this.currentPowerLevel = 1;
        this.powerLevelTimeout = 0;
        this.charge = 100; // Refill charge after degradation
        this.upgrade(this.currentPowerLevel);
        if (this.onPowerLevelChange) {
          this.onPowerLevelChange(this.currentPowerLevel);
        }
        console.log(`⚡ Weapon degraded from level ${oldLevel} to level ${this.currentPowerLevel} due to overuse! Charge refilled to 100%`);
      }
    }
  }
  
  /**
   * Get current charge level as percentage
   */
  getChargeLevel() {
    // Return 100% for power level 1 since it doesn't use charge
    if (this.currentPowerLevel === 1) {
      return 100;
    }
    return Math.round(this.charge);
  }
  
  /**
   * Reset charge to full
   */
  refillCharge() {
    this.charge = this.maxCharge;
    this.powerLevelTimeout = 0;
    console.log(`⚡ Weapon charge refilled to 100%`);
  }
  
  /**
   * Fire weapon from player position
   */
  fire(player) {
    const pos = player.getPosition();
    
    // Play sound effect based on weapon type
    if (this.onFireSound) {
      this.onFireSound(this.weaponType || 'basic');
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
   * Upgrade weapon (increase fire rate, spread, and visual effects)
   */
  upgrade(level) {
    // Reset timeout when manually upgraded
    if (level > this.currentPowerLevel) {
      this.powerLevelTimeout = 0;
    }
    
    this.currentPowerLevel = level;
    this.lastPowerLevel = level;
    
    switch (level) {
      case 1:
        this.fireRate = 10;
        this.bulletCount = 1;
        this.bulletRadius = 4;
        this.bulletColor = '#00FFD1'; // Default cyan
        this.weaponType = 'basic';
        this.chargeDrainRate = 0; // No charge drain at level 1
        this.charge = 100; // Force charge to 100%
        this.projectileSpeed = 400; // Reduced base projectile speed
        break;
      case 2:
        this.fireRate = 12;
        this.bulletCount = 1;
        this.bulletRadius = 5;
        this.bulletColor = '#00FF00'; // Green - faster
        this.weaponType = 'rapid';
        this.chargeDrainRate = 6; // Increased from 4
        this.projectileSpeed = 600; // Reduced from 800
        break;
      case 3:
        this.fireRate = 12;
        this.bulletCount = 2;
        this.spreadAngle = 10;
        this.bulletRadius = 5;
        this.bulletColor = '#FFFF00'; // Yellow - spread
        this.weaponType = 'spread';
        this.chargeDrainRate = 9; // Increased from 7
        this.projectileSpeed = 550; // Reduced from 800
        break;
      case 4:
        this.fireRate = 15;
        this.bulletCount = 3;
        this.spreadAngle = 15;
        this.bulletRadius = 6;
        this.bulletColor = '#FF8000'; // Orange - triple
        this.weaponType = 'triple';
        this.chargeDrainRate = 14; // Increased from 12
        this.projectileSpeed = 500; // Reduced from 800
        break;
      case 5:
        this.fireRate = 20;
        this.bulletCount = 3;
        this.spreadAngle = 20;
        this.bulletRadius = 7;
        this.bulletColor = '#FF0080'; // Magenta - laser
        this.weaponType = 'laser';
        this.chargeDrainRate = 20; // Increased from 18
        this.projectileSpeed = 450; // Reduced from 800
        break;
    }
    
    this.fireInterval = 1 / this.fireRate;
    // Set base damage for the level (don't accumulate, replace)
    this.damage = (this.weaponData.damage || 10) + (level - 1) * 2;
    console.log(`⚡ Weapon upgraded to level ${level} - drain rate: ${this.chargeDrainRate}/sec`);
  }
  
  /**
   * Reset weapon to default
   */
  reset() {
    this.timeSinceLastShot = 0;
    this.charge = 100;
    this.currentPowerLevel = 1;
    this.powerLevelTimeout = 0;
    this.upgrade(1);
  }
}
