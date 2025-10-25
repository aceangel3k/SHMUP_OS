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
import TUISkin from './TUISkin';
import BootLog from './BootLog';
import BossWarning from './BossWarning';
import GameOverScreen from './GameOverScreen';
import VictoryScreen from './VictoryScreen';
import MobileControls from './MobileControls';
import { assetLoader } from '../utils/AssetLoader';
import { DifficultyScaling } from '../utils/DifficultyScaling';

export default function GameView({ gameData, difficulty = 'normal', hidden, onRestart }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const [bombs, setBombs] = useState(3);
  const [power, setPower] = useState(1);
  const [score, setScore] = useState(0);
  const [kills, setKills] = useState(0);
  const [lives, setLives] = useState(3);
  const [shields, setShields] = useState(0);
  const [showBootLog, setShowBootLog] = useState(false);
  const [showBossWarning, setShowBossWarning] = useState(false);
  const [bossName, setBossName] = useState('');
  const [gameState, setGameState] = useState('playing'); // playing, game_over, victory

  // Show boot log when component becomes visible
  useEffect(() => {
    if (!hidden) {
      setShowBootLog(true);
    }
  }, [hidden]);

  useEffect(() => {
    if (!canvasRef.current || !gameData) return;

    const canvas = canvasRef.current;
    const difficultyScaling = new DifficultyScaling(difficulty);
    console.log(`🎮 Difficulty: ${difficulty}`, difficultyScaling.getModifiers());
    
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
      const bombSystem = new BombSystem(bulletManager);
      const collisionManager = new CollisionManager();
      const waveScheduler = new WaveScheduler(gameDataWithSprites, enemyDataMap, difficultyScaling);
      const bulletPattern = new BulletPattern(bulletManager);
      const soundSystem = new SoundSystem();
      const particleSystem = new ParticleSystem();
      
      // Resume audio context on first user interaction
      soundSystem.resume();
      
      // Hook up weapon sound
      weaponSystem.onFireSound = () => soundSystem.playPlayerShoot();
    
    // Store in ref for cleanup
    engineRef.current = { 
      renderer, parallax, player, input, 
      bulletManager, weaponSystem, bombSystem, collisionManager,
      waveScheduler, bulletPattern, soundSystem, particleSystem
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
    let bossSpawnedFlag = false;
    let hasWon = false;
    
    // Initialize UI with difficulty-based values
    setLives(currentLives);
    setShields(currentShields);
    
    // Start input handling
    input.start();
    
    // Update function
    const update = (deltaTime) => {
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
      bulletManager.update(deltaTime, GAME_CONFIG.RENDER_WIDTH, GAME_CONFIG.RENDER_HEIGHT);
      bombSystem.update(deltaTime);
      waveScheduler.update(deltaTime, player, PathFunctions, bulletPattern, bulletManager);
      particleSystem.update(deltaTime);
      
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
        const bombDamage = 300; // Bomb damage per frame (increased from 50 to 300 for 6x damage)
        
        // Damage regular enemies
        for (const enemy of activeEnemies) {
          const enemyPos = enemy.getPosition();
          if (collisionManager.checkBombRadius(enemyPos.x, enemyPos.y, playerPos.x, playerPos.y, bombRadius)) {
            const destroyed = enemy.takeDamage(bombDamage * deltaTime);
            if (destroyed) {
              currentScore += 100;
              currentKills++;
              setScore(currentScore);
              setKills(currentKills);
            }
          }
        }
        
        // Damage boss
        const boss = waveScheduler.getBoss();
        if (boss && boss.active) {
          const bossPos = boss.getPosition();
          if (collisionManager.checkBombRadius(bossPos.x, bossPos.y, playerPos.x, playerPos.y, bombRadius)) {
            boss.takeDamage(bombDamage * deltaTime);
          }
        }
      }
      
      // Bullet-enemy collisions
      const bulletHits = collisionManager.checkBulletEnemyCollisions(bulletManager, activeEnemies);
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
        }
      }
      
      // Update invulnerability
      if (isInvulnerable) {
        invulnerabilityTimer -= deltaTime;
        if (invulnerabilityTimer <= 0) {
          isInvulnerable = false;
          player.setInvulnerable(false);
        }
      }
      
      // Player-enemy collisions (player damage)
      if (!isInvulnerable && !hasWon) {
        const playerHits = collisionManager.checkPlayerEnemyCollisions(player, activeEnemies);
        if (playerHits.length > 0) {
          // Shield absorbs hit first
          if (currentShields > 0) {
            currentShields--;
            setShields(currentShields);
            console.log(`🛡️ Shield absorbed hit! Shields remaining: ${currentShields}`);
          } else {
            currentLives--;
            setLives(currentLives);
            console.log(`💥 Player hit! Lives remaining: ${currentLives}`);
            
            if (currentLives <= 0) {
              setGameState('game_over');
              renderer.stop();
              input.stop();
            }
          }
          
          // Trigger screen shake, player flash, hit sound, and particles
          const playerPos = player.getPosition();
          renderer.shake(15);
          renderer.flash(0.4, '#FF0000');
          soundSystem.playPlayerHit();
          particleSystem.createExplosion(playerPos.x, playerPos.y, '#FF0000', 15, 0.8);
          isInvulnerable = true;
          player.setInvulnerable(true);
          invulnerabilityTimer = 2.0; // 2 seconds invulnerability
        }
      }
      
      // Player-bullet collisions
      if (!isInvulnerable && !hasWon) {
        const bulletHits = collisionManager.checkPlayerBulletCollisions(player, bulletManager);
        if (bulletHits.length > 0) {
          // Shield absorbs hit first
          if (currentShields > 0) {
            currentShields--;
            setShields(currentShields);
            console.log(`🛡️ Shield absorbed hit! Shields remaining: ${currentShields}`);
          } else {
            currentLives--;
            setLives(currentLives);
            console.log(`💥 Player hit by bullet! Lives remaining: ${currentLives}`);
            
            if (currentLives <= 0) {
              setGameState('game_over');
              renderer.stop();
              input.stop();
            }
          }
          
          // Trigger screen shake, player flash, hit sound, and particles
          const playerPos2 = player.getPosition();
          renderer.shake(15);
          renderer.flash(0.4, '#FF0000');
          soundSystem.playPlayerHit();
          particleSystem.createExplosion(playerPos2.x, playerPos2.y, '#FF0000', 15, 0.8);
          isInvulnerable = true;
          player.setInvulnerable(true);
          invulnerabilityTimer = 2.0;
        }
      }
      
      // Check for boss spawn
      const boss = waveScheduler.getBoss();
      if (boss && !bossSpawnedFlag) {
        bossSpawnedFlag = true;
        setBossName(boss.name);
        setShowBossWarning(true);
        soundSystem.playBossWarning();
      }
      
      // Check for victory
      if (waveScheduler.isWavesComplete() && !hasWon) {
        hasWon = true;
        const boss = waveScheduler.getBoss();
        if (boss) {
          const bossPos = boss.getPosition();
          particleSystem.createBossExplosion(bossPos.x, bossPos.y);
          renderer.flash(0.8, '#FFFFFF');
          renderer.shake(30);
        }
        setGameState('victory');
        renderer.stop();
        input.stop();
        console.log('🎉 Victory!');
      }
    }; // Close update function
    
    // Render function
    const render = (ctx) => {
      // Apply screen shake to all rendering
      const hasShake = renderer.applyShake();
      
      // Render parallax background
      parallax.render(ctx, GAME_CONFIG.RENDER_WIDTH, GAME_CONFIG.RENDER_HEIGHT);
      
      // Render enemies
      waveScheduler.render(ctx);
      
      // Render bullets
      bulletManager.render(ctx);
      
      // Render player
      player.render(ctx);
      
      // Render bomb effect
      const playerPos = player.getPosition();
      bombSystem.render(ctx, playerPos.x, playerPos.y);
      
      // Render particles
      particleSystem.render(ctx);
      
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
      
      // Cleanup
      return () => {
        renderer.stop();
        input.stop();
      };
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
