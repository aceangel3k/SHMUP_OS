"""
Database module for Fantasy OS SHMUP
Handles SQLite connections and queries for campaigns, sessions, and shared worlds
"""
import sqlite3
import json
import os
from pathlib import Path
from typing import Optional, Dict, List, Tuple
from datetime import datetime
import uuid

# Database file location
DB_DIR = Path(__file__).parent / 'data'
DB_DIR.mkdir(exist_ok=True)
DB_PATH = DB_DIR / 'fantasy_shmup.db'

# Schema file location
SCHEMA_PATH = Path(__file__).parent / 'schema.sql'


def get_connection() -> sqlite3.Connection:
    """Get database connection with row factory"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_database():
    """Initialize database with schema"""
    if not SCHEMA_PATH.exists():
        raise FileNotFoundError(f"Schema file not found: {SCHEMA_PATH}")
    
    with open(SCHEMA_PATH, 'r') as f:
        schema = f.read()
    
    conn = get_connection()
    try:
        conn.executescript(schema)
        conn.commit()
        print(f"✅ Database initialized: {DB_PATH}")
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        raise
    finally:
        conn.close()


# ============================================================================
# CAMPAIGN FUNCTIONS
# ============================================================================

def create_campaign(player_id: str) -> str:
    """
    Create a new campaign for a player
    
    Args:
        player_id: Unique player identifier
        
    Returns:
        campaign_id: UUID of created campaign
    """
    campaign_id = str(uuid.uuid4())
    conn = get_connection()
    
    try:
        conn.execute("""
            INSERT INTO campaigns (campaign_id, player_id)
            VALUES (?, ?)
        """, (campaign_id, player_id))
        conn.commit()
        return campaign_id
    finally:
        conn.close()


def get_campaign(campaign_id: str) -> Optional[Dict]:
    """
    Get campaign by ID
    
    Args:
        campaign_id: Campaign UUID
        
    Returns:
        Campaign dict or None if not found
    """
    conn = get_connection()
    
    try:
        row = conn.execute("""
            SELECT * FROM campaigns WHERE campaign_id = ?
        """, (campaign_id,)).fetchone()
        
        if row:
            return dict(row)
        return None
    finally:
        conn.close()


def get_player_campaigns(player_id: str) -> List[Dict]:
    """
    Get all campaigns for a player
    
    Args:
        player_id: Player identifier
        
    Returns:
        List of campaign dicts
    """
    conn = get_connection()
    
    try:
        rows = conn.execute("""
            SELECT * FROM campaigns 
            WHERE player_id = ?
            ORDER BY updated_at DESC
        """, (player_id,)).fetchall()
        
        return [dict(row) for row in rows]
    finally:
        conn.close()


def update_campaign(campaign_id: str, **kwargs) -> bool:
    """
    Update campaign fields
    
    Args:
        campaign_id: Campaign UUID
        **kwargs: Fields to update (current_stage_num, total_score, lives, bombs, power_level)
        
    Returns:
        True if updated, False if not found
    """
    valid_fields = ['current_stage_num', 'total_score', 'lives', 'bombs', 'power_level']
    updates = {k: v for k, v in kwargs.items() if k in valid_fields}
    
    if not updates:
        return False
    
    updates['updated_at'] = datetime.now().isoformat()
    
    set_clause = ', '.join(f"{k} = ?" for k in updates.keys())
    values = list(updates.values()) + [campaign_id]
    
    conn = get_connection()
    
    try:
        cursor = conn.execute(f"""
            UPDATE campaigns 
            SET {set_clause}
            WHERE campaign_id = ?
        """, values)
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


# ============================================================================
# GAME SESSION FUNCTIONS
# ============================================================================

def create_session(campaign_id: str, game_id: str, stage_num: int, player_stats: Dict) -> str:
    """
    Create a new game session
    
    Args:
        campaign_id: Campaign UUID
        game_id: Game data UUID
        stage_num: Stage number (0-indexed)
        player_stats: Dict with score, lives, bombs, power, time_sec
        
    Returns:
        session_id: UUID of created session
    """
    session_id = str(uuid.uuid4())
    stats_json = json.dumps(player_stats)
    
    conn = get_connection()
    
    try:
        conn.execute("""
            INSERT INTO game_sessions 
            (session_id, campaign_id, game_id, stage_num, player_stats, score)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (session_id, campaign_id, game_id, stage_num, stats_json, player_stats.get('score', 0)))
        conn.commit()
        return session_id
    finally:
        conn.close()


def complete_session(session_id: str, final_stats: Dict) -> bool:
    """
    Mark session as completed with final stats
    
    Args:
        session_id: Session UUID
        final_stats: Final player stats
        
    Returns:
        True if updated
    """
    stats_json = json.dumps(final_stats)
    
    conn = get_connection()
    
    try:
        cursor = conn.execute("""
            UPDATE game_sessions
            SET completed = 1,
                completion_time = ?,
                player_stats = ?,
                score = ?
            WHERE session_id = ?
        """, (datetime.now().isoformat(), stats_json, final_stats.get('score', 0), session_id))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def get_campaign_sessions(campaign_id: str) -> List[Dict]:
    """
    Get all sessions for a campaign
    
    Args:
        campaign_id: Campaign UUID
        
    Returns:
        List of session dicts
    """
    conn = get_connection()
    
    try:
        rows = conn.execute("""
            SELECT * FROM game_sessions
            WHERE campaign_id = ?
            ORDER BY created_at DESC
        """, (campaign_id,)).fetchall()
        
        sessions = []
        for row in rows:
            session = dict(row)
            session['player_stats'] = json.loads(session['player_stats'])
            sessions.append(session)
        
        return sessions
    finally:
        conn.close()


# ============================================================================
# COMPLETED STAGES (SHARED WORLDS)
# ============================================================================

def save_completed_stage(
    creator_player_id: str,
    game_data: Dict,
    player_prompt: str,
    difficulty: str = 'normal'
) -> str:
    """
    Save a completed stage to shared world pool
    
    Args:
        creator_player_id: Player who created this stage
        game_data: Full game_data dict from LLM
        player_prompt: Original user prompt
        difficulty: Difficulty level
        
    Returns:
        stage_id: UUID of saved stage
    """
    stage_id = game_data.get('game_id', str(uuid.uuid4()))
    game_data_json = json.dumps(game_data)
    
    conn = get_connection()
    
    try:
        conn.execute("""
            INSERT OR REPLACE INTO completed_stages
            (stage_id, creator_player_id, game_data, player_prompt, difficulty)
            VALUES (?, ?, ?, ?, ?)
        """, (stage_id, creator_player_id, game_data_json, player_prompt, difficulty))
        conn.commit()
        return stage_id
    finally:
        conn.close()


def get_random_stage(exclude_player_id: Optional[str] = None, difficulty: Optional[str] = None) -> Optional[Dict]:
    """
    Get a random completed stage from shared world pool
    
    Args:
        exclude_player_id: Exclude stages from this player
        difficulty: Filter by difficulty (optional)
        
    Returns:
        Stage dict with game_data, or None if no stages available
    """
    conn = get_connection()
    
    try:
        query = "SELECT * FROM completed_stages WHERE 1=1"
        params = []
        
        if exclude_player_id:
            query += " AND creator_player_id != ?"
            params.append(exclude_player_id)
        
        if difficulty:
            query += " AND difficulty = ?"
            params.append(difficulty)
        
        query += " ORDER BY RANDOM() LIMIT 1"
        
        row = conn.execute(query, params).fetchone()
        
        if row:
            stage = dict(row)
            stage['game_data'] = json.loads(stage['game_data'])
            return stage
        return None
    finally:
        conn.close()


def increment_stage_plays(stage_id: str, score: int):
    """
    Increment play count and update average score for a stage
    
    Args:
        stage_id: Stage UUID
        score: Player's score on this playthrough
    """
    conn = get_connection()
    
    try:
        # Get current stats
        row = conn.execute("""
            SELECT times_played, average_score FROM completed_stages
            WHERE stage_id = ?
        """, (stage_id,)).fetchone()
        
        if row:
            times_played = row['times_played']
            avg_score = row['average_score']
            
            # Calculate new average
            new_times_played = times_played + 1
            new_avg_score = ((avg_score * times_played) + score) // new_times_played
            
            conn.execute("""
                UPDATE completed_stages
                SET times_played = ?,
                    average_score = ?
                WHERE stage_id = ?
            """, (new_times_played, new_avg_score, stage_id))
            conn.commit()
    finally:
        conn.close()


def get_stage_stats(stage_id: str) -> Optional[Dict]:
    """
    Get statistics for a stage
    
    Args:
        stage_id: Stage UUID
        
    Returns:
        Dict with times_played, average_score, etc.
    """
    conn = get_connection()
    
    try:
        row = conn.execute("""
            SELECT stage_id, creator_player_id, player_prompt, difficulty,
                   times_played, average_score, created_at
            FROM completed_stages
            WHERE stage_id = ?
        """, (stage_id,)).fetchone()
        
        if row:
            return dict(row)
        return None
    finally:
        conn.close()


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def get_database_stats() -> Dict:
    """Get database statistics"""
    conn = get_connection()
    
    try:
        campaigns_count = conn.execute("SELECT COUNT(*) as count FROM campaigns").fetchone()['count']
        sessions_count = conn.execute("SELECT COUNT(*) as count FROM game_sessions").fetchone()['count']
        stages_count = conn.execute("SELECT COUNT(*) as count FROM completed_stages").fetchone()['count']
        
        return {
            "campaigns": campaigns_count,
            "sessions": sessions_count,
            "completed_stages": stages_count,
            "database_path": str(DB_PATH)
        }
    finally:
        conn.close()


# Initialize database on module import
if not DB_PATH.exists():
    init_database()
