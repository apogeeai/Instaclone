import os
from datetime import datetime
from flask import render_template, request, flash, redirect, url_for, jsonify
from werkzeug.utils import secure_filename
from app import app, db
from models import Image
from utils import allowed_file, save_image

@app.route('/')
def index():
    images = Image.query.order_by(Image.created_at.desc()).all()
    return render_template('gallery.html', images=images)

@app.route('/upload', methods=['GET', 'POST'])
def upload():
    if request.method == 'POST':
        if 'files[]' not in request.files:
            flash('No files selected', 'error')
            return redirect(request.url)

        files = request.files.getlist('files[]')
        
        for file in files:
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                new_filename = f"{timestamp}_{filename}"
                
                # Save the file
                file_path = save_image(file, new_filename)
                
                if file_path:
                    # Create database entry
                    image = Image(
                        filename=new_filename,
                        original_filename=filename,
                        file_size=os.path.getsize(file_path),
                        mime_type=file.content_type
                    )
                    db.session.add(image)
                    
        db.session.commit()
        flash('Images uploaded successfully!', 'success')
        return redirect(url_for('index'))
    
    return render_template('upload.html')

@app.route('/delete/<int:image_id>', methods=['POST'])
def delete_image(image_id):
    image = Image.query.get_or_404(image_id)
    
    # Delete file from filesystem
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], image.filename)
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # Delete database entry
    db.session.delete(image)
    db.session.commit()
    
    return jsonify({'success': True})
