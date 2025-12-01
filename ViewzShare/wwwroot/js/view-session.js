document.addEventListener('DOMContentLoaded', () => {
  // --- Navigation Logic ---
  const scroller = document.getElementById('mainScroller');
  const sections = ['sec1', 'sec2', 'sec3', 'sec4'];

  const nextBtn = document.getElementById('nextBtn');
  const prevBtn = document.getElementById('prevBtn');

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const currentScroll = scroller.scrollTop;
      const height = window.innerHeight;
      const nextIndex = Math.floor((currentScroll + height * 0.5) / height) + 1;
      if (nextIndex < sections.length) {
        document.getElementById(sections[nextIndex]).scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      const currentScroll = scroller.scrollTop;
      const height = window.innerHeight;
      const prevIndex = Math.floor((currentScroll - height * 0.5) / height);
      if (prevIndex >= 0) {
        document.getElementById(sections[prevIndex]).scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // --- Splatter Interaction ---
  window.enableSplatter = function () {
    const overlay = document.getElementById('splatterOverlay');
    const frame = document.querySelector('.splatter-frame');
    if (overlay) overlay.classList.add('hidden');
    if (frame) frame.style.pointerEvents = 'auto';
  };

  // --- Swiper Gallery Logic ---
  let swiperMain = null;
  let swiperThumbs = null;

  // Initialize Swiper
  function initSwiper() {
    // Thumbs Swiper
    swiperThumbs = new Swiper(".mySwiper", {
      spaceBetween: 10,
      slidesPerView: 4,
      freeMode: true,
      watchSlidesProgress: true,
    });

    // Main Swiper
    swiperMain = new Swiper(".mySwiper2", {
      spaceBetween: 10,
      navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
      },
      thumbs: {
        swiper: swiperThumbs,
      },
      keyboard: {
        enabled: true,
      },
    });
  }

  // Load Category
  window.loadGalleryCategory = function (catId, btn) {
    if (!window.galleryData || !window.galleryData[catId]) return;

    // Update Buttons
    document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const images = window.galleryData[catId];
    const galleryWrapper = document.getElementById('galleryWrapper');
    const thumbsWrapper = document.getElementById('thumbsWrapper');

    if (!galleryWrapper || !thumbsWrapper) return;

    // Clear existing
    galleryWrapper.innerHTML = '';
    thumbsWrapper.innerHTML = '';

    // Generate Slides
    images.forEach(img => {
      // Main Slide
      const slide = document.createElement('div');
      slide.className = 'swiper-slide';
      slide.innerHTML = `<img src="${img.img}" alt="${img.caption}" loading="lazy" />`;
      galleryWrapper.appendChild(slide);

      // Thumb Slide
      const thumb = document.createElement('div');
      thumb.className = 'swiper-slide';
      thumb.innerHTML = `<img src="${img.img}" alt="${img.caption}" loading="lazy" />`;
      thumbsWrapper.appendChild(thumb);
    });

    // Re-init Swiper (destroy old if exists to avoid conflicts)
    if (swiperMain) {
      swiperMain.destroy(true, true);
      swiperThumbs.destroy(true, true);
    }

    initSwiper();
  };

  // Initial Load
  loadGalleryCategory('Interior', document.querySelector('.category-btn'));
});
