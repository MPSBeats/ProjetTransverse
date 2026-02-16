// public/js/app.js — Initialisation globale

document.addEventListener('DOMContentLoaded', () => {
    // Initialiser AOS (Animate On Scroll)
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 600,
            offset: 100,
            easing: 'ease-out-cubic',
            once: true,
        });
    }

    // Parallaxe Hero (page d'accueil)
    const heroImage = document.getElementById('hero-image');
    if (heroImage) {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            heroImage.style.transform = `translateY(${scrolled * 0.3}px)`;
        }, { passive: true });
    }

    // Smooth scroll pour les ancres
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Navbar hide/show on scroll (mobile)
    let lastScroll = 0;
    const header = document.querySelector('header');
    if (header) {
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            if (currentScroll > lastScroll && currentScroll > 80) {
                header.style.transform = 'translateY(-100%)';
            } else {
                header.style.transform = 'translateY(0)';
            }
            lastScroll = currentScroll;
        }, { passive: true });
    }

    // Star rating interactif (page produit — avis)
    const starRating = document.getElementById('star-rating');
    if (starRating) {
        const stars = starRating.querySelectorAll('.star-icon');
        const radios = starRating.querySelectorAll('input[type="radio"]');
        stars.forEach((star, index) => {
            star.addEventListener('click', () => {
                radios[index].checked = true;
                stars.forEach((s, i) => {
                    s.style.color = i <= index ? '#D4A574' : '#ddd';
                });
            });
            star.addEventListener('mouseenter', () => {
                stars.forEach((s, i) => {
                    s.style.color = i <= index ? '#C4704B' : '#ddd';
                });
            });
        });
        starRating.addEventListener('mouseleave', () => {
            const checked = starRating.querySelector('input:checked');
            const val = checked ? parseInt(checked.value) : 0;
            stars.forEach((s, i) => {
                s.style.color = i < val ? '#D4A574' : '#ddd';
            });
        });
    }
});
