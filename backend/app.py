"""
Fantasy OS SHMUP - Flask Backend Entry Point
Port: 5006
"""
import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

# Import blueprints after env is loaded
from routes.game import game_bp
from routes.textures import textures_bp
from routes.sprites import sprites_bp
from routes.shared import shared_bp

def create_app():
    """Application factory pattern"""
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['JSON_SORT_KEYS'] = False
    
    # Enable CORS for local development (frontend on :5173)
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:5173", "http://127.0.0.1:5173"],
            "methods": ["GET", "POST", "PUT", "DELETE"],
            "allow_headers": ["Content-Type"]
        }
    })
    
    # Register blueprints
    app.register_blueprint(game_bp, url_prefix='/api')
    app.register_blueprint(textures_bp, url_prefix='/api')
    app.register_blueprint(sprites_bp, url_prefix='/api')
    app.register_blueprint(shared_bp, url_prefix='/api')
    
    # Health check endpoint (no /api prefix)
    @app.route('/health')
    def health():
        return jsonify({"ok": True}), 200
    
    # Version endpoint
    @app.route('/api/version')
    def version():
        return jsonify({
            "service": "fantasy-os-shmup",
            "version": "0.1.0",
            "models": {
                "text": os.getenv('TEXT_MODEL', 'cerebras/llama-3.3-70b'),
                "image_primary": os.getenv('IMAGE_MODEL_PRIMARY', 'gemini-2.5-flash-image-preview'),
                "image_fallback": os.getenv('IMAGE_MODEL_FALLBACK', 'openai/gpt-image-1')
            }
        }), 200
    
    # Global error handlers
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({
            "error": "Bad Request",
            "message": str(e)
        }), 400
    
    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({
            "error": "Internal Server Error",
            "message": "An unexpected error occurred"
        }), 500
    
    @app.errorhandler(503)
    def service_unavailable(e):
        return jsonify({
            "error": "Service Unavailable",
            "message": str(e)
        }), 503
    
    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('PORT', 5006))
    print(f"🚀 Fantasy OS SHMUP Backend starting on port {port}")
    print(f"📡 Health check: http://localhost:{port}/health")
    print(f"📋 Version info: http://localhost:{port}/api/version")
    app.run(host='0.0.0.0', port=port, debug=True)
