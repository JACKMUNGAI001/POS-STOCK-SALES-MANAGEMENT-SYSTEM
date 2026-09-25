from flask import Flask, jsonify, request
from config import Config
from extensions import db, migrate, jwt, cors
from models.sale import ensure_sale_type_column, ensure_cylinder_schema

def create_app():
    app = Flask(__name__, static_folder=None)
    app.config.from_object(Config)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    with app.app_context():
        ensure_sale_type_column()
        ensure_cylinder_schema()
    cors.init_app(app, resources={r"/*": {"origins": "*"}})

    # Register routes
    from routes import register_blueprints
    register_blueprints(app)

    # Health check endpoint
    @app.route("/health")
    def health():
        return jsonify({"status": "ok"}), 200

    # Home route to stop 404s
    @app.route("/")
    def home():
        return jsonify({"message": "Welcome to Gas POS System API"}), 200

    @app.after_request
    def handle_options_request(response):
        if request.method == 'OPTIONS':
            return app.make_response(('', 200))
        return response

    return app

app = create_app()
