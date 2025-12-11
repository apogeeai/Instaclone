# Thumbnail Gallery Design Specification

## Overview
Match this Instagram-like gallery design with smooth hover effects, magnifying glass icon, and precise spacing. The design features a clean grid layout with elegant motion graphics on hover.

## Design Specifications

### Background Colors
- **Light Mode Background**: `#ffffff`
- **Dark Mode Background**: `#141414`
- **Navbar Background (Light)**: `#f8f9fa`
- **Navbar Background (Dark)**: `#1a1a1a`

### Header/Navbar
- **Height**: ~56px (Bootstrap default navbar height)
- **Background**: Uses theme-aware background color
- **Padding**: Standard Bootstrap container padding

### Thumbnail Grid Container
- **Max Width**: Use Bootstrap `.container` class (responsive max-widths: 576px, 768px, 992px, 1200px, 1400px)
- **Padding**: `1rem` (16px) on all sides
- **Grid Layout**: CSS Grid with `repeat(auto-fill, minmax(300px, 1fr))`
- **Gap/Spacing**: `1rem` (16px) between thumbnails

### Individual Thumbnails
- **Width**: Responsive, minimum 300px per column
- **Height**: Square aspect ratio (100% padding-bottom technique)
- **Border Radius**: `3px`
- **Overflow**: `hidden`
- **Position**: `relative`
- **Cursor**: `pointer`

### Hover State & Motion Graphics
- **Image Scale**: `transform: scale(1.05)` on hover (smooth 0.3s transition)
- **Overlay**: Dark semi-transparent overlay `rgba(0, 0, 0, 0.5)` appears on hover
- **Overlay Transition**: `opacity: 0` → `opacity: 1` with `0.3s` transition
- **Magnifying Glass Icon**: Font Awesome `fa-search` icon, appears in center of overlay
- **Icon Button**: Light button with search icon, positioned in overlay center

### Animation
- **Initial State**: `opacity: 0`, `transform: translateY(20px)`
- **Animated State**: `opacity: 1`, `transform: translateY(0)`
- **Duration**: `0.5s ease`
- **Animation Name**: `fadeInUp`

## Complete CSS Code

```css
/* CSS Variables for Theme Support */
:root {
    --bg-primary: #ffffff;
    --text-primary: #262626;
    --border-color: #dbdbdb;
    --navbar-bg: #f8f9fa;
    --navbar-text: #262626;
}

[data-theme="dark"] {
    --bg-primary: #141414;
    --text-primary: #ffffff;
    --border-color: #363636;
    --navbar-bg: #1a1a1a;
    --navbar-text: #ffffff;
}

/* Body Background */
body {
    background-color: var(--bg-primary);
    color: var(--text-primary);
    transition: background-color 0.3s, color 0.3s;
}

/* Navbar Styles */
.navbar {
    background-color: var(--navbar-bg) !important;
    transition: background-color 0.3s;
    height: 56px; /* Bootstrap default */
}

.navbar-light .navbar-brand,
.navbar-light .navbar-nav .nav-link {
    color: var(--navbar-text);
}

/* Gallery Grid Container */
.gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem; /* 16px spacing between thumbnails */
    padding: 1rem; /* 16px padding around grid */
    max-width: 100%;
}

/* Individual Thumbnail Item */
.gallery-item {
    position: relative;
    padding-bottom: 100%; /* Maintains square aspect ratio */
    cursor: pointer;
    overflow: hidden;
    border-radius: 3px; /* Exact border radius */
    opacity: 0;
    transform: translateY(20px);
    animation: fadeInUp 0.5s ease forwards;
}

/* Thumbnail Image */
.gallery-item img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s;
}

/* Hover Effect - Image Zoom */
.gallery-item:hover img {
    transform: scale(1.05); /* 5% zoom on hover */
}

/* Hover Overlay */
.gallery-item-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5); /* Dark semi-transparent overlay */
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: 0;
    transition: opacity 0.3s;
}

/* Show Overlay on Hover */
.gallery-item:hover .gallery-item-overlay {
    opacity: 1;
}

/* Action Buttons Container */
.image-actions {
    display: flex;
    gap: 1rem;
}

/* Magnifying Glass Button (View Image) */
.view-image {
    background: rgba(255, 255, 255, 0.9);
    border: none;
    border-radius: 50%;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s;
    cursor: pointer;
}

.view-image:hover {
    background: rgba(255, 255, 255, 1);
    transform: scale(1.1);
}

.view-image i {
    color: #262626;
    font-size: 1.2rem;
}

/* Fade In Up Animation */
@keyframes fadeInUp {
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
```

## HTML Structure

```html
<!-- Container with max-width constraints (Bootstrap container) -->
<div class="container mt-4">
    <!-- Gallery Grid -->
    <div class="gallery-grid" id="gallery-container">
        <!-- Individual Thumbnail -->
        <div class="gallery-item" data-image-id="1">
            <img src="path/to/image.jpg" alt="Image description" data-img-src="path/to/image.jpg">
            <div class="gallery-item-overlay">
                <div class="image-actions">
                    <!-- Magnifying Glass Icon Button -->
                    <button class="btn btn-light view-image">
                        <i class="fas fa-search"></i>
                    </button>
                </div>
            </div>
        </div>
        <!-- Repeat for each thumbnail -->
    </div>
</div>
```

## Required Dependencies

```html
<!-- Font Awesome for Icons -->
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">

<!-- Bootstrap (optional, for container max-widths) -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
```

## JavaScript for Modal/Image Viewer

```javascript
// When magnifying glass icon is clicked, open image in modal/lightbox
document.querySelectorAll('.view-image').forEach(button => {
    button.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const galleryItem = this.closest('.gallery-item');
        const img = galleryItem.querySelector('img');
        const imageSrc = img.dataset.imgSrc || img.src;
        
        // Open your modal/lightbox here with imageSrc
        // Example: openModal(imageSrc);
    });
});
```

## Key Design Points to Match Exactly

1. **Thumbnail Spacing**: Exactly `1rem` (16px) gap between items
2. **Border Radius**: Exactly `3px` - not rounded, just slightly softened corners
3. **Hover Zoom**: Image scales to `1.05` (5% larger) smoothly
4. **Overlay Opacity**: `rgba(0, 0, 0, 0.5)` - 50% black overlay
5. **Magnifying Glass**: Font Awesome `fa-search` icon, centered in overlay
6. **Animation**: Items fade in from below (20px translateY) with 0.5s ease
7. **Square Thumbnails**: Maintained via `padding-bottom: 100%` technique
8. **Grid Responsive**: Minimum 300px per column, expands to fill available space
9. **Container Max Width**: Use Bootstrap container or similar responsive max-widths

## Responsive Behavior

- **Mobile (< 576px)**: 1 column, full width minus padding
- **Tablet (576px - 768px)**: 1-2 columns depending on screen size
- **Desktop (768px+)**: 2-4+ columns, max-width constrained by container

## Testing Checklist

- [ ] Thumbnails are exactly square
- [ ] Border radius is exactly 3px
- [ ] Gap between thumbnails is exactly 16px
- [ ] Hover shows dark overlay at 50% opacity
- [ ] Image zooms to 105% on hover smoothly
- [ ] Magnifying glass icon appears centered on hover
- [ ] Clicking magnifying glass opens image viewer
- [ ] Items fade in from below on page load
- [ ] Background color matches specification
- [ ] Navbar height is ~56px

