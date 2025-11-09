/**
 * WaveScheduler - Enemy wave spawning system
 * Reads wave data from game JSON and spawns enemy formations
 */

import { Enemy } from './Enemy';
import { Boss } from './Boss';
import { GAME_CONFIG } from '../config';

export class WaveScheduler {
  constructor(gameData, enemyDataMap, difficultyScaling = null) {
    const baseWaves = gameData?.stages?.[0]?.waves || [];
    this.difficultyScaling = difficultyScaling;
    // Expand waves by creating variations and repeating patterns
    this.waves = this.expandWaves(baseWaves, difficultyScaling);
    this.enemyDataMap = enemyDataMap; // Map of enemy_id -> enemy data
    this.enemies = [];
    this.boss = null;
    this.bossData = gameData?.stages?.[0]?.boss || null;
    this.currentTime = 0;
    this.waveIndex = 0;
    this.isComplete = false;
    this.bossHasSpawned = false; // Simple flag: true once boss spawns, never spawn again
    if (typeof WaveScheduler.bossSpawnedGlobal === 'undefined') {
      WaveScheduler.bossSpawnedGlobal = false;
    }
    if (typeof WaveScheduler.bossSpawnInProgress === 'undefined') {
      WaveScheduler.bossSpawnInProgress = false;
    }
  }
  
  /**
   * Expand base waves into more varied waves for longer gameplay
   * Difficulty scaling: easy = x2, normal = x3, hard = x5 enemies per wave
   */
  expandWaves(baseWaves, difficultyScaling) {
    if (!baseWaves || baseWaves.length === 0) return [];
    
    // Use the wave count multiplier from difficulty scaling
    let waveCountMultiplier = 3.0; // default (normal)
    if (difficultyScaling) {
      waveCountMultiplier = difficultyScaling.modifiers.waveCountMultiplier || 3.0;
    }
    
    const expanded = [];
    const formations = ['v_wave', 'column', 'line', 'arc', 'circle', 'random'];
    const paths = ['straight', 'sine', 'seek', 'arc', 'spiral'];
    
    // Generate waves with difficulty-specific enemy counts
    let currentTime = 0;
    
    for (let i = 0; i < baseWaves.length; i++) {
      const baseWave = baseWaves[i];
      
      // First wave appears quickly, then maintain constant enemy presence
      if (i === 0) {
        currentTime = 2; // First wave appears at 2 seconds
      } else {
        // Calculate timing to maintain constant enemies: reduce gap for larger waves
        const baseGap = 2 + Math.random() * 2; // 2-4 seconds base gap
        const enemyDensity = difficultyScaling?.modifiers.waveCountMultiplier || 3.0;
        const densityAdjustment = Math.max(0, (enemyDensity - 2) * 0.5); // Reduce gap for higher difficulty
        currentTime += baseGap - densityAdjustment;
      }
      
      // Apply difficulty scaling to enemy count
      const count = difficultyScaling ?
        difficultyScaling.scaleWaveCount(baseWave.count) :
        baseWave.count;
      
      // Stagger large waves to prevent sprite overlapping
      if (count > 8) {
        // Split large waves into smaller staggered groups
        const groupSize = Math.min(6, Math.ceil(count / 3)); // Groups of max 6 enemies
        const numGroups = Math.ceil(count / groupSize);
        
        for (let g = 0; g < numGroups; g++) {
          const groupTime = currentTime + g * 1.5; // 1.5 seconds between groups
          const groupCount = g < numGroups - 1 ? groupSize : count - (g * groupSize);
          
          // Vary formation for each group
          const formation = formations[Math.floor(Math.random() * formations.length)];
          const path = paths[Math.floor(Math.random() * paths.length)];
          
          expanded.push({
            time: Math.round(groupTime),
            formation,
            enemy_type: baseWave.enemy_type,
            count: groupCount,
            path,
            isStaggeredGroup: true
          });
          
          console.log(`🌊 Staggered group ${g + 1}/${numGroups}: ${groupCount} enemies at time ${groupTime.toFixed(0)}`);
        }
      } else {
        // Small waves spawn normally but with varied formations
        const useVariation = Math.random() < 0.4; // 40% chance to vary
        const formation = useVariation ?
          formations[Math.floor(Math.random() * formations.length)] :
          baseWave.formation;
        const path = useVariation ?
          paths[Math.floor(Math.random() * paths.length)] :
          baseWave.path;
        
        expanded.push({
          time: Math.round(currentTime),
          formation,
          enemy_type: baseWave.enemy_type,
          count,
          path,
          isStaggeredGroup: false
        });
        
        console.log(`🌊 Wave ${i + 1}: ${count} enemies at time ${currentTime.toFixed(0)}`);
      }
      
      // Add small filler waves between large groups to maintain constant enemy presence
      if (i < baseWaves.length - 1 && Math.random() < 0.7) { // 70% chance for filler
        const fillerTime = currentTime + 1.5 + Math.random() * 1.5; // 1.5-3 seconds after
        const fillerCount = Math.max(2, Math.min(4, Math.round(count * 0.3))); // Small filler groups
        
        expanded.push({
          time: Math.round(fillerTime),
          formation: 'column', // Simple formation for filler
          enemy_type: baseWave.enemy_type,
          count: fillerCount,
          path: 'straight',
          isFiller: true
        });
        
        console.log(`🌊 Filler wave: ${fillerCount} enemies at time ${fillerTime.toFixed(0)}`);
      }
    }
    
    console.log(`🌊 Generated ${expanded.length} total waves with difficulty ${difficultyScaling?.getDifficulty() || 'normal'} (including staggered groups and filler waves)`);
    return expanded;
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
    
    // Update all enemies and track their age
    for (const enemy of this.enemies) {
      if (enemy.active) {
        enemy.update(deltaTime, player, pathFunctions, bulletManager);
        // Track enemy age for cleanup purposes
        enemy.age = (enemy.age || 0) + deltaTime;
      }
    }
    
    // Clean up inactive and stuck enemies
    const beforeCount = this.enemies.length;
    
    // Remove inactive enemies and enemies that have been alive too long (potentially stuck)
    this.enemies = this.enemies.filter(enemy => {
      // Remove clearly inactive enemies
      if (!enemy.active) return false;
      
      // Remove enemies that have been alive for too long (45 seconds max)
      const enemyAge = enemy.age || 0;
      if (enemyAge > 45) {
        console.log(`🧹 Removing stuck enemy (age: ${enemyAge.toFixed(1)}s)`);
        enemy.active = false;
        return false;
      }
      
      // Remove enemies that are too far off-screen and not moving back
      const margin = 200;
      const isFarOffScreen = enemy.x < -margin || enemy.x > GAME_CONFIG.RENDER_WIDTH + margin ||
                           enemy.y < -margin || enemy.y > GAME_CONFIG.RENDER_HEIGHT + margin;
      
      if (isFarOffScreen && enemyAge > 10) {
        console.log(`🧹 Removing distant enemy (age: ${enemyAge.toFixed(1)}s, pos: ${enemy.x.toFixed(0)},${enemy.y.toFixed(0)})`);
        enemy.active = false;
        return false;
      }
      
      return true;
    });
    
    const afterCount = this.enemies.length;
    
    if (beforeCount !== afterCount) {
      console.log(`🧹 Cleaned up ${beforeCount - afterCount} dead/stuck enemies (${afterCount} remaining)`);
    }
    
    // Boss spawn: after all waves are completed AND all enemies are defeated
    if (
      !this.bossHasSpawned &&
      !WaveScheduler.bossSpawnedGlobal &&
      !WaveScheduler.bossSpawnInProgress &&
      this.bossData &&
      this.waveIndex >= this.waves.length &&
      !this.boss
    ) {
      // Check if all enemies are defeated
      const allEnemiesDefeated = this.enemies.every(e => !e.active);
      const activeEnemyCount = this.enemies.filter(e => e.active).length;
      
      // Calculate time since last wave was spawned
      const lastWaveTime = this.waves.length > 0 ? this.waves[this.waves.length - 1].time : 0;
      const timeSinceLastWave = this.currentTime - lastWaveTime;
      
      // Only spawn boss if all waves are complete AND all enemies are defeated
      // Give a 3 second breathing room after the last enemy is defeated
      const shouldSpawnBoss = allEnemiesDefeated && timeSinceLastWave >= 3;
      
      if (!allEnemiesDefeated) {
        console.log(`⏳ Waiting for ${activeEnemyCount} enemies to be defeated before boss spawn (all waves scheduled)`);
      } else if (timeSinceLastWave < 3) {
        console.log(`⏳ All enemies defeated! Waiting for boss spawn delay (${(3 - timeSinceLastWave).toFixed(1)}s remaining)`);
      } else if (shouldSpawnBoss) {
        console.log(`🏆 All waves completed and all enemies defeated! Spawning boss...`);
        // Enter critical section to avoid race across instances/frames
        WaveScheduler.bossSpawnInProgress = true;

        // Double-check boss doesn't exist (race condition guard)
        if (this.boss) { WaveScheduler.bossSpawnInProgress = false; return; }

        const startX = GAME_CONFIG.RENDER_WIDTH + 100;
        const startY = GAME_CONFIG.RENDER_HEIGHT / 2;
        const shootCooldownMultiplier = this.difficultyScaling ?
          this.difficultyScaling.modifiers.shootCooldownMultiplier : 1.0;
        if (!this.bossHasSpawned && !WaveScheduler.bossSpawnedGlobal) {
          this.boss = new Boss(this.bossData, startX, startY, shootCooldownMultiplier);
          this.bossHasSpawned = true;
          WaveScheduler.bossSpawnedGlobal = true;
          console.log(`👹 Boss spawned: ${this.bossData.name || 'Unknown'} at (${startX}, ${startY})`);
        }

        // Leave critical section
        WaveScheduler.bossSpawnInProgress = false;
      }
    }
    
    // Update boss
    if (this.boss && this.boss.active) {
      this.boss.update(deltaTime, player, bulletPattern, bulletManager);
    }
    
    // Stage complete check: all enemies dead AND boss defeated (if boss exists)
    if (this.waveIndex >= this.waves.length) {
      const allEnemiesDead = this.enemies.every(e => !e.active);
      const bossDefeated = !this.bossData || (this.bossHasSpawned && (!this.boss || !this.boss.active));
      
      if (allEnemiesDead && bossDefeated) {
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
   * Spawn boss - flag is already set before calling this
   */
  spawnBoss_disabled() {
    if (this.boss || !this.bossData) return;
    
    const startX = GAME_CONFIG.RENDER_WIDTH + 100;
    const startY = GAME_CONFIG.RENDER_HEIGHT / 2;
    
    const shootCooldownMultiplier = this.difficultyScaling ? 
      this.difficultyScaling.modifiers.shootCooldownMultiplier : 1.0;
    
    this.boss = new Boss(this.bossData, startX, startY, shootCooldownMultiplier);
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
    this.boss = null;
    this.bossHasSpawned = false;
    this.currentTime = 0;
    this.waveIndex = 0;
    this.isComplete = false;
    WaveScheduler.bossSpawnedGlobal = false;
    WaveScheduler.bossSpawnInProgress = false;
  }
}

WaveScheduler.bossSpawnedGlobal = false;
WaveScheduler.bossSpawnInProgress = false;
