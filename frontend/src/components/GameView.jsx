import { useEffect, useRef, useState } from 'react';
import { GAME_CONFIG } from '../config';
import { Renderer } from '../engine/Renderer';
import { Parallax } from '../engine/Parallax';
import { Player } from '../engine/Player';
import { InputManager } from '../engine/InputManager';
import { BulletManager } from '../engine/BulletManager';
import { WeaponSystem } from '../engine/WeaponSystem';
import { BombSystem } from '../engine/BombSystem';
import { CollisionManager } from '../engine/CollisionManager';
import { WaveScheduler } from '../engine/WaveScheduler';
import { PathFunctions } from '../engine/PathFunctions';
import { BulletPattern } from '../engine/BulletPattern';
import { SoundSystem } from '../engine/SoundSystem';
import { ParticleSystem } from '../engine/ParticleSystem';
import { PickupManager } from '../engine/PickupManager';
import TUISkin from './TUISkin';
import BootLog from './BootLog';
import BossWarning from './BossWarning';
import GameOverScreen from './GameOverScreen';
import VictoryScreen from './VictoryScreen';
import MobileControls from './MobileControls';
import { assetLoader } from '../utils/AssetLoader';
import { DifficultyScaling } from '../utils/DifficultyScaling';

// Global singleton guard to prevent multiple game instances
let globalGameInstance = null;
let globalGameRunning = false;
let globalCleanupFn = null;
let lastGameData = null;

export default function GameView({ gameData, difficulty = 'normal', hidden, onRestart }) {
  
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const [bombs, setBombs] = useState(3);
  const [power, setPower] = useState(1);
  const [score, setScore] = useState(0);
  const [kills, setKills] = useState(0);
  const [lives, setLives] = useState(3);
  const [shields, setShields] = useState(0);
  const [charge, setCharge] = useState(100);
  const [showBootLog, setShowBootLog] = useState(false);
  const [showBossWarning, setShowBossWarning] = useState(false);
  const [bossName, setBossName] = useState('');
  const [gameState, setGameState] = useState('playing'); // playing, game_over, victory
  
  // Debug game state changes
  useEffect(() => {
    console.log(`🎮 Game state changed to: ${gameState}`);
  }, [gameState]);

  // Show boot log when component becomes visible
  useEffect(() => {
    if (!hidden) {
      setShowBootLog(true);
    }
  }, [hidden]);

  // Make boss vulnerable when warning disappears
  useEffect(() => {
    if (!showBossWarning && engineRef.current) {
      const { waveScheduler } = engineRef.current;
      const boss = waveScheduler?.getBoss();
      if (boss && boss.active) {
        boss.makeVulnerable();
        console.log(`🚨 Boss warning disappeared - ${boss.name || 'Boss'} is now vulnerable!`);
      }
    }
  }, [showBossWarning]);

  useEffect(() => {
    if (!gameData) return;
    
    // Simple cleanup of any existing game instance
    if (globalGameRunning) {
      console.log('🛑 Stopping existing game instance');
      if (globalCleanupFn) {
        globalCleanupFn();
      }
    }
    
    // Set singleton lock
    globalGameInstance = Date.now();
    globalGameRunning = true;
    const myInstanceId = globalGameInstance;
    console.log(`🎮 Starting GameView instance ${myInstanceId}`);

    if (!canvasRef.current || !gameData) return;

    const canvas = canvasRef.current;
    const difficultyScaling = new DifficultyScaling(difficulty);
    console.log(`🎮 Difficulty: ${difficulty}`, difficultyScaling.getModifiers());
    console.log(`🎁 Power-up settings - Drop rate: ${(difficultyScaling.getPowerUpDropRate() * 100).toFixed(0)}%, Pity threshold: ${difficultyScaling.getPowerUpPityThreshold()}`);
    
    // Load assets asynchronously and wait before starting game
    const loadAssets = async () => {
      try {
        // Get accent color from game data
        const accentColor = gameData.story?.palette?.accent || '#00FFD1';
        
        // Calculate total assets including all parallax layers
        const parallaxCount = gameData.stages[0].parallax?.length || 0;
        let loaded = 0;
        const totalAssets = parallaxCount + gameData.enemies.length + 1 + 1; // parallax + enemies + boss + player
        
        // Create sprite map for enemies/boss/parallax
        const spriteMap = {};
        const parallaxImages = [];
        let playerSprite = null;
        
        // Load ALL parallax layers (blocking - wait for these)
        if (gameData.stages[0].parallax) {
          for (let i = 0; i < gameData.stages[0].parallax.length; i++) {
            const layer = gameData.stages[0].parallax[i];
            try {
              window.updateAssetProgress?.(loaded / totalAssets, `Loading parallax layer ${i + 1}...`);
              const img = await assetLoader.loadParallaxLayer(layer, accentColor);
              parallaxImages[i] = img;
              loaded++;
            } catch (e) {
              console.warn(`Failed to load parallax layer ${i}:`, e);
              loaded++;
            }
          }
        }
        
        // Load enemy sprites (blocking - wait for all)
        for (const enemy of gameData.enemies) {
          try {
            window.updateAssetProgress?.(loaded / totalAssets, `Loading enemy: ${enemy.name}...`);
            const img = await assetLoader.loadEnemySprite(enemy, accentColor);
            spriteMap[enemy.id] = img;
            loaded++;
          } catch (e) {
            console.warn(`Failed to load enemy sprite ${enemy.id}:`, e);
            loaded++;
          }
        }
        
        // Load boss sprite (blocking)
        if (gameData.stages[0].boss) {
          try {
            window.updateAssetProgress?.(loaded / totalAssets, `Loading boss: ${gameData.stages[0].boss.title}...`);
            const img = await assetLoader.loadBossSprite(gameData.stages[0].boss, accentColor);
            spriteMap[gameData.stages[0].boss.id] = img;
            loaded++;
          } catch (e) {
            console.warn('Failed to load boss sprite:', e);
            loaded++;
          }
        }
        
        // Load player sprite (blocking)
        if (gameData.player) {
          try {
            window.updateAssetProgress?.(loaded / totalAssets, `Loading player ship...`);
            console.log('🚀 Loading player sprite:', gameData.player);
            playerSprite = await assetLoader.loadPlayerSprite(gameData.player, accentColor);
            console.log('✅ Player sprite loaded:', playerSprite);
            loaded++;
          } catch (e) {
            console.warn('❌ Failed to load player sprite:', e);
            loaded++;
          }
        } else {
          console.warn('⚠️  No player data in gameData');
          loaded++;
        }
        
        window.assetsLoadComplete?.();
        return { spriteMap, parallaxImages, playerSprite, accentColor };
      } catch (error) {
        console.error('Asset loading error:', error);
        window.assetsLoadComplete?.();
        return { spriteMap: {}, parallaxImages: [], accentColor: '#00FFD1' };
      }
    };
    
    // Load assets first, then initialize game
    loadAssets().then(({ spriteMap, parallaxImages, playerSprite, accentColor }) => {
      console.log('✅ Assets loaded:', { 
        spriteCount: Object.keys(spriteMap || {}).length,
        parallaxCount: parallaxImages?.length || 0
      });
      
      // Create enemy data map with sprites and difficulty scaling
      const enemyDataMap = {};
      gameData.enemies.forEach(enemy => {
        enemyDataMap[enemy.id] = {
          ...enemy,
          hp: difficultyScaling.scaleEnemyHp(enemy.hp),
          speed: difficultyScaling.scaleEnemySpeed(enemy.speed),
          sprite: spriteMap[enemy.id] // Add loaded sprite
        };
        const sprite = spriteMap[enemy.id];
        console.log(`Enemy ${enemy.id} sprite:`, sprite ? `loaded (${sprite.width}x${sprite.height}, complete: ${sprite.complete})` : 'missing');
      });
      
      // Add sprite to boss data and apply difficulty scaling
      const gameDataWithSprites = {
        ...gameData,
        stages: gameData.stages.map((stage, idx) => {
          if (idx === 0 && stage.boss) {
            const bossSprite = spriteMap[stage.boss.id];
            console.log(`Boss ${stage.boss.id} sprite:`, bossSprite ? `loaded (${bossSprite.width}x${bossSprite.height}, complete: ${bossSprite.complete})` : 'missing');
            return {
              ...stage,
              boss: {
                ...stage.boss,
                hp: difficultyScaling.scaleBossHp(stage.boss.hp),
                sprite: spriteMap[stage.boss.id]
              },
              waves: stage.waves.map(wave => ({
                ...wave,
                count: difficultyScaling.scaleWaveCount(wave.count)
              }))
            };
          }
          return stage;
        })
      };
      
      // Initialize game engine
      const renderer = new Renderer(canvas);
      const parallax = new Parallax(gameDataWithSprites);
      
      // Load parallax images into parallax system
      console.log('Loading parallax images:', parallaxImages.length);
      parallaxImages.forEach((img, index) => {
        if (img) {
          console.log(`Loading parallax layer ${index}:`, img.width, 'x', img.height);
          parallax.loadLayerImage(index, img.src);
        } else {
          console.warn(`Parallax layer ${index} is missing`);
        }
      });
      const player = new Player(100, GAME_CONFIG.RENDER_HEIGHT / 2);
      if (playerSprite) {
        console.log('🎮 Setting player sprite:', playerSprite);
        player.setSprite(playerSprite);
      } else {
        console.warn('⚠️  No player sprite to set - using placeholder');
      }
      const input = new InputManager();
      const bulletManager = new BulletManager(1000);
      // Apply difficulty scaling to weapon damage
      const weaponData = gameData.weapons?.[0] ? {
        ...gameData.weapons[0],
        damage: difficultyScaling.scalePlayerDamage(gameData.weapons[0].damage)
      } : null;
      const weaponSystem = new WeaponSystem(bulletManager, weaponData, accentColor);
      
      // Set up power level change callback to update UI immediately
      weaponSystem.onPowerLevelChange = (newLevel) => {
        currentPower = newLevel;
        setPower(newLevel);
        console.log(`🔫 UI synchronized: Power level changed to ${newLevel}`);
      };
      const bombSystem = new BombSystem(bulletManager);
      const collisionManager = new CollisionManager();
      const waveScheduler = new WaveScheduler(gameDataWithSprites, enemyDataMap, difficultyScaling);
      const bulletPattern = new BulletPattern(bulletManager);
      // Register LLM-defined bullet patterns if provided
      try {
        bulletPattern.registerFromDefinitions(gameData.bullet_patterns || []);
      } catch (e) {
        console.warn('Bullet pattern registration failed:', e);
      }
      const soundSystem = new SoundSystem();
      const particleSystem = new ParticleSystem();
      const pickupManager = new PickupManager();
      
      // Resume audio context on first user interaction
      soundSystem.resume();
      
      // Hook up weapon sound with different sounds for different weapon types
      weaponSystem.onFireSound = (weaponType) => {
        switch (weaponType) {
          case 'basic':
            soundSystem.playPlayerShoot();
            break;
          case 'rapid':
            soundSystem.playPlayerShoot(); // Could be different pitch
            break;
          case 'spread':
          case 'triple':
            soundSystem.playPlayerShoot(); // Could be deeper sound
            break;
          case 'laser':
            soundSystem.playPlayerShoot(); // Could be laser sound
            break;
          default:
            soundSystem.playPlayerShoot();
        }
      };
    
    // Store in ref for cleanup
    engineRef.current = { 
      renderer, parallax, player, input, 
      bulletManager, weaponSystem, bombSystem, collisionManager,
      waveScheduler, bulletPattern, soundSystem, particleSystem, pickupManager
    };
    
    // Local game state with difficulty-based starting values
    let currentBombs = 3;
    let currentPower = 1;
    let currentScore = 0;
    let currentKills = 0;
    let currentLives = difficultyScaling.modifiers.startingLives || 3;
    let currentShields = difficultyScaling.modifiers.startingShields || 0;
    let isInvulnerable = false;
    let invulnerabilityTimer = 0;
    let isDying = false;
    let deathTimer = 0;
    let bossSpawnedFlag = false;
    let hasWon = false;
    let isGameOver = false;
    let gameIsLocked = false; // Immediate synchronous lock
    
    // Power-up pity system (difficulty-based)
    let pickupPityCounter = 0; // Starts at 0, increments when no pickup drops
    const PICKUP_PITY_THRESHOLD = difficultyScaling.getPowerUpPityThreshold(); // Difficulty-based threshold
    const PICKUP_DROP_RATE = difficultyScaling.getPowerUpDropRate(); // Difficulty-based drop rate
    
    console.log('🔄 Game state variables initialized for new game');
    
    // Initialize UI with difficulty-based values
    setLives(currentLives);
    setShields(currentShields);
    
    // Provide starting power-up to help players
    setTimeout(() => {
      const pickupDefs = gameData.pickups || [];
      if (pickupDefs.length > 0 && currentPower < 3) {
        // Prefer power-ups at start, but give other pickups if already powered up
        const powerPickups = pickupDefs.filter(p => p.effect === 'power+1');
        const availablePickups = powerPickups.length > 0 ? powerPickups : pickupDefs;
        const def = availablePickups[Math.floor(Math.random() * availablePickups.length)];
        pickupManager.spawn(150, GAME_CONFIG.RENDER_HEIGHT / 2, def);
        console.log(`🎁 Starting power-up provided: ${def.effect}`);
      }
    }, 2000); // 2 seconds after game starts
    
    // Start input handling
    input.start();
    
    // Update function
    const update = (deltaTime) => {
      // Instance check - abort if we're not the active instance
      if (globalGameInstance !== myInstanceId) {
        return; // Silently stop updates for inactive instances
      }
      
      // Death sequence handling: allow particles to animate until timer completes (runs even when locked)
      if (isDying) {
        deathTimer -= deltaTime;
        particleSystem.update(deltaTime);
        console.log(`💀 Death timer: ${deathTimer.toFixed(1)}s remaining`);
        if (deathTimer <= 0) {
          isDying = false;
          renderer.stop();
          console.log('🔒 Setting game state to game_over');
          setGameState('game_over');
          // Force immediate UI update
          setTimeout(() => setGameState('game_over'), 0);
        }
        return;
      }
      
      // Check for boss spawn and victory FIRST (before any other logic)
      const boss = waveScheduler.getBoss();
      
      // Boss warning on spawn (only once) - only after boss is fully settled and sprite loaded
      if (
        boss &&
        !bossSpawnedFlag &&
        boss.active &&
        boss.isMovingToPosition === false
      ) {
        console.log(`🚨 Boss warning conditions met: name=${boss.name || 'Unknown'}, active=${boss.active}, moving=${boss.isMovingToPosition}, spriteLoaded=${boss.spriteLoaded || boss.sprite}`);
        bossSpawnedFlag = true;
        setBossName(boss.name || 'Boss'); // Use 'Boss' as fallback for empty/unknown names
        setShowBossWarning(true);
        soundSystem.playBossWarning();
        console.log(`🚨 Boss warning shown for ${boss.name || 'Boss'} - boss remains invulnerable until warning disappears`);
      }
      
      // Check for boss death as victory condition (only trigger once)
      if (boss && bossSpawnedFlag && boss.isDead && !boss.active && !hasWon) {
        hasWon = true;
        isGameOver = true; // Prevent any further collision checks
        console.log(`🎉 VICTORY - Boss defeated! Boss name: ${boss.name || 'Unknown'}. State transition to victory screen.`);
        
        // Boss explosion effect
        particleSystem.createBossExplosion(boss.x, boss.y);
        renderer.flash(0.8, '#FFFFFF');
        renderer.shake(30);
        
        // Stop game immediately
        renderer.stop();
        input.stop();
        
        // Show victory screen immediately with force update
        console.log('🎮 Setting game state to victory');
        setGameState('victory');
        
        // Force immediate UI update as backup
        setTimeout(() => {
          console.log('🎮 Forced victory screen update');
          setGameState('victory');
        }, 100);
        
        // Additional backup with longer delay
        setTimeout(() => {
          console.log('🎮 Secondary forced victory screen update');
          setGameState('victory');
        }, 500);
        
        return; // Stop updating this frame
      }
      
      // Immediate synchronous lock check - takes effect instantly (after death sequence)
      if (gameIsLocked) return;
      
      // Atomic game state check - stop everything if not playing
      if (gameState !== 'playing') return;
      
      // Stop ALL updates if game is over or won
      if (isGameOver) return;
      if (hasWon) return;
      
      // Helper: apply pickup effect
      const applyPickupEffect = (effect) => {
        if (!effect) return;
        if (effect === 'shield+1') {
          currentShields++;
          setShields(currentShields);
          soundSystem.playPickup?.();
        } else if (effect === 'bomb+1') {
          currentBombs++;
          setBombs(currentBombs);
          soundSystem.playPickup?.();
        } else if (effect === 'power+1') {
          if (currentPower < 5) {
            currentPower++;
            setPower(currentPower);
            soundSystem.playPickup?.();
            
            // Refill charge on power-up
            weaponSystem.refillCharge();
            setCharge(100);
            
            // Visual feedback for power-up
            const playerPos = player.getPosition();
            particleSystem.createExplosion(playerPos.x, playerPos.y, '#FFFF00', 20, 1.0);
            renderer.flash(0.3, '#FFFF00');
            console.log(`⚡ Power increased to level ${currentPower}! Charge refilled!`);
          }
        } else if (typeof effect === 'string' && effect.startsWith('score+')) {
          const n = parseInt(effect.split('+')[1] || '0', 10);
          if (!Number.isNaN(n)) {
            currentScore += n;
            setScore(currentScore);
          }
        }
      };
      // Get input state
      const actions = input.getActions();
      
      // Update player input
      player.setInput('up', actions.up);
      player.setInput('down', actions.down);
      player.setInput('left', actions.left);
      player.setInput('right', actions.right);
      player.setInput('slow', actions.slow);
      player.setInput('fire', actions.fire);
      
      // Handle bomb
      if (actions.bomb && currentBombs > 0) {
        input.resetAction('bomb');
        if (bombSystem.activate()) {
          currentBombs--;
          setBombs(currentBombs);
          soundSystem.playBomb();
          const playerPos = player.getPosition();
          particleSystem.createBombWave(playerPos.x, playerPos.y);
          renderer.flash(0.6, '#00FFFF');
          renderer.shake(20);
          console.log(`💣 BOMB! (${currentBombs} remaining)`);
        }
      }
      
      // Handle pause
      if (actions.pause) {
        input.resetAction('pause');
        console.log('Pause requested (not implemented yet)');
      }
      
      // Update game objects
      parallax.update(deltaTime);
      player.update(deltaTime);
      weaponSystem.update(deltaTime, player, actions.fire);
      
      // Update weapon system when power changes (only if different to avoid loops)
      if (weaponSystem.currentPowerLevel !== currentPower) {
        weaponSystem.upgrade(currentPower);
        weaponSystem.currentPowerLevel = currentPower;
        console.log(`🔫 Weapon upgraded to power level ${currentPower}`);
      }
      
      // Update weapon charge display
      const currentCharge = weaponSystem.getChargeLevel();
      if (currentCharge !== charge) {
        setCharge(currentCharge);
      }
      bulletManager.update(deltaTime, GAME_CONFIG.RENDER_WIDTH, GAME_CONFIG.RENDER_HEIGHT);
      bombSystem.update(deltaTime);
      waveScheduler.update(deltaTime, player, PathFunctions, bulletPattern, bulletManager);
      particleSystem.update(deltaTime);
      pickupManager.update(deltaTime);
      
      // Create bullet trails for player bullets
      const playerBullets = bulletManager.getPlayerBullets();
      for (const bullet of playerBullets) {
        if (Math.random() < 0.3) { // 30% chance per frame for performance
          particleSystem.createTrail(bullet.x, bullet.y, bullet.color, 2);
        }
      }
      
      // Check collisions
      const activeEnemies = waveScheduler.getActiveEnemies();
      
      // Bomb damage to enemies and boss
      if (bombSystem.isActiveBomb()) {
        const playerPos = player.getPosition();
        const bombRadius = bombSystem.getDamageRadius();
        // Bomb deals DPS and is scaled independently via DifficultyScaling
        const baseBombDps = 4000; // base DPS
        const bombDamageThisFrame = difficultyScaling.scaleBombDamage(baseBombDps) * deltaTime;
        
        // Damage regular enemies (use full-size hitboxes)
        for (const enemy of activeEnemies) {
          const enemyPos = enemy.getPosition();
          const enemyRadius = enemy.spriteRadius || enemy.hitboxRadius || enemy.radius || 20;
          const playerToEnemyDistance = collisionManager.getDistance(enemyPos.x, enemyPos.y, playerPos.x, playerPos.y);
          if (playerToEnemyDistance < bombRadius + enemyRadius) {
            const destroyed = enemy.takeDamage(bombDamageThisFrame);
            if (destroyed) {
              currentScore += 100;
              currentKills++;
              setScore(currentScore);
              setKills(currentKills);
            }
          }
        }
        
        // Damage boss (use full-size hitbox)
        const boss = waveScheduler.getBoss();
        if (boss && boss.active) {
          const bossPos = boss.getPosition();
          const bossRadius = boss.spriteRadius || boss.hitboxRadius || boss.radius || 40;
          const playerToBossDistance = collisionManager.getDistance(bossPos.x, bossPos.y, playerPos.x, playerPos.y);
          if (playerToBossDistance < bombRadius + bossRadius) {
            boss.takeDamage(bombDamageThisFrame);
          }
        }
      }
      
      // Bullet-enemy collisions
      const bulletHits = collisionManager.checkBulletEnemyCollisions(bulletManager, activeEnemies, GAME_CONFIG.RENDER_WIDTH, GAME_CONFIG.RENDER_HEIGHT);
      for (const hit of bulletHits) {
        const destroyed = hit.enemy.takeDamage(hit.bullet.damage);
        const enemyPos = hit.enemy.getPosition();
        
        // Impact effect on hit
        particleSystem.createImpact(hit.bullet.x, hit.bullet.y, '#FFFF00');
        
        // Create half-moon effect at bullet position when it hits
        particleSystem.createHalfMoon(hit.bullet.x, hit.bullet.y, hit.bullet.color, hit.bullet.radius);
        
        if (destroyed) {
          soundSystem.playExplosion();
          particleSystem.createExplosion(enemyPos.x, enemyPos.y, '#FF6600', 25);
          renderer.flash(0.2, '#FFFFFF');
          currentScore += 100;
          currentKills++;
          setScore(currentScore);
          setKills(currentKills);
          // Chance to drop a pickup with pity system
          const pickupDefs = gameData.pickups || [];
          let pickupDropped = false;
          
          if (pickupDefs.length > 0) {
            // Check if pity system should force a pickup
            if (pickupPityCounter >= PICKUP_PITY_THRESHOLD) {
              // Guaranteed pickup due to pity
              const def = pickupDefs[Math.floor(Math.random() * pickupDefs.length)];
              pickupManager.spawn(enemyPos.x, enemyPos.y, def);
              pickupDropped = true;
              pickupPityCounter = 0; // Reset pity counter
              console.log(`🎁 PITY SYSTEM: Guaranteed power-up dropped after ${PICKUP_PITY_THRESHOLD} enemies (${difficulty} difficulty)!`);
            } else if (Math.random() < PICKUP_DROP_RATE) {
              // Difficulty-based random pickup chance
              const def = pickupDefs[Math.floor(Math.random() * pickupDefs.length)];
              pickupManager.spawn(enemyPos.x, enemyPos.y, def);
              pickupDropped = true;
            }
          }
          
          // Increment pity counter if no pickup was dropped
          if (!pickupDropped) {
            pickupPityCounter++;
            // Debug: Show pity counter progress
            if (pickupPityCounter > 5 && pickupPityCounter % 3 === 0) {
              console.log(`🎁 Pity counter: ${pickupPityCounter}/${PICKUP_PITY_THRESHOLD}`);
            }
          }
        }
      }
      

      // Pickup collection (uses full-size hitbox for easier collection)
      const collectedPickups = collisionManager.checkPlayerPickupCollisions(player, pickupManager.pickups);
      for (const pickup of collectedPickups) {
        pickup.active = false;
        applyPickupEffect(pickup.effect);
      }
      
      // Update invulnerability
      if (isInvulnerable) {
        invulnerabilityTimer -= deltaTime;
        if (invulnerabilityTimer <= 0) {
          isInvulnerable = false;
          player.setInvulnerable(false);
        }
      }
      
      // Player-enemy collisions (player damage) - process at most one hit per frame
      if (!isInvulnerable && !hasWon && !isGameOver && !isDying && currentLives > 0) {
        const playerHits = collisionManager.checkPlayerEnemyCollisions(player, activeEnemies);
        if (playerHits.length > 0) {
          // Shield absorbs hit first
          if (currentShields > 0) {
            currentShields--;
            setShields(currentShields);
            console.log(`🛡️ Shield absorbed hit! Shields remaining: ${currentShields}`);
            
            const playerPos = player.getPosition();
            renderer.shake(8);
            renderer.flash(0.3, '#00D4FF');
            soundSystem.playPickup?.();
            particleSystem.createExplosion(playerPos.x, playerPos.y, '#00D4FF', 10, 0.6);
            isInvulnerable = true;
            player.setInvulnerable(true);
            invulnerabilityTimer = 1.0; // 1 second invulnerability (shorter)
            return; // stop further processing this frame
          } else {
            currentLives--;
            setLives(currentLives);
            console.log(`💥 Player hit! Lives remaining: ${currentLives}`);
            
            const playerPos = player.getPosition();
            renderer.shake(15);
            renderer.flash(0.4, '#FF0000');
            soundSystem.playPlayerHit();
            particleSystem.createExplosion(playerPos.x, playerPos.y, '#FF0000', 15, 0.8);
            
            if (currentLives <= 0) {
              console.log('💀 GAME OVER - Player died from enemy collision');
              
              // Atomic death sequence - prevent any further updates
              if (isDying || isGameOver || gameIsLocked) return; // Already dying, ignore
              
              // IMMEDIATE LOCK - stops all updates synchronously
              gameIsLocked = true;
              isDying = true;
              isGameOver = true;
              deathTimer = 2.5;
              
              // Zero out HUD atomically
              currentLives = 0;
              setLives(0);
              currentShields = 0;
              setShields(0);
              
              // Stop all game systems immediately
              input.stop();
              
              console.log('🔒 IMMEDIATE LOCK - All game updates stopped');
              
              // Hide player and create dramatic explosion with intense red screen
              player.active = false;
              particleSystem.createExplosion(playerPos.x, playerPos.y, '#FF0000', 50, 2.0);
              particleSystem.createExplosion(playerPos.x, playerPos.y, '#FFFF00', 40, 1.8);
              particleSystem.createExplosion(playerPos.x, playerPos.y, '#FFFFFF', 30, 1.5);
              renderer.shake(30);
              renderer.flash(1.5, '#FF0000'); // Intense red screen flash
              
              return;
            }
            
            isInvulnerable = true;
            player.setInvulnerable(true);
            invulnerabilityTimer = 2.0; // 2 seconds invulnerability
            return; // stop further processing this frame
          }
        }
      }
      
      // Player-bullet collisions - process at most one hit per frame
      if (!isInvulnerable && !hasWon && !isGameOver && !isDying && currentLives > 0) {
        const bulletHits = collisionManager.checkPlayerBulletCollisions(player, bulletManager);
        if (bulletHits.length > 0) {
          if (currentShields > 0) {
            currentShields--;
            setShields(currentShields);
            console.log(`🛡️ Shield absorbed hit! Shields remaining: ${currentShields}`);
            const playerPos2 = player.getPosition();
            renderer.shake(8);
            renderer.flash(0.3, '#00D4FF');
            soundSystem.playPickup?.();
            particleSystem.createExplosion(playerPos2.x, playerPos2.y, '#00D4FF', 10, 0.6);
            isInvulnerable = true;
            player.setInvulnerable(true);
            invulnerabilityTimer = 1.0;
            return; // stop further processing this frame
          } else {
            currentLives--;
            setLives(currentLives);
            console.log(`💥 Player hit by bullet! Lives remaining: ${currentLives}`);
            const playerPos2 = player.getPosition();
            renderer.shake(15);
            renderer.flash(0.4, '#FF0000');
            soundSystem.playPlayerHit();
            particleSystem.createExplosion(playerPos2.x, playerPos2.y, '#FF0000', 15, 0.8);
            if (currentLives <= 0) {
              console.log('💀 GAME OVER - Player died from bullet collision');
              
              // Atomic death sequence - prevent any further updates
              if (isDying || isGameOver || gameIsLocked) return; // Already dying, ignore
              
              // IMMEDIATE LOCK - stops all updates synchronously
              gameIsLocked = true;
              isDying = true;
              isGameOver = true;
              deathTimer = 2.5;
              
              // Zero out HUD atomically
              currentLives = 0;
              setLives(0);
              currentShields = 0;
              setShields(0);
              
              // Stop all game systems immediately
              input.stop();
              
              console.log('🔒 IMMEDIATE LOCK - All game updates stopped');
              
              // Hide player and create dramatic explosion with intense red screen
              player.active = false;
              particleSystem.createExplosion(playerPos2.x, playerPos2.y, '#FF0000', 50, 2.0);
              particleSystem.createExplosion(playerPos2.x, playerPos2.y, '#FFFF00', 40, 1.8);
              particleSystem.createExplosion(playerPos2.x, playerPos2.y, '#FFFFFF', 30, 1.5);
              renderer.shake(30);
              renderer.flash(1.5, '#FF0000'); // Intense red screen flash
              
              return;
            }
            isInvulnerable = true;
            player.setInvulnerable(true);
            invulnerabilityTimer = 2.0;
            return; // stop further processing this frame
          }
        }
      }
    }; // Close update function
    
    // Render function
    const render = (ctx) => {
      // Stop rendering game objects if game is over or won
      // (but still render the final frame)
      
      // Apply screen shake to all rendering
      const hasShake = renderer.applyShake();
      
      // Render parallax background
      parallax.render(ctx, GAME_CONFIG.RENDER_WIDTH, GAME_CONFIG.RENDER_HEIGHT);
      
      // Render enemies
      waveScheduler.render(ctx);
      
      // Render bullets (should be visible on top of enemies)
      bulletManager.render(ctx);
      
      // Render player (on top of everything)
      player.render(ctx);
      
      // Render bomb effect
      const playerPos = player.getPosition();
      bombSystem.render(ctx, playerPos.x, playerPos.y);
      
      // Render particles
      particleSystem.render(ctx);

      // Render pickups
      pickupManager.render(ctx);
      
      // Reset shake transform
      if (hasShake) {
        renderer.resetShake();
      }
      
      // Render screen flash (after shake reset, before UI)
      renderer.renderFlash();
      
      // Render game info with crisp text
      ctx.save();
      
      // Enable crisp text rendering
      ctx.imageSmoothingEnabled = false;
      ctx.textBaseline = 'top';
      
      // Draw semi-transparent background for better readability
      //ctx.fillStyle = 'rgba(6, 8, 10, 0.8)';
      //ctx.fillRect(5, 10, 250, 110);
      
      // Draw text with glow for sharpness
      ctx.shadowColor = 'rgba(0, 255, 209, 0.8)';
      ctx.shadowBlur = 3;
      ctx.fillStyle = '#00FFD1';
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`OS: ${gameData.story.os_name}`, 15, 15);
      ctx.fillText(`Stage: ${gameData.stages[0].title}`, 15, 35);
      ctx.fillText(`Enemies: ${waveScheduler.getActiveEnemies().length}`, 15, 55);
      ctx.fillText(`Score: ${currentScore}`, 15, 75);
      ctx.fillText(`Kills: ${currentKills}`, 15, 95);
      ctx.restore();
    };
    
    // Start game loop
    renderer.start(update, render);
      
      // Cleanup - ensure complete shutdown
      const cleanup = () => {
        console.log(`🧹 GameView cleanup for instance ${myInstanceId}`);
        if (renderer) renderer.stop();
        if (input) input.stop();
        // Reset global boss flags
        if (typeof WaveScheduler !== 'undefined') {
          WaveScheduler.bossSpawnedGlobal = false;
          WaveScheduler.bossSpawnInProgress = false;
        }
        // Only release lock if we're the active instance
        if (globalGameInstance === myInstanceId) {
          globalGameInstance = null;
          globalGameRunning = false;
          globalCleanupFn = null;
          console.log(`🔓 Instance ${myInstanceId} released singleton lock`);
        }
      };
      
      // Store cleanup function globally
      globalCleanupFn = cleanup;
      
      return cleanup;
    }); // Close .then() block
  }, [gameData]);

  // Boot log messages
  const bootMessages = [
    `Initializing ${gameData.story.os_name}...`,
    'Loading kernel modules...',
    `Mounting stage: ${gameData.stages[0].title}`,
    'Spawning enemy processes...',
    'Weapons system online',
    'All systems operational',
  ];

  // Restart handler
  const handleRestart = () => {
    if (onRestart) {
      onRestart();
    } else {
      // Fallback to reload if no handler provided
      window.location.reload();
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4" 
      style={{ 
        backgroundColor: '#06080A'
      }}
    >
      {/* Boot Log - Show even while hidden */}
      {showBootLog && (
        <BootLog 
          messages={bootMessages}
          onComplete={() => setShowBootLog(false)}
        />
      )}
      
      {/* Game UI - Hidden until assets load */}
      <div style={{ display: hidden ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <TUISkin>
          {/* Game Canvas */}
          <canvas
            ref={canvasRef}
            className="block"
            style={{
              maxWidth: '100%',
              height: 'auto',
            }}
          />
        </TUISkin>

        {/* HUD */}
        <div className="mt-4 flex gap-4 font-mono text-sm" style={{ color: '#00FFD1' }}>
          <div>SCORE: {score}</div>
          <div>LIVES: {lives}</div>
          {shields > 0 && <div>🛡️ SHIELDS: {shields}</div>}
          <div>BOMBS: {bombs}</div>
          <div>POWER: {power}</div>
          <div style={{
            color: charge > 30 ? '#00FFD1' : charge > 10 ? '#FFFF00' : '#FF0000',
            position: 'relative'
          }}>
            ⚡ CHARGE: {charge}%
            {charge < 30 && (
              <div style={{
                position: 'absolute',
                top: '-20px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '10px',
                color: charge > 10 ? '#FFFF00' : '#FF0000',
                whiteSpace: 'nowrap'
              }}>
                {charge > 10 ? 'LOW CHARGE' : 'CRITICAL!'}
              </div>
            )}
          </div>
        </div>

        {/* Controls Info */}
        <div className="mt-4 mb-4 font-mono text-xs text-center" style={{ color: '#00FFD1', opacity: 0.5 }}>
          <div>ARROWS/WASD: Move | SPACE: Fire | SHIFT: Slow | X: Bomb</div>
        </div>
      </div>

      {/* Boss Warning */}
      {showBossWarning && (
        <BossWarning 
          bossName={bossName}
          onComplete={() => setShowBossWarning(false)}
        />
      )}

      {/* Game Over */}
      {gameState === 'game_over' && (
        <GameOverScreen 
          score={score}
          kills={kills}
          onRestart={handleRestart}
        />
      )}

      {/* Victory */}
      {gameState === 'victory' && (
        <VictoryScreen 
          score={score}
          kills={kills}
          onContinue={handleRestart}
        />
      )}

      {/* Mobile Controls */}
      <MobileControls
        onMove={(movement) => {
          if (engineRef.current?.input) {
            engineRef.current.input.setMobileMovement(movement.x, movement.y);
          }
        }}
        onFire={(firing) => {
          if (engineRef.current?.input) {
            engineRef.current.input.setMobileFire(firing);
          }
        }}
        onBomb={() => {
          if (engineRef.current?.input) {
            engineRef.current.input.triggerMobileBomb();
          }
        }}
        disabled={gameState !== 'playing'}
      />
    </div>
  );
}
