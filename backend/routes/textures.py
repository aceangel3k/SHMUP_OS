"""
Texture generation endpoint
Handles /api/generate-textures
"""
from flask import Blueprint, request, jsonify
from services.image_service import generate_parallax_layer, generate_tui_frame

textures_bp = Blueprint('textures', __name__)

@textures_bp.route('/generate-textures', methods=['POST'])
def generate_textures():
    """
    Generate parallax backgrounds and TUI frame textures
    
    Request body:
        {
            "game_id": str,
            "theme": str,
            "color": str (hex),
            "parallax_layers": [
                {"id": str, "prompt": str, "depth": float}
            ],
            "tui_frame_prompt": str
        }
    
    Returns:
        Base64-encoded texture images
    """
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "Missing request body"}), 400
    
    theme = data.get('theme', '')
    color = data.get('color', '#00FFD1')
    parallax_layers = data.get('parallax_layers', [])
    tui_frame_prompt = data.get('tui_frame_prompt')
    tui_frames = data.get('tui_frames', [])
    
    results = {
        "game_id": data.get('game_id'),
        "parallax": [],
        "tui_frames": []
    }
    
    # Generate parallax layers
    for layer in parallax_layers:
        layer_id = layer.get('id')
        prompt = layer.get('prompt')
        depth = layer.get('depth', 0.5)
        
        success, image, error = generate_parallax_layer(theme, prompt, depth, color)
        
        if success:
            results['parallax'].append({
                "id": layer_id,
                "image": image,
                "depth": depth
            })
        else:
            results['parallax'].append({
                "id": layer_id,
                "error": error,
                "depth": depth
            })
    
    # Generate TUI frame (single prompt)
    if tui_frame_prompt:
        success, image, error = generate_tui_frame(tui_frame_prompt, color)
        
        if success:
            results['tui_frames'].append({
                "id": "main_frame",
                "image": image
            })
        else:
            results['tui_frames'].append({
                "id": "main_frame",
                "error": error
            })
    
    # Generate TUI frames (array format)
    for tui_frame in tui_frames:
        frame_id = tui_frame.get('id')
        prompt = tui_frame.get('prompt')
        
        if not prompt:
            results['tui_frames'].append({
                "id": frame_id,
                "error": "Missing prompt"
            })
            continue
        
        success, image, error = generate_tui_frame(prompt, color)
        
        if success:
            results['tui_frames'].append({
                "id": frame_id,
                "image": image
            })
        else:
            results['tui_frames'].append({
                "id": frame_id,
                "error": error
            })
    
    return jsonify(results), 200
