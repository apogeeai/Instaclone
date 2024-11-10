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
    let imageModal = null;
    let modalImage = null;
    let currentImageIndex = 0;
    let galleryImages = [];
    let slideshowInterval = null;
    const SLIDESHOW_INTERVAL = 3000; // 3 seconds

    const imageModalElement = document.getElementById('imageModal');
    if (imageModalElement) {
        try {
            imageModal = new bootstrap.Modal(imageModalElement);
            modalImage = imageModalElement.querySelector('.modal-image');
            
            // Initialize modal controls after modal is shown
            imageModalElement.addEventListener('shown.bs.modal', () => {
                if (!modalImage) {
                    console.error('Modal image element not found');
                    return;
                }
                setupModalNavigation();
                imageModalElement.focus();
            });
            
            // Reset modal state when hidden
            imageModalElement.addEventListener('hidden.bs.modal', () => {
                if (modalImage) {
                    modalImage.classList.remove('loaded');
                    modalImage.src = '';
                }
                if (slideshowInterval) {
                    toggleSlideshow();
                }
            });
        } catch (error) {
            console.error('Error initializing modal:', error);
        }
    }

    // Gallery Navigation Functions
    const updateGalleryImages = () => {
        try {
            galleryImages = Array.from(document.querySelectorAll('.gallery-item img'));
        } catch (error) {
            console.error('Error updating gallery images:', error);
            galleryImages = [];
        }
    };

    const showImage = (index) => {
        if (!modalImage || !galleryImages.length) return;
        
        if (index >= 0 && index < galleryImages.length) {
            try {
                currentImageIndex = index;
                modalImage.classList.remove('loaded');
                const newSrc = galleryImages[index].getAttribute('data-img-src');
                
                if (!newSrc) {
                    throw new Error('Image source not found');
                }
                
                modalImage.src = newSrc;
                modalImage.onload = () => modalImage.classList.add('loaded');
                modalImage.onerror = (error) => {
                    console.error('Error loading image:', error);
                    showNotification('Failed to load image', 'error');
                };
                
                // Update navigation buttons
                const prevButton = document.querySelector('.modal-prev');
                const nextButton = document.querySelector('.modal-next');
                
                if (prevButton) prevButton.classList.toggle('disabled', currentImageIndex === 0);
                if (nextButton) nextButton.classList.toggle('disabled', currentImageIndex === galleryImages.length - 1);
            } catch (error) {
                console.error('Error showing image:', error);
                showNotification('Failed to show image', 'error');
            }
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
        try {
            const slideshowButton = document.querySelector('.slideshow-toggle i');
            if (!slideshowButton) return;
            
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
        } catch (error) {
            console.error('Error toggling slideshow:', error);
        }
    };

    // Event Listeners for Modal Navigation
    const setupModalNavigation = () => {
        try {
            // Previous button click
            const prevButton = document.querySelector('.modal-prev');
            if (prevButton) {
                prevButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    navigateGallery(-1);
                });
            }

            // Next button click
            const nextButton = document.querySelector('.modal-next');
            if (nextButton) {
                nextButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    navigateGallery(1);
                });
            }

            // Slideshow toggle
            const slideshowButton = document.querySelector('.slideshow-toggle');
            if (slideshowButton) {
                slideshowButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    toggleSlideshow();
                });
            }

            // Keyboard navigation
            imageModalElement.addEventListener('keydown', (e) => {
                switch (e.key) {
                    case 'ArrowLeft':
                        e.preventDefault();
                        navigateGallery(-1);
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        navigateGallery(1);
                        break;
                    case 'Escape':
                        e.preventDefault();
                        imageModal.hide();
                        break;
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
        } catch (error) {
            console.error('Error setting up modal navigation:', error);
        }
    };

    // Setup image click handlers
    const setupImageClickHandlers = () => {
        try {
            updateGalleryImages();
            document.querySelectorAll('.gallery-item').forEach((item, index) => {
                const viewBtn = item.querySelector('.view-image');
                if (viewBtn) {
                    viewBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        currentImageIndex = index;
                        showImage(currentImageIndex);
                        if (imageModal) {
                            imageModal.show();
                        }
                    });
                }
            });
        } catch (error) {
            console.error('Error setting up image click handlers:', error);
        }
    };

    // Initialize click handlers
    setupImageClickHandlers();

    // Rest of the existing code...
    [The rest of the file remains unchanged]
});
