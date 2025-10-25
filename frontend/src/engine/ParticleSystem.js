/**
 * ParticleSystem - Handles particle effects for explosions, trails, and impacts
 */

export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  /**
   * Create an explosion effect
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {string} color - Particle color
   * @param {number} count - Number of particles
   * @param {number} speed - Base speed multiplier
   */
  createExplosion(x, y, color = '#FF6600', count = 30, speed = 1.0) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const baseSpeed = (100 + Math.random() * 200) * speed;
      
      this.particles.push({
        x, 
        y,
        vx: Math.cos(angle) * baseSpeed,
        vy: Math.sin(angle) * baseSpeed,
        life: 1.0,
        decay: 0.015 + Math.random() * 0.015,
        size: 2 + Math.random() * 4,
        color,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        type: 'explosion'
      });
    }
  }

  /**
   * Create a large boss explosion with multiple waves
   */
  createBossExplosion(x, y) {
    // Multiple colored explosions
    this.createExplosion(x, y, '#FF6600', 40, 1.5);
    this.createExplosion(x, y, '#FFAA00', 30, 1.2);
    this.createExplosion(x, y, '#FF0000', 20, 1.0);
    
    // Add some white flash particles
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;
      
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.5,
        decay: 0.01,
        size: 8 + Math.random() * 8,
        color: '#FFFFFF',
        type: 'flash'
      });
    }
  }

  /**
   * Create a bullet trail effect
   */
  createTrail(x, y, color = '#00FFD1', size = 2) {
    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 30,
      vy: (Math.random() - 0.5) * 30,
      life: 0.6,
      decay: 0.04,
      size,
      color,
      type: 'trail'
    });
  }

  /**
   * Create impact sparks when bullet hits enemy
   */
  createImpact(x, y, color = '#FFFF00') {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.3;
      const speed = 150 + Math.random() * 100;
      
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5,
        decay: 0.05,
        size: 2 + Math.random() * 2,
        color,
        type: 'spark'
      });
    }
  }

  /**
   * Create sparkles around power-ups
   */
  createSparkle(x, y, color = '#FFD700') {
    const angle = Math.random() * Math.PI * 2;
    const distance = 10 + Math.random() * 20;
    
    this.particles.push({
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance,
      vx: 0,
      vy: -30 - Math.random() * 20,
      life: 1.0,
      decay: 0.02,
      size: 2 + Math.random() * 2,
      color,
      type: 'sparkle'
    });
  }

  /**
   * Create bomb shockwave particles
   */
  createBombWave(x, y) {
    for (let i = 0; i < 60; i++) {
      const angle = (Math.PI * 2 * i) / 60;
      const speed = 300 + Math.random() * 200;
      
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8,
        decay: 0.03,
        size: 3 + Math.random() * 3,
        color: '#00FFFF',
        type: 'wave'
      });
    }
  }

  /**
   * Create a half-moon effect (two circles, one larger, one smaller offset)
   * Stays in place, rotates, and gradually disappears
   */
  createHalfMoon(x, y, color = '#00FFD1', size = 8) {
    this.particles.push({
      x,
      y,
      vx: 0, // Stationary
      vy: 0,
      life: 1.0,
      decay: 0.02, // Slower decay for visibility
      size,
      color,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: 3.0, // Fast rotation
      type: 'halfmoon'
    });
  }

  /**
   * Update all particles
   */
  update(deltaTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      // Update position
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      
      // Apply gravity (except for sparkles and trails)
      if (p.type === 'explosion' || p.type === 'spark') {
        p.vy += 300 * deltaTime;
      }
      
      // Apply drag
      p.vx *= 0.98;
      p.vy *= 0.98;
      
      // Update rotation
      if (p.rotation !== undefined) {
        p.rotation += p.rotationSpeed;
      }
      
      // Decay life
      p.life -= p.decay;
      
      // Remove dead particles
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * Render all particles
   */
  render(ctx) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      
      if (p.type === 'explosion' && p.rotation !== undefined) {
        // Rotating square particles for explosions
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
      } else if (p.type === 'halfmoon') {
        // Half-moon effect: two circles with one offset
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        
        // Draw larger circle
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw smaller circle offset to create crescent shape
        // Use composite operation to "cut out" part of the larger circle
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(p.size * 0.4, 0, p.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      } else if (p.type === 'flash') {
        // Large glowing circles for flash
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Simple circles for trails, sparks, sparkles
        ctx.fillStyle = p.color;
        if (p.type === 'sparkle') {
          ctx.shadowBlur = 10;
          ctx.shadowColor = p.color;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    }
  }

  /**
   * Clear all particles
   */
  clear() {
    this.particles = [];
  }

  /**
   * Get particle count (for debugging)
   */
  getCount() {
    return this.particles.length;
  }
}
