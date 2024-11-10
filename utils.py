import os
from app import app
from PIL import Image as PILImage

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_image(file, filename):
    try:
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        # Open and optimize the image
        img = PILImage.open(file)
        
        # Convert to RGB if necessary
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
        
        # Resize if too large (max 2000px on longest side)
        max_size = 2000
        if max(img.size) > max_size:
            ratio = max_size / max(img.size)
            new_size = tuple(int(dim * ratio) for dim in img.size)
            img = img.resize(new_size, PILImage.LANCZOS)
        
        # Save optimized image
        img.save(filepath, optimize=True, quality=85)
        return filepath
    except Exception as e:
        print(f"Error saving image: {e}")
        return None
