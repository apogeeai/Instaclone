import os
from datetime import datetime
from flask import render_template, request, flash, redirect, url_for, jsonify
from werkzeug.utils import secure_filename
from app import app, db
from models import Image
from utils import allowed_file, save_image

IMAGES_PER_PAGE = 12

@app.route('/')
def index():
    page = 1
    images = Image.query.order_by(Image.created_at.desc()).paginate(
        page=page, per_page=IMAGES_PER_PAGE, error_out=False)
    return render_template('gallery.html', images=images.items, has_next=images.has_next)

@app.route('/load_more/<int:page>')
def load_more(page):
    images = Image.query.order_by(Image.created_at.desc()).paginate(
        page=page, per_page=IMAGES_PER_PAGE, error_out=False)
    
    images_data = [{
        'id': image.id,
        'url': url_for('static', filename=f'uploads/{image.filename}'),
        'original_filename': image.original_filename
    } for image in images.items]
    
    return jsonify({
        'images': images_data,
        'has_next': images.has_next,
        'next_page': page + 1 if images.has_next else None
    })

@app.route('/upload', methods=['GET', 'POST'])
def upload():
    if request.method == 'POST':
        if 'files[]' not in request.files:
            if request.headers.get('Accept') == 'application/json':
                return jsonify({'success': False, 'message': 'No files selected'}), 400
            flash('No files selected', 'error')
            return redirect(request.url)

        files = request.files.getlist('files[]')
        
        for file in files:
            if not file or not file.filename:
                continue
                
            if not allowed_file(file.filename):
                continue
                
            filename = secure_filename(str(file.filename))
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            new_filename = f"{timestamp}_{filename}"
            
            # Save the file
            file_path = save_image(file, new_filename)
            
            if file_path:
                # Create database entry
                image = Image()
                image.filename = new_filename
                image.original_filename = filename
                image.file_size = os.path.getsize(file_path)
                image.mime_type = file.content_type
                db.session.add(image)
                
        try:
            db.session.commit()
            if request.headers.get('Accept') == 'application/json':
                return jsonify({'success': True, 'message': 'Images uploaded successfully'})
            flash('Images uploaded successfully!', 'success')
            return redirect(url_for('index'))
        except Exception as e:
            db.session.rollback()
            if request.headers.get('Accept') == 'application/json':
                return jsonify({'success': False, 'message': str(e)}), 500
            flash(f'Error uploading images: {str(e)}', 'error')
            return redirect(request.url)
    
    return render_template('upload.html')

@app.route('/delete/<int:image_id>', methods=['DELETE'])
def delete_image(image_id):
    try:
        image = Image.query.get_or_404(image_id)
        
        # Delete file from filesystem
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], image.filename)
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Delete database entry
        db.session.delete(image)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Image deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.errorhandler(413)
def request_entity_too_large(error):
    """Handle 413 Request Entity Too Large error"""
    if request.path == '/upload':
        if request.headers.get('Accept') == 'application/json':
            return jsonify({
                'error': 'File size too large',
                'message': 'The uploaded file exceeds the maximum size of 32MB.'
            }), 413
        flash('File size too large. Maximum size is 32MB.', 'error')
        return redirect(url_for('upload'))
    return 'File too large!', 413
