/**
 * Parallax - Scrolling background layers with depth
 * Handles multiple parallax layers with different scroll speeds
 */

export class Parallax {
  constructor(gameData) {
    this.layers = [];
    this.scrollSpeed = gameData?.stages?.[0]?.scroll_speed || 1.0;
    
    // Initialize layers from game data
    if (gameData?.stages?.[0]?.parallax && gameData.stages[0].parallax.length > 0) {
      gameData.stages[0].parallax.forEach((layerData, index) => {
        this.layers.push({
          depth: layerData.depth || (index + 1),
          prompt: layerData.prompt || '',
          color: layerData.color || '#00FFD1',
          x: 0,
          image: null,
          loaded: false,
        });
      });
    }
    
    // Ensure we have at least 3 layers for good parallax effect
    const defaultColors = ['#003030', '#005050', '#007070', '#009090'];
    while (this.layers.length < 3) {
      const depth = this.layers.length + 1;
      this.layers.push({
        depth: depth,
        prompt: `Background layer ${depth}`,
        color: defaultColors[depth - 1] || '#00FFD1',
        x: 0,
        image: null,
        loaded: false,
      });
    }
    
    console.log(`🎨 Parallax initialized with ${this.layers.length} layers`);
  }
  
  /**
   * Update parallax scroll positions
   */
  update(deltaTime) {
    this.layers.forEach(layer => {
      // Scroll based on depth (deeper = slower)
      const speed = this.scrollSpeed * (1 / layer.depth) * 100;
      layer.x -= speed * deltaTime;
      
      // Wrap around (assuming 2048px wide layers)
      if (layer.x <= -2048) {
        layer.x += 2048;
      }
    });
  }
  
  /**
   * Render parallax layers
   */
  render(ctx, width, height) {
    // Render all layers that have loaded images (back to front)
    // Lower index = background (slower), higher index = foreground (faster)
    this.layers.forEach((layer, index) => {
      if (layer.image && layer.loaded) {
        // Render tiled image
        this.renderTiledImage(ctx, layer, width, height, index);
      }
    });
  }
  
  /**
   * Render tiled image for seamless scrolling
   */
  renderTiledImage(ctx, layer, width, height, layerIndex) {
    const imgWidth = layer.image.width;
    const imgHeight = layer.image.height;
    
    // Calculate how many tiles we need for seamless coverage
    const x1 = Math.floor(layer.x) % imgWidth;
    const tilesNeeded = Math.ceil(width / imgWidth) + 1;
    
    ctx.save();
    
    // Apply simple opacity for foreground layers (not the background)
    // Layer 0 = background (100% opacity, fully visible)
    // Layer 1 = middle layer (70% opacity)
    // Layer 2 = foreground (50% opacity)
    // This creates a natural depth effect
    if (layerIndex === 1) {
      ctx.globalAlpha = 0.7;  // 70% opacity
    } else if (layerIndex === 2) {
      ctx.globalAlpha = 0.5;  // 50% opacity
    }
    
    // Draw multiple tiles for seamless scrolling
    for (let i = 0; i < tilesNeeded; i++) {
      const xPos = x1 + (i * imgWidth);
      ctx.drawImage(layer.image, xPos, 0, imgWidth, height);
    }
    
    ctx.restore();
  }
  
  /**
   * Render placeholder gradient (no image loaded)
   */
  renderPlaceholder(ctx, layer, width, height) {
    ctx.save();
    
    // Create repeating pattern for visibility
    const patternWidth = 200;
    const offset = layer.x % patternWidth;
    
    // Draw repeating vertical bars
    ctx.fillStyle = layer.color;
    ctx.globalAlpha = 0.15 + (layer.depth * 0.1);
    
    for (let x = offset - patternWidth; x < width; x += patternWidth) {
      ctx.fillRect(x, 0, patternWidth / 2, height);
    }
    
    // Draw grid lines for depth
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = layer.color;
    ctx.lineWidth = 1;
    
    const gridSpacing = 100;
    for (let x = offset - gridSpacing; x < width; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Draw depth indicator
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#00FFD1';
    ctx.font = '20px "Courier New"';
    ctx.textAlign = 'left';
    ctx.fillText(`PARALLAX LAYER ${layer.depth}`, 10, 100 + (layer.depth * 30));
    
    ctx.restore();
  }
  
  /**
   * Load image for a layer
   */
  loadLayerImage(layerIndex, imageDataUri) {
    if (layerIndex < 0 || layerIndex >= this.layers.length) {
      console.warn(`Cannot load layer ${layerIndex}, only have ${this.layers.length} layers`);
      return;
    }
    
    const layer = this.layers[layerIndex];
    const img = new Image();
    
    img.onload = () => {
      layer.image = img;
      layer.loaded = true;
      console.log(`✅ Parallax layer ${layerIndex} loaded (depth: ${layer.depth})`);
    };
    
    img.onerror = () => {
      console.error(`❌ Failed to load parallax layer ${layerIndex}`);
      layer.loaded = false;
    };
    
    img.src = imageDataUri;
  }
  
  /**
   * Get layer count
   */
  getLayerCount() {
    return this.layers.length;
  }
  
  /**
   * Reset scroll positions
   */
  reset() {
    this.layers.forEach(layer => {
      layer.x = 0;
    });
  }
}
