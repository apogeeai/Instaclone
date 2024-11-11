document.addEventListener('DOMContentLoaded', function() {
    // Dark Mode functionality
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        themeToggle.checked = savedTheme === 'dark';

        themeToggle.addEventListener('change', function() {
            const theme = this.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
        });
    }

    // Initialize modal components
    const imageModal = document.getElementById('imageModal');
    if (!imageModal) return;

    const modalInstance = new bootstrap.Modal(imageModal);
    const modalImage = imageModal.querySelector('.modal-image');
    const prevButton = imageModal.querySelector('.modal-prev');
    const nextButton = imageModal.querySelector('.modal-next');
    const slideshowToggle = imageModal.querySelector('.slideshow-toggle');

    let currentImageIndex = 0;
    let images = [];
    let slideshowInterval = null;
    const slideshowDelay = 3000;

    // Initialize images array
    function updateImagesList() {
        images = Array.from(document.querySelectorAll('.gallery-item img'));
    }

    // Show specific image in modal
    function showImage(index) {
        if (index < 0 || index >= images.length) return;
        
        currentImageIndex = index;
        const imgSrc = images[index].dataset.imgSrc;
        modalImage.src = imgSrc;
        modalImage.alt = images[index].alt;
        
        // Update navigation visibility
        prevButton.style.visibility = index > 0 ? 'visible' : 'hidden';
        nextButton.style.visibility = index < images.length - 1 ? 'visible' : 'hidden';
    }

    // Navigation functions
    function showNextImage() {
        if (currentImageIndex < images.length - 1) {
            showImage(currentImageIndex + 1);
        }
    }

    function showPrevImage() {
        if (currentImageIndex > 0) {
            showImage(currentImageIndex - 1);
        }
    }

    // Slideshow functions
    function startSlideshow() {
        if (slideshowInterval) return;
        
        slideshowToggle.innerHTML = '<i class="fas fa-pause"></i>';
        slideshowToggle.classList.add('active');
        
        slideshowInterval = setInterval(() => {
            if (currentImageIndex >= images.length - 1) {
                showImage(0); // Loop back to first image
            } else {
                showNextImage();
            }
        }, slideshowDelay);
    }

    function stopSlideshow() {
        if (!slideshowInterval) return;
        
        clearInterval(slideshowInterval);
        slideshowInterval = null;
        slideshowToggle.innerHTML = '<i class="fas fa-play"></i>';
        slideshowToggle.classList.remove('active');
    }

    function toggleSlideshow() {
        if (slideshowInterval) {
            stopSlideshow();
        } else {
            startSlideshow();
        }
    }

    // Event Listeners
    const galleryContainer = document.getElementById('gallery-container');
    if (galleryContainer) {
        galleryContainer.addEventListener('click', (e) => {
            const viewButton = e.target.closest('.view-image');
            if (!viewButton) return;

            const galleryItem = viewButton.closest('.gallery-item');
            const index = Array.from(document.querySelectorAll('.gallery-item')).indexOf(galleryItem);
            
            updateImagesList();
            showImage(index);
            modalInstance.show();
        });
    }

    // Mouse wheel navigation
    modalImage.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (e.deltaY > 0) {
            showNextImage();
        } else {
            showPrevImage();
        }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!imageModal.classList.contains('show')) return;

        switch(e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                showPrevImage();
                break;
            case 'ArrowRight':
                e.preventDefault();
                showNextImage();
                break;
            case 'Escape':
                modalInstance.hide();
                break;
            case ' ': // Spacebar
                e.preventDefault();
                toggleSlideshow();
                break;
        }
    });

    // Button click handlers
    prevButton.addEventListener('click', showPrevImage);
    nextButton.addEventListener('click', showNextImage);
    slideshowToggle.addEventListener('click', toggleSlideshow);

    // Modal events
    imageModal.addEventListener('hidden.bs.modal', () => {
        stopSlideshow();
    });

    imageModal.addEventListener('show.bs.modal', () => {
        updateImagesList();
        stopSlideshow();
    });

    // Add touch support for mobile devices
    let touchStartX = 0;
    let touchEndX = 0;

    modalImage.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });

    modalImage.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });

    function handleSwipe() {
        const swipeThreshold = 50;
        const swipeDistance = touchEndX - touchStartX;
        
        if (Math.abs(swipeDistance) > swipeThreshold) {
            if (swipeDistance > 0) {
                showPrevImage();
            } else {
                showNextImage();
            }
        }
    }

    // Infinite Scroll Implementation
    class InfiniteScroll {
        constructor() {
            this.container = document.getElementById('gallery-container');
            this.loadingIndicator = document.getElementById('loading-indicator');
            
            if (!this.container || !this.loadingIndicator) return;
            
            this.isLoading = false;
            this.hasMorePages = this.container.dataset.hasNext === 'true';
            this.currentPage = parseInt(this.container.dataset.nextPage) || 1;
            this.observer = null;
            
            this.init();
        }

        init() {
            this.observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting && !this.isLoading && this.hasMorePages) {
                            this.loadMoreImages();
                        }
                    });
                },
                {
                    root: null,
                    rootMargin: '100px',
                    threshold: 0.1
                }
            );

            if (this.loadingIndicator) {
                this.observer.observe(this.loadingIndicator);
            }
        }

        async loadMoreImages() {
            if (this.isLoading || !this.hasMorePages) return;
            
            try {
                this.isLoading = true;
                this.loadingIndicator.style.display = 'block';

                const response = await fetch('/load_more/' + this.currentPage);
                if (!response.ok) throw new Error('HTTP error! status: ' + response.status);
                
                const data = await response.json();
                
                if (data.images && data.images.length > 0) {
                    // Create and append new gallery items
                    for (let i = 0; i < data.images.length; i++) {
                        const image = data.images[i];
                        const galleryItem = document.createElement('div');
                        galleryItem.className = 'gallery-item';
                        galleryItem.dataset.imageId = image.id;
                        
                        galleryItem.innerHTML = `
                            <img src="${image.url}" 
                                 alt="${image.original_filename}"
                                 data-img-src="${image.url}">
                            <div class="gallery-item-overlay">
                                <div class="image-actions">
                                    <button class="btn btn-light view-image">
                                        <i class="fas fa-search"></i>
                                    </button>
                                    <button class="btn btn-danger delete-image" 
                                            data-image-id="${image.id}">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        `;
                        
                        this.container.insertBefore(galleryItem, this.loadingIndicator);
                    }

                    // Update pagination state
                    this.currentPage = data.next_page;
                    this.hasMorePages = data.has_next;
                    
                    // Bind events to new elements
                    this.bindNewElementEvents();
                    
                    // Update modal image list
                    if (typeof updateImagesList === 'function') {
                        updateImagesList();
                    }
                }

                if (!this.hasMorePages) {
                    this.observer.unobserve(this.loadingIndicator);
                    this.loadingIndicator.style.display = 'none';
                }

            } catch (error) {
                console.error('Error loading more images:', error);
                this.loadingIndicator.innerHTML = `
                    <div class="alert alert-danger">
                        Error loading images. <button class="btn btn-link" onclick="infiniteScroll.loadMoreImages()">Retry</button>
                    </div>`;
            } finally {
                this.isLoading = false;
                if (this.hasMorePages) {
                    this.loadingIndicator.style.display = 'none';
                }
            }
        }

        bindNewElementEvents() {
            const newItems = this.container.querySelectorAll('.gallery-item:not([data-bound])');
            newItems.forEach((item) => {
                const viewBtn = item.querySelector('.view-image');
                if (viewBtn) {
                    viewBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const index = Array.from(document.querySelectorAll('.gallery-item')).indexOf(item);
                        showImage(index);
                        modalInstance.show();
                    });
                }
                
                const deleteBtn = item.querySelector('.delete-image');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        if (!confirm('Are you sure you want to delete this image?')) return;
                        
                        const imageId = deleteBtn.dataset.imageId;
                        try {
                            const response = await fetch(`/delete/${imageId}`, {
                                method: 'DELETE'
                            });
                            const data = await response.json();
                            if (data.success) {
                                item.remove();
                                updateImagesList();
                            } else {
                                throw new Error(data.message);
                            }
                        } catch (error) {
                            console.error('Error deleting image:', error);
                            alert('Failed to delete image. Please try again.');
                        }
                    });
                }
                
                item.dataset.bound = 'true';
            });
        }
    }

    // Initialize infinite scroll
    const infiniteScroll = new InfiniteScroll();
    window.infiniteScroll = infiniteScroll;
});
