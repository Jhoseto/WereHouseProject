/**
 * Orders Navigation Badge Management
 * Управлява показването на броя pending поръчки в навигацията
 */

class OrdersNavManager {
    constructor() {
        this.badgeElement = null;
        this.refreshInterval = null;
        this.init();
    }

    init() {
        this.badgeElement = document.getElementById('ordersCount');

        if (this.badgeElement) {
            this.loadOrdersCount();
            this.setupAutoRefresh();
        }
    }

    async loadOrdersCount() {
        try {
            const response = await fetch('/api/orders/count', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.updateBadge(data.pendingCount || 0);
            }
        } catch (error) {
            console.log('Could not load orders count:', error.message);
            // Не показваме грешка, просто не показваме badge
        }
    }

    updateBadge(count) {
        if (!this.badgeElement) return;

        if (count > 0) {
            this.badgeElement.textContent = count > 99 ? '99+' : count.toString();
            this.badgeElement.style.display = 'block';
            this.badgeElement.style.opacity = '0';

            // Fade in animation
            setTimeout(() => {
                this.badgeElement.style.transition = 'opacity 0.3s ease';
                this.badgeElement.style.opacity = '1';
            }, 10);

            // Pulse animation for new orders
            this.badgeElement.classList.add('badge-pulse');
            setTimeout(() => {
                this.badgeElement.classList.remove('badge-pulse');
            }, 1000);
        } else {
            this.badgeElement.style.display = 'none';
        }
    }

    setupAutoRefresh() {
        // Обновявай на всеки 2 минути
        this.refreshInterval = setInterval(() => {
            this.loadOrdersCount();
        }, 120000);
    }

    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
}

// CSS стилове за badge анимацията
const badgeStyles = `
    @keyframes badge-pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
    }
    
    .badge-pulse {
        animation: badge-pulse 0.6s ease-in-out;
    }
    
    .nav-badge {
        transition: all 0.3s ease;
    }
    
    .nav-badge:hover {
        transform: scale(1.1);
    }
`;

// Добави стиловете
const styleSheet = document.createElement('style');
styleSheet.textContent = badgeStyles;
document.head.appendChild(styleSheet);

// Инициализирай при зареждане на страницата
document.addEventListener('DOMContentLoaded', () => {
    window.ordersNavManager = new OrdersNavManager();
});

// Cleanup при затваряне на страницата
window.addEventListener('beforeunload', () => {
    if (window.ordersNavManager) {
        window.ordersNavManager.destroy();
    }
});

// Export за външна употреба
window.OrdersNavManager = OrdersNavManager;