# Step 7: Renderer & Parallax Scroller

## What Was Built

### Engine Modules (`frontend/src/engine/`)

1. **Renderer.js** - Canvas setup and game loop
   - 60 FPS target with delta time
   - FPS counter (top-right corner)
   - requestAnimationFrame loop
   - Clear and render callbacks

2. **Parallax.js** - Scrolling background layers
   - Multiple layers with depth-based speeds
   - Tiled image rendering for seamless scrolling
   - Placeholder gradients when images not loaded
   - Automatic wrapping at 2048px

3. **Player.js** - Player ship with movement
   - Arrow keys / WASD movement
   - Shift for slow mode (shows hitbox)
   - Triangle placeholder sprite
   - Bounds checking (20px margin)
   - Normal speed: 300 px/s, Slow speed: 150 px/s

4. **InputManager.js** - Keyboard input handling
   - Key mapping (WASD, Arrows, Space, X, Shift, Esc)
   - Action state management
   - Event listener lifecycle
   - One-time action support (fire, bomb, pause)

### Integration

**GameView.jsx** - Updated to use game engine
- Initializes all engine modules
- Connects input to player
- Runs update/render loop
- Displays game info (OS name, stage, scroll speed)
- Cleanup on unmount

## Validation Tests

Run these tests after starting the frontend:

### 1. FPS Performance
```
Expected: 60 FPS displayed in top-right corner
Check: DevTools Performance tab shows consistent 16.6ms frames
```

### 2. Parallax Scrolling
```
Expected: 3 gradient layers scrolling at different speeds
- Layer 1 (depth 1): Fastest scroll
- Layer 2 (depth 2): Medium scroll
- Layer 3 (depth 3): Slowest scroll
Check: Layers wrap seamlessly, no tearing
```

### 3. Player Movement
```
Controls:
- Arrow Keys / WASD: Move player
- Shift: Slow mode (shows pink hitbox circle)

Expected:
- Player moves smoothly in all directions
- Diagonal movement normalized (same speed)
- Player stays within bounds (20px margin)
- Slow mode reduces speed by 50%
```

### 4. Input Responsiveness
```
Expected:
- No input lag
- Smooth movement
- Shift toggles slow mode instantly
- ESC logs "Pause requested" to console
```

### 5. Game Info Display
```
Expected:
- Top-left shows OS name, stage title, scroll speed
- Top-right shows FPS counter
- All text readable with cyan color
```

## Technical Details

### Coordinate System
- Logical size: 1280×720 pixels
- Origin: Top-left (0, 0)
- Player starts at (100, 360)

### Delta Time
- Calculated in seconds for frame-rate independence
- Movement: `position += velocity * deltaTime`

### Parallax Formula
```javascript
scrollSpeed = baseSpeed * (1 / depth) * 100
layer.x -= scrollSpeed * deltaTime
```

### Player Hitbox
- Visual sprite: 16px radius (32×32)
- Collision hitbox: 8px radius (shown in slow mode)

### Performance Targets
- 60 FPS on M1 MacBook Air
- < 16.6ms per frame
- No dropped frames during scrolling

## File Structure

```
frontend/src/
├── engine/
│   ├── Renderer.js       (130 lines)
│   ├── Parallax.js       (150 lines)
│   ├── Player.js         (180 lines)
│   └── InputManager.js   (120 lines)
└── components/
    └── GameView.jsx      (updated - 100 lines)
```

## Next Steps

- Step 8: Weapons & Bullets (BulletManager, firing, object pooling)
- Step 9: Enemies & Waves (Enemy class, WaveScheduler, formations)
- Step 10: Boss & Patterns (BossController, bullet patterns)

## Known Limitations (MVP)

- No sprite images (using placeholders)
- No parallax images (using gradients)
- No collision detection yet
- No weapons/bullets yet
- Pause not implemented (logs to console)
