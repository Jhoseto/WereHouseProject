/**
 * Common JavaScript utilities for Warehouse Portal
 */

// Global utilities object
window.WarehousePortal = {
    // Configuration
    config: {
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
        autoRefreshInterval: 5 * 60 * 1000, // 5 minutes
        maxRetries: 3,
        retryDelay: 1000
    },

    // Utility functions
    utils: {
        /**
         * Format number as currency
         */
        formatCurrency: function(amount, currency = 'лв') {
            if (typeof amount === 'string') {
                amount = parseFloat(amount);
            }
            if (isNaN(amount)) return '0.00 ' + currency;
            return amount.toFixed(2) + ' ' + currency;
        },

        /**
         * Format date in Bulgarian format
         */
        formatDate: function(date, includeTime = false) {
            if (!date) return '—';
            if (typeof date === 'string') {
                date = new Date(date);
            }
            if (includeTime) {
                return date.toLocaleString('bg-BG', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
            return date.toLocaleDateString('bg-BG');
        },

        /**
         * Debounce function
         */
        debounce: function(func, wait, immediate) {
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

        /**
         * Show loading state on button
         */
        setButtonLoading: function(button, loading = true) {
            if (loading) {
                button.setAttribute('data-original-text', button.innerHTML);
                button.innerHTML = '<span class="loading"></span> Зарежда...';
                button.disabled = true;
            } else {
                const originalText = button.getAttribute('data-original-text');
                if (originalText) {
                    button.innerHTML = originalText;
                    button.removeAttribute('data-original-text');
                }
                button.disabled = false;
            }
        },

        /**
         * Show notification
         */
        showNotification: function(message, type = 'info', duration = 5000) {
            // Remove existing notifications
            const existing = document.querySelectorAll('.notification');
            existing.forEach(n => n.remove());

            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.innerHTML = `
                <span class="notification-icon">
                    ${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
                </span>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.remove()">×</button>
            `;

            // Add styles if not already added
            if (!document.getElementById('notification-styles')) {
                const styles = document.createElement('style');
                styles.id = 'notification-styles';
                styles.textContent = `
                    .notification {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        background: white;
                        border-radius: 6px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        padding: 15px;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        z-index: 9999;
                        max-width: 400px;
                        border-left: 4px solid #3498db;
                        animation: slideInRight 0.3s ease;
                    }
                    .notification-success { border-left-color: #27ae60; }
                    .notification-error { border-left-color: #e74c3c; }
                    .notification-warning { border-left-color: #f39c12; }
                    .notification-close {
                        background: none;
                        border: none;
                        font-size: 1.2rem;
                        cursor: pointer;
                        color: #6c757d;
                        padding: 0;
                        margin-left: auto;
                    }
                    @keyframes slideInRight {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                `;
                document.head.appendChild(styles);
            }

            document.body.appendChild(notification);

            if (duration > 0) {
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.style.opacity = '0';
                        setTimeout(() => notification.remove(), 300);
                    }
                }, duration);
            }

            return notification;
        },

        /**
         * Validate form
         */
        validateForm: function(form) {
            const errors = [];
            const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');

            inputs.forEach(input => {
                if (!input.value.trim()) {
                    errors.push(`Полето "${this.getFieldLabel(input)}" е задължително`);
                    input.classList.add('error');
                } else {
                    input.classList.remove('error');
                }

                // Email validation
                if (input.type === 'email' && input.value.trim()) {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(input.value.trim())) {
                        errors.push(`Моля въведете валиден email адрес`);
                        input.classList.add('error');
                    }
                }

                // Number validation
                if (input.type === 'number' && input.value.trim()) {
                    const num = parseFloat(input.value);
                    const min = parseFloat(input.getAttribute('min'));
                    const max = parseFloat(input.getAttribute('max'));

                    if (!isNaN(min) && num < min) {
                        errors.push(`Стойността трябва да бъде поне ${min}`);
                        input.classList.add('error');
                    }
                    if (!isNaN(max) && num > max) {
                        errors.push(`Стойността не може да бъде над ${max}`);
                        input.classList.add('error');
                    }
                }
            });

            return errors;
        },

        /**
         * Get field label for validation
         */
        getFieldLabel: function(input) {
            const label = input.closest('.form-group')?.querySelector('label');
            if (label) {
                return label.textContent.replace(':', '').trim();
            }
            return input.getAttribute('placeholder') || input.name || 'Поле';
        },

        /**
         * Store data in session storage (with fallback)
         */
        setSessionData: function(key, value) {
            try {
                sessionStorage.setItem(key, JSON.stringify(value));
            } catch (e) {
                // Fallback to memory storage if sessionStorage is not available
                this.memoryStorage = this.memoryStorage || {};
                this.memoryStorage[key] = value;
            }
        },

        /**
         * Get data from session storage (with fallback)
         */
        getSessionData: function(key) {
            try {
                const item = sessionStorage.getItem(key);
                return item ? JSON.parse(item) : null;
            } catch (e) {
                // Fallback to memory storage
                return this.memoryStorage?.[key] || null;
            }
        },

        /**
         * Remove data from session storage
         */
        removeSessionData: function(key) {
            try {
                sessionStorage.removeItem(key);
            } catch (e) {
                if (this.memoryStorage) {
                    delete this.memoryStorage[key];
                }
            }
        }
    },

    // HTTP utilities
    http: {
        /**
         * Get CSRF token
         */
        getCsrfToken: function() {
            const token = document.querySelector('meta[name="_csrf"]')?.getAttribute('content') ||
                document.querySelector('input[name="_csrf"]')?.value;
            return token;
        },

        /**
         * Make HTTP request with CSRF protection
         */
        request: async function(url, options = {}) {
            const defaults = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            };

            const csrfToken = this.getCsrfToken();
            if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method?.toUpperCase())) {
                defaults.headers['X-CSRF-TOKEN'] = csrfToken;
            }

            const config = {
                ...defaults,
                ...options,
                headers: { ...defaults.headers, ...options.headers }
            };

            try {
                const response = await fetch(url, config);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    return await response.json();
                }
                return await response.text();

            } catch (error) {
                console.error('HTTP Request failed:', error);
                throw error;
            }
        }
    },

    // Cart utilities
    cart: {
        /**
         * Get cart item count from UI
         */
        getItemCount: function() {
            const badge = document.querySelector('.cart-count');
            return badge ? parseInt(badge.textContent) || 0 : 0;
        },

        /**
         * Update cart badge
         */
        updateBadge: function(count) {
            const badge = document.querySelector('.cart-count');
            if (badge) {
                if (count > 0) {
                    badge.textContent = count;
                    badge.style.display = 'inline-block';
                } else {
                    badge.style.display = 'none';
                }
            }
        },

        /**
         * Add visual feedback for cart operations
         */
        showAddFeedback: function(productName) {
            WarehousePortal.utils.showNotification(
                `Добавен "${productName}" в кошницата`,
                'success',
                3000
            );
        }
    },

    // UI enhancements
    ui: {
        /**
         * Initialize common UI features
         */
        init: function() {
            this.initTooltips();
            this.initFormValidation();
            this.initKeyboardShortcuts();
            this.initScrollToTop();
            this.initTableEnhancements();
        },

        /**
         * Initialize tooltips
         */
        initTooltips: function() {
            document.addEventListener('mouseover', function(e) {
                const element = e.target.closest('[data-tooltip]');
                if (element && !element.querySelector('.tooltip')) {
                    const tooltip = document.createElement('div');
                    tooltip.className = 'tooltip';
                    tooltip.textContent = element.getAttribute('data-tooltip');
                    element.appendChild(tooltip);
                }
            });

            document.addEventListener('mouseout', function(e) {
                const element = e.target.closest('[data-tooltip]');
                if (element) {
                    const tooltip = element.querySelector('.tooltip');
                    if (tooltip) {
                        tooltip.remove();
                    }
                }
            });
        },

        /**
         * Initialize form validation
         */
        initFormValidation: function() {
            document.addEventListener('submit', function(e) {
                const form = e.target;
                if (form.hasAttribute('data-validate')) {
                    const errors = WarehousePortal.utils.validateForm(form);
                    if (errors.length > 0) {
                        e.preventDefault();
                        WarehousePortal.utils.showNotification(
                            errors.join('<br>'),
                            'error'
                        );
                    }
                }
            });
        },

        /**
         * Initialize keyboard shortcuts
         */
        initKeyboardShortcuts: function() {
            document.addEventListener('keydown', function(e) {
                // Ctrl/Cmd + K for search focus
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    const searchInput = document.querySelector('input[name="q"], input[placeholder*="търси"], input[placeholder*="Търси"]');
                    if (searchInput) {
                        searchInput.focus();
                        searchInput.select();
                    }
                }

                // Escape to close modals
                if (e.key === 'Escape') {
                    const modal = document.querySelector('.modal.show');
                    if (modal) {
                        modal.classList.remove('show');
                    }
                }
            });
        },

        /**
         * Initialize scroll to top functionality
         */
        initScrollToTop: function() {
            // Create scroll to top button
            const scrollBtn = document.createElement('button');
            scrollBtn.innerHTML = '↑';
            scrollBtn.className = 'scroll-to-top';
            scrollBtn.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: #3498db;
                color: white;
                border: none;
                font-size: 20px;
                cursor: pointer;
                display: none;
                z-index: 1000;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                transition: all 0.3s ease;
            `;

            scrollBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            document.body.appendChild(scrollBtn);

            // Show/hide on scroll
            window.addEventListener('scroll', WarehousePortal.utils.debounce(() => {
                if (window.pageYOffset > 300) {
                    scrollBtn.style.display = 'block';
                } else {
                    scrollBtn.style.display = 'none';
                }
            }, 100));
        },

        /**
         * Initialize table enhancements
         */
        initTableEnhancements: function() {
            // Make tables responsive
            document.querySelectorAll('.table').forEach(table => {
                if (!table.closest('.table-responsive')) {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'table-responsive';
                    table.parentNode.insertBefore(wrapper, table);
                    wrapper.appendChild(table);
                }
            });

            // Add sorting capabilities
            document.addEventListener('click', function(e) {
                if (e.target.matches('th[data-sort]')) {
                    const th = e.target;
                    const table = th.closest('table');
                    const column = th.getAttribute('data-sort');
                    const tbody = table.querySelector('tbody');
                    const rows = Array.from(tbody.querySelectorAll('tr'));

                    const sortDirection = th.classList.contains('sort-asc') ? 'desc' : 'asc';

                    // Remove sorting classes from all headers
                    table.querySelectorAll('th').forEach(header => {
                        header.classList.remove('sort-asc', 'sort-desc');
                    });

                    th.classList.add(`sort-${sortDirection}`);

                    rows.sort((a, b) => {
                        const aVal = a.querySelector(`td:nth-child(${th.cellIndex + 1})`).textContent.trim();
                        const bVal = b.querySelector(`td:nth-child(${th.cellIndex + 1})`).textContent.trim();

                        const comparison = aVal.localeCompare(bVal, 'bg', { numeric: true });
                        return sortDirection === 'asc' ? comparison : -comparison;
                    });

                    rows.forEach(row => tbody.appendChild(row));
                }
            });
        }
    },

    // Initialize everything when DOM is ready
    init: function() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.ui.init();
            });
        } else {
            this.ui.init();
        }
    }
};

// Auto-initialize
WarehousePortal.init();

// Export for module systems if available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WarehousePortal;
}