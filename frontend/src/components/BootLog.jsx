/**
 * BootLog - Terminal-style boot sequence animation
 * Displays at stage start with typewriter effect
 */

import { useState, useEffect } from 'react';

export default function BootLog({ messages, onComplete }) {
  const [visibleMessages, setVisibleMessages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (currentIndex >= messages.length) {
      setIsComplete(true);
      if (onComplete) {
        setTimeout(onComplete, 1000); // Wait 1s before calling onComplete
      }
      return;
    }

    const timer = setTimeout(() => {
      setVisibleMessages(prev => [...prev, messages[currentIndex]]);
      setCurrentIndex(prev => prev + 1);
    }, 150); // 150ms between messages

    return () => clearTimeout(timer);
  }, [currentIndex, messages, onComplete]);

  if (isComplete && visibleMessages.length === 0) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(6, 8, 10, 0.95)' }}
    >
      <div className="w-full max-w-3xl p-8 font-mono text-sm" style={{ color: '#00FFD1' }}>
        {visibleMessages.map((msg, index) => (
          <div 
            key={index}
            className="mb-1 opacity-0 animate-fade-in"
            style={{
              animationDelay: `${index * 50}ms`,
              animationFillMode: 'forwards',
            }}
          >
            <span style={{ color: '#00FFD1' }}>{'>'}</span> {msg}
          </div>
        ))}
        
        {!isComplete && (
          <div className="mt-2 animate-pulse">
            <span style={{ color: '#00FFD1' }}>{'>'}</span> _
          </div>
        )}
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
