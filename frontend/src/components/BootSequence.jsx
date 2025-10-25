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
  const [showContinuePrompt, setShowContinuePrompt] = useState(false);

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
      // Don't trigger music yet - wait for user interaction
      console.log('Logo showing');
      
      // Start with opacity 0, then fade in after a brief delay
      const fadeInTimer = setTimeout(() => {
        setLogoOpacity(1);
      }, 100);

      // Show continue prompt after fade in completes
      const promptTimer = setTimeout(() => {
        setShowContinuePrompt(true);
      }, 1600); // Show prompt after fade in

      return () => {
        clearTimeout(fadeInTimer);
        clearTimeout(promptTimer);
      };
    }
  }, [showLogo, onLogoShow]);

  // Handle user interaction to continue
  useEffect(() => {
    if (!showContinuePrompt) return;

    const handleInteraction = () => {
      // Remove event listeners immediately to prevent multiple triggers
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('click', handleClick);
      
      // Trigger music autoplay on user interaction
      console.log('User interaction detected, triggering music autoplay');
      if (onLogoShow) {
        onLogoShow();
      }
      
      // Start strobe effect (keep continue prompt visible)
      setLogoStrobing(true);
      
      // Stop strobe and fade out after 1.5s
      setTimeout(() => {
        setLogoStrobing(false);
        setLogoOpacity(0);
        
        // Complete after fade out
        setTimeout(() => {
          onComplete();
        }, 1500);
      }, 1500);
    };

    const handleKeyPress = (e) => {
      handleInteraction();
    };

    const handleClick = () => {
      handleInteraction();
    };

    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('click', handleClick);
    };
  }, [showContinuePrompt, onComplete]);

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
          {showContinuePrompt && (
            <p
              style={{
                fontFamily: 'monospace',
                fontSize: '16px',
                color: '#00FFD1',
                marginTop: '48px',
                animation: 'blink 1.5s infinite',
              }}
            >
              Press any key or click to continue...
            </p>
          )}
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
