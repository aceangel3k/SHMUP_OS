/**
 * WaveScheduler - Enemy wave spawning system
 * Reads wave data from game JSON and spawns enemy formations
 */

import { Enemy } from './Enemy';
import { Boss } from './Boss';
import { GAME_CONFIG } from '../config';

export class WaveScheduler {
  constructor(gameData, enemyDataMap, difficultyScaling = null) {
    this.waves = gameData?.stages?.[0]?.waves || [];
    this.enemyDataMap = enemyDataMap; // Map of enemy_id -> enemy data
    this.enemies = [];
    this.boss = null;
    this.bossData = gameData?.stages?.[0]?.boss || null;
    this.currentTime = 0;
    this.waveIndex = 0;
    this.isComplete = false;
    this.bossSpawned = false;
    this.difficultyScaling = difficultyScaling;
  }
  
  /**
   * Update scheduler and spawn waves
   */
  update(deltaTime, player, pathFunctions, bulletPattern, bulletManager = null) {
    this.currentTime += deltaTime;
    
    // Check if we should spawn next wave
    while (this.waveIndex < this.waves.length) {
      const wave = this.waves[this.waveIndex];
      
      if (this.currentTime >= wave.time) {
        this.spawnWave(wave, bulletPattern);
        this.waveIndex++;
      } else {
        break;
      }
    }
    
    // Update all enemies
    for (const enemy of this.enemies) {
      if (enemy.active) {
        enemy.update(deltaTime, player, pathFunctions, bulletManager);
      }
    }
    
    // Check if should spawn boss
    if (!this.bossSpawned && this.waveIndex >= this.waves.length) {
      const allEnemiesDead = this.enemies.every(e => !e.active);
      if (allEnemiesDead && this.bossData) {
        this.spawnBoss();
      }
    }
    
    // Update boss
    if (this.boss && this.boss.active) {
      this.boss.update(deltaTime, player, bulletPattern, bulletManager);
    }
    
    // Check if all waves spawned and all enemies/boss dead
    if (this.waveIndex >= this.waves.length) {
      const allDead = this.enemies.every(e => !e.active);
      const bossDeadOrNone = !this.boss || !this.boss.active;
      if (allDead && bossDeadOrNone) {
        this.isComplete = true;
      }
    }
  }
  
  /**
   * Spawn a wave of enemies
   */
  spawnWave(wave, bulletPattern = null) {
    const enemyData = this.enemyDataMap[wave.enemy_type];
    if (!enemyData) {
      console.error(`Enemy type not found: ${wave.enemy_type}`);
      return;
    }
    
    const formation = this.getFormation(wave.formation, wave.count);
    
    for (const pos of formation) {
      const shootCooldownMultiplier = this.difficultyScaling ? 
        this.difficultyScaling.modifiers.shootCooldownMultiplier : 1.0;
      const enemy = new Enemy(
        enemyData,
        pos.x,
        pos.y,
        wave.path,
        bulletPattern, // Pass bullet pattern to enemy
        shootCooldownMultiplier // Pass difficulty-scaled shoot cooldown
      );
      this.enemies.push(enemy);
    }
    
    console.log(`🌊 Wave spawned: ${wave.count}x ${wave.enemy_type} (${wave.formation})`);
  }
  
  /**
   * Get formation positions
   */
  getFormation(formationType, count) {
    const formations = {
      v_wave: this.formationVWave,
      column: this.formationColumn,
      line: this.formationLine,
      arc: this.formationArc,
      circle: this.formationCircle,
      diamond: this.formationDiamond,
      wave: this.formationWave,
      grid: this.formationGrid,
      random: this.formationRandom,
    };
    
    const formationFn = formations[formationType] || formations.line;
    return formationFn.call(this, count);
  }
  
  /**
   * V-Wave formation (V shape)
   */
  formationVWave(count) {
    const positions = [];
    const spacing = 120;
    const centerY = GAME_CONFIG.RENDER_HEIGHT / 2;
    const startX = GAME_CONFIG.RENDER_WIDTH + 100;
    
    for (let i = 0; i < count; i++) {
      const offset = i - Math.floor(count / 2);
      positions.push({
        x: startX + Math.abs(offset) * spacing,
        y: centerY + offset * spacing,
      });
    }
    
    return positions;
  }
  
  /**
   * Column formation (vertical column)
   */
  formationColumn(count) {
    const positions = [];
    const spacing = 150;
    const centerY = GAME_CONFIG.RENDER_HEIGHT / 2;
    const startX = GAME_CONFIG.RENDER_WIDTH + 100;
    
    for (let i = 0; i < count; i++) {
      const offset = i - Math.floor(count / 2);
      positions.push({
        x: startX,
        y: centerY + offset * spacing,
      });
    }
    
    return positions;
  }
  
  /**
   * Line formation (horizontal line)
   */
  formationLine(count) {
    const positions = [];
    const spacing = 120;
    const centerY = GAME_CONFIG.RENDER_HEIGHT / 2;
    const startX = GAME_CONFIG.RENDER_WIDTH + 100;
    
    for (let i = 0; i < count; i++) {
      positions.push({
        x: startX + i * spacing,
        y: centerY,
      });
    }
    
    return positions;
  }
  
  /**
   * Arc formation (curved arc)
   */
  formationArc(count) {
    const positions = [];
    const radius = 250;
    const centerY = GAME_CONFIG.RENDER_HEIGHT / 2;
    const startX = GAME_CONFIG.RENDER_WIDTH + 100;
    
    for (let i = 0; i < count; i++) {
      const angle = (i / (count - 1)) * Math.PI - Math.PI / 2;
      positions.push({
        x: startX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      });
    }
    
    return positions;
  }
  
  /**
   * Circle formation (full circle)
   */
  formationCircle(count) {
    const positions = [];
    const radius = 200;
    const centerY = GAME_CONFIG.RENDER_HEIGHT / 2;
    const startX = GAME_CONFIG.RENDER_WIDTH + 100;
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      positions.push({
        x: startX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      });
    }
    
    return positions;
  }
  
  /**
   * Diamond formation (diamond shape)
   */
  formationDiamond(count) {
    const positions = [];
    const size = 150;
    const centerY = GAME_CONFIG.RENDER_HEIGHT / 2;
    const startX = GAME_CONFIG.RENDER_WIDTH + 100;
    
    for (let i = 0; i < count; i++) {
      const t = i / count;
      let x, y;
      if (t < 0.25) {
        x = t * 4 * size;
        y = t * 4 * size;
      } else if (t < 0.5) {
        x = (0.5 - t) * 4 * size;
        y = (t - 0.25) * 4 * size;
      } else if (t < 0.75) {
        x = (t - 0.5) * 4 * -size;
        y = (0.75 - t) * 4 * size;
      } else {
        x = (1 - t) * 4 * -size;
        y = (t - 0.75) * 4 * -size;
      }
      positions.push({
        x: startX + x,
        y: centerY + y,
      });
    }
    
    return positions;
  }
  
  /**
   * Wave formation (sine wave)
   */
  formationWave(count) {
    const positions = [];
    const amplitude = 150;
    const spacing = 100;
    const centerY = GAME_CONFIG.RENDER_HEIGHT / 2;
    const startX = GAME_CONFIG.RENDER_WIDTH + 100;
    
    for (let i = 0; i < count; i++) {
      positions.push({
        x: startX + i * spacing,
        y: centerY + Math.sin(i * 0.8) * amplitude,
      });
    }
    
    return positions;
  }
  
  /**
   * Grid formation (rectangular grid)
   */
  formationGrid(count) {
    const positions = [];
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const spacingX = 120;
    const spacingY = 120;
    const centerY = GAME_CONFIG.RENDER_HEIGHT / 2;
    const startX = GAME_CONFIG.RENDER_WIDTH + 100;
    
    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      positions.push({
        x: startX + col * spacingX,
        y: centerY - (rows * spacingY) / 2 + row * spacingY,
      });
    }
    
    return positions;
  }
  
  /**
   * Random formation (scattered)
   */
  formationRandom(count) {
    const positions = [];
    const startX = GAME_CONFIG.RENDER_WIDTH + 100;
    const minY = 100;
    const maxY = GAME_CONFIG.RENDER_HEIGHT - 100;
    
    for (let i = 0; i < count; i++) {
      positions.push({
        x: startX + Math.random() * 300,
        y: minY + Math.random() * (maxY - minY),
      });
    }
    
    return positions;
  }
  
  /**
   * Get all active enemies (including boss)
   */
  getActiveEnemies() {
    const activeEnemies = this.enemies.filter(e => e.active);
    if (this.boss && this.boss.active) {
      activeEnemies.push(this.boss);
    }
    return activeEnemies;
  }
  
  /**
   * Get boss
   */
  getBoss() {
    return this.boss;
  }
  
  /**
   * Get all enemies
   */
  getAllEnemies() {
    return this.enemies;
  }
  
  /**
   * Spawn boss
   */
  spawnBoss() {
    if (!this.bossData || this.bossSpawned) return;
    
    const startX = GAME_CONFIG.RENDER_WIDTH + 100;
    const startY = GAME_CONFIG.RENDER_HEIGHT / 2;
    
    const shootCooldownMultiplier = this.difficultyScaling ? 
      this.difficultyScaling.modifiers.shootCooldownMultiplier : 1.0;
    
    this.boss = new Boss(this.bossData, startX, startY, shootCooldownMultiplier);
    this.bossSpawned = true;
    
    console.log(`👹 BOSS SPAWNED: ${this.bossData.name}`);
  }
  
  /**
   * Render all enemies
   */
  render(ctx) {
    for (const enemy of this.enemies) {
      if (enemy.active) {
        enemy.render(ctx);
      }
    }
    
    // Render boss
    if (this.boss && this.boss.active) {
      this.boss.render(ctx);
    }
  }
  
  /**
   * Check if all waves complete
   */
  isWavesComplete() {
    return this.isComplete;
  }
  
  /**
   * Reset scheduler
   */
  reset() {
    this.enemies = [];
    this.currentTime = 0;
    this.waveIndex = 0;
    this.isComplete = false;
  }
}
