/**
 * Frontend Configuration
 * API endpoints and game settings
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5006';

export const API_ENDPOINTS = {
  GENERATE_GAME: `${API_BASE_URL}/api/generate-game`,
  GENERATE_TEXTURES: `${API_BASE_URL}/api/generate-textures`,
  GENERATE_SPRITES: `${API_BASE_URL}/api/generate-sprites`,
  SAVE_GAME: `${API_BASE_URL}/api/save-game`,
  LOAD_GAME: `${API_BASE_URL}/api/load-game`,
  GET_NEXT_STAGE: `${API_BASE_URL}/api/get-next-stage`,
  PATCH_STORY: `${API_BASE_URL}/api/patch-story`,
};

export const GAME_CONFIG = {
  RENDER_WIDTH: 1280,
  RENDER_HEIGHT: 720,
  TARGET_FPS: 60,
  PLAYER_SPEED: 300,
  PLAYER_SLOW_SPEED: 150,
};

export const GAME_STATES = {
  PROMPT: 'prompt',
  LOADING: 'loading',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'game_over',
  COMPLETE: 'complete',
};
