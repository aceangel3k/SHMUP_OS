/**
 * MusicToggle - YouTube music player with toggle button
 * Plays background music from YouTube with mute/unmute control
 */

import { useState, useEffect, useRef } from 'react';

export default function MusicToggle({ youtubeUrl = 'https://www.youtube.com/watch?v=lujByXyoUew', autoplay = false }) {
  // Check localStorage for saved preference, default to muted
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('musicMuted');
    return saved !== null ? saved === 'true' : true;
  });
  const playerRef = useRef(null);
  const iframeRef = useRef(null);
  const hasAutoPlayed = useRef(false);

  // Extract video ID from YouTube URL
  const getVideoId = (url) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    return match ? match[1] : null;
  };

  const videoId = getVideoId(youtubeUrl);

  useEffect(() => {
    // Only initialize once - don't reinitialize on re-renders
    if (playerRef.current) return;

    // Load YouTube IFrame API if not already loaded
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    // Create player when API is ready
    const initPlayer = () => {
      if (playerRef.current) return; // Already initialized
      
      playerRef.current = new window.YT.Player('youtube-player', {
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          loop: 1,
          playlist: videoId, // Required for looping
          controls: 0,
          showinfo: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          rel: 0,
        },
        events: {
          onReady: (event) => {
            event.target.mute(); // Start muted
            event.target.playVideo();
          },
          onStateChange: (event) => {
            // Loop video when it ends
            if (event.data === window.YT.PlayerState.ENDED) {
              event.target.playVideo();
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    // Only destroy on actual unmount, not on re-renders
    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run once on mount

  // Autoplay effect when autoplay prop changes
  useEffect(() => {
    if (autoplay && !hasAutoPlayed.current && playerRef.current) {
      const saved = localStorage.getItem('musicMuted');
      // Only autoplay if user hasn't explicitly turned it off
      if (saved !== 'true') {
        playerRef.current.unMute();
        playerRef.current.setVolume(50);
        setIsMuted(false);
        hasAutoPlayed.current = true;
      }
    }
  }, [autoplay]);

  const toggleMute = () => {
    if (playerRef.current) {
      const newMutedState = !isMuted;
      
      if (newMutedState) {
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
        playerRef.current.setVolume(50); // Set to 50% volume
      }
      
      setIsMuted(newMutedState);
      // Save preference to localStorage
      localStorage.setItem('musicMuted', newMutedState.toString());
    }
  };

  return (
    <>
      {/* Hidden YouTube Player */}
      <div style={{ display: 'none' }}>
        <div id="youtube-player" ref={iframeRef}></div>
      </div>

      {/* Music Toggle Button */}
      <button
        onClick={toggleMute}
        className="fixed top-4 right-4 z-50 tui-button"
        style={{
          padding: '8px 16px',
          backgroundColor: isMuted ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 255, 209, 0.2)',
          border: '1px solid #00FFD1',
          color: '#00FFD1',
          cursor: 'pointer',
          fontFamily: 'monospace',
          fontSize: '14px',
        }}
        title={isMuted ? 'Unmute Music' : 'Mute Music'}
      >
        {isMuted ? '🔇 MUSIC OFF' : '🔊 MUSIC ON'}
      </button>
    </>
  );
}
