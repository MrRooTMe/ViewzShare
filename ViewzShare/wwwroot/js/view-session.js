        const ids = ["sec1","sec2","sec3","sec4"];
        const sec2El = document.getElementById("sec2");
        const scroller = document.scrollingElement || document.documentElement;
        const scrollPrevBtn = document.querySelector('[data-scroll-prev]');
        const scrollNextBtn = document.querySelector('[data-scroll-next]');

        // enable splatter interaction on click
        if (sec2El) {
          sec2El.addEventListener("click", e => {
            if (e.target.closest(".nav-arrows")) return;
            sec2El.classList.add("interact");
          }, { passive: true });
        }

        function resetSplatter() {
          sec2El?.classList.remove("interact");
        }

        function currentIndex() {
          const y = window.scrollY + window.innerHeight / 2;
          let best = 0, bestDist = Infinity;
          for (let i = 0; i < ids.length; i++) {
            const el = document.getElementById(ids[i]);
            if (!el) continue;
            const rect = el.getBoundingClientRect();
            const mid = rect.top + window.scrollY + rect.height / 2;
            const d = Math.abs(mid - y);
            if (d < bestDist) { bestDist = d; best = i; }
          }
          return best;
        }

        // Helper: temporarily disable snap so programmatic scroll isn't blocked
        function withSnapDisabled(fn) {
          document.documentElement.classList.add("no-snap");
          document.body.classList.add("no-snap");
          try { fn(); } finally {
            // give the browser time to start the smooth scroll, then re-enable
            setTimeout(() => {
              document.documentElement.classList.remove("no-snap");
              document.body.classList.remove("no-snap");
            }, 350);
          }
        }

        function scrollToIndex(i) {
          const el = document.getElementById(ids[i]);
          if (!el) return;
          withSnapDisabled(() => {
            // Prefer scrollIntoView for reliability across engines
            el.scrollIntoView({ behavior: "smooth", block: "start" });

            // Fallback kick (some engines need a direct scrollTo on the scroller)
            setTimeout(() => {
              const top = el.offsetTop || 0;
              scroller.scrollTo({ top, behavior: "smooth" });
            }, 0);
          });
        }

        // Upper arrow: go one section up (and reset splatter if we're currently on sec2)
        function scrollPrev() {
          const i = currentIndex();
          if (ids[i] === "sec2") resetSplatter();
          scrollToIndex(Math.max(0, i - 1));
        }

        // Lower arrow: jump straight to LAST section (Liked Apartments)
        function scrollNext() {
          resetSplatter(); // keep transition clean
          scrollToIndex(ids.length - 1); // go to sec4
        }

        scrollPrevBtn?.addEventListener('click', scrollPrev);
        scrollNextBtn?.addEventListener('click', scrollNext);

        // Optional: if user scrolls away from Splatter manually, restore overlay
        let scrollTimer;
        window.addEventListener("scroll", () => {
          clearTimeout(scrollTimer);
          scrollTimer = setTimeout(() => {
            const i = currentIndex();
            if (ids[i] !== "sec2") resetSplatter();
          }, 120);
        }, { passive: true });

        // PhotoSwipe-powered gallery
        import('https://unpkg.com/photoswipe@5/dist/photoswipe-lightbox.esm.js').then(({ default: PhotoSwipeLightbox }) => {
          const galleryRoot = document.querySelector('[data-gallery-root]');
          if (!galleryRoot) return;

          const tabs = Array.from(galleryRoot.querySelectorAll('[data-gallery-tab]'));
          const thumbs = Array.from(galleryRoot.querySelectorAll('[data-gallery-thumb]'));
          const previewImg = galleryRoot.querySelector('[data-gallery-preview-img]');
          const prevBtn = galleryRoot.querySelector('[data-gallery-prev]');
          const nextBtn = galleryRoot.querySelector('[data-gallery-next]');
          const fullscreenBtn = galleryRoot.querySelector('[data-gallery-fullscreen]');

          let activeCategory = tabs.find(tab => tab.classList.contains('active'))?.dataset.category || tabs[0]?.dataset.category || '';
          let activeThumbIndex = 0;

          function getVisibleThumbs() {
            return thumbs.filter(thumb => !thumb.hidden && thumb.dataset.image);
          }

          function setPreviewFromThumb(thumb) {
            if (thumb && !thumb.hidden && previewImg) {
              const label = thumb.dataset.label || thumb.dataset.title || 'תמונה';
              previewImg.src = thumb.dataset.image || '';
              previewImg.alt = label;
              previewImg.hidden = false;

              const vis = getVisibleThumbs();
              const idx = vis.indexOf(thumb);
              if (idx >= 0) {
                activeThumbIndex = idx;
              }
            } else if (previewImg) {
              previewImg.removeAttribute('src');
              previewImg.removeAttribute('alt');
              previewImg.hidden = true;
            }
          }

          const lightbox = new PhotoSwipeLightbox({
            gallery: '[data-gallery-root]',
            children: '[data-gallery-thumb]:not([hidden])',
            showHideAnimationType: 'zoom',
            pswpModule: () => import('https://unpkg.com/photoswipe@5/dist/photoswipe.esm.js')
          });

          lightbox.addFilter('itemData', (itemData, element) => {
            return (!activeCategory || element.dataset.category === activeCategory) ? itemData : false;
          });

          lightbox.init();

          lightbox.on('close', () => {
            fullscreenBtn?.setAttribute('aria-pressed', 'false');
          });

          function updatePreview() {
            const visibleThumbs = getVisibleThumbs();
            if (!visibleThumbs.length) {
              activeThumbIndex = 0;
              setPreviewFromThumb(null);
              return;
            }

            if (activeThumbIndex >= visibleThumbs.length) {
              activeThumbIndex = 0;
            }

            setPreviewFromThumb(visibleThumbs[activeThumbIndex]);
          }

          function movePreview(delta) {
            const visibleThumbs = getVisibleThumbs();
            if (!visibleThumbs.length) return;
            activeThumbIndex = (activeThumbIndex + delta + visibleThumbs.length) % visibleThumbs.length;
            setPreviewFromThumb(visibleThumbs[activeThumbIndex]);
          }

          function toggleFullscreen() {
            if (!fullscreenBtn) return;
            const visibleThumbs = getVisibleThumbs();
            const targetIndex = visibleThumbs.length ? activeThumbIndex : 0;
            fullscreenBtn.setAttribute('aria-pressed', 'true');
            lightbox.loadAndOpen(targetIndex);
          }

          function setCategory(category) {
            activeCategory = category;
            tabs.forEach(tab => {
              const isActive = tab.dataset.category === category;
              tab.classList.toggle('active', isActive);
              tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });

            thumbs.forEach(thumb => {
              const matches = !category || thumb.dataset.category === category;
              thumb.hidden = !matches;
            });

            activeThumbIndex = 0;
            updatePreview();
            lightbox.refresh();
          }

          tabs.forEach(tab => {
            tab.addEventListener('click', () => {
              setCategory(tab.dataset.category || '');
            });
          });

          thumbs.forEach(thumb => {
            thumb.addEventListener('click', () => {
              setPreviewFromThumb(thumb);
            });
          });

          prevBtn?.addEventListener('click', () => movePreview(-1));
          nextBtn?.addEventListener('click', () => movePreview(1));
          fullscreenBtn?.addEventListener('click', toggleFullscreen);

          if (tabs.length) {
            setCategory(activeCategory);
          } else {
            updatePreview();
          }
        });

        // Hide query parameters after load
        if (window.history.replaceState) {
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }
 

