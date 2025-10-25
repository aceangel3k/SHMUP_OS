"""
Game generation endpoint
Handles /api/generate-game
"""
from flask import Blueprint, request, jsonify
from services.llm_service import generate_game_json
from utils.validation import validate_game_data, get_validation_summary

game_bp = Blueprint('game', __name__)

@game_bp.route('/generate-game', methods=['POST'])
def generate_game():
    """
    Generate complete game data from user prompt
    
    Request body:
        {
            "user_prompt": str,
            "player_id": str (optional),
            "difficulty": "easy"|"normal"|"hard" (optional, default: normal)
        }
    
    Returns:
        Game data JSON with stages, enemies, patterns, etc.
    """
    try:
        data = request.get_json()
        
        # Validate request
        if not data or 'user_prompt' not in data:
            return jsonify({
                "error": "Missing required field: user_prompt"
            }), 400
        
        user_prompt = data.get('user_prompt', '').strip()
        if not user_prompt or len(user_prompt) < 10:
            return jsonify({
                "error": "user_prompt must be at least 10 characters"
            }), 400
        
        difficulty = data.get('difficulty', 'normal')
        if difficulty not in ['easy', 'normal', 'hard']:
            return jsonify({
                "error": "difficulty must be one of: easy, normal, hard"
            }), 400
        
        player_id = data.get('player_id')
        
        # Generate game JSON using LLM
        print(f"📝 Generating game for prompt: {user_prompt[:50]}...")
        success, game_data, error = generate_game_json(user_prompt, difficulty)
        
        if not success:
            print(f"❌ LLM generation failed: {error}")
            return jsonify({
                "error": "Failed to generate game",
                "details": error
            }), 500
        
        print(f"✅ LLM generated game data, validating...")
        
        # Validate generated data
        try:
            is_valid, validated_game, validation_error = validate_game_data(game_data)
        except Exception as validation_exception:
            print(f"❌ Validation crashed: {type(validation_exception).__name__}: {str(validation_exception)}")
            import traceback
            traceback.print_exc()
            return jsonify({
                "error": "Validation error",
                "details": f"{type(validation_exception).__name__}: {str(validation_exception)}"
            }), 500
        
        if not is_valid:
            print(f"❌ Validation failed: {validation_error}")
            return jsonify({
                "error": "Generated game data failed validation",
                "details": validation_error,
                "raw_data": game_data  # Include for debugging
            }), 500
        
        print(f"✅ Validation passed")
        
        # Get summary statistics
        summary = get_validation_summary(validated_game)
        
        # Return validated game data
        response = {
            "success": True,
            "game_data": validated_game.model_dump(),
            "summary": summary,
            "metadata": {
                "user_prompt": user_prompt,
                "difficulty": difficulty,
                "player_id": player_id
            }
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        # Catch any unexpected errors
        import traceback
        error_details = traceback.format_exc()
        print(f"❌ Unexpected error in /generate-game: {error_details}")
        
        return jsonify({
            "error": "Internal server error",
            "details": f"{type(e).__name__}: {str(e)}"
        }), 500
