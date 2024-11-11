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

    // Infinite Scroll Implementation
    class InfiniteScroll {
        constructor() {
            // Initialize DOM elements
            this.container = document.getElementById('gallery-container');
            this.loadingIndicator = document.getElementById('loading-indicator');
            this.imageModal = document.getElementById('imageModal');
            
            if (!this.container || !this.loadingIndicator || !this.imageModal) {
                console.warn('Some required elements not found for infinite scroll');
                return;
            }
            
            // Initialize modal elements
            this.modalInstance = new bootstrap.Modal(this.imageModal);
            this.modalImage = this.imageModal.querySelector('.modal-image');
            this.prevButton = this.imageModal.querySelector('.modal-prev');
            this.nextButton = this.imageModal.querySelector('.modal-next');
            this.slideshowToggle = this.imageModal.querySelector('.slideshow-toggle');
            
            // Initialize state
            this.isLoading = false;
            this.hasMorePages = this.container.dataset.hasNext === 'true';
            this.currentPage = parseInt(this.container.dataset.nextPage) || 1;
            this.currentImageIndex = 0;
            this.images = [];
            this.slideshowInterval = null;
            this.slideshowDelay = 3000;
            this.observer = null;
            this.throttleTimeout = null;
            this.throttleDelay = 250;
            this.scrollAnimationFrame = null;

            // Initialize components
            this.initialize();
        }

        initialize() {
            this.updateImagesList();
            this.setupEventListeners();
            this.setupIntersectionObserver();
            this.setupGalleryItems();
        }

        setupGalleryItems() {
            document.querySelectorAll('.gallery-item').forEach(item => {
                this.setupGalleryItemEventListeners(item);
            });
        }

        setupEventListeners() {
            // Scroll and resize events with throttling
            window.addEventListener('scroll', () => this.handleScroll(), { passive: true });
            window.addEventListener('resize', () => this.handleResize(), { passive: true });
            
            // Modal navigation
            this.prevButton.addEventListener('click', () => this.showPrevImage());
            this.nextButton.addEventListener('click', () => this.showNextImage());
            this.slideshowToggle.addEventListener('click', () => this.toggleSlideshow());

            // Modal image events
            this.modalImage.addEventListener('wheel', (e) => {
                e.preventDefault();
                if (e.deltaY > 0) {
                    this.showNextImage();
                } else {
                    this.showPrevImage();
                }
            });

            // Keyboard navigation
            document.addEventListener('keydown', (e) => {
                if (!this.imageModal.classList.contains('show')) return;
                
                switch(e.key) {
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.showPrevImage();
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.showNextImage();
                        break;
                    case 'Escape':
                        this.modalInstance.hide();
                        break;
                    case ' ':
                        e.preventDefault();
                        this.toggleSlideshow();
                        break;
                }
            });

            // Touch events
            let touchStartX = 0;
            this.modalImage.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
            }, { passive: true });

            this.modalImage.addEventListener('touchend', (e) => {
                const touchEndX = e.changedTouches[0].screenX;
                const swipeThreshold = 50;
                const swipeDistance = touchEndX - touchStartX;
                
                if (Math.abs(swipeDistance) > swipeThreshold) {
                    if (swipeDistance > 0) {
                        this.showPrevImage();
                    } else {
                        this.showNextImage();
                    }
                }
            }, { passive: true });

            // Modal lifecycle events
            this.imageModal.addEventListener('hidden.bs.modal', () => {
                if (this.slideshowInterval) {
                    this.stopSlideshow();
                }
            });

            this.imageModal.addEventListener('show.bs.modal', () => {
                this.updateImagesList();
            });
        }

        handleScroll() {
            if (this.scrollAnimationFrame) {
                cancelAnimationFrame(this.scrollAnimationFrame);
            }

            this.scrollAnimationFrame = requestAnimationFrame(() => {
                if (this.throttleTimeout) return;

                this.throttleTimeout = setTimeout(() => {
                    const scrollPosition = window.innerHeight + window.pageYOffset;
                    const threshold = document.documentElement.scrollHeight - 800;
                    
                    if (scrollPosition >= threshold && !this.isLoading && this.hasMorePages) {
                        this.loadMoreImages();
                    }
                    this.throttleTimeout = null;
                }, this.throttleDelay);
            });
        }

        handleResize() {
            if (this.throttleTimeout) {
                clearTimeout(this.throttleTimeout);
            }
            
            this.throttleTimeout = setTimeout(() => {
                this.setupIntersectionObserver();
            }, this.throttleDelay);
        }

        updateImagesList() {
            this.images = Array.from(document.querySelectorAll('.gallery-item img'));
        }

        showImage(index) {
            if (index < 0 || index >= this.images.length) return;
            
            this.currentImageIndex = index;
            const imgSrc = this.images[index].dataset.imgSrc;
            this.modalImage.src = imgSrc;
            this.modalImage.alt = this.images[index].alt;
            
            this.prevButton.style.visibility = index > 0 ? 'visible' : 'hidden';
            this.nextButton.style.visibility = index < this.images.length - 1 ? 'visible' : 'hidden';
        }

        showNextImage() {
            if (this.currentImageIndex < this.images.length - 1) {
                this.showImage(this.currentImageIndex + 1);
            }
        }

        showPrevImage() {
            if (this.currentImageIndex > 0) {
                this.showImage(this.currentImageIndex - 1);
            }
        }

        toggleSlideshow() {
            if (this.slideshowInterval) {
                this.stopSlideshow();
            } else {
                this.startSlideshow();
            }
        }

        startSlideshow() {
            if (this.slideshowInterval) return;
            
            this.slideshowToggle.innerHTML = '<i class="fas fa-pause"></i>';
            this.slideshowToggle.classList.add('active');
            
            this.slideshowInterval = setInterval(() => {
                if (this.currentImageIndex >= this.images.length - 1) {
                    this.showImage(0);
                } else {
                    this.showNextImage();
                }
            }, this.slideshowDelay);
        }

        stopSlideshow() {
            if (!this.slideshowInterval) return;
            
            clearInterval(this.slideshowInterval);
            this.slideshowInterval = null;
            this.slideshowToggle.innerHTML = '<i class="fas fa-play"></i>';
            this.slideshowToggle.classList.remove('active');
        }

        setupIntersectionObserver() {
            if (this.observer) {
                this.observer.disconnect();
            }

            this.observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting && !this.isLoading && this.hasMorePages) {
                            this.loadMoreImages();
                        }
                    });
                },
                {
                    root: null,
                    rootMargin: '200px',
                    threshold: 0.1
                }
            );

            if (this.loadingIndicator) {
                this.observer.observe(this.loadingIndicator);
            }
        }

        async loadMoreImages() {
            if (this.isLoading || !this.hasMorePages) return;
            
            this.isLoading = true;
            this.loadingIndicator.style.display = 'block';

            try {
                const response = await fetch(`/load_more/${this.currentPage}`);
                if (!response.ok) throw new Error('HTTP error! status: ' + response.status);
                
                const data = await response.json();
                
                if (data.images && data.images.length > 0) {
                    for (const image of data.images) {
                        const galleryItem = await this.createGalleryItem(image);
                        if (galleryItem) {
                            this.container.insertBefore(galleryItem, this.loadingIndicator);
                            this.setupGalleryItemEventListeners(galleryItem);
                        }
                    }
                    
                    this.currentPage = data.next_page;
                    this.hasMorePages = data.has_next;
                    this.updateImagesList();
                }

                if (!this.hasMorePages) {
                    this.observer.unobserve(this.loadingIndicator);
                    this.loadingIndicator.style.display = 'none';
                }
            } catch (error) {
                console.error('Error loading more images:', error);
                this.loadingIndicator.innerHTML = `
                    <div class="alert alert-danger">
                        Error loading images. 
                        <button class="btn btn-link" onclick="window.infiniteScroll.loadMoreImages()">
                            Retry
                        </button>
                    </div>`;
            } finally {
                this.isLoading = false;
                if (this.hasMorePages) {
                    this.loadingIndicator.style.display = 'none';
                }
            }
        }

        createGalleryItem(image) {
            return new Promise((resolve) => {
                const galleryItem = document.createElement('div');
                galleryItem.className = 'gallery-item';
                galleryItem.setAttribute('data-image-id', image.id);
                
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
                    </div>`;

                const img = galleryItem.querySelector('img');
                img.addEventListener('load', () => resolve(galleryItem));
                img.addEventListener('error', () => {
                    console.error(`Failed to load image: ${image.url}`);
                    resolve(null);
                });
            });
        }

        setupGalleryItemEventListeners(galleryItem) {
            const viewBtn = galleryItem.querySelector('.view-image');
            if (viewBtn) {
                viewBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const items = Array.from(document.querySelectorAll('.gallery-item'));
                    const index = items.indexOf(galleryItem);
                    this.showImage(index);
                    this.modalInstance.show();
                });
            }

            const deleteBtn = galleryItem.querySelector('.delete-image');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!confirm('Are you sure you want to delete this image?')) return;
                    
                    const imageId = deleteBtn.dataset.imageId;
                    try {
                        const response = await fetch(`/delete/${imageId}`, {
                            method: 'DELETE'
                        });
                        const data = await response.json();
                        
                        if (data.success) {
                            galleryItem.remove();
                            this.updateImagesList();
                        } else {
                            throw new Error(data.message);
                        }
                    } catch (error) {
                        console.error('Error deleting image:', error);
                        alert('Failed to delete image. Please try again.');
                    }
                });
            }
        }

        cleanup() {
            if (this.observer) {
                this.observer.disconnect();
            }
            if (this.throttleTimeout) {
                clearTimeout(this.throttleTimeout);
            }
            if (this.scrollAnimationFrame) {
                cancelAnimationFrame(this.scrollAnimationFrame);
            }
            if (this.slideshowInterval) {
                clearInterval(this.slideshowInterval);
            }
        }
    }

    // Initialize infinite scroll
    try {
        window.infiniteScroll = new InfiniteScroll();
    } catch (error) {
        console.error('Failed to initialize infinite scroll:', error);
    }

    // Cleanup on page unload
    window.addEventListener('unload', () => {
        if (window.infiniteScroll) {
            window.infiniteScroll.cleanup();
        }
    });
});
