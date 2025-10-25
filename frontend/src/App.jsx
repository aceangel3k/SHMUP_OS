import { useState } from 'react';
import BootSequence from './components/BootSequence';
import PromptScreen from './components/PromptScreen';
import LoadingScreen from './components/LoadingScreen';
import GameView from './components/GameView';
import MusicToggle from './components/MusicToggle';
import { API_ENDPOINTS, GAME_STATES } from './config';

function App() {
  const [showBootSequence, setShowBootSequence] = useState(true);
  const [promptFadeIn, setPromptFadeIn] = useState(false);
  const [shouldAutoplayMusic, setShouldAutoplayMusic] = useState(false);
  const [gameState, setGameState] = useState(GAME_STATES.PROMPT);
  const [gameData, setGameData] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [difficulty, setDifficulty] = useState('normal');
  const [currentPrompt, setCurrentPrompt] = useState('');

  const handlePromptSubmit = async (userPrompt, selectedDifficulty) => {
    setCurrentPrompt(userPrompt); // Store the prompt
    setDifficulty(selectedDifficulty);
    setGameState(GAME_STATES.LOADING);
    setLoadingProgress(0);
    setLoadingStage('Generating game data...');

    try {
      // Step 1: Generate game data (0-50%)
      setLoadingMessage('Calling Cerebras LLM...');
      const gameResponse = await fetch(API_ENDPOINTS.GENERATE_GAME, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_prompt: userPrompt, difficulty: selectedDifficulty }),
      });

      if (!gameResponse.ok) {
        throw new Error(`Game generation failed: ${gameResponse.statusText}`);
      }

      const gameResult = await gameResponse.json();
      
      if (!gameResult.success) {
        throw new Error('Game generation returned unsuccessful');
      }

      setGameData(gameResult.game_data);
      setLoadingProgress(50);
      setLoadingStage('Game data generated');
      setLoadingMessage(`OS: ${gameResult.game_data.story.os_name}`);

      // Step 2: Generate textures (50-75%)
      setLoadingStage('Generating textures...');
      setLoadingMessage('Creating parallax layers and UI frames...');
      
      // For MVP, we'll skip texture generation and go straight to game
      // In production, you would call:
      // await fetch(API_ENDPOINTS.GENERATE_TEXTURES, { ... })
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
      setLoadingProgress(75);

      // Step 3: Load assets (75-100%)
      setLoadingStage('Loading assets...');
      setLoadingMessage('Fetching sprites and textures...');
      setAssetsLoaded(false);
      
      // Store callbacks for GameView to update progress
      window.updateAssetProgress = (progress, message) => {
        setLoadingProgress(75 + (progress * 0.25)); // 75-100%
        if (message) setLoadingMessage(message);
      };
      
      window.assetsLoadComplete = () => {
        setLoadingProgress(100);
        setLoadingStage('Complete');
        setLoadingMessage('System ready');
        // Wait for loading screen to show completion, then transition
        setTimeout(() => {
          setAssetsLoaded(true);
        }, 1000);
      };
      
      // Start loading assets (GameView will mount and load them)
      setGameState(GAME_STATES.PLAYING);

    } catch (error) {
      console.error('Error during game generation:', error);
      alert(`Failed to generate game: ${error.message}`);
      setGameState(GAME_STATES.PROMPT);
    }
  };

  const handleRestart = () => {
    // Reset to prompt screen without reloading page (preserves music)
    setGameState(GAME_STATES.PROMPT);
    setGameData(null);
    setAssetsLoaded(false);
    setLoadingProgress(0);
    setPromptFadeIn(true); // Skip boot sequence on restart
  };

  const handleBootComplete = () => {
    setShowBootSequence(false);
    // Trigger fade-in animation
    setTimeout(() => {
      setPromptFadeIn(true);
    }, 100);
  };

  const handleLogoShow = () => {
    // Trigger music autoplay when logo appears
    setShouldAutoplayMusic(true);
  };

  return (
    <div className="App">
      {/* Music Toggle - Always visible */}
      <MusicToggle 
        youtubeUrl="https://www.youtube.com/watch?v=lujByXyoUew" 
        autoplay={shouldAutoplayMusic}
      />
      
      {/* Boot Sequence */}
      {showBootSequence && (
        <BootSequence 
          onComplete={handleBootComplete}
          onLogoShow={handleLogoShow}
        />
      )}
      
      {/* Prompt Screen with fade-in */}
      {!showBootSequence && gameState === GAME_STATES.PROMPT && (
        <div
          style={{
            opacity: promptFadeIn ? 1 : 0,
            transition: 'opacity 1.5s ease-in-out',
          }}
        >
          <PromptScreen 
            onSubmit={handlePromptSubmit} 
            initialPrompt={currentPrompt}
            initialDifficulty={difficulty}
          />
        </div>
      )}
      
      {!showBootSequence && (gameState === GAME_STATES.LOADING || (gameState === GAME_STATES.PLAYING && !assetsLoaded)) && (
        <LoadingScreen
          progress={loadingProgress}
          stage={loadingStage}
          message={loadingMessage}
        />
      )}
      
      {!showBootSequence && gameState === GAME_STATES.PLAYING && gameData && (
        <GameView 
          gameData={gameData} 
          difficulty={difficulty} 
          hidden={!assetsLoaded} 
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}

export default App;
