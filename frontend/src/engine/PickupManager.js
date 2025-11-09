/**
 * PickupManager - Spawns, updates, renders pickups and applies effects on collection
 */
export class PickupManager {
  constructor() {
    this.pickups = [];
  }

  /**
   * Spawn a pickup at x,y
   * pickupDef: { id, name, effect }
   */
  spawn(x, y, pickupDef) {
    if (!pickupDef) return;
    
    // Determine visual style based on effect
    let color, shape, size;
    const effect = pickupDef.effect;
    
    if (effect === 'shield+1') {
      color = '#00D4FF'; // Cyan
      shape = 'shield';
      size = 14;
    } else if (effect === 'bomb+1') {
      color = '#FF00D1'; // Magenta
      shape = 'bomb';
      size = 12;
    } else if (effect === 'power+1') {
      color = '#FFD700'; // Gold
      shape = 'star';
      size = 16;
    } else {
      color = '#00FFD1'; // Default cyan
      shape = 'circle';
      size = 10;
    }
    
    this.pickups.push({
      x,
      y,
      vx: -120, // float left
      vy: 0,
      radius: size,
      color,
      shape,
      effect: pickupDef.effect,
      id: pickupDef.id || pickupDef.effect,
      name: pickupDef.name || pickupDef.effect,
      active: true,
      time: 0, // for animation
    });
  }

  update(deltaTime) {
    for (const p of this.pickups) {
      if (!p.active) continue;
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.time += deltaTime;
      // Gentle bobbing motion
      p.y += Math.sin(p.time * 3) * 20 * deltaTime;
      if (p.x < -50) p.active = false;
    }
  }

  render(ctx) {
    for (const p of this.pickups) {
      if (!p.active) continue;
      
      ctx.save();
      
      // Pulsing glow effect
      const pulse = 0.7 + Math.sin(p.time * 4) * 0.3;
      
      // Outer glow
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 15 * pulse;
      
      // Render based on shape
      if (p.shape === 'shield') {
        this.renderShield(ctx, p.x, p.y, p.radius, p.color, pulse);
      } else if (p.shape === 'bomb') {
        this.renderBomb(ctx, p.x, p.y, p.radius, p.color, pulse);
      } else if (p.shape === 'star') {
        this.renderStar(ctx, p.x, p.y, p.radius, p.color, pulse);
      } else {
        this.renderCircle(ctx, p.x, p.y, p.radius, p.color, pulse);
      }
      
      ctx.restore();
    }
  }
  
  renderShield(ctx, x, y, size, color, pulse) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color + '40'; // Semi-transparent
    ctx.lineWidth = 3;
    
    // Shield shape (hexagon)
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(angle) * size;
      const py = y + Math.sin(angle) * size;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Inner cross
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.6);
    ctx.lineTo(x, y + size * 0.6);
    ctx.moveTo(x - size * 0.6, y);
    ctx.lineTo(x + size * 0.6, y);
    ctx.stroke();
  }
  
  renderBomb(ctx, x, y, size, color, pulse) {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    // Bomb body (circle)
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Fuse
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - size * 0.5, y - size * 0.5);
    ctx.lineTo(x - size * 0.9, y - size * 0.9);
    ctx.stroke();
    
    // Spark at fuse tip
    const sparkSize = 3 * pulse;
    ctx.fillStyle = '#FFFF00';
    ctx.beginPath();
    ctx.arc(x - size * 0.9, y - size * 0.9, sparkSize, 0, Math.PI * 2);
    ctx.fill();
  }
  
  renderStar(ctx, x, y, size, color, pulse) {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    // 5-pointed star
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const outerRadius = size;
      const innerRadius = size * 0.4;
      
      // Outer point
      const x1 = x + Math.cos(angle) * outerRadius;
      const y1 = y + Math.sin(angle) * outerRadius;
      
      // Inner point
      const angle2 = angle + Math.PI / 5;
      const x2 = x + Math.cos(angle2) * innerRadius;
      const y2 = y + Math.sin(angle2) * innerRadius;
      
      if (i === 0) ctx.moveTo(x1, y1);
      else ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Center dot
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x, y, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  
  renderCircle(ctx, x, y, size, color, pulse) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color + '40';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  /**
   * Check player collision and apply effect
   * Returns list of applied effects this frame
   */
  collect(player, applyEffect) {
    const collected = [];
    const px = player.x, py = player.y;
    for (const p of this.pickups) {
      if (!p.active) continue;
      const dx = p.x - px;
      const dy = p.y - py;
      const dist2 = dx*dx + dy*dy;
      const r = p.radius + 12; // generous pickup radius
      if (dist2 <= r*r) {
        p.active = false;
        collected.push(p.effect);
        if (applyEffect) applyEffect(p.effect);
      }
    }
    return collected;
  }

  clear() {
    this.pickups = [];
  }
}
