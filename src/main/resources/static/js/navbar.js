// ==========================================
// NAVBAR FUNCTIONALITY
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
// TOAST NOTIFICATIONS
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
            success: 'bi-check-circle',
            error: 'bi-x-circle',
            warning: 'bi-exclamation-triangle',
            info: 'bi-info-circle'
        };

        const titleMap = {
            success: title || 'Успех',
            error: title || 'Грешка',
            warning: title || 'Внимание',
            info: title || 'Информация'
        };

        toast.innerHTML = `
            <div class="toast-icon">
                <i class="bi ${iconMap[type] || iconMap.info}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${titleMap[type]}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="toastManager.hide(${id})">
                <i class="bi bi-x"></i>
            </button>
        `;

        return toast;
    }

    hide(toastId) {
        const toast = this.toasts.get(toastId);
        if (toast) {
            toast.classList.remove('show');

            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
                this.toasts.delete(toastId);
            }, 300);
        }
    }

    success(message, title = '', duration = 5000) {
        return this.show(message, 'success', title, duration);
    }

    error(message, title = '', duration = 0) { // Errors не се скриват автоматично
        return this.show(message, 'error', title, duration);
    }

    warning(message, title = '', duration = 6000) {
        return this.show(message, 'warning', title, duration);
    }

    info(message, title = '', duration = 5000) {
        return this.show(message, 'info', title, duration);
    }

    clear() {
        this.toasts.forEach((toast, id) => {
            this.hide(id);
        });
    }
}

// Глобален instance на ToastManager
const toastManager = new ToastManager();

// ==========================================
// HELPER FUNCTIONS
// ==========================================

// Функция за scroll до login секцията (за index страницата)
function scrollToLogin() {
    const loginSection = document.getElementById('auth-section');
    if (loginSection) {
        loginSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });

        // Активираме login tab-а
        const loginTab = document.querySelector('[data-tab="login"]');
        if (loginTab) {
            loginTab.click();
        }
    }
}

// Функция за scroll до register секцията (за index страницата)
function scrollToRegister() {
    const registerSection = document.getElementById('auth-section');
    if (registerSection) {
        registerSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });

        // Активираме register tab-а
        const registerTab = document.querySelector('[data-tab="register"]');
        if (registerTab) {
            registerTab.click();
        }
    }
}

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    // Проверяваме за Flash съобщения от сървъра
    checkForFlashMessages();

    // Проверяваме за URL параметри за показване на съобщения
    checkUrlParams();
});

// Функция за проверка на Flash съобщения
function checkForFlashMessages() {
    // Тези атрибути ще бъдат сетнати от Thymeleaf
    const successMessage = document.body.dataset.successMessage;
    const errorMessage = document.body.dataset.errorMessage;
    const warningMessage = document.body.dataset.warningMessage;
    const infoMessage = document.body.dataset.infoMessage;

    if (successMessage) {
        toastManager.success(successMessage);
        delete document.body.dataset.successMessage;
    }

    if (errorMessage) {
        toastManager.error(errorMessage);
        delete document.body.dataset.errorMessage;
    }

    if (warningMessage) {
        toastManager.warning(warningMessage);
        delete document.body.dataset.warningMessage;
    }

    if (infoMessage) {
        toastManager.info(infoMessage);
        delete document.body.dataset.infoMessage;
    }
}

// Функция за проверка на URL параметри
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get('logout') === 'true') {
        toastManager.success('Успешно излязохте от системата', 'Изход');

        // Премахваме параметъра от URL-а без да презареждаме страницата
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }

    if (urlParams.get('error') === 'true') {
        toastManager.error('Възникна грешка при влизане', 'Грешка при вход');

        // Премахваме параметъра от URL-а
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }
}

// ==========================================
// EXPORT FOR OTHER SCRIPTS
// ==========================================

// Правим toastManager достъпен глобално
window.toastManager = toastManager;
window.toggleProfileDropdown = toggleProfileDropdown;
window.scrollToLogin = scrollToLogin;
window.scrollToRegister = scrollToRegister;