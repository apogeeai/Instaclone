from app import app
from models import Image
import os

def setup_upload_directory():
    """Ensure upload directory exists on application start"""
    upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 
                             'static', 'uploads')
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
        print(f"Created upload directory at {upload_dir}")

def init():
    """Initialize application settings"""
    setup_upload_directory()
    
    # Check if database is initialized
    with app.app_context():
        try:
            # Test database connection by querying images
            Image.query.first()
            print("Database connection successful")
        except Exception as e:
            print(f"Database initialization error: {e}")
            return False
    return True

if __name__ == "__main__":
    if init():
        # Run the application
        app.run(
            host="0.0.0.0",  # Listen on all available interfaces
            port=5000,       # Use port 5000 as specified
            debug=True       # Enable debug mode for development
        )
    else:
        print("Failed to initialize application")
