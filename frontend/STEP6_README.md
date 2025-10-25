# Step 6: Frontend Scaffold

## Setup

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env if backend is not on localhost:5006
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Open browser:**
   Navigate to `http://localhost:5173`

## What Was Built

### Components

1. **PromptScreen** - User input for game generation
   - Text area for biomechanical prompt
   - Difficulty selector (easy/normal/hard)
   - Example prompts
   - TUI/terminal styling

2. **LoadingScreen** - Progress indicator
   - Progress bar (0-100%)
   - Loading stages (game data, textures, sprites)
   - Status messages
   - Boot log animation

3. **GameView** - Game canvas placeholder
   - Canvas rendering setup
   - Placeholder text showing game data
   - HUD display (score, lives, bombs, power)
   - Controls info

### Configuration

- **config.js** - API endpoints and game settings
- **tailwind.config.js** - Tailwind CSS 4.1 with Giger colors
- **vite.config.js** - Vite with Tailwind plugin and API proxy

### Styling

- **TUI/Terminal aesthetic** - Monospace fonts, cyan on black
- **Scanline effect** - CRT-style scanlines overlay
- **CRT glow** - Box shadows for glow effect
- **Responsive** - Scales to different screen sizes

## Validation

1. **Prompt screen loads** - Shows title and input form
2. **Form validation** - Requires 10+ character prompt
3. **API call works** - Calls `/api/generate-game` on submit
4. **Loading screen** - Shows progress during generation
5. **Game view** - Displays canvas with game data
6. **Network tab** - Shows successful API calls

## Tech Stack

- **React 19.1.1** - UI framework
- **Vite 7.1.7** - Build tool and dev server
- **Tailwind CSS 4.1.14** - Utility-first CSS (with @tailwindcss/vite plugin)
- **Fetch API** - HTTP requests to backend
- **Vite Proxy** - API requests proxied to backend

## File Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── PromptScreen.jsx
│   │   ├── LoadingScreen.jsx
│   │   └── GameView.jsx
│   ├── config.js
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── package.json
├── tailwind.config.js
├── vite.config.js (with Tailwind plugin + API proxy)
└── .env.example
```

## Next Steps

- Step 7: Implement game renderer and parallax scroller
- Step 8: Add player movement and weapons
- Step 9: Implement enemies and waves
- Step 10+: Boss phases, TUI overlay, asset integration
