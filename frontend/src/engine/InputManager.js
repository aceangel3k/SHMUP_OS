/**
 * InputManager - Keyboard input handling
 * Maps keyboard events to game actions
 */

export class InputManager {
  constructor() {
    this.keys = {};
    this.actions = {
      up: false,
      down: false,
      left: false,
      right: false,
      fire: false,
      bomb: false,
      slow: false,
      pause: false,
    };
    
    // Key mappings
    this.keyMap = {
      // Movement
      'ArrowUp': 'up',
      'KeyW': 'up',
      'ArrowDown': 'down',
      'KeyS': 'down',
      'ArrowLeft': 'left',
      'KeyA': 'left',
      'ArrowRight': 'right',
      'KeyD': 'right',
      
      // Actions
      'Space': 'fire',
      'KeyX': 'bomb',
      'ShiftLeft': 'slow',
      'ShiftRight': 'slow',
      'Escape': 'pause',
    };
    
    // Bind event handlers
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }
  
  /**
   * Start listening for input
   */
  start() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }
  
  /**
   * Stop listening for input
   */
  stop() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
  
  /**
   * Handle keydown event
   */
  handleKeyDown(event) {
    const action = this.keyMap[event.code];
    
    if (action) {
      event.preventDefault();
      
      // Don't repeat fire/bomb/pause actions
      if (['fire', 'bomb', 'pause'].includes(action)) {
        if (!this.keys[event.code]) {
          this.actions[action] = true;
          this.keys[event.code] = true;
        }
      } else {
        this.actions[action] = true;
        this.keys[event.code] = true;
      }
    }
  }
  
  /**
   * Handle keyup event
   */
  handleKeyUp(event) {
    const action = this.keyMap[event.code];
    
    if (action) {
      event.preventDefault();
      this.actions[action] = false;
      this.keys[event.code] = false;
    }
  }
  
  /**
   * Get action state
   */
  isActionActive(action) {
    return this.actions[action] || false;
  }
  
  /**
   * Get all actions
   */
  getActions() {
    return { ...this.actions };
  }
  
  /**
   * Reset action (for one-time actions like bomb/pause)
   */
  resetAction(action) {
    this.actions[action] = false;
  }
  
  /**
   * Reset all actions
   */
  resetAll() {
    Object.keys(this.actions).forEach(action => {
      this.actions[action] = false;
    });
    this.keys = {};
  }
  
  /**
   * Set mobile movement (from virtual joystick)
   */
  setMobileMovement(x, y) {
    // Convert joystick input to directional actions
    const threshold = 0.3; // Dead zone
    
    this.actions.left = x < -threshold;
    this.actions.right = x > threshold;
    this.actions.up = y < -threshold;
    this.actions.down = y > threshold;
  }
  
  /**
   * Set mobile fire state
   */
  setMobileFire(firing) {
    this.actions.fire = firing;
  }
  
  /**
   * Trigger mobile bomb
   */
  triggerMobileBomb() {
    this.actions.bomb = true;
  }
}
