document.addEventListener('DOMContentLoaded', function() {
    // Dark Mode functionality
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        // Check for saved theme preference or default to light
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        themeToggle.checked = savedTheme === 'dark';

        // Theme toggle handler
        themeToggle.addEventListener('change', function() {
            const theme = this.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
        });
    }

    // Initialize elements
    const galleryContainer = document.getElementById('gallery-container');
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
        
        // Update modal image
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
    function toggleSlideshow() {
        if (slideshowInterval) {
            stopSlideshow();
        } else {
            startSlideshow();
        }
    }

    function startSlideshow() {
        // Stop any existing slideshow first
        stopSlideshow();
        
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
        if (slideshowInterval) {
            clearInterval(slideshowInterval);
            slideshowInterval = null;
            slideshowToggle.innerHTML = '<i class="fas fa-play"></i>';
            slideshowToggle.classList.remove('active');
        }
    }

    // Event Listeners
    galleryContainer.addEventListener('click', (e) => {
        const viewButton = e.target.closest('.view-image');
        if (!viewButton) return;

        const galleryItem = viewButton.closest('.gallery-item');
        const index = Array.from(document.querySelectorAll('.gallery-item')).indexOf(galleryItem);
        
        updateImagesList();
        showImage(index);
        modalInstance.show();
    });

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
        stopSlideshow(); // Ensure slideshow is stopped when opening modal
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
            // Create intersection observer for infinite scroll
            this.observer = new IntersectionObserver(
                (entries) => {
                    if (entries[0].isIntersecting && !this.isLoading && this.hasMorePages) {
                        this.loadMoreImages();
                    }
                },
                {
                    root: null,
                    rootMargin: '100px',
                    threshold: 0.1
                }
            );

            // Start observing the loading indicator
            this.observer.observe(this.loadingIndicator);
        }

        async loadMoreImages() {
            try {
                this.isLoading = true;
                this.loadingIndicator.style.display = 'block';

                const response = await fetch(`/load_more?page=${this.currentPage}`);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                
                const data = await response.json();
                
                if (data.html) {
                    // Insert new content
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(data.html, 'text/html');
                    const newItems = Array.from(doc.body.children);
                    
                    // Insert each new item before the loading indicator
                    newItems.forEach(item => {
                        this.container.insertBefore(item, this.loadingIndicator);
                    });

                    // Update state
                    this.currentPage = parseInt(data.next_page);
                    this.hasMorePages = data.has_next === true;
                    this.container.dataset.nextPage = this.currentPage;
                    this.container.dataset.hasNext = this.hasMorePages;

                    // Update modal image list
                    if (typeof updateImagesList === 'function') {
                        updateImagesList();
                    }

                    // Animate new items
                    newItems.forEach(item => {
                        item.style.opacity = '0';
                        item.style.transform = 'translateY(20px)';
                        requestAnimationFrame(() => {
                            item.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                            item.style.opacity = '1';
                            item.style.transform = 'translateY(0)';
                        });
                    });
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

        // Public method to reset the scroll observer
        reset() {
            if (this.observer) {
                this.observer.disconnect();
                this.init();
            }
        }
    }

    // Initialize infinite scroll
    const infiniteScroll = new InfiniteScroll();
    window.infiniteScroll = infiniteScroll; // Make it available globally for retry button

    // Handle window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => infiniteScroll.reset(), 100);
    });
});
