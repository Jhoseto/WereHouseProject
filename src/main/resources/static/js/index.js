/**
 * INDEX.JS - МИНИМАЛЕН И ЧИСТ
 * ============================
 * Само необходимите функции за index страницата
 */

// ==========================================
// SCROLL TO LOGIN - Глобална функция за HTML
// ==========================================
function scrollToLogin() {
    const loginSection = document.getElementById('login');
    if (loginSection) {
        // Премахваме #login от URL-а ако има
        if (window.location.hash) {
            history.replaceState(null, null, ' ');
        }

        loginSection.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });

        // Focus на username input след scroll
        setTimeout(() => {
            const usernameInput = loginSection.querySelector('input[name="username"]');
            if (usernameInput) {
                usernameInput.focus();
            }
        }, 600);
    }
}

// ==========================================
// FIX: Scroll to top при refresh
// ==========================================
window.addEventListener('load', () => {
    // Ако има hash в URL-а и не е първо зареждане, премахваме го
    if (window.location.hash && !sessionStorage.getItem('scrollHandled')) {
        history.replaceState(null, null, ' ');
        window.scrollTo(0, 0);
    }
    sessionStorage.setItem('scrollHandled', 'true');
});

// ==========================================
// SCROLL PROGRESS BAR
// ==========================================
function setupScrollProgress() {
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 0%;
        height: 3px;
        background: linear-gradient(90deg, var(--color-accent), var(--color-primary));
        z-index: 10000;
        transition: width 0.1s ease;
    `;
    document.body.appendChild(progressBar);

    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset;
        const docHeight = document.body.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;
        progressBar.style.width = Math.min(scrollPercent, 100) + '%';
    });
}

// ==========================================
// SMOOTH SCROLL ANIMATIONS
// ==========================================
function setupScrollAnimations() {
    // Fade-in за карти при scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    // Observe всички карти
    document.querySelectorAll('.feature-card, .account-card, .tech-item, .custom-item').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
}

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    setupScrollProgress();
    setupScrollAnimations();
    console.log('✅ Index.js loaded');
});