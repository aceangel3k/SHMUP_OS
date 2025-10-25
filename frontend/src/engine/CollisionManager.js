/**
 * CollisionManager - Collision detection
 * Handles circle-circle collision detection
 */

export class CollisionManager {
  constructor() {
    // Collision stats
    this.collisionCount = 0;
  }
  
  /**
   * Check circle-circle collision
   */
  checkCircleCircle(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const distSq = dx * dx + dy * dy;
    const radiusSum = a.radius + b.radius;
    
    return distSq < radiusSum * radiusSum;
  }
  
  /**
   * Check point-circle collision
   */
  checkPointCircle(px, py, circle) {
    const dx = px - circle.x;
    const dy = py - circle.y;
    const distSq = dx * dx + dy * dy;
    
    return distSq < circle.radius * circle.radius;
  }
  
  /**
   * Get distance between two points
   */
  getDistance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  /**
   * Check collision between player and bullets
   */
  checkPlayerBulletCollisions(player, bulletManager) {
    const playerHitbox = player.getHitbox();
    const enemyBullets = bulletManager.getEnemyBullets();
    const hits = [];
    
    for (const bullet of enemyBullets) {
      if (this.checkCircleCircle(playerHitbox, bullet)) {
        hits.push(bullet);
        bulletManager.deactivate(bullet);
        this.collisionCount++;
      }
    }
    
    return hits;
  }
  
  /**
   * Check collision between player bullets and enemies
   */
  checkBulletEnemyCollisions(bulletManager, enemies) {
    const playerBullets = bulletManager.getPlayerBullets();
    const hits = [];
    
    for (const bullet of playerBullets) {
      for (const enemy of enemies) {
        if (!enemy.active) continue;
        
        // Use hitboxRadius for larger, easier-to-hit collision area
        const enemyHitbox = {
          x: enemy.x,
          y: enemy.y,
          radius: enemy.hitboxRadius || enemy.radius
        };
        
        if (this.checkCircleCircle(bullet, enemyHitbox)) {
          hits.push({ bullet, enemy });
          
          // Grow bullet on hit instead of deactivating
          bullet.radius = Math.min(bullet.radius * 1.15, 12); // Grow by 15%, max 12
          bullet.damage = Math.min(bullet.damage * 1.1, 50); // Increase damage by 10%, max 50
          bullet.hitCount = (bullet.hitCount || 0) + 1;
          
          // Deactivate after 3 hits
          if (bullet.hitCount >= 3) {
            bulletManager.deactivate(bullet);
          }
          
          this.collisionCount++;
          break; // Bullet can only hit one enemy per frame
        }
      }
    }
    
    return hits;
  }
  
  /**
   * Check collision between player and enemies
   */
  checkPlayerEnemyCollisions(player, enemies) {
    const playerHitbox = player.getHitbox();
    const hits = [];
    
    for (const enemy of enemies) {
      if (!enemy.active) continue;
      
      if (this.checkCircleCircle(playerHitbox, enemy)) {
        hits.push(enemy);
        this.collisionCount++;
      }
    }
    
    return hits;
  }
  
  /**
   * Check if point is within bomb radius
   */
  checkBombRadius(x, y, bombX, bombY, bombRadius) {
    return this.getDistance(x, y, bombX, bombY) < bombRadius;
  }
  
  /**
   * Get collision count
   */
  getCollisionCount() {
    return this.collisionCount;
  }
  
  /**
   * Reset collision count
   */
  resetCount() {
    this.collisionCount = 0;
  }
}
