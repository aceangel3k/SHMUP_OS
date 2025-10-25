/**
 * TUISkin - Terminal UI visual effects overlay
 * Renders bezel, scanlines, CRT glow, and borders
 */

import { useState, useEffect } from 'react';

export default function TUISkin({ children, config = {} }) {
  const {
    showScanlines = true,
    showCRTGlow = true,
    showBezel = true,
    showVignette = true,
  } = config;

  return (
    <div className="relative">
      {/* Main content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Scanlines overlay */}
      {showScanlines && (
        <div 
          className="pointer-events-none absolute inset-0 z-20"
          style={{
            background: 'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.15) 0px, transparent 1px, transparent 2px, rgba(0, 0, 0, 0.15) 3px)',
            opacity: 0.3,
          }}
        />
      )}

      {/* CRT glow effect */}
      {showCRTGlow && (
        <div 
          className="pointer-events-none absolute inset-0 z-20"
          style={{
            boxShadow: 'inset 0 0 100px rgba(0, 255, 209, 0.1), inset 0 0 50px rgba(0, 255, 209, 0.05)',
          }}
        />
      )}

      {/* Vignette */}
      {showVignette && (
        <div 
          className="pointer-events-none absolute inset-0 z-20"
          style={{
            background: 'radial-gradient(circle at center, transparent 0%, transparent 60%, rgba(0, 0, 0, 0.3) 100%)',
          }}
        />
      )}

      {/* Bezel frame */}
      {showBezel && (
        <div 
          className="pointer-events-none absolute inset-0 z-30"
          style={{
            border: '8px solid #1a1a1a',
            boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.8)',
          }}
        />
      )}
    </div>
  );
}
