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
        
        const loadMoreImages = async () => {
            if (loading) return;
            
            const nextPage = parseInt(galleryContainer.dataset.nextPage);
            const hasNext = galleryContainer.dataset.hasNext === 'true';
            
            if (!hasNext) return;
            
            loading = true;
            loadingIndicator.classList.remove('d-none');
            
            try {
                const response = await fetch(`/load_more/${nextPage}`);
                const data = await response.json();
                
                if (data.images.length > 0) {
                    data.images.forEach(image => {
                        const div = document.createElement('div');
                        div.className = 'gallery-item';
                        div.innerHTML = `
                            <img src="${image.url}"
                                 alt="${image.original_filename}"
                                 data-bs-toggle="modal"
                                 data-bs-target="#imageModal"
                                 data-img-src="${image.url}">
                        `;
                        galleryContainer.appendChild(div);
                    });
                    
                    galleryContainer.dataset.nextPage = data.next_page;
                    galleryContainer.dataset.hasNext = data.has_next;
                }
            } catch (error) {
                console.error('Error loading more images:', error);
            } finally {
                loading = false;
                loadingIndicator.classList.add('d-none');
            }
        };
        
        // Intersection Observer for infinite scroll
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    loadMoreImages();
                }
            });
        }, {
            rootMargin: '100px',
        });
        
        observer.observe(loadingIndicator);
    }

    // Image upload handling
    const uploadForm = document.getElementById('upload-form');
    const uploadArea = document.querySelector('.upload-area');
    
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
    }

    function handleFiles(files) {
        const formData = new FormData();
        Array.from(files).forEach(file => {
            formData.append('files[]', file);
        });

        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.href = '/';
            }
        })
        .catch(error => console.error('Error:', error));
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
