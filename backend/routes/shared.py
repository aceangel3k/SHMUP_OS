"""
Shared world and persistence endpoints
Handles /api/save-game, /api/load-game, /api/get-next-stage, /api/patch-story
"""
from flask import Blueprint, request, jsonify
import database
import litellm
import os

shared_bp = Blueprint('shared', __name__)


@shared_bp.route('/save-game', methods=['POST'])
def save_game():
    """
    Save player campaign progress
    
    Request body:
        {
            "player_id": str,
            "campaign_id": str (optional),
            "game_id": str,
            "game_data": dict (optional, for completed stages),
            "player_prompt": str (optional, for completed stages),
            "difficulty": str (optional),
            "stage_num": int,
            "player_stats": {
                "score": int,
                "lives": int,
                "bombs": int,
                "power": int,
                "time_sec": int
            },
            "completed": bool
        }
    
    Returns:
        Campaign and session IDs
    """
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "Missing request body"}), 400
    
    player_id = data.get('player_id')
    campaign_id = data.get('campaign_id')
    game_id = data.get('game_id')
    stage_num = data.get('stage_num', 0)
    player_stats = data.get('player_stats', {})
    completed = data.get('completed', False)
    
    if not player_id or not game_id:
        return jsonify({"error": "Missing player_id or game_id"}), 400
    
    try:
        # Create or get campaign
        if not campaign_id:
            campaign_id = database.create_campaign(player_id)
        else:
            # Verify campaign exists
            campaign = database.get_campaign(campaign_id)
            if not campaign:
                return jsonify({"error": "Campaign not found"}), 404
        
        # Create session
        session_id = database.create_session(campaign_id, game_id, stage_num, player_stats)
        
        # Update campaign stats
        database.update_campaign(
            campaign_id,
            current_stage_num=stage_num,
            total_score=player_stats.get('score', 0),
            lives=player_stats.get('lives', 3),
            bombs=player_stats.get('bombs', 3),
            power_level=player_stats.get('power', 1)
        )
        
        # If completed, mark session and optionally save to shared world
        if completed:
            database.complete_session(session_id, player_stats)
            
            # Save to shared world if game_data provided
            game_data = data.get('game_data')
            player_prompt = data.get('player_prompt')
            difficulty = data.get('difficulty', 'normal')
            
            if game_data and player_prompt:
                stage_id = database.save_completed_stage(
                    player_id,
                    game_data,
                    player_prompt,
                    difficulty
                )
                
                return jsonify({
                    "success": True,
                    "campaign_id": campaign_id,
                    "session_id": session_id,
                    "stage_id": stage_id,
                    "message": "Game saved and added to shared world"
                }), 200
        
        return jsonify({
            "success": True,
            "campaign_id": campaign_id,
            "session_id": session_id,
            "message": "Game saved"
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@shared_bp.route('/load-game', methods=['GET'])
def load_game():
    """
    Load player campaign progress
    
    Query params:
        player_id: str
        campaign_id: str (optional, loads most recent if omitted)
    
    Returns:
        Campaign data and sessions
    """
    player_id = request.args.get('player_id')
    campaign_id = request.args.get('campaign_id')
    
    if not player_id:
        return jsonify({"error": "Missing player_id"}), 400
    
    try:
        # Get campaign
        if campaign_id:
            campaign = database.get_campaign(campaign_id)
            if not campaign:
                return jsonify({"error": "Campaign not found"}), 404
        else:
            # Get most recent campaign
            campaigns = database.get_player_campaigns(player_id)
            if not campaigns:
                return jsonify({
                    "success": False,
                    "message": "No campaigns found for player"
                }), 404
            campaign = campaigns[0]
            campaign_id = campaign['campaign_id']
        
        # Get sessions
        sessions = database.get_campaign_sessions(campaign_id)
        
        return jsonify({
            "success": True,
            "campaign": campaign,
            "sessions": sessions,
            "session_count": len(sessions)
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@shared_bp.route('/get-next-stage', methods=['GET'])
def get_next_stage():
    """
    Get a random stage from another player's completed stages
    
    Query params:
        player_id: str (to exclude own stages)
        difficulty: str (optional filter)
    
    Returns:
        Random stage game_data
    """
    player_id = request.args.get('player_id')
    difficulty = request.args.get('difficulty')
    
    try:
        stage = database.get_random_stage(
            exclude_player_id=player_id,
            difficulty=difficulty
        )
        
        if not stage:
            return jsonify({
                "success": False,
                "message": "No stages available in shared world"
            }), 404
        
        # Increment play count
        database.increment_stage_plays(stage['stage_id'], 0)
        
        return jsonify({
            "success": True,
            "stage": {
                "stage_id": stage['stage_id'],
                "game_data": stage['game_data'],
                "player_prompt": stage['player_prompt'],
                "difficulty": stage['difficulty'],
                "creator_player_id": stage['creator_player_id'],
                "times_played": stage['times_played'],
                "average_score": stage['average_score']
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@shared_bp.route('/patch-story', methods=['POST'])
def patch_story():
    """
    Generate narrative bridge between two stages using Cerebras
    
    Request body:
        {
            "previous_stage": {
                "os_name": str,
                "tagline": str
            },
            "next_stage": {
                "os_name": str,
                "tagline": str
            }
        }
    
    Returns:
        2-3 sentence narrative bridge
    """
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "Missing request body"}), 400
    
    previous = data.get('previous_stage', {})
    next_stage = data.get('next_stage', {})
    
    if not previous or not next_stage:
        return jsonify({"error": "Missing previous_stage or next_stage"}), 400
    
    prev_os = previous.get('os_name', 'Unknown OS')
    prev_tagline = previous.get('tagline', '')
    next_os = next_stage.get('os_name', 'Unknown OS')
    next_tagline = next_stage.get('tagline', '')
    
    try:
        # Build prompt for narrative bridge
        prompt = f"""You are a narrative designer for a biomechanical shmup game.
Write a 2-3 sentence transition between two stages.

Previous stage: {prev_os} - "{prev_tagline}"
Next stage: {next_os} - "{next_tagline}"

Write a brief, atmospheric transition that connects these two worlds.
Use biomechanical, Giger-inspired imagery. Keep it under 50 words.
Return only the narrative text, no additional formatting."""
        
        # Call Cerebras LLM
        model = os.getenv('TEXT_MODEL', 'cerebras/llama-3.3-70b')
        
        print(f"🤖 Generating story bridge with {model}...")
        
        response = litellm.completion(
            model=model,
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.8,
            max_tokens=150
        )
        
        bridge_text = response.choices[0].message.content.strip()
        
        print(f"✅ Story bridge generated: {len(bridge_text)} chars")
        
        return jsonify({
            "success": True,
            "bridge": bridge_text,
            "previous_os": prev_os,
            "next_os": next_os
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Story generation failed: {str(e)}"}), 500


@shared_bp.route('/database-stats', methods=['GET'])
def database_stats():
    """Get database statistics (dev endpoint)"""
    try:
        stats = database.get_database_stats()
        return jsonify(stats), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
