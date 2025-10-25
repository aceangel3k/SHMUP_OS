"""
Sprite generation endpoint
Handles /api/generate-sprites
"""
from flask import Blueprint, request, jsonify
from services.image_service import generate_enemy_sprite, generate_boss_sprite, generate_player_sprite

sprites_bp = Blueprint('sprites', __name__)

@sprites_bp.route('/generate-sprites', methods=['POST'])
def generate_sprites():
    """
    Generate enemy, boss, player, and bullet sprites
    
    Request body:
        {
            "game_id": str,
            "color": str (hex),
            "player": {"id": str, "sprite_prompt": str},
            "enemies": [
                {"id": str, "sprite_prompt": str}
            ],
            "bosses": [
                {"id": str, "sprite_prompt": str}
            ]
        }
    
    Returns:
        Base64-encoded sprite images
    """
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "Missing request body"}), 400
    
    color = data.get('color', '#00FFD1')
    player = data.get('player')
    enemies = data.get('enemies', [])
    bosses = data.get('bosses', [])
    
    results = {
        "game_id": data.get('game_id'),
        "player_sprite": None,
        "enemy_sprites": [],
        "boss_sprites": []
    }
    
    # Generate player sprite
    if player:
        player_id = player.get('id')
        sprite_prompt = player.get('sprite_prompt')
        
        if sprite_prompt:
            success, image, error = generate_player_sprite(sprite_prompt, color)
            
            if success:
                results['player_sprite'] = {
                    "id": player_id,
                    "image": image
                }
            else:
                results['player_sprite'] = {
                    "id": player_id,
                    "error": error
                }
    
    # Generate enemy sprites
    for enemy in enemies:
        enemy_id = enemy.get('id')
        sprite_prompt = enemy.get('sprite_prompt')
        
        if not sprite_prompt:
            results['enemy_sprites'].append({
                "id": enemy_id,
                "error": "Missing sprite_prompt"
            })
            continue
        
        success, image, error = generate_enemy_sprite(sprite_prompt, color)
        
        if success:
            results['enemy_sprites'].append({
                "id": enemy_id,
                "image": image
            })
        else:
            results['enemy_sprites'].append({
                "id": enemy_id,
                "error": error
            })
    
    # Generate boss sprites
    for boss in bosses:
        boss_id = boss.get('id')
        sprite_prompt = boss.get('sprite_prompt')
        
        if not sprite_prompt:
            results['boss_sprites'].append({
                "id": boss_id,
                "error": "Missing sprite_prompt"
            })
            continue
        
        success, image, error = generate_boss_sprite(sprite_prompt, color)
        
        if success:
            results['boss_sprites'].append({
                "id": boss_id,
                "image": image
            })
        else:
            results['boss_sprites'].append({
                "id": boss_id,
                "error": error
            })
    
    return jsonify(results), 200
