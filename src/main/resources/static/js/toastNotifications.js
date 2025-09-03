/ ==========================================
// TOAST NOTIFICATIONS JAVASCRIPT
// ==========================================

// Auto-hide toasts after 5 seconds
document.addEventListener('DOMContentLoaded', function() {
    const toasts = document.querySelectorAll('.toast');

    toasts.forEach(toast => {
        // Auto hide after 5 seconds
        setTimeout(() => {
            hideToast(toast);
        }, 5000);

        // Add hover to pause auto-hide
        let timeoutId;

        toast.addEventListener('mouseenter', () => {
            clearTimeout(timeoutId);
            toast.style.animationPlayState = 'paused';
        });

        toast.addEventListener('mouseleave', () => {
            toast.style.animationPlayState = 'running';
            timeoutId = setTimeout(() => {
                hideToast(toast);
            }, 2000); // 2 more seconds on mouse leave
        });
    });
});

// Close toast by ID
function closeToast(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
        hideToast(toast);
    }
}

// Hide toast with animation
function hideToast(toast) {
    if (!toast) return;

    toast.classList.add('toast-hiding');

    setTimeout(() => {
        toast.remove();
    }, 300); // Match CSS animation duration
}

// Show toast programmatically (за използване от JavaScript)
function showToast(type, title, message, duration = 5000) {
    const container = document.querySelector('.toast-container');
    if (!container) return;

    const toastId = 'toast_' + Date.now();
    const iconClass = getToastIcon(type);

    const toastHTML = `
        <div class="toast toast-${type}" id="${toastId}">
            <div class="toast-icon">
                <i class="${iconClass}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="closeToast('${toastId}')">
                <i class="bi bi-x"></i>
            </button>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', toastHTML);

    const newToast = document.getElementById(toastId);

    // Auto hide
    setTimeout(() => {
        hideToast(newToast);
    }, duration);

    return newToast;
}

// Get icon class for toast type
function getToastIcon(type) {
    switch (type) {
        case 'success':
            return 'bi bi-check-circle-fill';
        case 'error':
            return 'bi bi-exclamation-triangle-fill';
        case 'info':
            return 'bi bi-info-circle-fill';
        case 'warning':
            return 'bi bi-exclamation-triangle-fill';
        default:
            return 'bi bi-info-circle-fill';
    }
}

// Helper functions for easy use
window.Toast = {
    success: (title, message, duration) => showToast('success', title, message, duration),
    error: (title, message, duration) => showToast('error', title, message, duration),
    info: (title, message, duration) => showToast('info', title, message, duration),
    warning: (title, message, duration) => showToast('warning', title, message, duration)
};

// Example usage:
// Toast.success('Успешно!', 'Операцията беше завършена успешно');
// Toast.error('Грешка!', 'Възникна грешка при обработката');
// Toast.info('Информация', 'Това е информационно съобщение');

/*
Добави този код в:
1. src/main/resources/static/js/index.js (в края на файла)
или
2. В <script> таг в края на index.html преди </body>
*/