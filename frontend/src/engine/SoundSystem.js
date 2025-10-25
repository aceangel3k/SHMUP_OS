/**
 * SoundSystem - Procedural sound effects using Web Audio API
 * Generates retro sci-fi sounds for shooting, explosions, and impacts
 */

export class SoundSystem {
  constructor() {
    // Create audio context
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.masterVolume = 0.3; // Master volume (0.0 to 1.0)
  }

  /**
   * Player laser shot - fat, dark bass cannon
   */
  playPlayerShoot() {
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    
    // Main bass oscillator
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    
    // Sub-bass layer
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    
    // Mid layer for punch
    const mid = ctx.createOscillator();
    const midGain = ctx.createGain();
    
    // Bass: deep sweep
    bass.frequency.setValueAtTime(180, now);
    bass.frequency.exponentialRampToValueAtTime(60, now + 0.15);
    bass.type = 'sawtooth';
    
    // Sub-bass: ultra low
    sub.frequency.setValueAtTime(90, now);
    sub.frequency.exponentialRampToValueAtTime(30, now + 0.15);
    sub.type = 'sine';
    
    // Mid: adds definition
    mid.frequency.setValueAtTime(360, now);
    mid.frequency.exponentialRampToValueAtTime(120, now + 0.15);
    mid.type = 'square';
    
    // Mix levels
    bassGain.gain.setValueAtTime(this.masterVolume * 0.5, now);
    bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    subGain.gain.setValueAtTime(this.masterVolume * 0.6, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    midGain.gain.setValueAtTime(this.masterVolume * 0.2, now);
    midGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    bass.connect(bassGain);
    bassGain.connect(ctx.destination);
    
    sub.connect(subGain);
    subGain.connect(ctx.destination);
    
    mid.connect(midGain);
    midGain.connect(ctx.destination);
    
    bass.start(now);
    sub.start(now);
    mid.start(now);
    
    bass.stop(now + 0.15);
    sub.stop(now + 0.15);
    mid.stop(now + 0.15);
  }

  /**
   * Enemy laser shot - deeper, menacing sound
   */
  playEnemyShoot() {
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // Lower frequency sweep
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);
    
    gain.gain.setValueAtTime(this.masterVolume * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    osc.type = 'sawtooth';
    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Enemy explosion - massive dark boom
   */
  playExplosion() {
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    
    // Noise generator for explosion
    const bufferSize = ctx.sampleRate * 0.7;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(400, now); // Lower cutoff for darker sound
    noiseFilter.frequency.exponentialRampToValueAtTime(50, now + 0.7);
    noiseFilter.Q.value = 2; // Resonance for more character
    
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(this.masterVolume * 0.7, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    
    // Deep bass thump
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    
    bass.frequency.setValueAtTime(80, now);
    bass.frequency.exponentialRampToValueAtTime(25, now + 0.5);
    
    bassGain.gain.setValueAtTime(this.masterVolume * 0.9, now);
    bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    
    bass.connect(bassGain);
    bassGain.connect(ctx.destination);
    
    bass.type = 'sine';
    
    // Sub-bass rumble
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    
    sub.frequency.setValueAtTime(40, now);
    sub.frequency.exponentialRampToValueAtTime(20, now + 0.6);
    
    subGain.gain.setValueAtTime(this.masterVolume * 0.8, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    
    sub.connect(subGain);
    subGain.connect(ctx.destination);
    
    sub.type = 'sine';
    
    noise.start(now);
    bass.start(now);
    sub.start(now);
    noise.stop(now + 0.7);
    bass.stop(now + 0.5);
    sub.stop(now + 0.6);
  }

  /**
   * Bomb activation - massive dark energy wave
   */
  playBomb() {
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    
    // Deep bass charge
    const bass1 = ctx.createOscillator();
    const bass2 = ctx.createOscillator();
    const bassGain = ctx.createGain();
    
    // Sub-bass rumble
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    
    // Mid layer for definition
    const mid = ctx.createOscillator();
    const midGain = ctx.createGain();
    
    // Bass: rising dark energy
    bass1.frequency.setValueAtTime(60, now);
    bass1.frequency.exponentialRampToValueAtTime(400, now + 0.4);
    bass1.type = 'sawtooth';
    
    bass2.frequency.setValueAtTime(63, now); // Slight detune for fatness
    bass2.frequency.exponentialRampToValueAtTime(403, now + 0.4);
    bass2.type = 'sawtooth';
    
    // Sub: ultra low rumble
    sub.frequency.setValueAtTime(30, now);
    sub.frequency.exponentialRampToValueAtTime(200, now + 0.4);
    sub.type = 'sine';
    
    // Mid: adds punch
    mid.frequency.setValueAtTime(120, now);
    mid.frequency.exponentialRampToValueAtTime(800, now + 0.4);
    mid.type = 'square';
    
    bassGain.gain.setValueAtTime(this.masterVolume * 0.6, now);
    bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    
    subGain.gain.setValueAtTime(this.masterVolume * 0.7, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    
    midGain.gain.setValueAtTime(this.masterVolume * 0.3, now);
    midGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    
    bass1.connect(bassGain);
    bass2.connect(bassGain);
    bassGain.connect(ctx.destination);
    
    sub.connect(subGain);
    subGain.connect(ctx.destination);
    
    mid.connect(midGain);
    midGain.connect(ctx.destination);
    
    bass1.start(now);
    bass2.start(now);
    sub.start(now);
    mid.start(now);
    
    bass1.stop(now + 0.4);
    bass2.stop(now + 0.4);
    sub.stop(now + 0.4);
    mid.stop(now + 0.4);
  }

  /**
   * Player hit - heavy dark impact
   */
  playPlayerHit() {
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    
    // Deep impact bass
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    
    // Sub-bass thud
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    
    // Mid crunch
    const mid = ctx.createOscillator();
    const midGain = ctx.createGain();
    
    bass.frequency.setValueAtTime(120, now);
    bass.frequency.exponentialRampToValueAtTime(35, now + 0.25);
    bass.type = 'sawtooth';
    
    sub.frequency.setValueAtTime(60, now);
    sub.frequency.exponentialRampToValueAtTime(20, now + 0.3);
    sub.type = 'sine';
    
    mid.frequency.setValueAtTime(240, now);
    mid.frequency.exponentialRampToValueAtTime(70, now + 0.2);
    mid.type = 'square';
    
    bassGain.gain.setValueAtTime(this.masterVolume * 0.7, now);
    bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    
    subGain.gain.setValueAtTime(this.masterVolume * 0.8, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    
    midGain.gain.setValueAtTime(this.masterVolume * 0.4, now);
    midGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    
    bass.connect(bassGain);
    bassGain.connect(ctx.destination);
    
    sub.connect(subGain);
    subGain.connect(ctx.destination);
    
    mid.connect(midGain);
    midGain.connect(ctx.destination);
    
    bass.start(now);
    sub.start(now);
    mid.start(now);
    
    bass.stop(now + 0.25);
    sub.stop(now + 0.3);
    mid.stop(now + 0.2);
  }

  /**
   * Boss warning - ominous dark alarm
   */
  playBossWarning() {
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    
    // Deep alarm oscillation
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    
    // Sub-bass rumble
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    
    bass.connect(bassGain);
    bassGain.connect(ctx.destination);
    
    sub.connect(subGain);
    subGain.connect(ctx.destination);
    
    // Oscillating dark alarm
    bass.frequency.setValueAtTime(150, now);
    bass.frequency.setValueAtTime(100, now + 0.15);
    bass.frequency.setValueAtTime(150, now + 0.3);
    bass.frequency.setValueAtTime(100, now + 0.45);
    bass.type = 'sawtooth';
    
    // Sub rumble
    sub.frequency.setValueAtTime(50, now);
    sub.frequency.setValueAtTime(35, now + 0.15);
    sub.frequency.setValueAtTime(50, now + 0.3);
    sub.frequency.setValueAtTime(35, now + 0.45);
    sub.type = 'sine';
    
    bassGain.gain.setValueAtTime(this.masterVolume * 0.6, now);
    bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    
    subGain.gain.setValueAtTime(this.masterVolume * 0.7, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    
    bass.start(now);
    sub.start(now);
    bass.stop(now + 0.6);
    sub.stop(now + 0.6);
  }

  /**
   * Power up - positive feedback
   */
  playPowerUp() {
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // Rising arpeggio
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.setValueAtTime(500, now + 0.05);
    osc.frequency.setValueAtTime(600, now + 0.1);
    osc.frequency.setValueAtTime(800, now + 0.15);
    
    gain.gain.setValueAtTime(this.masterVolume * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    
    osc.type = 'square';
    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * Set master volume (0.0 to 1.0)
   */
  setVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Resume audio context (needed for browser autoplay policies)
   */
  resume() {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}
