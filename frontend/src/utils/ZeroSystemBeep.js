/**
 * Zero System Beep - Gundam Wing inspired startup sound
 * Creates a strobing oscillator beep with pitch bending over 8 seconds
 */

export class ZeroSystemBeep {
  constructor() {
    this.audioContext = null;
    this.activeNodes = [];
  }

  /**
   * Play the Zero System beep sequence - Last 2.4 seconds (from 5.6s to 8s of original)
   */
  play() {
    // Create audio context if it doesn't exist
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const fullDuration = 8; // Original 8 seconds
    const startOffset = 5.6; // Start at 70% (5.6 seconds)
    const playDuration = 2.4; // Play last 2.4 seconds

    // Calculate the frequency at 5.6 seconds into the original progression
    const startFreq = 220; // Original start
    const endFreq = 880; // Original end
    // Exponential interpolation at 70% (5.6/8)
    const ratio = Math.pow(endFreq / startFreq, startOffset / fullDuration);
    const clippedStartFreq = startFreq * ratio; // ~622 Hz

    // Main oscillator - darker, fatter sound (sawtooth wave)
    const mainOsc = ctx.createOscillator();
    mainOsc.type = 'sawtooth'; // Fatter, darker sound
    
    // Start at the 5.6s frequency and bend up to the end
    mainOsc.frequency.setValueAtTime(clippedStartFreq, now);
    mainOsc.frequency.exponentialRampToValueAtTime(endFreq, now + playDuration);

    // LFO (Low Frequency Oscillator) for the strobing effect
    const lfo = ctx.createOscillator();
    lfo.type = 'square';
    
    // Calculate LFO frequency at 5.6 seconds
    const startLFOFreq = 2; // Original start
    const endLFOFreq = 12; // Original end
    const lfoRatio = Math.pow(endLFOFreq / startLFOFreq, startOffset / fullDuration);
    const clippedStartLFO = startLFOFreq * lfoRatio; // ~8.5 Hz (fast strobing)
    
    lfo.frequency.setValueAtTime(clippedStartLFO, now);
    lfo.frequency.exponentialRampToValueAtTime(endLFOFreq, now + playDuration);

    // LFO gain to modulate the main oscillator
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0.5, now); // 50% modulation depth

    // Main gain envelope
    const mainGain = ctx.createGain();
    mainGain.gain.setValueAtTime(0, now);
    mainGain.gain.linearRampToValueAtTime(0.25, now + 0.05); // Quick attack
    mainGain.gain.setValueAtTime(0.25, now + playDuration - 0.5); // Sustain
    mainGain.gain.linearRampToValueAtTime(0, now + playDuration); // Fade out

    // Add some low-pass filter - calculate filter at 5.6s
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const filterStart = 3000;
    const filterEnd = 1200;
    const filterRatio = Math.pow(filterEnd / filterStart, startOffset / fullDuration);
    const clippedFilterStart = filterStart * filterRatio; // ~1600 Hz
    
    filter.frequency.setValueAtTime(clippedFilterStart, now);
    filter.frequency.exponentialRampToValueAtTime(filterEnd, now + playDuration);
    filter.Q.setValueAtTime(3, now); // Higher resonance for brightness

    // Connect LFO to modulate main gain
    lfo.connect(lfoGain);
    lfoGain.connect(mainGain.gain);

    // Connect main signal chain
    mainOsc.connect(filter);
    filter.connect(mainGain);
    mainGain.connect(ctx.destination);

    // Start everything
    mainOsc.start(now);
    lfo.start(now);

    // Stop everything after playDuration
    mainOsc.stop(now + playDuration);
    lfo.stop(now + playDuration);

    // Store for cleanup
    this.activeNodes.push(mainOsc, lfo, mainGain, lfoGain, filter);

    // Clean up after playDuration
    setTimeout(() => {
      this.activeNodes = [];
    }, playDuration * 1000 + 100);
  }

  /**
   * Stop all sounds (cleanup)
   */
  stop() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Create singleton instance
export const zeroSystemBeep = new ZeroSystemBeep();
