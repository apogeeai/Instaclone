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

    // Initialize modal and gallery state
    const imageModalElement = document.getElementById('imageModal');
    const imageModal = new bootstrap.Modal(imageModalElement);
    const modalImage = document.querySelector('.modal-image');
    let currentImageIndex = 0;
    let galleryImages = [];
    let slideshowInterval = null;
    const SLIDESHOW_INTERVAL = 3000; // 3 seconds

    // Gallery Navigation Functions
    const updateGalleryImages = () => {
        galleryImages = Array.from(document.querySelectorAll('.gallery-item img'));
    };

    const showImage = (index) => {
        if (index >= 0 && index < galleryImages.length) {
            currentImageIndex = index;
            modalImage.classList.remove('loaded');
            modalImage.src = galleryImages[index].getAttribute('data-img-src');
            modalImage.onload = () => modalImage.classList.add('loaded');
            
            // Update navigation buttons
            document.querySelector('.modal-prev').classList.toggle('disabled', currentImageIndex === 0);
            document.querySelector('.modal-next').classList.toggle('disabled', currentImageIndex === galleryImages.length - 1);
        }
    };

    const navigateGallery = (direction) => {
        const newIndex = currentImageIndex + direction;
        if (newIndex >= 0 && newIndex < galleryImages.length) {
            showImage(newIndex);
        }
    };

    // Slideshow Functions
    const toggleSlideshow = () => {
        const slideshowButton = document.querySelector('.slideshow-toggle i');
        if (slideshowInterval) {
            clearInterval(slideshowInterval);
            slideshowInterval = null;
            slideshowButton.className = 'fas fa-play';
        } else {
            slideshowInterval = setInterval(() => {
                if (currentImageIndex < galleryImages.length - 1) {
                    navigateGallery(1);
                } else {
                    showImage(0); // Loop back to start
                }
            }, SLIDESHOW_INTERVAL);
            slideshowButton.className = 'fas fa-pause';
        }
    };

    // Event Listeners for Modal Navigation
    const setupModalNavigation = () => {
        // Previous button click
        document.querySelector('.modal-prev').addEventListener('click', () => {
            navigateGallery(-1);
        });

        // Next button click
        document.querySelector('.modal-next').addEventListener('click', () => {
            navigateGallery(1);
        });

        // Slideshow toggle
        document.querySelector('.slideshow-toggle').addEventListener('click', toggleSlideshow);

        // Keyboard navigation
        imageModalElement.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                navigateGallery(-1);
            } else if (e.key === 'ArrowRight') {
                navigateGallery(1);
            } else if (e.key === 'Escape') {
                imageModal.hide();
            }
        });

        // Mouse wheel navigation
        imageModalElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.deltaY < 0) {
                navigateGallery(-1);
            } else {
                navigateGallery(1);
            }
        });
    };

    // Setup image click handlers
    const setupImageClickHandlers = () => {
        updateGalleryImages();
        document.querySelectorAll('.gallery-item .view-image').forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                currentImageIndex = index;
                showImage(currentImageIndex);
                imageModal.show();
            });
        });
    };

    // Initialize modal navigation
    setupModalNavigation();
    setupImageClickHandlers();

    // Reset modal state when hidden
    imageModalElement.addEventListener('hidden.bs.modal', () => {
        modalImage.classList.remove('loaded');
        modalImage.src = '';
        if (slideshowInterval) {
            toggleSlideshow(); // Stop slideshow
        }
    });

    // Focus trap for keyboard navigation
    imageModalElement.addEventListener('shown.bs.modal', () => {
        imageModalElement.focus();
    });

    // Infinite scroll implementation
    const galleryContainer = document.getElementById('gallery-container');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    if (galleryContainer && loadingIndicator) {
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
                    loadingIndicator.remove();
                    
                    data.images.forEach(image => {
                        const div = document.createElement('div');
                        div.className = 'gallery-item';
                        div.dataset.imageId = image.id;
                        div.innerHTML = `
                            <img src="${image.url}"
                                 alt="${image.original_filename}"
                                 data-img-src="${image.url}">
                            <div class="gallery-item-overlay">
                                <div class="image-actions">
                                    <button class="btn btn-light view-image">
                                        <i class="fas fa-search"></i>
                                    </button>
                                    <button class="btn btn-danger delete-image" 
                                            onclick="return confirm('Are you sure you want to delete this image?')"
                                            data-image-id="${image.id}">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        `;
                        galleryContainer.appendChild(div);
                        
                        const deleteBtn = div.querySelector('.delete-image');
                        if (deleteBtn) {
                            deleteBtn.addEventListener('click', handleDeleteImage);
                        }
                    });
                    
                    galleryContainer.appendChild(loadingIndicator);
                    setupImageClickHandlers();
                    
                    galleryContainer.dataset.nextPage = data.next_page;
                    galleryContainer.dataset.hasNext = data.has_next;
                    retryCount = 0;
                }
            } catch (error) {
                console.error('Error loading more images:', error);
                if (retryCount < MAX_RETRIES) {
                    retryCount++;
                    setTimeout(() => {
                        loading = false;
                        loadMoreImages();
                    }, RETRY_DELAY);
                    return;
                } else {
                    observer.disconnect();
                }
            } finally {
                if (retryCount >= MAX_RETRIES) {
                    loadingIndicator.classList.add('d-none');
                }
                loading = false;
            }
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !loading && galleryContainer.dataset.hasNext === 'true') {
                    loadMoreImages();
                }
            });
        }, {
            root: null,
            rootMargin: '50px',
            threshold: 0.1
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
                    updateGalleryImages();
                    showNotification('Image deleted successfully', 'success');
                } else {
                    throw new Error(data.message || 'Failed to delete image');
                }
            } catch (error) {
                console.error('Error deleting image:', error);
                showNotification(error.message || 'Error deleting image', 'error');
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
        
        setTimeout(() => {
            alertDiv.remove();
        }, 3000);
    }

    function handleFiles(files) {
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
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 413) {
                    throw new Error('File size too large. Maximum size is 32MB.');
                }
                return response.json().then(data => {
                    throw new Error(data.message || 'Upload failed. Please try again.');
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                window.location.href = '/';
            } else {
                throw new Error(data.message || 'Upload failed');
            }
        })
        .catch(error => {
            showNotification(error.message || 'Upload failed', 'danger');
            console.error('Error:', error);
        });
    }
});
