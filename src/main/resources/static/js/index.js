/**
 * Sunny Group Catering Portal - Index Page JavaScript
 * Modern, performant interactions with Apple/Tesla feel
 */

// ==========================================
// GLOBAL CONFIGURATION
// ==========================================

const CONFIG = {
    animation: {
        duration: 300,
        easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
        stagger: 100
    },
    scroll: {
        offset: 100,
        behavior: 'smooth'
    },
    stats: {
        animationDuration: 2000,
        startDelay: 500
    },
    forms: {
        submitDelay: 1500
    }
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

const Utils = {
    // Debounce function for performance
    debounce(func, wait, immediate) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    },

    // Throttle function for scroll events
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    },

    // Smooth scroll to element
    scrollTo(element, offset = CONFIG.scroll.offset) {
        const target = typeof element === 'string' ? document.querySelector(element) : element;
        if (!target) return;

        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;

        window.scrollTo({
            top: targetPosition,
            behavior: CONFIG.scroll.behavior
        });
    },

    // Check if element is in viewport
    isInViewport(element, threshold = 0.1) {
        const rect = element.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        return (
            rect.top >= 0 - (windowHeight * threshold) &&
            rect.bottom <= windowHeight + (windowHeight * threshold)
        );
    },

    // Format numbers with animation
    animateNumber(element, start, end, duration = 2000, callback = null) {
        const startTime = performance.now();
        const isDecimal = end.toString().includes('.');

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out)
            const easedProgress = 1 - Math.pow(1 - progress, 3);

            const current = start + (end - start) * easedProgress;
            const displayValue = isDecimal ? current.toFixed(1) : Math.floor(current);

            element.textContent = displayValue;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else if (callback) {
                callback();
            }
        };

        requestAnimationFrame(animate);
    }
};

// ==========================================
// NAVIGATION FUNCTIONALITY
// ==========================================

const Navigation = {
    init() {
        this.setupSmoothScroll();
        this.setupScrollProgress();
        this.setupNavVisibility();
    },

    setupSmoothScroll() {
        // Global scroll functions
        window.scrollToLogin = () => Utils.scrollTo('#login');
        window.scrollToRegister = () => Utils.scrollTo('#register');
    },

    setupScrollProgress() {
        const progressBar = document.createElement('div');
        progressBar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 0%;
            height: 3px;
            background: linear-gradient(90deg, var(--color-accent), var(--color-secondary));
            z-index: var(--z-fixed);
            transition: width 0.1s ease;
        `;
        document.body.appendChild(progressBar);

        const updateProgress = Utils.throttle(() => {
            const scrollTop = window.pageYOffset;
            const docHeight = document.body.scrollHeight - window.innerHeight;
            const scrollPercent = (scrollTop / docHeight) * 100;
            progressBar.style.width = Math.min(scrollPercent, 100) + '%';
        }, 10);

        window.addEventListener('scroll', updateProgress);
    },

    setupNavVisibility() {
        const nav = document.querySelector('.top-nav');
        let lastScrollY = window.pageYOffset;
        let ticking = false;

        const updateNav = () => {
            const currentScrollY = window.pageYOffset;

            if (currentScrollY > 100) {
                nav.style.background = 'rgba(44, 62, 80, 0.95)';
                nav.style.backdropFilter = 'blur(20px)';
            } else {
                nav.style.background = 'rgba(255, 255, 255, 0.1)';
                nav.style.backdropFilter = 'blur(20px)';
            }

            lastScrollY = currentScrollY;
            ticking = false;
        };

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateNav);
                ticking = true;
            }
        });
    }
};

// ==========================================
// TAB FUNCTIONALITY
// ==========================================

const TabManager = {
    init() {
        this.setupTabSwitching();
    },

    setupTabSwitching() {
        window.switchTab = (tabName) => {
            // Remove active class from all buttons and panes
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });

            // Add active class to selected button and pane
            const selectedBtn = document.querySelector(`[data-tab="${tabName}"]`);
            const selectedPane = document.querySelector(`#${tabName}`);

            if (selectedBtn) selectedBtn.classList.add('active');
            if (selectedPane) {
                selectedPane.classList.add('active');
                // Focus first input in the active pane
                const firstInput = selectedPane.querySelector('input[type="text"], input[type="email"]');
                if (firstInput) {
                    setTimeout(() => firstInput.focus(), 100);
                }
            }
        };
    }
};

// ==========================================
// FORM HANDLING
// ==========================================

const FormManager = {
    init() {
        this.setupFormValidation();
        this.setupFormSubmissions();
        this.setupInputEnhancements();
    },

    setupFormValidation() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            form.addEventListener('submit', (e) => {
                if (!this.validateForm(form)) {
                    e.preventDefault();
                    this.showFormErrors(form);
                }
            });

            // Real-time validation
            const inputs = form.querySelectorAll('input');
            inputs.forEach(input => {
                input.addEventListener('blur', () => this.validateField(input));
                input.addEventListener('input', Utils.debounce(() => {
                    if (input.classList.contains('is-invalid')) {
                        this.validateField(input);
                    }
                }, 300));
            });
        });
    },

    validateForm(form) {
        const inputs = form.querySelectorAll('input[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });

        return isValid;
    },

    validateField(input) {
        const value = input.value.trim();
        let isValid = true;
        let errorMessage = '';

        // Required field validation
        if (input.hasAttribute('required') && !value) {
            isValid = false;
            errorMessage = 'Това поле е задължително';
        }

        // Email validation
        if (input.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                errorMessage = 'Моля въведете валиден email адрес';
            }
        }

        // Phone validation
        if (input.type === 'tel' && value) {
            const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
            if (!phoneRegex.test(value)) {
                isValid = false;
                errorMessage = 'Моля въведете валиден телефонен номер';
            }
        }

        // Update field appearance
        this.updateFieldState(input, isValid, errorMessage);

        return isValid;
    },

    updateFieldState(input, isValid, errorMessage) {
        const formGroup = input.closest('.form-group');
        if (!formGroup) return;

        // Remove existing error elements
        const existingError = formGroup.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }

        // Update input classes
        input.classList.toggle('is-invalid', !isValid);
        input.classList.toggle('is-valid', isValid && input.value.trim());

        // Add error message if needed
        if (!isValid && errorMessage) {
            const errorElement = document.createElement('div');
            errorElement.className = 'field-error';
            errorElement.style.cssText = `
                color: var(--color-danger);
                font-size: var(--font-size-sm);
                margin-top: var(--space-2);
                animation: slideDown 0.3s ease;
            `;
            errorElement.textContent = errorMessage;
            formGroup.appendChild(errorElement);
        }
    },

    setupFormSubmissions() {
        // Registration form handler
        window.handleRegistration = (event) => {
            event.preventDefault();
            const form = event.target;
            const formData = new FormData(form);

            this.submitForm(form, {
                company: formData.get('company'),
                contact_person: formData.get('contact_person'),
                email: formData.get('email'),
                phone: formData.get('phone')
            });
        };
    },

    async submitForm(form, data) {
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;

        try {
            // Show loading state
            this.setButtonLoading(submitButton, true);

            // Simulate API call (replace with actual endpoint)
            await new Promise(resolve => setTimeout(resolve, CONFIG.forms.submitDelay));

            // Reset form
            form.reset();

            // Show success modal
            this.showSuccessModal();

        } catch (error) {
            console.error('Form submission error:', error);
            this.showErrorMessage('Възникна грешка при изпращането. Моля опитайте отново.');
        } finally {
            // Reset button
            this.setButtonLoading(submitButton, false, originalText);
        }
    },

    setButtonLoading(button, loading, originalText = null) {
        if (loading) {
            button.dataset.originalText = button.innerHTML;
            button.innerHTML = '<span class="loading"></span> Изпраща...';
            button.disabled = true;
        } else {
            button.innerHTML = originalText || button.dataset.originalText;
            button.disabled = false;
            delete button.dataset.originalText;
        }
    },

    showSuccessModal() {
        const modal = document.getElementById('successModal');
        if (modal) {
            modal.classList.add('show');
        }
    },

    showErrorMessage(message) {
        // Create temporary error notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--color-danger);
            color: white;
            padding: var(--space-4) var(--space-6);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-lg);
            z-index: var(--z-modal);
            animation: slideInRight 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    },

    setupInputEnhancements() {
        // Add floating label effect
        const inputs = document.querySelectorAll('.form-input');
        inputs.forEach(input => {
            // Auto-resize phone input
            if (input.type === 'tel') {
                input.addEventListener('input', (e) => {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.startsWith('359')) {
                        value = '+' + value;
                    } else if (value.startsWith('0')) {
                        value = '+359' + value.substring(1);
                    }
                    e.target.value = value;
                });
            }
        });
    }
};

// ==========================================
// MODAL FUNCTIONALITY
// ==========================================

const ModalManager = {
    init() {
        this.setupModalClose();
    },

    setupModalClose() {
        window.closeModal = () => {
            const modal = document.querySelector('.modal.show');
            if (modal) {
                modal.classList.remove('show');
            }
        };

        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                window.closeModal();
            }
        });

        // Close modal on outside click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                window.closeModal();
            }
        });
    }
};

// ==========================================
// STATISTICS ANIMATION
// ==========================================

const StatsAnimator = {
    init() {
        this.setupIntersectionObserver();
    },

    setupIntersectionObserver() {
        const statsSection = document.querySelector('.trust-stats');
        if (!statsSection) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.dataset.animated) {
                    entry.target.dataset.animated = 'true';
                    this.animateStats();
                }
            });
        }, {
            threshold: 0.5
        });

        observer.observe(statsSection);
    },

    animateStats() {
        const statNumbers = document.querySelectorAll('.stat-number');

        statNumbers.forEach((element, index) => {
            const targetValue = parseFloat(element.dataset.count);

            setTimeout(() => {
                Utils.animateNumber(element, 0, targetValue, CONFIG.stats.animationDuration);
            }, index * CONFIG.animation.stagger);
        });
    }
};

// ==========================================
// SCROLL ANIMATIONS
// ==========================================

const ScrollAnimations = {
    init() {
        this.setupScrollReveal();
        this.setupParallax();
    },

    setupScrollReveal() {
        const revealElements = document.querySelectorAll('.feature-card, .trust-stat');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }, index * 100);
                }
            });
        }, {
            threshold: 0.2,
            rootMargin: '0px 0px -50px 0px'
        });

        revealElements.forEach(element => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(30px)';
            element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(element);
        });
    },

    setupParallax() {
        const hero = document.querySelector('.hero');
        if (!hero) return;

        const handleScroll = Utils.throttle(() => {
            const scrolled = window.pageYOffset;
            const parallaxElements = hero.querySelectorAll('.hero-visual');

            parallaxElements.forEach(element => {
                const speed = 0.5;
                element.style.transform = `translateY(${scrolled * speed}px)`;
            });
        }, 16); // ~60fps

        window.addEventListener('scroll', handleScroll);
    }
};

// ==========================================
// KEYBOARD NAVIGATION
// ==========================================

const KeyboardNavigation = {
    init() {
        this.setupShortcuts();
        this.setupFocusManagement();
    },

    setupShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K for search/login focus
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const loginSection = document.getElementById('login');
                if (loginSection) {
                    Utils.scrollTo(loginSection);
                    const firstInput = loginSection.querySelector('input');
                    if (firstInput) {
                        setTimeout(() => firstInput.focus(), 300);
                    }
                }
            }

            // Tab navigation between login tabs
            if (e.key === 'Tab' && e.target.classList.contains('tab-btn')) {
                e.preventDefault();
                const tabs = Array.from(document.querySelectorAll('.tab-btn'));
                const currentIndex = tabs.indexOf(e.target);
                const nextIndex = e.shiftKey ?
                    (currentIndex - 1 + tabs.length) % tabs.length :
                    (currentIndex + 1) % tabs.length;

                tabs[nextIndex].click();
                tabs[nextIndex].focus();
            }
        });
    },

    setupFocusManagement() {
        // Improved focus visibility for accessibility
        const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-nav');
            }
        });

        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-nav');
        });
    }
};

// ==========================================
// PERFORMANCE MONITORING
// ==========================================

const PerformanceMonitor = {
    init() {
        this.trackPageLoad();
        this.trackUserInteractions();
    },

    trackPageLoad() {
        window.addEventListener('load', () => {
            // Use Performance API to track loading metrics
            if ('performance' in window) {
                const perfData = performance.getEntriesByType('navigation')[0];
                console.log('Page Load Metrics:', {
                    domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
                    loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
                    totalTime: perfData.loadEventEnd - perfData.fetchStart
                });
            }
        });
    },

    trackUserInteractions() {
        // Track button clicks for analytics
        document.addEventListener('click', (e) => {
            if (e.target.matches('button, .btn')) {
                const buttonText = e.target.textContent.trim();
                console.log('Button clicked:', buttonText);
                // Here you would send to analytics service
            }
        });

        // Track form submissions
        document.addEventListener('submit', (e) => {
            const formClass = e.target.className;
            // Here you would send to analytics service
        });
    }
};

// ==========================================
// INITIALIZATION
// ==========================================

class SunnyGroupPortal {
    constructor() {
        this.modules = [
            Navigation,
            TabManager,
            FormManager,
            ModalManager,
            StatsAnimator,
            ScrollAnimations,
            KeyboardNavigation,
            PerformanceMonitor
        ];
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initModules());
        } else {
            this.initModules();
        }
    }

    initModules() {
        console.log('🚀 Sunny Group Portal initializing...');

        try {
            this.modules.forEach(module => {
                if (typeof module.init === 'function') {
                    module.init();
                }
            });

            console.log('✅ All modules initialized successfully');

            // Trigger custom event for other scripts
            document.dispatchEvent(new CustomEvent('sunnyPortalReady', {
                detail: { timestamp: Date.now() }
            }));

        } catch (error) {
            console.error('❌ Error initializing modules:', error);
        }
    }
}

// ==========================================
// START APPLICATION
// ==========================================

const app = new SunnyGroupPortal();
app.init();

// Export for external access if needed
window.SunnyPortal = app;

// Add some global styles for enhanced interactions
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideDown {
        from {
            transform: translateY(-10px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }

    /* Enhanced focus styles for keyboard navigation */
    .keyboard-nav *:focus {
        outline: 2px solid var(--color-accent) !important;
        outline-offset: 2px !important;
    }

    /* Form field states */
    .form-input.is-valid {
        border-color: var(--color-success);
        box-shadow: 0 0 0 3px rgba(39, 174, 96, 0.1);
    }

    .form-input.is-invalid {
        border-color: var(--color-danger);
        box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
    }

    /* Loading button animation */
    .btn:disabled {
        cursor: not-allowed;
        opacity: 0.7;
    }

    .loading {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid transparent;
        border-top: 2px solid currentColor;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;

document.head.appendChild(style);