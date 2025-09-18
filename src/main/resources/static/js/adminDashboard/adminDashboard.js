/**
 * ADMIN DASHBOARD JAVASCRIPT
 * Минимална функционалност за управление на табове и основни операции
 */

class AdminDashboard {
    constructor() {
        this.currentTab = 'clients';
        this.tabButtons = document.querySelectorAll('.tab-button');
        this.tabContents = document.querySelectorAll('.tab-content');

        this.init();
    }

    /**
     * Инициализиране на dashboard функционалността
     */
    init() {
        this.initTabNavigation();
        this.setActiveTabFromURL();

        // Добавяне на keyboard navigation support
        this.initKeyboardNavigation();
    }

    /**
     * Инициализиране на tab navigation
     */
    initTabNavigation() {
        this.tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabId = e.currentTarget.getAttribute('data-tab');
                this.switchTab(tabId);
            });
        });
    }

    /**
     * Превключване между табове със съществуващата loader система
     * @param {string} tabId - ID на таба който да се активира
     */
    switchTab(tabId) {
        // Проверка дали табът съществува
        const targetTab = document.getElementById(`${tabId}-tab`);
        if (!targetTab) {
            console.warn(`Таб с ID "${tabId}" не е намерен`);
            return;
        }

        // Показване на loader с персонализирани съобщения
        const loadingMessages = {
            'clients': { text: 'Зареждане на клиентите...', sub: 'Подготвяме данните за потребителите' },
            'employees': { text: 'Зареждане на служителите...', sub: 'Обработваме информацията за екипа' },
            'inventory': { text: 'Зареждане на инвентара...', sub: 'Подготвяме продуктовите данни' },
            'system': { text: 'Зареждане на системата...', sub: 'Подготвяме системните настройки' },
            'reports': { text: 'Зареждане на отчетите...', sub: 'Обработваме статистическите данни' }
        };

        const message = loadingMessages[tabId] || { text: 'Зареждане...', sub: 'Моля изчакайте' };
        this.showLoading(message.text, message.sub, `tab-switch-${tabId}`);

        // Симулиране на малка забавяне за по-добър UX при смяна на табове
        setTimeout(() => {
            // Премахване на active класове от всички табове и бутони
            this.tabButtons.forEach(btn => btn.classList.remove('active'));
            this.tabContents.forEach(content => content.classList.remove('active'));

            // Добавяне на active клас към новия таб и бутон
            const activeButton = document.querySelector(`[data-tab="${tabId}"]`);
            const activeContent = document.getElementById(`${tabId}-tab`);

            if (activeButton && activeContent) {
                activeButton.classList.add('active');
                activeContent.classList.add('active');
                this.currentTab = tabId;

                // Обновяване на URL без page reload
                this.updateURL(tabId);
            }

            this.hideLoading();
        }, 250); // Кратко забавяне за smooth UX
    }

    /**
     * Задаване на активен таб от URL параметъра
     */
    setActiveTabFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const tabFromURL = urlParams.get('tab');

        if (tabFromURL && document.getElementById(`${tabFromURL}-tab`)) {
            this.switchTab(tabFromURL);
        }
    }

    /**
     * Обновяване на URL с текущия активен таб
     * @param {string} tabId - ID на активния таб
     */
    updateURL(tabId) {
        const url = new URL(window.location);
        url.searchParams.set('tab', tabId);
        window.history.replaceState({}, '', url);
    }

    /**
     * Инициализиране на keyboard navigation (стрелки за превключване между табове)
     */
    initKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Само ако потребителят не е в input поле
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            const tabs = ['clients', 'employees', 'inventory', 'system', 'reports'];
            const currentIndex = tabs.indexOf(this.currentTab);

            if (e.key === 'ArrowLeft' && currentIndex > 0) {
                e.preventDefault();
                this.switchTab(tabs[currentIndex - 1]);
            } else if (e.key === 'ArrowRight' && currentIndex < tabs.length - 1) {
                e.preventDefault();
                this.switchTab(tabs[currentIndex + 1]);
            }
        });
    }

    /**
     * Показване на loading чрез съществуващата loader система
     * @param {string} text - Основен текст за показване
     * @param {string} subtext - Допълнителен текст
     * @param {string} operation - Тип операция за tracking
     */
    showLoading(text = 'Зареждане...', subtext = 'Моля изчакайте', operation = 'admin-operation') {
        if (window.universalLoader) {
            window.universalLoader.show(text, subtext, 'primary', operation);
        } else {
            console.warn('Universal Loader система не е налична');
        }
    }

    /**
     * Скриване на loading чрез съществуващата loader система
     * @param {number} delay - Забавяне преди скриване в милисекунди
     */
    hideLoading(delay = 0) {
        if (window.universalLoader) {
            window.universalLoader.hide(delay);
        } else {
            console.warn('Universal Loader система не е налична за скриване');
        }
    }

    /**
     * Показване на съобщение чрез съществуващата toast система
     * @param {string} message - Текстът на съобщението
     * @param {string} type - Типът: 'success', 'error', 'warning', 'info'
     * @param {string} title - Заглавие на съобщението (optional)
     */
    showMessage(message, type = 'info', title = '') {
        // Използва съществуващата toast система от приложението
        if (window.toastManager) {
            switch(type) {
                case 'success':
                    window.toastManager.success(message, title);
                    break;
                case 'error':
                    window.toastManager.error(message, title);
                    break;
                case 'warning':
                    window.toastManager.warning(message, title);
                    break;
                case 'info':
                default:
                    window.toastManager.info(message, title);
                    break;
            }
        } else {
            // Fallback ако toast системата не е заредена
            console.warn('Toast система не е налична:', message);
            alert(`${title ? title + ': ' : ''}${message}`);
        }
    }

    /**
     * Статични методи за лесно извикване от external код
     */
    static showSuccess(message, title = 'Успешно!') {
        if (window.toastManager) {
            window.toastManager.success(message, title);
        }
    }

    static showError(message, title = 'Грешка!') {
        if (window.toastManager) {
            window.toastManager.error(message, title);
        }
    }

    static showWarning(message, title = 'Внимание!') {
        if (window.toastManager) {
            window.toastManager.warning(message, title);
        }
    }

    static showInfo(message, title = 'Информация') {
        if (window.toastManager) {
            window.toastManager.info(message, title);
        }
    }

    static showLoading(text = 'Обработва се...', subtext = 'Моля изчакайте', operation = 'admin-operation') {
        if (window.universalLoader) {
            window.universalLoader.show(text, subtext, 'primary', operation);
        }
    }

    static hideLoading(delay = 0) {
        if (window.universalLoader) {
            window.universalLoader.hide(delay);
        }
    }
}

/**
 * Инициализиране на admin dashboard при зареждане на страницата
 */
document.addEventListener('DOMContentLoaded', function() {
    window.adminDashboard = new AdminDashboard();

    // Проверка дали са заредени всички необходими елементи
    if (document.querySelectorAll('.tab-button').length === 0) {
        console.warn('Не са намерени tab buttons. Проверете HTML структурата.');
    }

    if (document.querySelectorAll('.tab-content').length === 0) {
        console.warn('Не са намерени tab contents. Проверете HTML структурата.');
    }
});

/**
 * Export на класа за използване в други модули ако е необходимо
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminDashboard;
}