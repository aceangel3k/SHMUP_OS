/**
 * BootSequence - Initial boot animation with terminal logs and logo
 * Shows before the prompt screen to simulate OS boot
 */

import { useEffect, useState } from 'react';

export default function BootSequence({ onComplete, onLogoShow }) {
  const [bootLines, setBootLines] = useState([]);
  const [showLogo, setShowLogo] = useState(false);
  const [logoOpacity, setLogoOpacity] = useState(0);
  const [logoStrobing, setLogoStrobing] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);

  const bootMessages = [
    'Initializing SHMUP OS Engine v2.0...',
    'Loading kernel modules...',
    '[ OK ] Started System Logging Service',
    '[ OK ] Reached target Network',
    '[ OK ] Started OpenGL Graphics Driver',
    '[ OK ] Started Audio Subsystem',
    '[ OK ] Mounted /dev/sprites',
    '[ OK ] Started Bullet Physics Engine',
    '[ OK ] Started Collision Detection Service',
    '[ OK ] Started Enemy AI Controller',
    '[ OK ] Started Boss Battle Manager',
    '[ OK ] Started Parallax Renderer',
    '[ OK ] Started Input Handler',
    '[ OK ] Started Weapon Systems',
    '[ OK ] Loaded Sound Effects Library',
    '[ OK ] Started Music Player Service',
    '[ OK ] Reached target Multi-User System',
    'Starting LLM Game Generator...',
    '[ OK ] Connected to AI Service',
    'System ready. Loading interface...',
  ];

  useEffect(() => {
    // Type out boot messages
    if (currentLineIndex < bootMessages.length) {
      const timer = setTimeout(() => {
        setBootLines(prev => [...prev, bootMessages[currentLineIndex]]);
        setCurrentLineIndex(prev => prev + 1);
      }, 100); // Fast typing

      return () => clearTimeout(timer);
    } else {
      // Boot complete, show logo
      const logoTimer = setTimeout(() => {
        setShowLogo(true);
      }, 500);

      return () => clearTimeout(logoTimer);
    }
  }, [currentLineIndex]);

  useEffect(() => {
    if (showLogo) {
      // Trigger music autoplay when logo shows
      if (onLogoShow) {
        onLogoShow();
      }
      
      // Start with opacity 0, then fade in after a brief delay
      // This ensures the transition actually happens
      const fadeInTimer = setTimeout(() => {
        setLogoOpacity(1);
      }, 100);

      // Start strobing after fade in completes
      const strobeTimer = setTimeout(() => {
        setLogoStrobing(true);
      }, 1500); // Start strobe after 1.5s (after fade in)

      // Stop strobing and start fade out
      const stopStrobeTimer = setTimeout(() => {
        setLogoStrobing(false);
        setLogoOpacity(0);
      }, 3000); // Strobe for 1.5s

      // Complete boot sequence after fade out
      const completeTimer = setTimeout(() => {
        onComplete();
      }, 4500); // Total: 1.5s fade in + 1.5s strobe + 1.5s fade out

      return () => {
        clearTimeout(fadeInTimer);
        clearTimeout(strobeTimer);
        clearTimeout(stopStrobeTimer);
        clearTimeout(completeTimer);
      };
    }
  }, [showLogo, onComplete, onLogoShow]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        backgroundColor: '#000000',
        fontFamily: 'monospace',
        color: '#00FFD1',
      }}
    >
      {!showLogo ? (
        // Boot log
        <div
          className="w-full max-w-4xl px-8 overflow-hidden"
          style={{
            maxHeight: '80vh',
            overflowY: 'auto',
          }}
        >
          {bootLines.map((line, index) => (
            <div
              key={index}
              style={{
                fontSize: '14px',
                marginBottom: '4px',
                opacity: 0.9,
                animation: 'fadeIn 0.2s ease-in',
              }}
            >
              {line}
            </div>
          ))}
          {currentLineIndex < bootMessages.length && (
            <div
              style={{
                display: 'inline-block',
                width: '8px',
                height: '16px',
                backgroundColor: '#00FFD1',
                animation: 'blink 1s infinite',
                marginLeft: '4px',
              }}
            />
          )}
        </div>
      ) : (
        // Logo screen - exact same as PromptScreen
        <div
          style={{
            opacity: logoOpacity,
            transition: 'opacity 1.5s ease-in-out',
            textAlign: 'center',
          }}
        >
          <pre
            style={{
              fontFamily: 'monospace',
              fontSize: '12px',
              lineHeight: '1.2',
              color: '#00FFD1',
              textShadow: logoStrobing 
                ? '0 0 20px rgba(0, 255, 209, 1), 0 0 40px rgba(0, 255, 209, 0.8)' 
                : '0 0 5px rgba(0, 255, 209, 0.5)',
              margin: '0 auto',
              display: 'inline-block',
              animation: logoStrobing ? 'logoStrobe 0.15s linear infinite' : 'none',
              filter: logoStrobing ? 'brightness(1.5)' : 'none',
            }}
          >
{`
 ███████╗██╗  ██╗███╗   ███╗██╗   ██╗██████╗      ██████╗ ███████╗
 ██╔════╝██║  ██║████╗ ████║██║   ██║██╔══██╗    ██╔═══██╗██╔════╝
 ███████╗███████║██╔████╔██║██║   ██║██████╔╝    ██║   ██║███████╗
 ╚════██║██╔══██║██║╚██╔╝██║██║   ██║██╔═══╝     ██║   ██║╚════██║
 ███████║██║  ██║██║ ╚═╝ ██║╚██████╔╝██║         ╚██████╔╝███████║
 ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝ ╚═╝          ╚═════╝ ╚══════╝
`}
          </pre>
          <p
            style={{
              fontFamily: 'monospace',
              fontSize: '14px',
              color: '#00FFD1',
              opacity: 0.7,
              marginTop: '24px',
            }}
          >
            ▓▒░ AI-Generated Shoot-'em-up ░▒▓
          </p>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 0.9; }
        }
        
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        
        @keyframes logoStrobe {
          0%, 100% {
            filter: brightness(1.8) drop-shadow(0 0 30px rgba(0, 255, 209, 1));
            transform: scale(1.02);
          }
          50% {
            filter: brightness(1.2) drop-shadow(0 0 10px rgba(0, 255, 209, 0.5));
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
