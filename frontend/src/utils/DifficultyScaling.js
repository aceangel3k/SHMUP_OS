/**
 * DifficultyScaling - Applies difficulty modifiers to game parameters
 * Scales enemy HP, damage, bullet patterns, and wave counts
 */

export class DifficultyScaling {
  constructor(difficulty = 'normal') {
    this.difficulty = difficulty;
    this.modifiers = this._getModifiersForDifficulty(difficulty);
  }

  /**
   * Get difficulty modifiers for a specific difficulty level
   */
  _getModifiersForDifficulty(difficulty) {
    const modifiers = {
      easy: {
        enemyHpMultiplier: 0.8,      // 80% HP
        enemyDamageMultiplier: 0.8,  // 80% damage
        enemySpeedMultiplier: 0.9,   // 90% speed
        bulletSpeedMultiplier: 0.9,  // 90% bullet speed
        waveCountMultiplier: 0.8,    // 80% enemies per wave
        shootCooldownMultiplier: 1.3, // 30% slower shooting (1.3x cooldown)
        bossHpMultiplier: 0.8,       // 80% boss HP
        playerDamageMultiplier: 0.7, // 30% less player damage
        bombDamageMultiplier: 1.2,
        startingLives: 5,            // 5 lives
        startingShields: 2,          // 2 shields
      },
      normal: {
        enemyHpMultiplier: 1.3,      // 30% more HP
        enemyDamageMultiplier: 1.0,
        enemySpeedMultiplier: 1.0,
        bulletSpeedMultiplier: 1.0,
        waveCountMultiplier: 1.0,
        shootCooldownMultiplier: 0.9, // 10% faster shooting
        bossHpMultiplier: 1.3,       // 30% more boss HP
        playerDamageMultiplier: 0.5, // 50% less player damage
        bombDamageMultiplier: 1.0,
        startingLives: 4,            // 4 lives
        startingShields: 1,          // 1 shield
      },
      hard: {
        enemyHpMultiplier: 2.0,      // 100% more HP (double)
        enemyDamageMultiplier: 1.5,  // 50% more damage
        enemySpeedMultiplier: 1.3,   // 30% faster
        bulletSpeedMultiplier: 1.3,  // 30% faster bullets
        waveCountMultiplier: 1.4,    // 40% more enemies
        shootCooldownMultiplier: 0.6, // 40% faster shooting
        bossHpMultiplier: 2.0,       // 100% more boss HP (double)
        playerDamageMultiplier: 0.3, // 70% less player damage
        bombDamageMultiplier: 1.0,
        startingLives: 3,            // 3 lives
        startingShields: 0,          // 0 shields
      },
    };

    return modifiers[difficulty] || modifiers.normal;
  }

  /**
   * Scale enemy HP
   */
  scaleEnemyHp(baseHp) {
    return Math.round(baseHp * this.modifiers.enemyHpMultiplier);
  }

  /**
   * Scale enemy speed
   */
  scaleEnemySpeed(baseSpeed) {
    return baseSpeed * this.modifiers.enemySpeedMultiplier;
  }

  /**
   * Scale bullet damage
   */
  scaleBulletDamage(baseDamage) {
    return Math.round(baseDamage * this.modifiers.enemyDamageMultiplier);
  }

  /**
   * Scale bullet speed
   */
  scaleBulletSpeed(baseSpeed) {
    return baseSpeed * this.modifiers.bulletSpeedMultiplier;
  }

  /**
   * Scale wave enemy count
   */
  scaleWaveCount(baseCount) {
    return Math.max(1, Math.round(baseCount * this.modifiers.waveCountMultiplier));
  }

  /**
   * Scale enemy shoot cooldown
   */
  scaleShootCooldown(baseCooldown) {
    return baseCooldown * this.modifiers.shootCooldownMultiplier;
  }

  /**
   * Scale boss HP
   */
  scaleBossHp(baseHp) {
    return Math.round(baseHp * this.modifiers.bossHpMultiplier);
  }

  /**
   * Scale player weapon damage
   */
  scalePlayerDamage(baseDamage) {
    return Math.round(baseDamage * this.modifiers.playerDamageMultiplier);
  }

  /**
   * Scale bomb damage (DPS)
   */
  scaleBombDamage(baseDps) {
    return baseDps * (this.modifiers.bombDamageMultiplier || 1.0);
  }

  /**
   * Get difficulty name
   */
  getDifficulty() {
    return this.difficulty;
  }

  /**
   * Get all modifiers
   */
  getModifiers() {
    return this.modifiers;
  }
}
