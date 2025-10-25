import { useState, useMemo } from 'react';
import { zeroSystemBeep } from '../utils/ZeroSystemBeep';

export default function PromptScreen({ onSubmit, initialPrompt = '', initialDifficulty = 'normal' }) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flashingButton, setFlashingButton] = useState(null);

  // Random placeholder text
  const placeholderText = useMemo(() => {
    const placeholders = [
      "Paint a realm untamed by time",
      "Unveil a universe carved from chaos",
      "Spin a saga of a world reborn",
      "Craft a cosmos brimming with secrets",
      "Forge a world where legends collide"
    ];
    return placeholders[Math.floor(Math.random() * placeholders.length)];
  }, []); // Empty dependency array means this only runs once on mount

  const triggerFlash = (buttonId) => {
    setFlashingButton(buttonId);
    setTimeout(() => setFlashingButton(null), 300); // Flash for 300ms
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (prompt.trim().length < 10) {
      alert('Prompt must be at least 10 characters');
      return;
    }

    // Play Zero System beep sound
    zeroSystemBeep.play();
    
    // Start strobing the button
    triggerFlash('submit');
    
    // Wait for strobe effect to complete before submitting
    setTimeout(async () => {
      setIsSubmitting(true);
      try {
        await onSubmit(prompt, difficulty);
      } catch (error) {
        console.error('Error submitting prompt:', error);
        setIsSubmitting(false);
      }
    }, 300); // Wait for the strobe to finish
  };

  const examplePrompts = [
    "H.R. Giger biomechanical nightmare with ribbed cables and bone machinery",
    "Pixel art retro arcade with chunky sprites and 8-bit colors",
    "Street Fighter style with muscular characters and martial arts",
    "Bubble Bobble cute dinosaurs blowing bubbles in pastel world",
    "Cute underwater adventure with colorful fish and coral reefs",
    "Retro 1940s warplanes battling over the Pacific",
    "Neon cyberpunk city with flying cars and holograms",
    "Whimsical candy land with gummy bears and lollipops",
    "Dark gothic cathedral with gargoyles and stained glass",
    "Tropical jungle with parrots and ancient temples",
    "Abstract geometric shapes and minimalist patterns",
    "Steampunk dragons with brass gears and steam",
    "Kawaii space adventure with pastel planets and stars",
    "Post-apocalyptic wasteland with rusted machines"
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 scanlines overflow-y-auto" style={{ backgroundColor: '#06080A' }}>
      <div className="max-w-2xl w-full my-8">
        {/* Title */}
        <div className="tui-border p-8 mb-6 crt-glow">
          <pre className="text-center font-mono text-xs leading-tight mb-4" style={{ color: '#00FFD1', textShadow: '0 0 5px rgba(0, 255, 209, 0.5)' }}>
{`
 ███████╗██╗  ██╗███╗   ███╗██╗   ██╗██████╗      ██████╗ ███████╗
 ██╔════╝██║  ██║████╗ ████║██║   ██║██╔══██╗    ██╔═══██╗██╔════╝
 ███████╗███████║██╔████╔██║██║   ██║██████╔╝    ██║   ██║███████╗
 ╚════██║██╔══██║██║╚██╔╝██║██║   ██║██╔═══╝     ██║   ██║╚════██║
 ███████║██║  ██║██║ ╚═╝ ██║╚██████╔╝██║         ╚██████╔╝███████║
 ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝ ╚═╝          ╚═════╝ ╚══════╝
`}
          </pre>
          <p className="text-center font-mono text-sm" style={{ color: '#00FFD1', opacity: 0.7 }}>
            ▓▒░ AI-Generated Shoot-'em-up ░▒▓
          </p>
        </div>

        {/* Prompt Form */}
        <form onSubmit={handleSubmit} className="tui-border p-6 crt-glow">
          <label className="block mb-4">
            <span className="font-mono block mb-2" style={{ color: '#00FFD1' }}>
              &gt; ENTER YOUR DESTINATION (PROMPT):
            </span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={placeholderText}
              className="tui-input w-full h-32 resize-none"
              disabled={isSubmitting}
              maxLength={500}
            />
            <span className="font-mono text-sm" style={{ color: '#00FFD1', opacity: 0.5 }}>
              {prompt.length}/500 characters
            </span>
          </label>

          <div className="block mb-6">
            <span className="font-mono block mb-2" style={{ color: '#00FFD1' }}>
              &gt; SELECT DIFFICULTY:
            </span>
            <div className="flex gap-4">
              {['easy', 'normal', 'hard'].map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => {
                    triggerFlash(`diff-${diff}`);
                    setDifficulty(diff);
                  }}
                  className={`tui-button flex-1 ${difficulty === diff ? 'difficulty-selected' : ''}`}
                  style={{
                    ...(flashingButton === `diff-${diff}`
                      ? { 
                          animation: 'strobe 0.1s linear infinite',
                          boxShadow: '0 0 30px rgba(0, 255, 209, 1)'
                        }
                      : {})
                  }}
                  disabled={isSubmitting}
                >
                  {diff.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="tui-button w-full text-lg"
            disabled={isSubmitting || prompt.trim().length < 10}
            style={
              flashingButton === 'submit'
                ? { 
                    animation: 'strobe 0.1s linear infinite',
                    boxShadow: '0 0 30px rgba(0, 255, 209, 1)'
                  }
                : {}
            }
          >
            {isSubmitting ? '[ GENERATING... ]' : '[ INITIALIZE SYSTEM ]'}
          </button>
        </form>

        {/* Example Prompts */}
        <div className="mt-6 p-4" style={{ border: '1px solid rgba(0, 255, 209, 0.3)' }}>
          <p className="font-mono text-sm mb-2" style={{ color: '#00FFD1', opacity: 0.7 }}>
            EXAMPLE PROMPTS:
          </p>
          {examplePrompts.map((example, i) => (
            <button
              key={i}
              onClick={() => {
                triggerFlash(`example-${i}`);
                setPrompt(example);
              }}
              className="block w-full text-left font-mono text-sm py-1 transition-colors"
              style={{
                color: flashingButton === `example-${i}` ? '#00FFD1' : 'rgba(0, 255, 209, 0.5)',
                ...(flashingButton === `example-${i}`
                  ? { 
                      animation: 'strobe 0.1s linear infinite',
                      textShadow: '0 0 10px rgba(0, 255, 209, 1)'
                    }
                  : {})
              }}
              onMouseEnter={(e) => {
                if (flashingButton !== `example-${i}`) {
                  e.target.style.color = '#00FFD1';
                }
              }}
              onMouseLeave={(e) => {
                if (flashingButton !== `example-${i}`) {
                  e.target.style.color = 'rgba(0, 255, 209, 0.5)';
                }
              }}
              disabled={isSubmitting}
            >
              {i + 1}. {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
