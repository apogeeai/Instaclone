import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)
app = Flask(__name__)

# Configuration
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "a secret key"
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///gallery.db"
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
app.config["UPLOAD_FOLDER"] = "static/uploads"
app.config["MAX_CONTENT_LENGTH"] = 32 * 1024 * 1024  # 32MB max file size

# Ensure upload directory exists
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

db.init_app(app)

with app.app_context():
    import models
    import routes
    db.create_all()
