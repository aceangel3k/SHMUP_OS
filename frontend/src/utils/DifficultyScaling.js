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
        enemyHpMultiplier: 0.6,      // 60% HP
        enemyDamageMultiplier: 0.7,  // 70% damage
        enemySpeedMultiplier: 0.8,   // 80% speed
        bulletSpeedMultiplier: 0.8,  // 80% bullet speed
        waveCountMultiplier: 2.0,    // 2x enemies per wave
        shootCooldownMultiplier: 1.5, // 50% slower shooting (1.5x cooldown)
        bossHpMultiplier: 20.0,      // 20x boss HP (much stronger boss for 15-20s fight)
        playerDamageMultiplier: 0.9, // 10% less player damage (easier mode still needs some challenge)
        bombDamageMultiplier: 1.2,   // 20% more bomb damage
        startingLives: 5,            // 5 lives
        startingShields: 2,          // 2 shields
        powerUpDropRate: 0.35,       // 35% chance (more generous)
        powerUpPityThreshold: 12,    // Pity after 12 enemies (more frequent)
      },
      normal: {
        enemyHpMultiplier: 1.0,
        enemyDamageMultiplier: 1.0,
        enemySpeedMultiplier: 1.0,
        bulletSpeedMultiplier: 1.0,
        waveCountMultiplier: 3.0,
        shootCooldownMultiplier: 1.0,
        bossHpMultiplier: 30.0,      // 30x boss HP (epic boss for 20-25s fight)
        playerDamageMultiplier: 0.7, // 30% less player damage (normal mode needs significant challenge)
        bombDamageMultiplier: 1.0,   // Normal bomb damage
        startingLives: 4,            // 4 lives
        startingShields: 1,          // 1 shield
        powerUpDropRate: 0.25,       // 25% chance (standard)
        powerUpPityThreshold: 15,    // Pity after 15 enemies (standard)
      },
      hard: {
        enemyHpMultiplier: 1.5,      // 50% more HP
        enemyDamageMultiplier: 1.3,  // 30% more damage
        enemySpeedMultiplier: 1.2,   // 20% faster
        bulletSpeedMultiplier: 1.2,  // 20% faster bullets
        waveCountMultiplier: 5.0,    // 5x enemies per wave
        shootCooldownMultiplier: 0.7, // 30% faster shooting
        bossHpMultiplier: 50.0,      // 50x boss HP (nightmare boss for extreme challenge)
        playerDamageMultiplier: 0.5, // 50% less player damage (extreme difficulty requiring mastery)
        bombDamageMultiplier: 1.0,   // Normal bomb damage (hard mode)
        startingLives: 3,            // 3 lives
        startingShields: 0,          // 0 shields
        powerUpDropRate: 0.15,       // 15% chance (more scarce)
        powerUpPityThreshold: 20,    // Pity after 20 enemies (less frequent)
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
   * Scale bomb damage (DPS)
   */
  scaleBombDamage(baseDps) {
    return baseDps * (this.modifiers.bombDamageMultiplier || 1.0);
  }

  /**
   * Get power-up drop rate for current difficulty
   */
  getPowerUpDropRate() {
    return this.modifiers.powerUpDropRate || 0.25;
  }

  /**
   * Get power-up pity threshold for current difficulty
   */
  getPowerUpPityThreshold() {
    return this.modifiers.powerUpPityThreshold || 15;
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
