"""
Validation utilities for game data
"""
from typing import Dict, Any, Tuple, Optional
from pydantic import ValidationError
from models.game_data import GameData


def validate_game_data(data: Dict[str, Any]) -> Tuple[bool, Optional[GameData], Optional[str]]:
    """
    Validate game data against Pydantic schema
    
    Args:
        data: Dictionary containing game data
        
    Returns:
        Tuple of (is_valid, game_data_object, error_message)
        - is_valid: True if validation passed
        - game_data_object: Validated GameData instance if valid, None otherwise
        - error_message: Human-readable error message if invalid, None otherwise
    """
    try:
        game_data = GameData(**data)
        return True, game_data, None
    except ValidationError as e:
        error_msg = format_validation_error(e)
        return False, None, error_msg


def format_validation_error(error: ValidationError) -> str:
    """
    Format Pydantic validation error into human-readable message
    
    Args:
        error: Pydantic ValidationError
        
    Returns:
        Formatted error message string
    """
    errors = []
    for err in error.errors():
        loc = " -> ".join(str(x) for x in err['loc'])
        msg = err['msg']
        errors.append(f"  • {loc}: {msg}")
    
    return "Validation failed:\n" + "\n".join(errors)


def validate_partial_game_data(data: Dict[str, Any], field: str) -> Tuple[bool, Optional[str]]:
    """
    Validate a specific field of game data
    
    Args:
        data: Dictionary containing the field data
        field: Field name to validate (e.g., 'story', 'enemies', 'bullet_patterns')
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    from models.game_data import Story, Enemy, BulletPattern, Weapon, Pickup, TUISkin, Stage
    
    field_models = {
        'story': Story,
        'enemy': Enemy,
        'bullet_pattern': BulletPattern,
        'weapon': Weapon,
        'pickup': Pickup,
        'tui_skin': TUISkin,
        'stage': Stage
    }
    
    if field not in field_models:
        return False, f"Unknown field: {field}"
    
    try:
        field_models[field](**data)
        return True, None
    except ValidationError as e:
        return False, format_validation_error(e)


def get_validation_summary(game_data: GameData) -> Dict[str, Any]:
    """
    Get summary statistics for validated game data
    
    Args:
        game_data: Validated GameData instance
        
    Returns:
        Dictionary with summary statistics
    """
    return {
        "game_id": game_data.game_id,
        "os_name": game_data.story.os_name,
        "stage_count": len(game_data.stages),
        "enemy_count": len(game_data.enemies),
        "pattern_count": len(game_data.bullet_patterns) if game_data.bullet_patterns else 0,
        "weapon_count": len(game_data.weapons),
        "pickup_count": len(game_data.pickups),
        "total_waves": sum(len(stage.waves) for stage in game_data.stages),
        "total_boss_phases": sum(len(stage.boss.phases) for stage in game_data.stages),
        "glyph_bullets": game_data.tui_skin.glyph_bullets if game_data.tui_skin else False
    }
