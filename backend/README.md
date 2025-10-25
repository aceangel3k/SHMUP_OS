# Fantasy OS SHMUP - Backend

Flask backend for AI-powered horizontal shmup game generation.

## Quick Start

### 1. Create Virtual Environment

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your API keys
```

### 4. Run Server

```bash
python app.py
```

Server will start on `http://localhost:5006`

## Validation (Step 1)

Test the endpoints:

```bash
# Health check
curl http://localhost:5006/health
# Expected: {"ok": true}

# Version info
curl http://localhost:5006/api/version
# Expected: {"service": "fantasy-os-shmup", "version": "0.1.0", ...}
```

## API Endpoints

- `GET /health` - Health check
- `GET /api/version` - Service version and model info
- `POST /api/generate-game` - Generate game from prompt (Step 3)
- `POST /api/generate-textures` - Generate parallax/UI textures (Step 4)
- `POST /api/generate-sprites` - Generate enemy/boss sprites (Step 4)
- `POST /api/save-game` - Save campaign progress (Step 5)
- `GET /api/load-game` - Load campaign progress (Step 5)
- `GET /api/get-next-stage` - Get random player stage (Step 5)
- `POST /api/patch-story` - Generate narrative bridge (Step 5)

## Project Structure

```
backend/
├── app.py              # Flask entry point
├── requirements.txt    # Python dependencies
├── .env.example        # Environment template
├── routes/             # API blueprints
│   ├── game.py        # Game generation
│   ├── textures.py    # Texture generation
│   ├── sprites.py     # Sprite generation
│   └── shared.py      # Save/load/shared worlds
├── models/            # Pydantic schemas (Step 2)
├── services/          # AI integrations (Step 3+)
└── utils/             # Helpers (Step 2+)
```

## Development

- Port: 5006
- CORS: Enabled for `localhost:5173` (frontend)
- Debug mode: Enabled in development
