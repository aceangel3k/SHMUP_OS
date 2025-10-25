-- Fantasy OS SHMUP Database Schema
-- SQLite schema for campaigns, sessions, and shared worlds

-- Campaigns: Player progression tracking
CREATE TABLE IF NOT EXISTS campaigns (
    campaign_id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    current_stage_num INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    lives INTEGER DEFAULT 3,
    bombs INTEGER DEFAULT 3,
    power_level INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Game Sessions: Individual stage playthroughs
CREATE TABLE IF NOT EXISTS game_sessions (
    session_id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    game_id TEXT NOT NULL,
    stage_num INTEGER NOT NULL,
    player_stats TEXT NOT NULL,  -- JSON: {score, lives, bombs, power, time_sec}
    completion_time TIMESTAMP,
    score INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id)
);

-- Completed Stages: Shared world content pool
CREATE TABLE IF NOT EXISTS completed_stages (
    stage_id TEXT PRIMARY KEY,
    creator_player_id TEXT NOT NULL,
    game_data TEXT NOT NULL,  -- JSON: Full game_data from LLM
    player_prompt TEXT NOT NULL,
    difficulty TEXT DEFAULT 'normal',
    times_played INTEGER DEFAULT 0,
    average_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_player ON campaigns(player_id);
CREATE INDEX IF NOT EXISTS idx_sessions_campaign ON game_sessions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sessions_game ON game_sessions(game_id);
CREATE INDEX IF NOT EXISTS idx_completed_creator ON completed_stages(creator_player_id);
CREATE INDEX IF NOT EXISTS idx_completed_difficulty ON completed_stages(difficulty);
CREATE INDEX IF NOT EXISTS idx_completed_times_played ON completed_stages(times_played);
