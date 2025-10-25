/**
 * VictoryScreen - Victory display
 * Shows completion stats and continue option
 */

export default function VictoryScreen({ score, kills, onContinue }) {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(6, 8, 10, 0.95)' }}
    >
      <div className="text-center font-mono p-8">
        <div 
          className="text-6xl font-bold mb-8"
          style={{ color: '#00FFD1', textShadow: '0 0 30px rgba(0, 255, 209, 0.8)' }}
        >
          SYSTEM PURGED
        </div>
        
        <div className="text-2xl mb-4" style={{ color: '#00FF00' }}>
          CORE ELIMINATED
        </div>
        
        <div className="text-xl mb-8" style={{ color: '#FFFFFF' }}>
          <div>FINAL SCORE: {score}</div>
          <div>ENTITIES ELIMINATED: {kills}</div>
          <div className="mt-4" style={{ color: '#00FFD1' }}>
            SYSTEM RESTORED
          </div>
        </div>
        
        <button
          onClick={onContinue}
          className="tui-button px-8 py-3 text-xl"
          style={{
            backgroundColor: 'transparent',
            border: '2px solid #00FFD1',
            color: '#00FFD1',
            cursor: 'pointer',
          }}
        >
          CONTINUE
        </button>
      </div>
    </div>
  );
}
