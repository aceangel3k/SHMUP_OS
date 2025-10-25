/**
 * GameOverScreen - Game over display
 * Shows final score and restart option
 */

export default function GameOverScreen({ score, kills, onRestart }) {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(6, 8, 10, 0.95)' }}
    >
      <div className="text-center font-mono p-8">
        <div 
          className="text-6xl font-bold mb-8 animate-pulse"
          style={{ color: '#FF0000', textShadow: '0 0 20px rgba(255, 0, 0, 0.8)' }}
        >
          SYSTEM FAILURE
        </div>
        
        <div className="text-2xl mb-4" style={{ color: '#00FFD1' }}>
          PROCESS TERMINATED
        </div>
        
        <div className="text-xl mb-8" style={{ color: '#FFFFFF' }}>
          <div>FINAL SCORE: {score}</div>
          <div>ENTITIES ELIMINATED: {kills}</div>
        </div>
        
        <button
          onClick={onRestart}
          className="tui-button px-8 py-3 text-xl"
          style={{
            backgroundColor: 'transparent',
            border: '2px solid #00FFD1',
            color: '#00FFD1',
            cursor: 'pointer',
          }}
        >
          RESTART SYSTEM
        </button>
      </div>
    </div>
  );
}
