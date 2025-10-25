import { useEffect, useRef, useState } from 'react';

/**
 * Mobile Touch Controls Component for SHMUP
 * Provides virtual joystick for movement and fire button
 */
export default function MobileControls({ 
  onMove, 
  onFire,
  onBomb,
  disabled = false 
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const joystickRef = useRef(null);
  const joystickKnobRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const joystickActiveRef = useRef(false);
  
  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                            window.innerWidth <= 768 ||
                            ('ontouchstart' in window);
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Auto-hide instructions after 5 seconds
  useEffect(() => {
    if (isMobile && !disabled) {
      const timer = setTimeout(() => {
        setShowInstructions(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isMobile, disabled]);
  
  // Virtual joystick logic
  useEffect(() => {
    if (!isMobile || disabled) return;
    
    const joystick = joystickRef.current;
    const knob = joystickKnobRef.current;
    if (!joystick || !knob) return;
    
    const joystickRadius = 60;
    const knobRadius = 25;
    
    const handleTouchStart = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = joystick.getBoundingClientRect();
      touchStartRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
      joystickActiveRef.current = true;
    };
    
    const handleTouchMove = (e) => {
      if (!joystickActiveRef.current) return;
      e.preventDefault();
      
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      
      // Calculate distance and angle
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      
      // Limit knob movement to joystick radius
      const limitedDistance = Math.min(distance, joystickRadius - knobRadius);
      const knobX = Math.cos(angle) * limitedDistance;
      const knobY = Math.sin(angle) * limitedDistance;
      
      // Update knob position
      knob.style.transform = `translate(${knobX}px, ${knobY}px)`;
      
      // Calculate normalized movement vector (-1 to 1)
      const normalizedX = knobX / (joystickRadius - knobRadius);
      const normalizedY = knobY / (joystickRadius - knobRadius);
      
      // Send movement data to parent
      if (onMove) {
        onMove({
          x: normalizedX,
          y: normalizedY,
          magnitude: limitedDistance / (joystickRadius - knobRadius)
        });
      }
    };
    
    const handleTouchEnd = (e) => {
      e.preventDefault();
      joystickActiveRef.current = false;
      
      // Reset knob position
      knob.style.transform = 'translate(0, 0)';
      
      // Stop movement
      if (onMove) {
        onMove({ x: 0, y: 0, magnitude: 0 });
      }
    };
    
    joystick.addEventListener('touchstart', handleTouchStart, { passive: false });
    joystick.addEventListener('touchmove', handleTouchMove, { passive: false });
    joystick.addEventListener('touchend', handleTouchEnd, { passive: false });
    joystick.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    
    return () => {
      joystick.removeEventListener('touchstart', handleTouchStart);
      joystick.removeEventListener('touchmove', handleTouchMove);
      joystick.removeEventListener('touchend', handleTouchEnd);
      joystick.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isMobile, disabled, onMove]);
  
  // Don't render on desktop
  if (!isMobile) return null;
  
  return (
    <div 
      className="absolute inset-0 pointer-events-none" 
      style={{ zIndex: 1000 }}
    >
      {/* Virtual Joystick - Bottom Left */}
      <div 
        ref={joystickRef}
        className="absolute bottom-8 left-8 pointer-events-auto"
        style={{
          width: '120px',
          height: '120px',
          opacity: disabled ? 0.3 : 1,
          touchAction: 'none'
        }}
      >
        {/* Outer circle */}
        <div 
          className="absolute inset-0 rounded-full flex items-center justify-center"
          style={{
            border: '4px solid #00FFD1',
            backgroundColor: 'rgba(6, 8, 10, 0.7)',
            boxShadow: '0 0 15px rgba(0, 255, 209, 0.8), inset 0 0 20px rgba(0, 255, 209, 0.1)'
          }}
        >
          {/* Inner knob */}
          <div 
            ref={joystickKnobRef}
            className="w-12 h-12 rounded-full transition-transform duration-100 ease-out"
            style={{
              backgroundColor: '#00FFD1',
              border: '2px solid #00FFFF',
              boxShadow: '0 0 25px rgba(0, 255, 209, 0.9), 0 2px 8px rgba(0, 0, 0, 0.5)'
            }}
          />
        </div>
      </div>
      
      {/* Action Buttons - Bottom Right */}
      <div className="absolute bottom-8 right-8 flex flex-col gap-4 pointer-events-auto">
        {/* Fire Button */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            if (!disabled && onFire) onFire(true);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            if (!disabled && onFire) onFire(false);
          }}
          disabled={disabled}
          className="w-20 h-20 rounded-full flex items-center justify-center active:scale-95 transition-transform disabled:opacity-30"
          style={{
            backgroundColor: '#FF6B6B',
            border: '4px solid #00FFD1',
            boxShadow: '0 4px 20px rgba(255, 107, 107, 0.8), 0 0 15px rgba(0, 255, 209, 0.6)',
            touchAction: 'none',
            opacity: disabled ? 0.3 : 1
          }}
        >
          <svg 
            className="w-10 h-10"
            fill="#00FFD1" 
            viewBox="0 0 24 24"
            style={{
              filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))'
            }}
          >
            <circle cx="12" cy="12" r="8"/>
            <circle cx="12" cy="12" r="4" fill="#FF6B6B"/>
          </svg>
        </button>
        
        {/* Bomb Button */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            if (!disabled && onBomb) onBomb();
          }}
          disabled={disabled}
          className="w-16 h-16 rounded-full flex items-center justify-center active:scale-95 transition-transform disabled:opacity-30"
          style={{
            backgroundColor: '#FFD700',
            border: '4px solid #00FFD1',
            boxShadow: '0 4px 20px rgba(255, 215, 0, 0.8), 0 0 15px rgba(0, 255, 209, 0.6)',
            touchAction: 'none',
            opacity: disabled ? 0.3 : 1
          }}
        >
          <span 
            className="font-bold text-xl"
            style={{
              color: '#06080A',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
            }}
          >
            💣
          </span>
        </button>
      </div>
      
      {/* Instructions overlay */}
      {showInstructions && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-500">
          <div 
            className="px-6 py-4 rounded-lg text-center max-w-xs"
            style={{
              backgroundColor: 'rgba(6, 8, 10, 0.95)',
              color: '#00FFD1',
              border: '2px solid #00FFD1',
              boxShadow: '0 0 20px rgba(0, 255, 209, 0.5)'
            }}
          >
            <p className="text-sm font-bold mb-2" style={{ fontFamily: 'Courier New, monospace' }}>
              📱 MOBILE CONTROLS
            </p>
            <p className="text-xs" style={{ fontFamily: 'Courier New, monospace', opacity: 0.9 }}>
              <span className="block mb-1">🕹️ Joystick: Move Ship</span>
              <span className="block mb-1">🔴 Red: Fire Weapons</span>
              <span className="block">💣 Gold: Deploy Bomb</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
