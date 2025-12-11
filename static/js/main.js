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
            try {
                // Initialize and verify DOM elements
                this.initializeElements();
                
                // Initialize state
                this.initializeState();
                
                // Initialize components
                this.initialize();
                
                // Log successful initialization
                console.log('InfiniteScroll initialized successfully', {
                    hasMorePages: this.hasMorePages,
                    currentPage: this.currentPage,
                    containerState: {
                        nextPage: this.container.dataset.nextPage,
                        hasNext: this.container.dataset.hasNext
                    }
                });
            } catch (error) {
                console.error('Failed to initialize InfiniteScroll:', error);
                throw error;  // Re-throw to prevent partial initialization
            }
        }

        initializeElements() {
            // Required elements
            this.container = document.getElementById('gallery-container');
            this.loadingIndicator = document.getElementById('loading-indicator');
            this.imageModal = document.getElementById('imageModal');
            
            // Verify required elements
            if (!this.container) {
                throw new Error('Gallery container element not found');
            }
            if (!this.loadingIndicator) {
                throw new Error('Loading indicator element not found');
            }
            if (!this.imageModal) {
                throw new Error('Image modal element not found');
            }
            
            // Initialize modal elements
            this.modalInstance = new bootstrap.Modal(this.imageModal);
            this.modalImage = this.imageModal.querySelector('.modal-image');
            this.prevButton = this.imageModal.querySelector('.modal-prev');
            this.nextButton = this.imageModal.querySelector('.modal-next');
            this.slideshowToggle = this.imageModal.querySelector('.slideshow-toggle');
            
            // Verify modal elements
            if (!this.modalImage || !this.prevButton || !this.nextButton || !this.slideshowToggle) {
                throw new Error('Required modal elements not found');
            }
        }

        initializeState() {
            // Initialize state with validation and persistence
            this.isLoading = false;
            this.hasMorePages = this.validateHasMorePages();
            this.currentPage = this.validateCurrentPage();
            this.currentImageIndex = 0;
            this.images = [];
            this.slideshowInterval = null;
            this.slideshowDelay = 3000;
            this.observer = null;
            this.sentinel = null;
            this.throttleTimeout = null;
            this.throttleDelay = 150;
            this.scrollAnimationFrame = null;
            this.retryCount = 0;
            this.maxRetries = 3;
            
            // Restore scroll position if available
            const savedScrollPosition = sessionStorage.getItem('scrollPosition');
            if (savedScrollPosition) {
                window.scrollTo(0, parseInt(savedScrollPosition));
                sessionStorage.removeItem('scrollPosition');
            }
            
            // Log initial state for debugging
            console.log('Initial state:', {
                hasMorePages: this.hasMorePages,
                currentPage: this.currentPage,
                savedScrollPosition: savedScrollPosition
            });
            
            // Save state before page unload
            window.addEventListener('beforeunload', () => {
                sessionStorage.setItem('scrollPosition', window.scrollY.toString());
            });
        }

        validateHasMorePages() {
            const hasNext = this.container.dataset.hasNext;
            if (typeof hasNext !== 'string') {
                console.warn('data-has-next attribute not found, defaulting to false');
                return false;
            }
            // Update DOM to ensure consistency
            const hasMorePages = hasNext === 'true';
            this.container.dataset.hasNext = hasMorePages.toString();
            return hasMorePages;
        }

        validateCurrentPage() {
            let nextPage;
            
            // Try to get from sessionStorage first
            const storedPage = sessionStorage.getItem('currentPage');
            if (storedPage) {
                nextPage = parseInt(storedPage);
                if (!isNaN(nextPage)) {
                    console.log('Restored page from session:', nextPage);
                    return nextPage;
                }
            }
            
            // Fallback to dataset
            nextPage = parseInt(this.container.dataset.nextPage);
            if (isNaN(nextPage)) {
                console.warn('Invalid next page, defaulting to 1');
                nextPage = 1;
            }
            
            // Update DOM and session storage
            this.container.dataset.nextPage = nextPage.toString();
            sessionStorage.setItem('currentPage', nextPage.toString());
            return nextPage;
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
                    // Only process scroll if we're not loading and have more pages
                    if (!this.isLoading && this.hasMorePages) {
                        const scrollPosition = window.scrollY + window.innerHeight;
                        const threshold = document.documentElement.scrollHeight - 1000;
                        
                        if (scrollPosition >= threshold) {
                            console.log('Scroll threshold reached, loading more images...');
                            this.loadMoreImages();
                        }
                    }
                    
                    this.throttleTimeout = null;
                }, this.throttleDelay);
            });
            
            // Cleanup any existing animation frame when leaving the page
            window.addEventListener('unload', () => {
                if (this.scrollAnimationFrame) {
                    cancelAnimationFrame(this.scrollAnimationFrame);
                }
            }, { once: true });
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

        showLoadingIndicator() {
            // First ensure the content is set
            this.loadingIndicator.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <div class="loading-text mt-2">Loading more images...</div>
                </div>`;
            
            // Then make it visible with a slight delay to ensure smooth animation
            requestAnimationFrame(() => {
                this.loadingIndicator.style.display = 'block';
                requestAnimationFrame(() => {
                    this.loadingIndicator.classList.add('loading');
                });
            });
        }

        hideLoadingIndicator() {
            // First remove the loading class to trigger the fade out
            this.loadingIndicator.classList.remove('loading');
            
            // Wait for the transition to complete before hiding
            setTimeout(() => {
                this.loadingIndicator.style.display = 'none';
            }, 300); // Match this with the CSS transition duration
        }

        showLoadingError(error) {
            this.loadingIndicator.innerHTML = `
                <div class="alert alert-danger">
                    <p>Error loading images: ${error}</p>
                    <button class="btn btn-link p-0" onclick="window.infiniteScroll.loadMoreImages()">
                        Retry
                    </button>
                </div>`;
            this.loadingIndicator.style.display = 'block';
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
            // Disconnect existing observer
            if (this.observer) {
                this.observer.disconnect();
            }

            // Remove old sentinel if it exists
            if (this.sentinel && this.sentinel.parentNode) {
                this.sentinel.parentNode.removeChild(this.sentinel);
            }

            this.observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting && !this.isLoading && this.hasMorePages) {
                            console.log('IntersectionObserver triggered loading');
                            this.loadMoreImages();
                        }
                    });
                },
                {
                    root: null,
                    rootMargin: '500px',
                    threshold: 0
                }
            );

            // Create and observe a sentinel element at the bottom of the container
            this.sentinel = document.createElement('div');
            this.sentinel.style.height = '1px';
            this.sentinel.style.width = '100%';
            this.sentinel.style.gridColumn = '1 / -1';
            this.container.appendChild(this.sentinel);
            this.observer.observe(this.sentinel);

            // Also observe the loading indicator
            if (this.loadingIndicator) {
                this.observer.observe(this.loadingIndicator);
            }
        }

        async loadMoreImages() {
            if (this.isLoading || !this.hasMorePages) return;
            
            this.isLoading = true;
            this.showLoadingIndicator();
            
            // Add a minimum loading time to prevent flickering
            const loadingStartTime = Date.now();
            const minLoadingTime = 500; // milliseconds

            try {
                const response = await fetch(`/load_more/${this.currentPage}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                if (!data) {
                    throw new Error('Invalid response data');
                }
                
                // Reset retry count on successful load
                this.retryCount = 0;
                
                // Ensure minimum loading time
                const loadingEndTime = Date.now();
                const loadingDuration = loadingEndTime - loadingStartTime;
                if (loadingDuration < minLoadingTime) {
                    await new Promise(resolve => setTimeout(resolve, minLoadingTime - loadingDuration));
                }
                
                if (data.images && data.images.length > 0) {
                    const fragment = document.createDocumentFragment();
                    for (const image of data.images) {
                        const galleryItem = await this.createGalleryItem(image);
                        if (galleryItem) {
                            fragment.appendChild(galleryItem);
                            this.setupGalleryItemEventListeners(galleryItem);
                        }
                    }
                    
                    // Batch DOM updates
                    this.container.insertBefore(fragment, this.loadingIndicator);
                    
                    // Update state and persist it
                    this.currentPage = data.next_page;
                    this.hasMorePages = data.has_next;
                    
                    // Update DOM state
                    this.container.dataset.nextPage = this.currentPage.toString();
                    this.container.dataset.hasNext = this.hasMorePages.toString();
                    
                    // Persist state to session
                    sessionStorage.setItem('currentPage', this.currentPage.toString());
                    sessionStorage.setItem('hasMorePages', this.hasMorePages.toString());
                    
                    // Update images list after DOM changes
                    this.updateImagesList();
                    
                    console.log('State updated:', {
                        currentPage: this.currentPage,
                        hasMorePages: this.hasMorePages,
                        imagesCount: this.images.length
                    });
                }

                if (!this.hasMorePages) {
                    this.observer.unobserve(this.loadingIndicator);
                    this.hideLoadingIndicator();
                }
            } catch (error) {
                console.error('Error loading more images:', error);
                this.retryCount++;
                
                if (this.retryCount < this.maxRetries) {
                    console.log(`Retrying... Attempt ${this.retryCount} of ${this.maxRetries}`);
                    setTimeout(() => this.loadMoreImages(), 1000 * this.retryCount);
                } else {
                    this.showLoadingError(error.message);
                }
            } finally {
                this.isLoading = false;
                if (this.hasMorePages) {
                    this.hideLoadingIndicator();
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
            if (this.sentinel && this.sentinel.parentNode) {
                this.sentinel.parentNode.removeChild(this.sentinel);
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

    // Initialize infinite scroll with retry mechanism
    const initializeInfiniteScroll = () => {
        try {
            if (!window.infiniteScroll) {
                window.infiniteScroll = new InfiniteScroll();
            }
        } catch (error) {
            console.error('Failed to initialize infinite scroll:', error);
            // Retry initialization after a short delay
            setTimeout(initializeInfiniteScroll, 1000);
        }
    };

    // Start initialization
    initializeInfiniteScroll();

    // Cleanup on page unload
    window.addEventListener('unload', () => {
        if (window.infiniteScroll) {
            window.infiniteScroll.cleanup();
        }
    });
});