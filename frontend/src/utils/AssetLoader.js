/**
 * AssetLoader - Asset loading with LocalStorage caching
 * Loads AI-generated images from backend with caching
 */

import { API_ENDPOINTS } from '../config';

class AssetLoader {
  constructor() {
    this.cache = new Map();
    this.loadingPromises = new Map();
  }

  /**
   * Get cache key for an asset
   */
  getCacheKey(type, prompt) {
    return `asset_${type}_${this.hashString(prompt)}`;
  }

  /**
   * Simple string hash function
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Load image from cache or fetch from backend
   */
  async loadImage(type, prompt, assetId, width = 1024, height = 1024, color = '#00FFD1') {
    const cacheKey = this.getCacheKey(type, prompt);

    // Check memory cache
    if (this.cache.has(cacheKey)) {
      console.log(`📦 Cache hit (memory): ${type}`);
      return this.cache.get(cacheKey);
    }

    // Check if already loading
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    // Check LocalStorage cache
    try {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        console.log(`📦 Cache hit (localStorage): ${type}`);
        const img = await this.createImage(cachedData);
        this.cache.set(cacheKey, img);
        return img;
      }
    } catch (e) {
      console.warn('LocalStorage read failed:', e);
    }

    // Fetch from backend
    const loadPromise = this.fetchImage(type, prompt, width, height, cacheKey, assetId, color);
    this.loadingPromises.set(cacheKey, loadPromise);

    try {
      const img = await loadPromise;
      this.loadingPromises.delete(cacheKey);
      return img;
    } catch (error) {
      this.loadingPromises.delete(cacheKey);
      throw error;
    }
  }

  /**
   * Fetch image from backend
   */
  async fetchImage(type, prompt, width, height, cacheKey, assetId, color = '#00FFD1') {
    console.log(`🎨 Fetching ${type} from backend...`);

    try {
      let response, data, imageData;

      if (type === 'parallax') {
        // Use textures endpoint for parallax
        response = await fetch(API_ENDPOINTS.GENERATE_TEXTURES, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            color: color,
            parallax_layers: [{
              id: assetId,
              prompt: prompt,
              depth: 0.5
            }]
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch ${type}: ${response.statusText}`);
        }

        data = await response.json();
        const layerData = data.parallax?.[0];
        
        if (!layerData || !layerData.image) {
          throw new Error(`No image data returned for ${type}: ${layerData?.error || 'Unknown error'}`);
        }
        
        imageData = layerData.image;

      } else if (type === 'enemy') {
        // Use sprites endpoint for enemies
        response = await fetch(API_ENDPOINTS.GENERATE_SPRITES, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            color: color,
            enemies: [{
              id: assetId,
              sprite_prompt: prompt
            }]
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch ${type}: ${response.statusText}`);
        }

        data = await response.json();
        const enemyData = data.enemy_sprites?.[0];
        
        if (!enemyData || !enemyData.image) {
          throw new Error(`No image data returned for ${type}: ${enemyData?.error || 'Unknown error'}`);
        }
        
        imageData = enemyData.image;

      } else if (type === 'boss') {
        // Use sprites endpoint for bosses
        response = await fetch(API_ENDPOINTS.GENERATE_SPRITES, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            color: color,
            bosses: [{
              id: assetId,
              sprite_prompt: prompt
            }]
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch ${type}: ${response.statusText}`);
        }

        data = await response.json();
        const bossData = data.boss_sprites?.[0];
        
        if (!bossData || !bossData.image) {
          throw new Error(`No image data returned for ${type}: ${bossData?.error || 'Unknown error'}`);
        }
        
        imageData = bossData.image;

      } else if (type === 'player') {
        // Use sprites endpoint for player
        response = await fetch(API_ENDPOINTS.GENERATE_SPRITES, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            color: color,
            player: {
              id: assetId,
              sprite_prompt: prompt
            }
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch ${type}: ${response.statusText}`);
        }

        data = await response.json();
        const playerData = data.player_sprite;
        
        if (!playerData || !playerData.image) {
          throw new Error(`No image data returned for ${type}: ${playerData?.error || 'Unknown error'}`);
        }
        
        imageData = playerData.image;

      } else if (type === 'tui') {
        // Use textures endpoint for TUI frames
        response = await fetch(API_ENDPOINTS.GENERATE_TEXTURES, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            color: color,
            tui_frames: [{
              id: assetId,
              prompt: prompt
            }]
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch ${type}: ${response.statusText}`);
        }

        data = await response.json();
        const tuiData = data.tui_frames?.[0];
        
        if (!tuiData || !tuiData.image) {
          throw new Error(`No image data returned for ${type}: ${tuiData?.error || 'Unknown error'}`);
        }
        
        imageData = tuiData.image;

      } else {
        throw new Error(`Unknown asset type: ${type}`);
      }

      // Create image
      const img = await this.createImage(imageData);

      // Cache in memory
      this.cache.set(cacheKey, img);

      // Cache in LocalStorage (with size limit check)
      try {
        const dataSize = imageData.length;
        if (dataSize < 1024 * 1024) { // Only cache if < 1MB
          localStorage.setItem(cacheKey, imageData);
          console.log(`💾 Cached ${type} in localStorage`);
        } else {
          console.log(`⚠️  ${type} too large for localStorage (${Math.round(dataSize / 1024)}KB)`);
        }
      } catch (e) {
        console.warn('LocalStorage write failed:', e);
      }

      return img;
    } catch (error) {
      console.error(`❌ Failed to load ${type}:`, error);
      throw error;
    }
  }

  /**
   * Create Image object from data URI
   */
  createImage(dataUri) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = dataUri;
    });
  }

  /**
   * Load parallax layer
   */
  async loadParallaxLayer(layerData, color = '#00FFD1') {
    return this.loadImage('parallax', layerData.prompt, layerData.id, 2048, 512, color);
  }

  /**
   * Load enemy sprite
   */
  async loadEnemySprite(enemyData, color = '#00FFD1') {
    const size = enemyData.radius * 4; // 2x radius for sprite size
    return this.loadImage('enemy', enemyData.sprite_prompt, enemyData.id, size, size, color);
  }

  /**
   * Load boss sprite
   */
  async loadBossSprite(bossData, color = '#00FFD1') {
    const size = (bossData.radius || 40) * 4;
    return this.loadImage('boss', bossData.sprite_prompt, bossData.id, size, size, color);
  }

  /**
   * Load player sprite
   */
  async loadPlayerSprite(playerData, color = '#00FFD1') {
    return this.loadImage('player', playerData.sprite_prompt, 'player', 1024, 1024, color);
  }

  /**
   * Load TUI frame
   */
  async loadTUIFrame(tuiData, color = '#00FFD1') {
    const prompt = tuiData.frame_prompt || tuiData.prompt;
    return this.loadImage('tui', prompt, 'tui_frame', 1024, 1024, color);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('asset_')) {
          localStorage.removeItem(key);
        }
      });
      console.log('🗑️  Cache cleared');
    } catch (e) {
      console.warn('Failed to clear localStorage:', e);
    }
  }

  /**
   * Get cache size
   */
  getCacheSize() {
    let size = 0;
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('asset_')) {
          size += localStorage.getItem(key).length;
        }
      });
    } catch (e) {
      console.warn('Failed to get cache size:', e);
    }
    return size;
  }
}

// Singleton instance
export const assetLoader = new AssetLoader();
