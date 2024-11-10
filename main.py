from app import app, db
from models import Image
import os
import requests
from datetime import datetime
from werkzeug.utils import secure_filename
from utils import save_image

def setup_upload_directory():
    """Ensure upload directory exists on application start"""
    upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 
                             'static', 'uploads')
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
        print(f"Created upload directory at {upload_dir}")
    return upload_dir

def seed_sample_images():
    """Seed the database with sample nature/landscape images"""
    # Sample image URLs (using Unsplash API for random nature images)
    sample_images = [
        "https://source.unsplash.com/random/800x600/?nature,landscape",
        "https://source.unsplash.com/random/800x600/?mountain",
        "https://source.unsplash.com/random/800x600/?forest",
        "https://source.unsplash.com/random/800x600/?ocean",
        "https://source.unsplash.com/random/800x600/?desert"
    ]
    
    upload_dir = setup_upload_directory()
    
    for idx, image_url in enumerate(sample_images):
        try:
            response = requests.get(image_url, stream=True)
            if response.status_code == 200:
                # Generate a unique filename
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                filename = f"sample_{timestamp}_{idx}.jpg"
                filepath = os.path.join(upload_dir, filename)
                
                # Save the image
                with open(filepath, 'wb') as f:
                    for chunk in response.iter_content(8192):
                        f.write(chunk)
                
                # Create database entry
                image = Image(
                    filename=filename,
                    original_filename=f"sample_image_{idx}.jpg",
                    file_size=os.path.getsize(filepath),
                    mime_type='image/jpeg'
                )
                db.session.add(image)
                
            else:
                print(f"Failed to download image {idx}: Status code {response.status_code}")
                
        except Exception as e:
            print(f"Error seeding sample image {idx}: {str(e)}")
    
    try:
        db.session.commit()
        print("Successfully seeded sample images")
    except Exception as e:
        db.session.rollback()
        print(f"Error committing sample images to database: {str(e)}")

def init():
    """Initialize application settings"""
    setup_upload_directory()
    
    # Check if database is initialized
    with app.app_context():
        try:
            # Test database connection by querying images
            if Image.query.count() == 0:
                print("No images found, seeding sample images...")
                seed_sample_images()
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
