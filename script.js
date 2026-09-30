document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', (event) => {
        const quoteButton = event.target.closest('.tape-button');
        if (quoteButton && !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
            if (quoteButton.classList.contains('is-sawing')) {
                event.preventDefault();
                return;
            }

            const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const destination = quoteButton instanceof HTMLAnchorElement ? quoteButton.href : null;
            const saw = document.createElement('span');
            saw.className = 'saw-tool';
            saw.setAttribute('aria-hidden', 'true');
            saw.innerHTML = '<svg viewBox="0 0 170 44" focusable="false"><defs><linearGradient id="steel-tone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7e898d"/><stop offset=".2" stop-color="#d5dad8"/><stop offset=".48" stop-color="#a6afb1"/><stop offset=".72" stop-color="#e0e3df"/><stop offset="1" stop-color="#788286"/></linearGradient><linearGradient id="walnut-tone" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#795239"/><stop offset=".38" stop-color="#483022"/><stop offset="1" stop-color="#261a13"/></linearGradient></defs><path d="M39 10 166 7 157 28 39 27Z" fill="url(#steel-tone)"/><path d="M42 28 48 32 52 28 58 32 62 28 68 32 72 28 78 32 82 28 88 32 92 28 98 32 102 28 108 32 112 28 118 32 122 28 128 32 132 28 138 32 142 28 148 32 152 28" fill="#cbd0ce"/><path d="M11 12Q12 8 17 8H31Q40 9 44 15L42 28Q40 34 33 35H17Q8 34 8 26V19Q8 14 11 12Z" fill="url(#walnut-tone)"/><path d="M15 15Q12 15 12 19V23Q12 27 16 27H21Q25 27 25 23V19Q25 15 21 15Z" fill="#211a15"/><path d="M17 10 29 10M16 32 29 32" stroke="#b28a60" stroke-width=".55" opacity=".48"/><circle cx="34" cy="14" r="1.1" fill="#b28a60"/><circle cx="34" cy="29" r="1.1" fill="#b28a60"/><path d="M46 11 158 8" stroke="#f5f6f3" stroke-width=".45" opacity=".46"/><path d="m61 13-3 10m20-11-3 10m20-11-3 10m20-11-3 10m20-11-3 10m20-11-3 10" stroke="#566166" stroke-width=".45" opacity=".42"/></svg>';
            quoteButton.append(saw);

            if (destination) {
                event.preventDefault();
                quoteButton.classList.add('is-sawing');
                window.setTimeout(() => {
                    window.location.assign(destination);
                }, reducedMotion ? 0 : 720);
            } else {
                quoteButton.classList.add('is-sawing');
                window.setTimeout(() => {
                    saw.remove();
                    quoteButton.classList.remove('is-sawing');
                }, reducedMotion ? 0 : 720);
            }
            return;
        }
    });

    const carousel = document.querySelector('.hero-slider');
    if (carousel) {
        const slides = Array.from(carousel.querySelectorAll('.hero-slide'));
        const dots = Array.from(carousel.querySelectorAll('.slider-dot'));
        const count = carousel.querySelector('.current-slide');
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        let activeIndex = slides.findIndex((slide) => slide.classList.contains('is-active'));
        let timerId;

        const showSlide = (index) => {
            activeIndex = (index + slides.length) % slides.length;

            slides.forEach((slide, slideIndex) => {
                const active = slideIndex === activeIndex;
                slide.classList.toggle('is-active', active);
                slide.setAttribute('aria-hidden', String(!active));
                dots[slideIndex].classList.toggle('is-active', active);
                dots[slideIndex].setAttribute('aria-pressed', String(active));
            });

            if (count) {
                count.textContent = String(activeIndex + 1).padStart(2, '0');
            }
        };

        const stopAutoplay = () => {
            window.clearInterval(timerId);
        };

        const startAutoplay = () => {
            stopAutoplay();
            if (!reducedMotion.matches && !document.hidden) {
                timerId = window.setInterval(() => showSlide(activeIndex + 1), 6000);
            }
        };

        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                showSlide(index);
                startAutoplay();
            });
        });

        carousel.querySelectorAll('[data-slide-direction]').forEach((control) => {
            control.addEventListener('click', () => {
                showSlide(activeIndex + Number(control.dataset.slideDirection));
                startAutoplay();
            });
        });

        carousel.addEventListener('mouseenter', stopAutoplay);
        carousel.addEventListener('mouseleave', startAutoplay);
        carousel.addEventListener('focusin', stopAutoplay);
        carousel.addEventListener('focusout', (event) => {
            if (!carousel.contains(event.relatedTarget)) {
                startAutoplay();
            }
        });
        document.addEventListener('visibilitychange', startAutoplay);
        reducedMotion.addEventListener('change', startAutoplay);
        showSlide(activeIndex < 0 ? 0 : activeIndex);
        startAutoplay();
    }

});
