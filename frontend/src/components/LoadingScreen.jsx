export default function LoadingScreen({ progress, stage, message }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 scanlines" style={{ backgroundColor: '#06080A' }}>
      <div className="max-w-2xl w-full">
        {/* Loading Frame */}
        <div className="tui-border p-8 crt-glow">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-mono tui-text mb-2">
              [ SYSTEM INITIALIZATION ]
            </h2>
            <p className="font-mono text-sm" style={{ color: '#00FFD1', opacity: 0.7 }}>
              {stage || 'Preparing...'}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="h-8 relative overflow-hidden" style={{ border: '2px solid #00FFD1' }}>
              <div
                className="h-full transition-all duration-300"
                style={{ width: `${progress}%`, backgroundColor: '#00FFD1' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono text-sm mix-blend-difference">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>
          </div>

          {/* Status Message */}
          {message && (
            <div className="font-mono text-sm text-center" style={{ color: '#00FFD1', opacity: 0.7 }}>
              &gt; {message}
            </div>
          )}

          {/* Boot Log */}
          <div className="mt-6 font-mono text-xs space-y-1" style={{ color: '#00FFD1', opacity: 0.5 }}>
            <div>&gt; Loading kernel modules...</div>
            <div>&gt; Initializing biomechanical processes...</div>
            <div>&gt; Mounting daemon filesystems...</div>
            <div>&gt; Spawning enemy threads...</div>
            <div>&gt; Calibrating bullet patterns...</div>
          </div>
        </div>
      </div>
    </div>
  );
}
