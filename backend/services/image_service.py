"""
Image generation service using Gemini (primary) and GPT-image-1 (fallback)
"""
import os
import base64
import hashlib
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
import requests
from google import genai
from google.genai import types
import litellm
import logging
import sys

# Add parent directory to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from utils.image_processing import remove_solid_background

logger = logging.getLogger(__name__)

# In-memory cache for MVP
IMAGE_CACHE: Dict[str, str] = {}

# Image generation timeouts
TIMEOUT_PRIMARY = int(os.getenv('IMAGE_TIMEOUT_PRIMARY_SEC', '30'))
TIMEOUT_FALLBACK = int(os.getenv('IMAGE_TIMEOUT_FALLBACK_SEC', '180'))

# Cache TTL
CACHE_TTL_TEXTURES = int(os.getenv('CACHE_TTL_TEXTURES_SEC', '86400'))
CACHE_TTL_SPRITES = int(os.getenv('CACHE_TTL_SPRITES_SEC', '86400'))

# Cache directory
CACHE_DIR = Path(__file__).parent.parent / 'cache' / 'images'
CACHE_DIR.mkdir(parents=True, exist_ok=True)


def get_cache_key(prompt: str, size: str, model: str) -> str:
    """Generate cache key from prompt, size, and model"""
    key_str = f"{prompt}|{size}|{model}"
    return hashlib.sha256(key_str.encode()).hexdigest()


def save_image_to_cache(cache_key: str, base64_data: str, image_type: str = "image") -> Optional[str]:
    """
    Save image to filesystem cache
    
    Args:
        cache_key: Cache key (hash)
        base64_data: Base64 data URI
        image_type: Type of image (parallax, enemy, boss, tui_frame)
        
    Returns:
        File path if saved successfully, None otherwise
    """
    try:
        # Extract base64 content (remove data:image/png;base64, prefix)
        if base64_data.startswith('data:image/png;base64,'):
            base64_content = base64_data.split(',', 1)[1]
        else:
            base64_content = base64_data
        
        # Decode base64 to bytes
        image_bytes = base64.b64decode(base64_content)
        
        # Create subdirectory for image type
        type_dir = CACHE_DIR / image_type
        type_dir.mkdir(exist_ok=True)
        
        # Save to file
        file_path = type_dir / f"{cache_key}.png"
        with open(file_path, 'wb') as f:
            f.write(image_bytes)
        
        print(f"💾 Saved to cache: {file_path.relative_to(CACHE_DIR.parent)}")
        return str(file_path)
        
    except Exception as e:
        print(f"⚠️  Failed to save image to cache: {e}")
        return None


def load_image_from_cache(cache_key: str, image_type: str = "image") -> Optional[str]:
    """
    Load image from filesystem cache
    
    Args:
        cache_key: Cache key (hash)
        image_type: Type of image (parallax, enemy, boss, tui_frame)
        
    Returns:
        Base64 data URI if found, None otherwise
    """
    try:
        file_path = CACHE_DIR / image_type / f"{cache_key}.png"
        
        if not file_path.exists():
            return None
        
        # Read file
        with open(file_path, 'rb') as f:
            image_bytes = f.read()
        
        # Convert to base64 data URI
        base64_str = base64.b64encode(image_bytes).decode('utf-8')
        data_uri = f"data:image/png;base64,{base64_str}"
        
        print(f"📦 Loaded from cache: {file_path.relative_to(CACHE_DIR.parent)}")
        return data_uri
        
    except Exception as e:
        print(f"⚠️  Failed to load image from cache: {e}")
        return None


def get_gemini_generation_config(temperature=0.8):
    """Helper to create generation config for Gemini image generation"""
    try:
        safety_settings = [
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold=types.HarmBlockThreshold.BLOCK_NONE
            ),
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold=types.HarmBlockThreshold.BLOCK_NONE
            ),
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold=types.HarmBlockThreshold.BLOCK_NONE
            ),
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold=types.HarmBlockThreshold.BLOCK_NONE
            )
        ]
        
        config = types.GenerateContentConfig(
            temperature=temperature,
            safety_settings=safety_settings
        )
        return config
    except Exception as e:
        logger.warning(f"Error creating generation config: {e}, using dict fallback")
        return {"temperature": temperature}


def parse_gemini_response(response) -> Dict[str, Any]:
    """Parse image data from Gemini API response"""
    output_image_url = None
    image_found = False
    
    try:
        if hasattr(response, 'candidates') and response.candidates:
            for candidate in response.candidates:
                if hasattr(candidate, 'content') and hasattr(candidate.content, 'parts'):
                    for part in candidate.content.parts:
                        # Check for inline_data (image)
                        if hasattr(part, 'inline_data'):
                            inline_data = part.inline_data
                            if hasattr(inline_data, 'data'):
                                image_data = inline_data.data
                                mime_type = getattr(inline_data, 'mime_type', 'image/png')
                                
                                # Convert bytes to base64 if needed
                                if isinstance(image_data, bytes):
                                    image_b64 = base64.b64encode(image_data).decode('utf-8')
                                else:
                                    image_b64 = image_data
                                
                                output_image_url = f"data:{mime_type};base64,{image_b64}"
                                image_found = True
                                logger.info("Successfully extracted image from Gemini response")
                                break
                
                # Check for finish_reason blocking
                if hasattr(candidate, 'finish_reason'):
                    finish_reason = str(candidate.finish_reason)
                    if 'SAFETY' in finish_reason or 'BLOCKED' in finish_reason:
                        block_msg = f"Content blocked by safety filters: {finish_reason}"
                        logger.error(block_msg)
                        return {"error": block_msg}
        
        if image_found and output_image_url:
            return {"image": output_image_url}
        else:
            return {"error": "No image found in response"}
            
    except Exception as e:
        logger.error(f"Error parsing Gemini response: {e}")
        return {"error": f"Failed to parse response: {e}"}


def generate_image_gemini(prompt: str, size: str = "1024x1024") -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Generate image using gemini-2.5-flash-image-preview
    
    Args:
        prompt: Image description
        size: Image size (e.g., "1024x1024", "2048x512")
        
    Returns:
        Tuple of (success, base64_image, error_message)
    """
    try:
        api_key = os.getenv('GOOGLE_API_KEY') or os.getenv('GEMINI_API_KEY')
        if not api_key:
            return False, None, "GOOGLE_API_KEY or GEMINI_API_KEY not configured"
        
        print(f"🎨 Generating image with Gemini 2.5 Flash Image Preview ({size})...")
        
        client = genai.Client(api_key=api_key)
        model = "gemini-2.5-flash-image-preview"
        model_name = f"models/{model}"
        
        content_parts = [{
            "role": "user",
            "parts": [{"text": prompt}]
        }]
        
        generation_config = get_gemini_generation_config(temperature=0.8)
        
        response = client.models.generate_content(
            model=model_name,
            contents=content_parts,
            config=generation_config
        )
        
        logger.info(f"Received response from {model}")
        parsed_response = parse_gemini_response(response)
        
        if parsed_response.get("image"):
            print(f"✅ Gemini image generated")
            return True, parsed_response["image"], None
        else:
            error_msg = parsed_response.get("error", "Image generation failed")
            logger.error(f"Gemini image generation failed: {error_msg}")
            return False, None, error_msg
            
    except Exception as e:
        error_msg = f"Gemini error: {type(e).__name__}: {str(e)}"
        print(f"⚠️  {error_msg}")
        return False, None, error_msg


def generate_image_openai(prompt: str, size: str = "1024x1024") -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Generate image using openai/gpt-image-1 (fallback)
    
    Args:
        prompt: Image description
        size: Image size (e.g., "1024x1024", "2048x512")
        
    Returns:
        Tuple of (success, base64_image, error_message)
    """
    try:
        print(f"🎨 Generating image with gpt-image-1 ({size})...")
        
        # Map size to supported sizes
        openai_size = "1024x1024"
        if size in ["1024x1024", "1792x1024", "1024x1792"]:
            openai_size = size
        
        # Use LiteLLM for OpenAI image generation
        response = litellm.image_generation(
            model="openai/gpt-image-1",
            prompt=prompt,
            size=openai_size,
            quality="standard",
            n=1
        )
        
        # Extract image URL - response.data is a list of dicts
        image_url = response.data[0]['url']
        
        if not image_url or image_url == 'None':
            return False, None, "Model returned None as image URL"
        
        # Download image
        img_response = requests.get(image_url, timeout=TIMEOUT_FALLBACK)
        img_response.raise_for_status()
        
        # Convert to base64
        img_bytes = img_response.content
        base64_str = base64.b64encode(img_bytes).decode('utf-8')
        data_uri = f"data:image/png;base64,{base64_str}"
        
        print(f"✅ gpt-image-1 generated ({len(base64_str)} bytes)")
        return True, data_uri, None
            
    except Exception as e:
        error_msg = f"OpenAI error: {type(e).__name__}: {str(e)}"
        print(f"❌ {error_msg}")
        return False, None, error_msg


def generate_image(
    prompt: str,
    size: str = "1024x1024",
    use_cache: bool = True,
    image_type: str = "image"
) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Generate image with Gemini (primary) and OpenAI (fallback)
    
    Args:
        prompt: Image description
        size: Image size
        use_cache: Whether to use cache
        image_type: Type of image for cache organization
        
    Returns:
        Tuple of (success, base64_image, error_message)
    """
    # Use consistent cache key regardless of which model generates it
    cache_key = get_cache_key(prompt, size, image_type) if use_cache else None
    
    # Check filesystem cache first
    if use_cache and cache_key:
        print(f"🔍 Checking cache for {image_type} (key: {cache_key[:16]}...)")
        
        # Try filesystem cache
        cached_image = load_image_from_cache(cache_key, image_type)
        if cached_image:
            print(f"✅ Filesystem cache HIT for {image_type}")
            # Also store in memory cache
            IMAGE_CACHE[cache_key] = cached_image
            return True, cached_image, None
        
        # Try memory cache
        if cache_key in IMAGE_CACHE:
            print(f"✅ Memory cache HIT for {image_type}")
            return True, IMAGE_CACHE[cache_key], None
        
        print(f"❌ Cache MISS for {image_type} - generating new image")
    
    # Try Gemini first
    success, image, error = generate_image_gemini(prompt, size)
    
    if success and image:
        # Cache result
        if use_cache and cache_key:
            IMAGE_CACHE[cache_key] = image
            save_image_to_cache(cache_key, image, image_type)
            print(f"💾 Cached {image_type} image")
        return True, image, None
    
    # Fallback to OpenAI
    print(f"⚠️  Gemini failed, trying OpenAI fallback...")
    success, image, error = generate_image_openai(prompt, size)
    
    if success and image:
        # Cache result
        if use_cache and cache_key:
            IMAGE_CACHE[cache_key] = image
            save_image_to_cache(cache_key, image, image_type)
            print(f"💾 Cached {image_type} image (from fallback)")
        return True, image, None
    
    return False, None, f"Both Gemini and OpenAI failed. Last error: {error}"


def generate_parallax_layer(
    theme: str,
    prompt: str,
    depth: float,
    color: str = "#00FFD1"
) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Generate parallax background layer
    
    Args:
        theme: Overall theme
        prompt: Layer-specific prompt
        depth: Depth factor (0.0-1.0)
        color: Accent color
        
    Returns:
        Tuple of (success, base64_image, error_message)
    """
    full_prompt = f"""{prompt}, {theme},
horizontal scrolling background for a video game, seamless tileable edges,
stylized game art aesthetic matching sprite-based game graphics,
painterly or illustrated style, not photorealistic,
vibrant game art colors, depth layer {depth},
no text, no UI elements"""
    
    return generate_image(full_prompt, size="2048x512", image_type="parallax")


def generate_enemy_sprite(
    description: str,
    color: str = "#00FFD1"
) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Generate enemy sprite
    
    Args:
        description: Enemy description
        color: Accent color
        
    Returns:
        Tuple of (success, base64_image, error_message)
    """
    full_prompt = f"""{description}, side view sprite facing LEFT, game asset.
CRITICAL: The ENTIRE background must be SOLID BRIGHT GREEN color (#00FF00 / RGB 0,255,0).
Fill the entire background with pure bright green chroma key color.
The character should be centered with detailed colors and textures.
Single character facing LEFT toward viewer, no text, no UI, clean cutout style.
Background must be completely filled with bright green (#00FF00) for chroma keying."""
    
    # Generate cache key for background-removed version (v6 = edge sampling)
    cache_key = get_cache_key(full_prompt + "|nobg|v6", "1024x1024", "enemy")
    
    # Check if background-removed version is cached
    cached_nobg = load_image_from_cache(cache_key, "enemy")
    if cached_nobg:
        print(f"✅ Background-removed enemy sprite loaded from cache")
        return True, cached_nobg, None
    
    success, base64_image, error = generate_image(full_prompt, size="1024x1024", image_type="enemy")
    
    if success and base64_image:
        # Remove solid background to make it transparent
        print(f"  → Removing background from enemy sprite...")
        base64_image = remove_solid_background(base64_image, tolerance=80)
        
        # Cache the background-removed version
        save_image_to_cache(cache_key, base64_image, "enemy")
        print(f"💾 Cached background-removed enemy sprite")
    
    return success, base64_image, error


def generate_boss_sprite(
    description: str,
    color: str = "#00FFD1"
) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Generate boss sprite
    
    Args:
        description: Boss description
        color: Accent color
        
    Returns:
        Tuple of (success, base64_image, error_message)
    """
    full_prompt = f"""{description}, side view sprite facing LEFT, large boss enemy, game asset.
CRITICAL: The ENTIRE background must be SOLID BRIGHT GREEN color (#00FF00 / RGB 0,255,0).
Fill the entire background with pure bright green chroma key color.
The boss should be imposing with detailed colors and textures.
Facing LEFT toward viewer, no text, no UI, clean cutout style.
Background must be completely filled with bright green (#00FF00) for chroma keying."""
    
    # Generate cache key for background-removed version (v6 = edge sampling)
    cache_key = get_cache_key(full_prompt + "|nobg|v6", "1024x1024", "boss")
    
    # Check if background-removed version is cached
    cached_nobg = load_image_from_cache(cache_key, "boss")
    if cached_nobg:
        print(f"✅ Background-removed boss sprite loaded from cache")
        return True, cached_nobg, None
    
    success, base64_image, error = generate_image(full_prompt, size="1024x1024", image_type="boss")
    
    if success and base64_image:
        # Remove solid background to make it transparent
        print(f"  → Removing background from boss sprite...")
        base64_image = remove_solid_background(base64_image, tolerance=80)
        
        # Cache the background-removed version
        save_image_to_cache(cache_key, base64_image, "boss")
        print(f"💾 Cached background-removed boss sprite")
    
    return success, base64_image, error


def generate_player_sprite(
    description: str,
    color: str = "#00FFD1"
) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Generate player ship sprite
    
    Args:
        description: Player ship description
        color: Accent color
        
    Returns:
        Tuple of (success, base64_image, error_message)
    """
    full_prompt = f"""{description}, side view sprite facing RIGHT, player ship, game asset.
CRITICAL: The ENTIRE background must be SOLID BRIGHT GREEN color (#00FF00 / RGB 0,255,0).
Fill the entire background with pure bright green chroma key color.
The ship should be centered with detailed colors and textures.
Facing RIGHT, no text, no UI, clean cutout style.
Background must be completely filled with bright green (#00FF00) for chroma keying."""
    
    # Generate cache key for background-removed version (v6 = edge sampling)
    cache_key = get_cache_key(full_prompt + "|nobg|v6", "1024x1024", "player")
    
    # Check if background-removed version is cached
    cached_nobg = load_image_from_cache(cache_key, "player")
    if cached_nobg:
        print(f"✅ Background-removed player sprite loaded from cache")
        return True, cached_nobg, None
    
    success, base64_image, error = generate_image(full_prompt, size="1024x1024", image_type="player")
    
    if success and base64_image:
        # Remove solid background to make it transparent
        print(f"  → Removing background from player sprite...")
        base64_image = remove_solid_background(base64_image, tolerance=80)
        
        # Cache the background-removed version
        save_image_to_cache(cache_key, base64_image, "player")
        print(f"💾 Cached background-removed player sprite")
    
    return success, base64_image, error


def generate_tui_frame(
    description: str,
    color: str = "#00FFD1"
) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Generate TUI frame element
    
    Args:
        description: Frame description
        color: Accent color
        
    Returns:
        Tuple of (success, base64_image, error_message)
    """
    full_prompt = f"""{description}, terminal UI frame, {color} monochrome,
giger filigree details, ornamental corners, no text content,
retro computer aesthetic"""
    
    return generate_image(full_prompt, size="1024x1024", image_type="tui_frame")


def clear_cache(clear_filesystem: bool = False):
    """
    Clear image cache
    
    Args:
        clear_filesystem: If True, also delete cached files from disk
    """
    global IMAGE_CACHE
    IMAGE_CACHE = {}
    print("🗑️  Memory cache cleared")
    
    if clear_filesystem:
        import shutil
        if CACHE_DIR.exists():
            shutil.rmtree(CACHE_DIR)
            CACHE_DIR.mkdir(parents=True, exist_ok=True)
            print("🗑️  Filesystem cache cleared")


def get_cache_stats() -> Dict[str, Any]:
    """Get cache statistics"""
    # Count filesystem cached images
    fs_count = 0
    fs_size = 0
    
    if CACHE_DIR.exists():
        for subdir in CACHE_DIR.iterdir():
            if subdir.is_dir():
                for file in subdir.glob("*.png"):
                    fs_count += 1
                    fs_size += file.stat().st_size
    
    return {
        "memory_cached_images": len(IMAGE_CACHE),
        "memory_size_bytes": sum(len(img) for img in IMAGE_CACHE.values()),
        "filesystem_cached_images": fs_count,
        "filesystem_size_bytes": fs_size,
        "cache_directory": str(CACHE_DIR)
    }
