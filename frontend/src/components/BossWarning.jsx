/**
 * BossWarning - Terminal-style boss warning banner
 * Displays when boss spawns
 */

import { useState, useEffect } from 'react';

export default function BossWarning({ bossName, onComplete }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) onComplete();
    }, 3000); // Show for 3 seconds

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      style={{ backgroundColor: 'rgba(255, 0, 209, 0.1)' }}
    >
      <div 
        className="border-4 p-8 animate-pulse-slow"
        style={{
          borderColor: '#FF00D1',
          backgroundColor: 'rgba(6, 8, 10, 0.9)',
          boxShadow: '0 0 40px rgba(255, 0, 209, 0.5), inset 0 0 40px rgba(255, 0, 209, 0.2)',
        }}
      >
        <div className="font-mono text-center">
          <div 
            className="text-6xl font-bold mb-4 animate-glitch"
            style={{ color: '#FF00D1', textShadow: '0 0 20px rgba(255, 0, 209, 0.8)' }}
          >
            ⚠ WARNING ⚠
          </div>
          <div 
            className="text-3xl mb-2"
            style={{ color: '#00FFD1' }}
          >
            BOSS ENTITY DETECTED
          </div>
          <div 
            className="text-2xl font-bold"
            style={{ color: '#FFFFFF' }}
          >
            {bossName}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.02); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
        @keyframes glitch {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(2px, -2px); }
          60% { transform: translate(-2px, -2px); }
          80% { transform: translate(2px, 2px); }
        }
        .animate-glitch {
          animation: glitch 0.3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
