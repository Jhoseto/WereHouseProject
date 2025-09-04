// ==========================================
// NAVBAR FUNCTIONALITY - ОБНОВЕН
// ==========================================

// Profile dropdown functionality
function toggleProfileDropdown() {
    const dropdown = document.getElementById('profileDropdown');
    const profileCard = document.querySelector('.user-profile-card');

    if (dropdown && profileCard) {
        dropdown.classList.toggle('show');
        profileCard.classList.toggle('active');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const profileSection = document.querySelector('.user-profile-section');
    const dropdown = document.getElementById('profileDropdown');
    const profileCard = document.querySelector('.user-profile-card');

    if (profileSection && !profileSection.contains(event.target)) {
        dropdown?.classList.remove('show');
        profileCard?.classList.remove('active');
    }
});

// Close dropdown on escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const dropdown = document.getElementById('profileDropdown');
        const profileCard = document.querySelector('.user-profile-card');
        dropdown?.classList.remove('show');
        profileCard?.classList.remove('active');
    }
});

// ==========================================
// CART PANEL INTEGRATION
// ==========================================

/**
 * Отваря/затваря cart панела - глобална функция за HTML onclick
 */
function toggleCartPanel() {
    if (window.cartPanel) {
        if (window.cartPanel.isOpen) {
            window.cartPanel.close();
        } else {
            window.cartPanel.open();
        }
    }
}

/**
 * Затваря cart панела - глобална функция за HTML onclick
 */
function closeCartPanel() {
    window.cartPanel?.close();
}

// ==========================================
// SCROLL FUNCTIONS FOR INDEX PAGE
// ==========================================

function scrollToLogin() {
    const loginSection = document.getElementById('login');
    if (loginSection) {
        loginSection.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });

        // Focus на първия input
        setTimeout(() => {
            const usernameInput = loginSection.querySelector('input[name="username"]');
            usernameInput?.focus();
        }, 500);
    }
}

function scrollToRegister() {
    const registerSection = document.getElementById('register');
    if (registerSection) {
        registerSection.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });

        // Focus на първия input
        setTimeout(() => {
            const usernameInput = registerSection.querySelector('input[name="username"]');
            usernameInput?.focus();
        }, 500);
    }
}

// ==========================================
// TOAST NOTIFICATIONS - БЕЗ ПРОМЕНИ
// ==========================================

class ToastManager {
    constructor() {
        this.container = document.getElementById('toastContainer');
        this.toasts = new Map();
        this.nextId = 1;
    }

    show(message, type = 'info', title = '', duration = 5000) {
        if (!this.container) {
            console.warn('Toast container не е намерен');
            return;
        }

        const toastId = this.nextId++;
        const toast = this.createToast(toastId, message, type, title);

        this.container.appendChild(toast);
        this.toasts.set(toastId, toast);

        // Анимация за показване
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        // Автоматично премахване
        if (duration > 0) {
            setTimeout(() => {
                this.hide(toastId);
            }, duration);
        }

        return toastId;
    }

    createToast(id, message, type, title) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.dataset.toastId = id;

        const iconMap = {
            success: 'bi-check-circle-fill',        // ✓ в кръг
            error: 'bi-exclamation-triangle-fill',  // ! в триъгълник
            warning: 'bi-exclamation-triangle',     // ! в триъгълник (по-светъл)
            info: 'bi-info-circle-fill'             // i в кръг
        };

        const icon = iconMap[type] || iconMap.info;
        const titleHtml = title ? `<div class="toast-title">${this.escapeHtml(title)}</div>` : '';

        toast.innerHTML = `
            <div class="toast-icon">
                <i class="${icon}"></i>
            </div>
            <div class="toast-content">
                ${titleHtml}
                <div class="toast-message">${this.escapeHtml(message)}</div>
            </div>
            <button class="toast-close" onclick="window.toastManager.hide(${id})">
                <i class="bi bi-x"></i>
            </button>
        `;

        return toast;
    }

    hide(toastId) {
        const toast = this.toasts.get(toastId);
        if (toast) {
            toast.classList.remove('show');
            toast.classList.add('hiding');

            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
                this.toasts.delete(toastId);
            }, 300);
        }
    }

    success(message, title = '') {
        return this.show(message, 'success', title);
    }

    error(message, title = '') {
        return this.show(message, 'error', title);
    }

    warning(message, title = '') {
        return this.show(message, 'warning', title);
    }

    info(message, title = '') {
        return this.show(message, 'info', title);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    // Инициализира toast manager
    window.toastManager = new ToastManager();

    // Проверява дали има flash съобщения и ги показва
    const flashMessages = document.querySelectorAll('.alert[data-auto-dismiss="true"]');
    flashMessages.forEach(alert => {
        const type = alert.classList.contains('alert-success') ? 'success' :
            alert.classList.contains('alert-danger') ? 'error' :
                alert.classList.contains('alert-warning') ? 'warning' : 'info';

        const message = alert.textContent.trim();
        if (message) {
            window.toastManager.show(message, type);
        }

        // Премахва оригиналния alert
        alert.remove();
    });

    // Auto-hide за останалите alerts
    const autoHideAlerts = document.querySelectorAll('.alert[data-auto-hide="true"]');
    autoHideAlerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 300);
        }, 5000);
    });
});

// ==========================================
// NAVBAR SCROLL EFFECTS (ако е нужно)
// ==========================================

// Добавя scroll ефект към navbar ако е нужно
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.top-nav');
    if (navbar) {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(44, 62, 80, 0.95)';
            navbar.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.15)';
        } else {
            navbar.style.background = 'rgba(44, 62, 80, 0.9)';
            navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
        }
    }
});

// ==========================================
// ACCESSIBILITY IMPROVEMENTS
// ==========================================

// Keyboard navigation за dropdowns
document.addEventListener('keydown', function(event) {
    // ESC затваря всички отворени панели
    if (event.key === 'Escape') {
        // Затваря profile dropdown
        const dropdown = document.getElementById('profileDropdown');
        const profileCard = document.querySelector('.user-profile-card');
        dropdown?.classList.remove('show');
        profileCard?.classList.remove('active');

        // Затваря cart panel
        window.cartPanel?.close();
    }

    // Enter на cart иконата отваря панела
    if (event.key === 'Enter' && event.target.classList.contains('standalone-cart-icon')) {
        toggleCartPanel();
    }
});

// Focus management за accessibility
function focusFirstInput(container) {
    const firstInput = container.querySelector('input, button, select, textarea');
    if (firstInput) {
        firstInput.focus();
    }
}

// ==========================================
// PERFORMANCE OPTIMIZATION
// ==========================================

// Debounce функция за performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle scroll events за по-добра performance
const throttledScrollHandler = debounce(function() {
    // Scroll logic тук ако е нужно
}, 100);

window.addEventListener('scroll', throttledScrollHandler);