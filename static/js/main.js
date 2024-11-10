// Theme switching
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Set initial theme
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) {
        document.documentElement.setAttribute('data-theme', currentTheme);
        themeToggle.checked = currentTheme === 'dark';
    } else {
        document.documentElement.setAttribute('data-theme', 
            prefersDarkScheme.matches ? 'dark' : 'light');
        themeToggle.checked = prefersDarkScheme.matches;
    }
    
    // Theme toggle handler
    themeToggle.addEventListener('change', () => {
        const theme = themeToggle.checked ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    });

    // Infinite scroll implementation
    const galleryContainer = document.getElementById('gallery-container');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    if (galleryContainer) {
        let loading = false;
        let retryCount = 0;
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 2000; // 2 seconds
        
        const loadMoreImages = async () => {
            if (loading) return;
            
            const nextPage = parseInt(galleryContainer.dataset.nextPage);
            const hasNext = galleryContainer.dataset.hasNext === 'true';
            
            if (!hasNext) return;
            
            loading = true;
            loadingIndicator.classList.remove('d-none');
            
            try {
                const response = await fetch(`/load_more/${nextPage}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                
                if (data.images.length > 0) {
                    data.images.forEach(image => {
                        const div = document.createElement('div');
                        div.className = 'gallery-item';
                        div.dataset.imageId = image.id;
                        div.innerHTML = `
                            <img src="${image.url}"
                                 alt="${image.original_filename}"
                                 data-bs-toggle="modal"
                                 data-bs-target="#imageModal"
                                 data-img-src="${image.url}">
                            <div class="gallery-item-overlay">
                                <button class="btn btn-danger delete-image" 
                                        onclick="return confirm('Are you sure you want to delete this image?')"
                                        data-image-id="${image.id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        `;
                        galleryContainer.appendChild(div);
                        
                        // Add delete handler to new image
                        const deleteBtn = div.querySelector('.delete-image');
                        if (deleteBtn) {
                            deleteBtn.addEventListener('click', handleDeleteImage);
                        }
                    });
                    
                    galleryContainer.dataset.nextPage = data.next_page;
                    galleryContainer.dataset.hasNext = data.has_next;
                    retryCount = 0; // Reset retry count on successful load
                }
            } catch (error) {
                console.error('Error loading more images:', error.message);
                if (retryCount < MAX_RETRIES) {
                    retryCount++;
                    showNotification(`Loading failed. Retrying... (${retryCount}/${MAX_RETRIES})`, 'warning');
                    setTimeout(() => {
                        loading = false;
                        loadMoreImages();
                    }, RETRY_DELAY);
                    return;
                } else {
                    showNotification('Failed to load more images. Please refresh the page.', 'error');
                    // Disable infinite scroll on max retries
                    observer.disconnect();
                }
            } finally {
                if (retryCount >= MAX_RETRIES) {
                    loadingIndicator.classList.add('d-none');
                } else {
                    loading = false;
                    loadingIndicator.classList.add('d-none');
                }
            }
        };
        
        // Intersection Observer for infinite scroll
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !loading) {
                    loadMoreImages();
                }
            });
        }, {
            rootMargin: '100px',
        });
        
        observer.observe(loadingIndicator);

        // Delete image handler
        const handleDeleteImage = async (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            const imageId = event.currentTarget.dataset.imageId;
            const galleryItem = document.querySelector(`.gallery-item[data-image-id="${imageId}"]`);
            
            try {
                const response = await fetch(`/delete/${imageId}`, {
                    method: 'DELETE',
                });
                const data = await response.json();
                
                if (data.success) {
                    galleryItem.remove();
                    showNotification('Image deleted successfully', 'success');
                } else {
                    showNotification('Failed to delete image', 'error');
                }
            } catch (error) {
                console.error('Error deleting image:', error);
                showNotification('Error deleting image', 'error');
            }
        };

        // Add delete handlers to existing images
        document.querySelectorAll('.delete-image').forEach(btn => {
            btn.addEventListener('click', handleDeleteImage);
        });
    }

    // Image upload handling
    const uploadForm = document.getElementById('upload-form');
    const uploadArea = document.querySelector('.upload-area');
    const MAX_FILE_SIZE = 32 * 1024 * 1024; // 32MB in bytes
    
    if (uploadArea) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.remove('dragover');
            });
        });

        uploadArea.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            handleFiles(files);
        });

        // Add file input change handler
        const fileInput = uploadArea.querySelector('input[type="file"]');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                handleFiles(e.target.files);
            });
        }
    }

    function showNotification(message, type = 'success') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        document.querySelector('.container').insertAdjacentElement('afterbegin', alertDiv);
        
        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            alertDiv.remove();
        }, 3000);
    }

    function handleFiles(files) {
        // Validate file sizes before upload
        const oversizedFiles = Array.from(files).filter(file => file.size > MAX_FILE_SIZE);
        if (oversizedFiles.length > 0) {
            const fileList = oversizedFiles.map(f => f.name).join(', ');
            showNotification(`The following files exceed the 32MB size limit: ${fileList}`, 'danger');
            return;
        }

        const formData = new FormData();
        Array.from(files).forEach(file => {
            formData.append('files[]', file);
        });

        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 413) {
                    throw new Error('File size too large. Maximum size is 32MB.');
                }
                throw new Error('Upload failed. Please try again.');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                window.location.href = '/';
            }
        })
        .catch(error => {
            showNotification(error.message, 'danger');
            console.error('Error:', error);
        });
    }

    // Modal image viewing
    const imageModal = document.getElementById('imageModal');
    if (imageModal) {
        imageModal.addEventListener('show.bs.modal', event => {
            const button = event.relatedTarget;
            const imgSrc = button.getAttribute('data-img-src');
            const modalImg = imageModal.querySelector('.modal-image');
            modalImg.src = imgSrc;
        });
    }
});
