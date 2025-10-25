"""
LLM service for game generation using Cerebras via LiteLLM
"""
import os
import time
import json
import hashlib
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
import litellm
from litellm import completion

# Cache directory for LLM responses
CACHE_DIR = Path(__file__).parent.parent / 'cache' / 'llm'
CACHE_DIR.mkdir(parents=True, exist_ok=True)


# System prompt for game generation
SYSTEM_PROMPT = """You are an expert horizontal scrolling shoot-'em-up (shmup) game designer inspired by classics like:
- TwinBee (cute, colorful, whimsical)
- 1942 (military, historical, grounded)
- Xevious (alien, mysterious, geometric)
- Star Parodier (chaotic, humorous, over-the-top)
- Space Invaders (minimalist, arcade, retro)
- R-Type (biomechanical, dark, atmospheric)
- Gradius (sci-fi, power-up focused, epic)

Generate complete game designs as valid JSON only. BE EXTREMELY CREATIVE AND VARIED.

Design Principles:
- VARY THE AESTHETIC: Can be cute, dark, retro, futuristic, organic, geometric, silly, serious, etc.
- VARY THE THEME: Space, ocean, fantasy, cyberpunk, nature, abstract, historical, etc.
- VARY THE TONE: Serious war drama, lighthearted comedy, cosmic horror, arcade fun, etc.
- Keep horizontal scrolling shooter mechanics
- Match the user's theme but add unexpected creative twists
- Use diverse color palettes (not just cyan/teal - try pastels, neons, earth tones, monochromes)
- Create unique enemy designs that match the theme
- Bullet patterns should fit the aesthetic (organic curves, geometric grids, chaotic swarms, etc.)

Return ONLY valid JSON matching the exact schema provided. No markdown, no explanations."""


def build_user_prompt(user_prompt: str, difficulty: str = "normal") -> str:
    """
    Build user prompt for game generation
    
    Args:
        user_prompt: User's theme/concept
        difficulty: easy, normal, or hard
        
    Returns:
        Formatted prompt string
    """
    difficulty_params = {
        "easy": {
            "enemy_hp": "15-40",
            "enemy_speed": "0.6-1.2",
            "boss_hp": "800-1000",
            "bullet_count": "3-8"
        },
        "normal": {
            "enemy_hp": "20-60",
            "enemy_speed": "0.8-2.0",
            "boss_hp": "1000-1500",
            "bullet_count": "5-15"
        },
        "hard": {
            "enemy_hp": "40-100",
            "enemy_speed": "1.2-3.0",
            "boss_hp": "1500-2500",
            "bullet_count": "10-32"
        }
    }
    
    params = difficulty_params.get(difficulty, difficulty_params["normal"])
    
    return f"""Create a horizontal scrolling shmup based on this theme: {user_prompt}

AESTHETIC DIRECTION: Create a cohesive visual style that matches the user's theme. Be creative and interpret the theme in interesting ways:

Theme Interpretation Examples:
- "ocean" → bioluminescent sea creatures, coral reefs, underwater caves
- "space" → alien ships, asteroids, nebulae, cosmic phenomena
- "forest" → magical trees, woodland creatures, mystical plants
- "city" → futuristic buildings, neon lights, urban landscapes
- "candy" → sweet treats, pastel colors, whimsical desserts
- "dragons" → mythical beasts, fantasy elements, medieval aesthetics
- "music" → instruments, sound waves, rhythm-based visuals
- "weather" → clouds, lightning, atmospheric effects

Generate a complete game JSON with these specifications:

1. **story** (required object):
   - os_name: Creative name matching your aesthetic (can be cute, serious, retro, futuristic, etc.)
   - tagline: One sentence describing the world (max 200 chars)
   - palette: Colors that match your chosen aesthetic (NOT limited to cyan/teal!)
     - ansi_fg: Foreground color (hex) - try pastels, neons, earth tones, bright primaries, etc.
     - ansi_bg: Background color (hex) - can be dark, light, colorful, muted
     - accent: Accent color (hex) - complementary or contrasting to foreground

2. **player** (required object):
   - sprite_prompt: Player ship/character description matching the theme (50-200 chars)
     Examples: "cute bee with striped body and translucent wings", "sleek fighter jet with angular design", 
     "geometric crystal ship with glowing core", "friendly alien creature with big eyes", 
     "chibi robot with rounded joints", "abstract energy form with flowing particles", etc.

3. **stages** (array with exactly 1 stage):
   Each stage must have:
     - id: Short identifier (string)
     - title: Stage name (string, max 100 chars)
     - scroll_speed: 0.8 to 1.5 (float)
     - length_sec: 180 to 300 (integer, seconds)
     - parallax: Array of 3 background layers matching the theme
       Each layer needs:
       - id: Layer identifier (string)
       - prompt: Background layer description (10-500 chars)
         Examples: "fluffy clouds drifting slowly", "distant mountains with snow peaks", "starfield with twinkling stars"
       - depth: 0.3, 0.6, or 0.9 (float, back to front)
     - waves: Array of 3 enemy waves
       Each wave needs:
       - time: Spawn time in seconds (integer, use 3, 8, 15)
       - formation: One of [v_wave, column, line, arc, circle, random] (string)
       - enemy_type: Reference to enemy id (string)
       - count: 4 to 12 enemies (integer)
       - path: One of [straight, sine, seek, arc, spiral] (string)
     - boss: Single boss object with:
       - id: Boss identifier (string)
       - title: Boss name (string, max 100 chars)
       - sprite_prompt: Boss description matching the theme (10-500 chars)
         Examples: "massive sea serpent with glowing scales", "giant mechanical dragon with steel wings"
       - phases: Array of exactly 2 phase objects
         Each phase needs:
         - hp: {params['boss_hp']} (integer)
         - patterns: Array of 2-3 pattern ids (strings)

4. **enemies** (array with exactly 3 types):
   Each enemy must have:
   - id: Unique identifier (string)
   - name: Enemy name (string, max 100 chars)
   - hp: {params['enemy_hp']} (integer)
   - speed: {params['enemy_speed']} (float)
   - radius: 8 to 16 (integer, pixels)
   - sprite_prompt: Enemy description matching the theme (10-500 chars)
     Examples: "cute flying octopus with wavy tentacles", "angular geometric drone with glowing core", 
     "retro pixel spaceship with colorful hull", "fluffy cloud with lightning bolts"
   - score: 50 to 500 (integer, optional, defaults to 100)

5. **bullet_patterns** (array with 3 to 5 patterns, OPTIONAL - can be null/omitted):
   Each pattern must have:
   - id: Unique identifier (string)
   - type: One of [fan, burst, spiral, laser, aimed, stream, ring] (string)
   - cooldown_ms: 100 to 10000 (integer, required)
   - speed: 50 to 1000 (float, optional, defaults to 300)
   - For fan type: bullets (integer, {params['bullet_count']}), spread_deg (float, 20-90)
   - For burst type: bullets (integer, {params['bullet_count']}), arc_deg (float, 180-360)
   - For spiral type: rate (float, 0.05-0.15), dual (boolean, true/false)
   - For laser type: no extra fields needed

6. **weapons** (array with exactly 1 weapon):
   Each weapon must have:
   - id: Weapon identifier (string)
   - name: Weapon name (string, max 100 chars, optional)
   - dps: 100 to 150 (float, damage per second)
   - projectile_speed: 800 to 1000 (float)
   - spread: 0 to 15 (float, degrees, defaults to 0)
   - fire_rate: 6 to 10 (float, shots per second)

7. **pickups** (array with exactly 3 types):
   Each pickup must have:
   - id: Pickup identifier (string)
   - name: Pickup name (string, max 100 chars, optional)
   - effect: One of ["shield+1", "power+1", "bomb+1"] (string)
   - sprite_prompt: Pickup description (10-500 chars, optional)

8. **tui_skin** (RECOMMENDED: set to null):
   This field is complex and error-prone. STRONGLY RECOMMENDED to set to null.
   
   If you must include it, use this EXACT structure:
   {{
     "frame_prompt": "terminal bezel with biomechanical elements",
     "glyph_bullets": true,
     "glyph_set": ["•", "×", "◇", "|", "/", "\\\\", "-", "+", "*"],
     "crt_effects": {{
       "scanlines": true,
       "glow": 0.3,
       "vignette": 0.2,
       "flicker": 0.0
     }}
   }}
   
   CRITICAL: glyph_set must be an array of STRING values (in quotes), not characters or numbers.
   CRITICAL: crt_effects object is REQUIRED if tui_skin exists.
   
   SAFEST: Just use null for tui_skin

Return ONLY the JSON object. Ensure all IDs are unique and all references are valid."""


def get_llm_cache_key(user_prompt: str, difficulty: str = None) -> str:
    """Generate cache key from user prompt only (difficulty is handled on frontend)"""
    # Include version to invalidate old cache when prompt changes
    PROMPT_VERSION = "v4"  # Increment this when system prompt changes significantly
    # Only use user_prompt for cache key - difficulty is applied on frontend
    key_str = f"{PROMPT_VERSION}:{user_prompt}"
    return hashlib.sha256(key_str.encode()).hexdigest()


def load_from_llm_cache(cache_key: str) -> Optional[Dict[str, Any]]:
    """Load cached LLM response"""
    cache_file = CACHE_DIR / f"{cache_key}.json"
    if cache_file.exists():
        try:
            with open(cache_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"⚠️  Failed to load LLM cache: {e}")
    return None


def save_to_llm_cache(cache_key: str, game_data: Dict[str, Any]) -> None:
    """Save LLM response to cache"""
    cache_file = CACHE_DIR / f"{cache_key}.json"
    try:
        with open(cache_file, 'w') as f:
            json.dump(game_data, f, indent=2)
        print(f"💾 Saved LLM response to cache: {cache_file.name}")
    except Exception as e:
        print(f"⚠️  Failed to save LLM cache: {e}")


def generate_game_json(
    user_prompt: str,
    difficulty: str = "normal",
    max_retries: int = 3,
    use_cache: bool = True
) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
    """
    Generate game JSON using Cerebras LLM via LiteLLM
    
    Args:
        user_prompt: User's theme/concept
        difficulty: easy, normal, or hard
        max_retries: Maximum retry attempts
        use_cache: Whether to use cache
        
    Returns:
        Tuple of (success, game_data_dict, error_message)
    """
    # Generate cache key (always, even if not using cache)
    cache_key = get_llm_cache_key(user_prompt) if use_cache else None
    
    # Check cache first
    if use_cache and cache_key:
        print(f"🔍 Checking LLM cache (key: {cache_key[:16]}...)")
        
        cached_data = load_from_llm_cache(cache_key)
        if cached_data:
            print(f"✅ LLM cache HIT - using cached game data")
            return True, cached_data, None
        
        print(f"❌ LLM cache MISS - generating new game data")
    
    model = os.getenv('TEXT_MODEL', 'cerebras/llama-3.3-70b')
    
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": build_user_prompt(user_prompt, difficulty)}
    ]
    
    for attempt in range(max_retries):
        try:
            print(f"🤖 Calling {model} (attempt {attempt + 1}/{max_retries})...")
            
            response = completion(
                model=model,
                messages=messages,
                temperature=0.8,
                max_tokens=4000,
                response_format={"type": "json_object"}
            )
            
            # Extract JSON from response
            content = response.choices[0].message.content
            
            # Parse JSON
            game_data = json.loads(content)
            
            print(f"✅ Successfully generated game data")
            
            # Save to cache
            if use_cache and cache_key:
                save_to_llm_cache(cache_key, game_data)
            
            return True, game_data, None
            
        except json.JSONDecodeError as e:
            error_msg = f"JSON parsing error: {str(e)}"
            print(f"⚠️  {error_msg}")
            
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # Exponential backoff: 1s, 2s, 4s
                print(f"   Retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                return False, None, error_msg
                
        except Exception as e:
            error_msg = f"LLM error: {type(e).__name__}: {str(e)}"
            print(f"❌ {error_msg}")
            
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt
                print(f"   Retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                return False, None, error_msg
    
    return False, None, "Max retries exceeded"


def test_llm_connection() -> Tuple[bool, Optional[str]]:
    """
    Test LLM connection with a simple prompt
    
    Returns:
        Tuple of (success, error_message)
    """
    model = os.getenv('TEXT_MODEL', 'cerebras/llama-3.3-70b')
    
    try:
        response = completion(
            model=model,
            messages=[{"role": "user", "content": "Say 'OK' if you can read this."}],
            max_tokens=10
        )
        
        content = response.choices[0].message.content
        return True, None
        
    except Exception as e:
        return False, f"{type(e).__name__}: {str(e)}"
