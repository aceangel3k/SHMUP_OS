/**
 * Renderer - Canvas setup and main game loop
 * Handles canvas initialization, scaling, and frame timing
 */

import { GAME_CONFIG } from '../config';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Game dimensions (logical units)
    this.width = GAME_CONFIG.RENDER_WIDTH;
    this.height = GAME_CONFIG.RENDER_HEIGHT;
    
    // Set canvas size
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    
    // Frame timing
    this.targetFPS = GAME_CONFIG.TARGET_FPS;
    this.frameTime = 1000 / this.targetFPS;
    this.lastFrameTime = 0;
    this.deltaTime = 0;
    
    // FPS counter
    this.fps = 0;
    this.frameCount = 0;
    this.fpsUpdateTime = 0;
    
    // Animation frame ID
    this.animationId = null;
    
    // Game state
    this.isRunning = false;
    
    // Screen shake
    this.shakeIntensity = 0;
    this.shakeDecay = 5; // How fast shake decays per second
    
    // Screen flash
    this.flashIntensity = 0;
    this.flashColor = '#FFFFFF';
    this.flashDecay = 0.05; // How fast flash fades per frame
  }
  
  /**
   * Start the game loop
   */
  start(updateCallback, renderCallback) {
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.fpsUpdateTime = this.lastFrameTime;
    
    const loop = (currentTime) => {
      if (!this.isRunning) return;
      
      // Calculate delta time
      this.deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
      this.lastFrameTime = currentTime;
      
      // Update FPS counter
      this.frameCount++;
      if (currentTime - this.fpsUpdateTime >= 1000) {
        this.fps = this.frameCount;
        this.frameCount = 0;
        this.fpsUpdateTime = currentTime;
      }
      
      // Update screen shake
      if (this.shakeIntensity > 0) {
        this.shakeIntensity -= this.shakeDecay * this.deltaTime;
        if (this.shakeIntensity < 0) this.shakeIntensity = 0;
      }
      
      // Update game logic
      if (updateCallback) {
        updateCallback(this.deltaTime);
      }
      
      // Clear canvas
      this.clear();
      
      // Render game
      if (renderCallback) {
        renderCallback(this.ctx);
      }
      
      // Render FPS counter (dev mode)
      this.renderFPS();
      
      // Next frame
      this.animationId = requestAnimationFrame(loop);
    };
    
    this.animationId = requestAnimationFrame(loop);
  }
  
  /**
   * Stop the game loop
   */
  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  
  /**
   * Clear the canvas
   */
  clear() {
    // Apply screen shake offset
    if (this.shakeIntensity > 0) {
      const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      const shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      this.ctx.save();
      this.ctx.translate(shakeX, shakeY);
    }
    
    this.ctx.fillStyle = '#06080A';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Reset shake transform after clearing
    if (this.shakeIntensity > 0) {
      this.ctx.restore();
    }
  }
  
  /**
   * Apply screen shake transform for rendering
   */
  applyShake() {
    if (this.shakeIntensity > 0) {
      const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      const shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      this.ctx.save();
      this.ctx.translate(shakeX, shakeY);
      return true;
    }
    return false;
  }
  
  /**
   * Reset shake transform
   */
  resetShake() {
    this.ctx.restore();
  }
  
  /**
   * Trigger screen shake
   */
  shake(intensity = 10) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }
  
  /**
   * Trigger screen flash
   * @param {number} intensity - Flash intensity (0-1)
   * @param {string} color - Flash color (hex)
   */
  flash(intensity = 0.5, color = '#FFFFFF') {
    this.flashIntensity = Math.max(this.flashIntensity, intensity);
    this.flashColor = color;
  }
  
  /**
   * Render screen flash overlay
   */
  renderFlash() {
    if (this.flashIntensity > 0) {
      this.ctx.save();
      this.ctx.globalAlpha = this.flashIntensity;
      this.ctx.fillStyle = this.flashColor;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.restore();
      
      // Decay flash
      this.flashIntensity -= this.flashDecay;
      if (this.flashIntensity < 0) {
        this.flashIntensity = 0;
      }
    }
  }
  
  /**
   * Render FPS counter (top-right corner)
   */
  renderFPS() {
    this.ctx.save();
    
    // Enable crisp text rendering
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.textBaseline = 'top';
    
    // Draw background for better readability
    //this.ctx.fillStyle = 'rgba(6, 8, 10, 0.8)';
    //this.ctx.fillRect(this.width - 90, 10, 80, 25);
    
    // Draw text with shadow for sharpness
    this.ctx.shadowColor = 'rgba(0, 255, 209, 0.8)';
    this.ctx.shadowBlur = 3;
    this.ctx.fillStyle = '#00FFD1';
    this.ctx.font = 'bold 16px "Courier New", monospace';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`FPS: ${this.fps}`, this.width - 15, 15);
    
    this.ctx.restore();
  }
  
  /**
   * Get delta time in seconds
   */
  getDeltaTime() {
    return this.deltaTime;
  }
  
  /**
   * Get current FPS
   */
  getFPS() {
    return this.fps;
  }
}
