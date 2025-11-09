/**
 * PathFunctions - Enemy movement patterns
 * Defines various path behaviors for enemies
 */

export const PathFunctions = {
  /**
   * Straight - Move left at constant speed
   */
  straight: (enemy, t) => {
    enemy.x -= enemy.speed * (1 / 60); // Approximate deltaTime
  },
  
  /**
   * Sine - Move left with vertical sine wave
   */
  sine: (enemy, t) => {
    enemy.x -= enemy.speed * (1 / 60);
    enemy.y = enemy.startY + Math.sin(t * 2) * 50;
  },
  
  /**
   * Seek - Move toward player
   */
  seek: (enemy, t, player) => {
    if (!player) {
      // Fallback to straight if no player
      enemy.x -= enemy.speed * (1 / 60);
      return;
    }
    
    // Don't seek if too far left or if been seeking too long
    if (enemy.x < 200 || t > 10) {
      enemy.x -= enemy.speed * (1 / 60);
      return;
    }
    
    const playerPos = player.getPosition();
    const dx = playerPos.x - enemy.x;
    const dy = playerPos.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 0) {
      enemy.x += (dx / dist) * enemy.speed * 0.5 * (1 / 60);
      enemy.y += (dy / dist) * enemy.speed * 0.5 * (1 / 60);
    }
  },
  
  /**
   * Arc - Move in an arc pattern
   */
  arc: (enemy, t) => {
    const radius = 100;
    const speed = 2;
    enemy.x = enemy.startX - t * enemy.speed * 0.5 - 50; // Always move left
    enemy.y = enemy.startY + Math.sin(t * speed) * radius;
  },
  
  /**
   * Zigzag - Sharp zigzag pattern
   */
  zigzag: (enemy, t) => {
    enemy.x -= enemy.speed * (1 / 60);
    const zigzagSpeed = 3;
    const zigzagHeight = 40;
    enemy.y = enemy.startY + (Math.floor(t * zigzagSpeed) % 2 === 0 ? zigzagHeight : -zigzagHeight);
  },
  
  /**
   * Circle - Move in a circular pattern
   */
  circle: (enemy, t) => {
    const radius = 80;
    const speed = 2;
    enemy.x = enemy.startX - t * 50 + Math.cos(t * speed) * radius;
    enemy.y = enemy.startY + Math.sin(t * speed) * radius;
  },
  
  /**
   * Dive - Dive toward bottom then pull up
   */
  dive: (enemy, t) => {
    enemy.x -= enemy.speed * 0.7 * (1 / 60);
    
    if (t < 1.5) {
      // Dive down
      enemy.y += enemy.speed * 0.5 * (1 / 60);
    } else {
      // Pull up
      enemy.y -= enemy.speed * 0.3 * (1 / 60);
    }
  },
  
  /**
   * Hover - Move to position and hover
   */
  hover: (enemy, t) => {
    const targetX = enemy.startX - 300;
    
    if (enemy.x > targetX) {
      enemy.x -= enemy.speed * (1 / 60);
    } else if (t > 5) { // After 5 seconds of hovering, move left
      enemy.x -= enemy.speed * (1 / 60);
    }
    enemy.y = enemy.startY + Math.sin(t * 3) * 10;
  },
};

/**
 * Get path function by name
 */
export function getPathFunction(pathName) {
  return PathFunctions[pathName] || PathFunctions.straight;
}
