"""
Pydantic models for Fantasy OS SHMUP game data validation
Based on GDD JSON schema
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator
import uuid


# Story and theming models
class Palette(BaseModel):
    """ANSI color palette for TUI rendering"""
    ansi_fg: str = Field(..., description="Foreground color (hex)", pattern=r"^#[0-9A-Fa-f]{6}$")
    ansi_bg: str = Field(..., description="Background color (hex)", pattern=r"^#[0-9A-Fa-f]{6}$")
    accent: str = Field(..., description="Accent color (hex)", pattern=r"^#[0-9A-Fa-f]{6}$")


class Story(BaseModel):
    """Game story and theming"""
    os_name: str = Field(..., min_length=1, max_length=100)
    tagline: str = Field(..., min_length=1, max_length=200)
    palette: Palette


# Stage and wave models
class ParallaxLayer(BaseModel):
    """Parallax background layer"""
    id: str = Field(..., min_length=1)
    prompt: str = Field(..., min_length=10, max_length=500)
    depth: float = Field(..., ge=0.0, le=1.0, description="Depth factor for parallax scrolling")


class Wave(BaseModel):
    """Enemy wave spawn definition"""
    time: int = Field(..., ge=0, description="Time in seconds when wave spawns")
    formation: str = Field(..., description="Formation type: v_wave, column, line, arc")
    enemy_type: str = Field(..., description="Enemy ID to spawn")
    count: int = Field(..., ge=1, le=50, description="Number of enemies in wave")
    path: str = Field(..., description="Movement path: straight, sine, seek, arc")
    
    @field_validator('formation')
    @classmethod
    def validate_formation(cls, v: str) -> str:
        allowed = ['v_wave', 'column', 'line', 'arc', 'circle', 'random']
        if v not in allowed:
            raise ValueError(f"Formation must be one of {allowed}")
        return v
    
    @field_validator('path')
    @classmethod
    def validate_path(cls, v: str) -> str:
        allowed = ['straight', 'sine', 'seek', 'arc', 'spiral']
        if v not in allowed:
            raise ValueError(f"Path must be one of {allowed}")
        return v


class BossPhase(BaseModel):
    """Boss phase with HP threshold and attack patterns"""
    hp: int = Field(..., ge=100, le=10000, description="HP threshold for this phase")
    patterns: List[str] = Field(..., min_length=1, max_length=10, description="Pattern IDs to use")


class Boss(BaseModel):
    """Boss enemy definition"""
    id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1, max_length=100)
    sprite_prompt: Optional[str] = Field(None, max_length=500)
    phases: List[BossPhase] = Field(..., min_length=1, max_length=5)


class Stage(BaseModel):
    """Game stage definition"""
    id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1, max_length=100)
    scroll_speed: float = Field(..., ge=0.1, le=5.0, description="Horizontal scroll speed")
    length_sec: int = Field(..., ge=60, le=600, description="Stage length in seconds")
    parallax: List[ParallaxLayer] = Field(..., min_length=1, max_length=5)
    waves: List[Wave] = Field(..., min_length=1, max_length=50)
    boss: Boss


# Enemy and combat models
class Enemy(BaseModel):
    """Enemy type definition"""
    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1, max_length=100)
    hp: int = Field(..., ge=1, le=1000, description="Hit points")
    speed: float = Field(..., ge=0.1, le=10.0, description="Movement speed")
    radius: int = Field(..., ge=4, le=64, description="Collision radius in pixels")
    sprite_prompt: str = Field(..., min_length=10, max_length=500)
    score: Optional[int] = Field(100, ge=0, description="Points awarded on kill")


class BulletPattern(BaseModel):
    """Bullet pattern definition"""
    id: str = Field(..., min_length=1)
    type: str = Field(..., description="Pattern type: fan, burst, spiral, laser, aimed")
    bullets: Optional[int] = Field(None, ge=1, le=100, description="Number of bullets")
    spread_deg: Optional[float] = Field(None, ge=0, le=360, description="Spread angle in degrees")
    arc_deg: Optional[float] = Field(None, ge=0, le=360, description="Arc coverage in degrees")
    cooldown_ms: int = Field(..., ge=100, le=10000, description="Cooldown in milliseconds")
    speed: Optional[float] = Field(300.0, ge=50, le=1000, description="Bullet speed")
    rate: Optional[float] = Field(None, ge=0.01, le=1.0, description="Rate for continuous patterns")
    dual: Optional[bool] = Field(False, description="Dual spiral/pattern")
    
    @field_validator('type')
    @classmethod
    def validate_type(cls, v: str) -> str:
        allowed = ['fan', 'burst', 'spiral', 'laser', 'aimed', 'stream', 'ring']
        if v not in allowed:
            raise ValueError(f"Pattern type must be one of {allowed}")
        return v


class Weapon(BaseModel):
    """Player weapon definition"""
    id: str = Field(..., min_length=1)
    name: Optional[str] = Field(None, max_length=100)
    dps: float = Field(..., ge=10, le=1000, description="Damage per second")
    projectile_speed: float = Field(..., ge=100, le=2000, description="Projectile speed")
    spread: float = Field(0, ge=0, le=90, description="Spread angle in degrees")
    fire_rate: float = Field(..., ge=1, le=60, description="Shots per second")


class Pickup(BaseModel):
    """Collectible pickup definition"""
    id: str = Field(..., min_length=1)
    name: Optional[str] = Field(None, max_length=100)
    effect: str = Field(..., description="Effect: shield+1, power+1, bomb+1, score+N")
    sprite_prompt: Optional[str] = Field(None, max_length=500)


class CRTEffects(BaseModel):
    """CRT visual effects configuration"""
    scanlines: bool = Field(True)
    glow: float = Field(0.3, ge=0.0, le=1.0)
    vignette: float = Field(0.2, ge=0.0, le=1.0)
    flicker: Optional[float] = Field(0.0, ge=0.0, le=1.0)


class Player(BaseModel):
    """Player ship configuration"""
    sprite_prompt: str = Field(..., min_length=10, max_length=500, description="Player ship sprite description")


class TUISkin(BaseModel):
    """TUI/terminal skin configuration"""
    frame_prompt: str = Field(..., min_length=10, max_length=500)
    glyph_bullets: bool = Field(True, description="Use text glyphs instead of images for bullets")
    glyph_set: List[str] = Field(..., min_length=3, max_length=20)
    crt_effects: CRTEffects
    boot_sequence: Optional[List[str]] = Field(None, max_length=10, description="Boot log messages")


# Root game data model
class GameData(BaseModel):
    """Complete game data structure"""
    game_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    story: Story
    player: Player
    stages: List[Stage] = Field(..., min_length=1, max_length=10)
    enemies: List[Enemy] = Field(..., min_length=1, max_length=50)
    bullet_patterns: Optional[List[BulletPattern]] = Field(None, description="Bullet patterns (optional, uses defaults)")
    weapons: List[Weapon] = Field(..., min_length=1, max_length=10)
    pickups: List[Pickup] = Field(..., min_length=1, max_length=20)
    tui_skin: Optional[TUISkin] = Field(None, description="TUI skin configuration (optional)")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    
    @field_validator('stages')
    @classmethod
    def validate_stages(cls, v: List[Stage]) -> List[Stage]:
        """Ensure stage IDs are unique"""
        ids = [stage.id for stage in v]
        if len(ids) != len(set(ids)):
            raise ValueError("Stage IDs must be unique")
        return v
    
    @field_validator('enemies')
    @classmethod
    def validate_enemies(cls, v: List[Enemy]) -> List[Enemy]:
        """Ensure enemy IDs are unique"""
        ids = [enemy.id for enemy in v]
        if len(ids) != len(set(ids)):
            raise ValueError("Enemy IDs must be unique")
        return v
    
    @field_validator('bullet_patterns')
    @classmethod
    def validate_patterns(cls, v: List[BulletPattern]) -> List[BulletPattern]:
        """Ensure pattern IDs are unique"""
        ids = [pattern.id for pattern in v]
        if len(ids) != len(set(ids)):
            raise ValueError("Bullet pattern IDs must be unique")
        return v


# Sample data for testing
SAMPLE_GAME_DATA = {
    "story": {
        "os_name": "FantasyOS-Δ9",
        "tagline": "A living terminal of bone and wire",
        "palette": {
            "ansi_fg": "#00FFD1",
            "ansi_bg": "#06080A",
            "accent": "#8AE6FF"
        }
    },
    "stages": [
        {
            "id": "mod-init",
            "title": "initd: Cathedral Kernel",
            "scroll_speed": 1.0,
            "length_sec": 240,
            "parallax": [
                {
                    "id": "bg_ribs",
                    "prompt": "biomechanical ribbed tunnel, giger, monochrome teal",
                    "depth": 0.2
                },
                {
                    "id": "bg_cables",
                    "prompt": "sinewy cables, organic conduits, giger",
                    "depth": 0.5
                }
            ],
            "waves": [
                {
                    "time": 5,
                    "formation": "v_wave",
                    "enemy_type": "glyph_worm",
                    "count": 6,
                    "path": "sine"
                },
                {
                    "time": 25,
                    "formation": "column",
                    "enemy_type": "rib_sentry",
                    "count": 4,
                    "path": "straight"
                }
            ],
            "boss": {
                "id": "daemon_seraph",
                "title": "Seraph of Sockets",
                "sprite_prompt": "biomechanical angel with cable wings, giger style",
                "phases": [
                    {"hp": 1000, "patterns": ["fan_5", "burst_32"]},
                    {"hp": 1200, "patterns": ["spiral_dual", "laser_sweep"]}
                ]
            }
        }
    ],
    "enemies": [
        {
            "id": "glyph_worm",
            "name": "Glyph Worm",
            "hp": 24,
            "speed": 1.2,
            "radius": 10,
            "sprite_prompt": "side-view biomech larva, single eye socket, giger lines, teal highlights",
            "score": 100
        },
        {
            "id": "rib_sentry",
            "name": "Rib Sentry",
            "hp": 48,
            "speed": 0.8,
            "radius": 12,
            "sprite_prompt": "floating ribcage with mechanical core, giger biomech",
            "score": 200
        }
    ],
    "bullet_patterns": [
        {
            "id": "fan_5",
            "type": "fan",
            "bullets": 5,
            "spread_deg": 40,
            "cooldown_ms": 800,
            "speed": 300
        },
        {
            "id": "burst_32",
            "type": "burst",
            "bullets": 32,
            "arc_deg": 360,
            "cooldown_ms": 1500,
            "speed": 200
        },
        {
            "id": "spiral_dual",
            "type": "spiral",
            "rate": 0.08,
            "dual": True,
            "cooldown_ms": 100,
            "speed": 250
        }
    ],
    "weapons": [
        {
            "id": "needle_rifle",
            "name": "Needle Rifle",
            "dps": 120,
            "projectile_speed": 900,
            "spread": 0,
            "fire_rate": 8
        }
    ],
    "pickups": [
        {"id": "shield_cell", "name": "Shield Cell", "effect": "shield+1"},
        {"id": "power_core", "name": "Power Core", "effect": "power+1"},
        {"id": "bomb_cache", "name": "Bomb Cache", "effect": "bomb+1"}
    ],
    "tui_skin": {
        "frame_prompt": "terminal bezel with box-drawing, giger filigree corners",
        "glyph_bullets": True,
        "glyph_set": ["•", "×", "◇", "/", "\\", "|"],
        "crt_effects": {
            "scanlines": True,
            "glow": 0.3,
            "vignette": 0.2
        }
    }
}
