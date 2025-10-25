# Step 9: Enemies, Waves, Paths

## What Was Built

### Engine Modules (`frontend/src/engine/`)

1. **Enemy.js** (200 lines)
   - Enemy class with HP, speed, radius from JSON
   - Damage system with HP bar display
   - Placeholder sprite rendering (colored circle with ID letter)
   - Damage flash effect
   - Active/inactive state management
   - Position tracking

2. **PathFunctions.js** (100 lines)
   - 8 path behaviors for enemy movement
   - `straight` - Move left at constant speed
   - `sine` - Sine wave vertical movement
   - `seek` - Home in on player
   - `arc` - Curved arc pattern
   - `zigzag` - Sharp zigzag movement
   - `circle` - Circular pattern
   - `dive` - Dive down then pull up
   - `hover` - Move to position and hover

3. **WaveScheduler.js** (200 lines)
   - Reads wave data from game JSON
   - Time-based wave spawning
   - 4 formation types:
     - `v_wave` - V-shaped formation
     - `column` - Vertical column
     - `line` - Horizontal line
     - `arc` - Curved arc
   - Enemy lifecycle management
   - Wave completion tracking

### Integration

**GameView.jsx** - Updated with enemy systems
- WaveScheduler initialized from game data
- Enemy-bullet collision detection
- Player-enemy collision detection (logs to console)
- Score system (100 points per kill)
- Kill counter
- Enemy count display

## Validation Tests

### 1. Wave Spawning
```
Expected:
- Enemies spawn at times specified in game data
- Console logs "🌊 Wave spawned: Nx [enemy_type] ([formation])"
- Enemy count increases in top-left HUD
- Formations match specified type (v_wave, column, line, arc)
```

### 2. Enemy Movement Paths
```
Test each path type by observing enemy behavior:

straight: Enemies move left at constant speed
sine: Enemies move left with vertical sine wave
seek: Enemies move toward player position
arc: Enemies move in curved arc pattern

Expected:
- Movement matches path type
- Smooth animation
- No jittering
```

### 3. Enemy HP and Damage
```
Test: Shoot enemies with player bullets

Expected:
- HP bar appears above enemy (green → yellow → red)
- HP decreases when hit
- White damage flash on hit
- Enemy destroyed at 0 HP
- Score increases by 100 per kill
- Kill counter increases
```

### 4. Formations
```
Test: Observe different wave formations

v_wave: V-shaped pattern (60px spacing)
column: Vertical column (80px spacing)
line: Horizontal line (50px spacing)
arc: Curved arc (150px radius)

Expected:
- Enemies spawn in correct formation
- Spacing matches pattern
- All enemies visible on screen
```

### 5. Collision Detection
```
Test: Shoot enemies and touch enemies

Expected:
- Bullets hit enemies (HP decreases)
- Bullets disappear on hit
- Player touching enemy logs "💥 Player hit!" to console
- No false positives/negatives
```

### 6. Enemy Lifecycle
```
Test: Watch enemies from spawn to death/off-screen

Expected:
- Enemies spawn from right side
- Enemies move according to path
- Enemies deactivate when off-screen (left side)
- Destroyed enemies removed from active count
- Enemy count updates correctly
```

## Technical Details

### Enemy Stats (from JSON)
```javascript
{
  id: "enemy_1",
  name: "Drone",
  hp: 20-60,           // Health points
  speed: 0.8-2.0,      // Speed multiplier (×100 = px/s)
  radius: 8-16,        // Collision radius
  sprite_prompt: "..." // Sprite description
}
```

### Wave Data (from JSON)
```javascript
{
  time: 5,             // Spawn at 5 seconds
  formation: "v_wave", // Formation type
  enemy_type: "enemy_1", // Enemy ID
  count: 5,            // Number of enemies
  path: "sine"         // Movement path
}
```

### Formation Spacing
- **v_wave**: 60px spacing, V-angle 45°
- **column**: 80px vertical spacing
- **line**: 50px horizontal spacing
- **arc**: 150px radius, π radians

### Path Behaviors
- **straight**: -speed px/s horizontal
- **sine**: Amplitude 50px, frequency 2 Hz
- **seek**: 0.5× speed toward player
- **arc**: 100px radius, 2 rad/s
- **zigzag**: ±40px, 3 Hz
- **circle**: 80px radius, 2 rad/s
- **dive**: 0.7× horizontal, ±0.5× vertical
- **hover**: Stop at -300px from start

### Collision System
- Circle-circle detection
- Player hitbox: 8px radius
- Enemy hitbox: Variable (8-16px from JSON)
- Bullet hitbox: 3-4px radius

## File Structure

```
frontend/src/engine/
├── Enemy.js          (NEW - 200 lines)
├── PathFunctions.js  (NEW - 100 lines)
└── WaveScheduler.js  (NEW - 200 lines)

frontend/src/components/
└── GameView.jsx      (UPDATED - enemy integration)
```

## Controls Summary

- **SPACE**: Fire at enemies
- **WASD/Arrows**: Move to dodge
- **SHIFT**: Slow mode (precise dodging)
- **X**: Bomb (clears enemy bullets)

## Known Limitations (MVP)

- No enemy bullets yet (Step 10)
- No player lives/damage system yet (Step 11)
- No boss yet (Step 10)
- Placeholder enemy sprites (colored circles)
- Player-enemy collision only logs to console

## Next Steps

- Step 10: Bullet Patterns & Boss Phases
- Step 11: TUI Overlay & HUD (lives, score display)
- Step 12: Asset Integration (enemy sprites)
