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
        const imageElements = document.querySelectorAll('.gallery-item img');
        images = Array.prototype.slice.call(imageElements);
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
        
        slideshowInterval = setInterval(function() {
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
        galleryContainer.addEventListener('click', function(e) {
            const viewButton = e.target.closest('.view-image');
            if (!viewButton) return;

            const galleryItem = viewButton.closest('.gallery-item');
            const items = Array.prototype.slice.call(document.querySelectorAll('.gallery-item'));
            const index = items.indexOf(galleryItem);
            
            updateImagesList();
            showImage(index);
            modalInstance.show();
        });
    }

    // Mouse wheel navigation
    modalImage.addEventListener('wheel', function(e) {
        e.preventDefault();
        if (e.deltaY > 0) {
            showNextImage();
        } else {
            showPrevImage();
        }
    });

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
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
    imageModal.addEventListener('hidden.bs.modal', function() {
        stopSlideshow();
    });

    imageModal.addEventListener('show.bs.modal', function() {
        updateImagesList();
        stopSlideshow();
    });

    // Add touch support for mobile devices
    let touchStartX = 0;
    let touchEndX = 0;

    modalImage.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
    });

    modalImage.addEventListener('touchend', function(e) {
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
    function InfiniteScroll() {
        this.container = document.getElementById('gallery-container');
        this.loadingIndicator = document.getElementById('loading-indicator');
        
        if (!this.container || !this.loadingIndicator) return;
        
        this.isLoading = false;
        this.hasMorePages = this.container.dataset.hasNext === 'true';
        this.currentPage = parseInt(this.container.dataset.nextPage) || 1;
        this.observer = null;
        this.scrollThrottle = null;
        this.throttleDelay = 250; // Increased throttle delay for better performance
        
        this.init();
    }

    InfiniteScroll.prototype.init = function() {
        if (this.observer) {
            this.observer.disconnect();
        }

        const self = this;
        
        this.observer = new IntersectionObserver(
            function(entries) {
                if (self.scrollThrottle) {
                    clearTimeout(self.scrollThrottle);
                }
                
                self.scrollThrottle = setTimeout(function() {
                    entries.forEach(function(entry) {
                        if (entry.isIntersecting && !self.isLoading && self.hasMorePages) {
                            self.loadMoreImages();
                        }
                    });
                    self.scrollThrottle = null;
                }, self.throttleDelay);
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
    };

    InfiniteScroll.prototype.loadMoreImages = function() {
        if (this.isLoading || !this.hasMorePages) return;
        
        this.isLoading = true;
        this.loadingIndicator.style.display = 'block';

        const self = this;
        
        fetch('/load_more/' + this.currentPage)
            .then(function(response) {
                if (!response.ok) throw new Error('HTTP error! status: ' + response.status);
                return response.json();
            })
            .then(function(data) {
                if (data.images && data.images.length > 0) {
                    data.images.forEach(function(image) {
                        const galleryItem = document.createElement('div');
                        galleryItem.className = 'gallery-item';
                        galleryItem.setAttribute('data-image-id', image.id);
                        
                        galleryItem.innerHTML = [
                            '<img src="' + image.url + '"',
                            '     alt="' + image.original_filename + '"',
                            '     data-img-src="' + image.url + '">',
                            '<div class="gallery-item-overlay">',
                            '    <div class="image-actions">',
                            '        <button class="btn btn-light view-image">',
                            '            <i class="fas fa-search"></i>',
                            '        </button>',
                            '        <button class="btn btn-danger delete-image"',
                            '                onclick="return confirm(\'Are you sure you want to delete this image?\')"',
                            '                data-image-id="' + image.id + '">',
                            '            <i class="fas fa-trash"></i>',
                            '        </button>',
                            '    </div>',
                            '</div>'
                        ].join('\n');
                        
                        self.container.insertBefore(galleryItem, self.loadingIndicator);
                    });

                    // Update pagination state
                    self.currentPage = data.next_page;
                    self.hasMorePages = data.has_next;
                    
                    // Bind events to new elements
                    self.bindNewElementEvents();
                    
                    // Update modal image list
                    updateImagesList();
                }

                if (!self.hasMorePages) {
                    self.observer.unobserve(self.loadingIndicator);
                    self.loadingIndicator.style.display = 'none';
                }
            })
            .catch(function(error) {
                console.error('Error loading more images:', error);
                self.loadingIndicator.innerHTML = [
                    '<div class="alert alert-danger">',
                    '    Error loading images. <button class="btn btn-link" onclick="infiniteScroll.loadMoreImages()">Retry</button>',
                    '</div>'
                ].join('\n');
            })
            .finally(function() {
                self.isLoading = false;
                if (self.hasMorePages) {
                    self.loadingIndicator.style.display = 'none';
                }
            });
    };

    InfiniteScroll.prototype.bindNewElementEvents = function() {
        const newItems = this.container.querySelectorAll('.gallery-item:not([data-bound])');
        const items = Array.prototype.slice.call(document.querySelectorAll('.gallery-item'));
        
        Array.prototype.forEach.call(newItems, function(item) {
            const viewBtn = item.querySelector('.view-image');
            
            if (viewBtn) {
                viewBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const index = items.indexOf(this.closest('.gallery-item'));
                    showImage(index);
                    modalInstance.show();
                });
            }
            
            const deleteBtn = item.querySelector('.delete-image');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    const btn = this;
                    if (!confirm('Are you sure you want to delete this image?')) return;
                    
                    const imageId = btn.dataset.imageId;
                    fetch('/delete/' + imageId, {
                        method: 'DELETE'
                    })
                    .then(function(response) {
                        return response.json();
                    })
                    .then(function(data) {
                        if (data.success) {
                            btn.closest('.gallery-item').remove();
                            updateImagesList();
                        } else {
                            throw new Error(data.message);
                        }
                    })
                    .catch(function(error) {
                        console.error('Error deleting image:', error);
                        alert('Failed to delete image. Please try again.');
                    });
                });
            }
            
            item.setAttribute('data-bound', 'true');
        });
    };

    InfiniteScroll.prototype.cleanup = function() {
        if (this.observer) {
            this.observer.disconnect();
        }
        if (this.scrollThrottle) {
            clearTimeout(this.scrollThrottle);
        }
    };

    // Initialize infinite scroll
    const infiniteScroll = new InfiniteScroll();
    window.infiniteScroll = infiniteScroll;

    // Cleanup on page unload
    window.addEventListener('unload', function() {
        if (infiniteScroll) {
            infiniteScroll.cleanup();
        }
    });
});
