/**
 * УНИВЕРСАЛЕН LOADING SPINNER MANAGER - SmolyanVote
 * ===============================================
 */

class UniversalLoader {
    constructor() {
        this.overlay = null;
        this.container = null;
        this.spinner = null;
        this.textElement = null;
        this.subtextElement = null;
        this.isActive = false;
        this.currentOperation = null;

        this.createElements();
    }

    /**
     * Създава DOM елементите за спинера
     */
    createElements() {
        // Основен overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'universal-loader-overlay';
        this.overlay.id = 'universalLoaderOverlay';

        // Container
        this.container = document.createElement('div');
        this.container.className = 'universal-loader-container';

        // Spinner
        this.spinner = document.createElement('div');
        this.spinner.className = 'universal-spinner';

        // Text elements
        this.textElement = document.createElement('p');
        this.textElement.className = 'universal-loader-text';
        this.textElement.textContent = 'Зареждане...';

        this.subtextElement = document.createElement('p');
        this.subtextElement.className = 'universal-loader-subtext';
        this.subtextElement.textContent = 'Моля изчакайте';

        // Съставяне
        this.container.appendChild(this.spinner);
        this.container.appendChild(this.textElement);
        this.container.appendChild(this.subtextElement);
        this.overlay.appendChild(this.container);

        // Добавяне към DOM
        document.body.appendChild(this.overlay);

        // Event listeners
        this.setupEventListeners();
    }

    /**
     * Настройка на event listeners
     */
    setupEventListeners() {
        // ESC клавиш за затваряне (само ако не е critical операция)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isActive && !this.isCriticalOperation()) {
                this.hide();
            }
        });

        // Блокира скролинга при активен loader
        this.overlay.addEventListener('wheel', (e) => {
            e.preventDefault();
        }, { passive: false });
    }

    /**
     * Показва loader с fullscreen overlay
     * @param {string} text - Основен текст
     * @param {string} subtext - Допълнителен текст
     * @param {string} variant - Вариант на спинера (primary, secondary, accent)
     * @param {string} operation - Тип операция за tracking
     */
    show(text = 'Зареждане...', subtext = 'Моля изчакайте', variant = 'primary', operation = 'generic') {
        if (this.isActive) return;

        this.isActive = true;
        this.currentOperation = operation;

        // Задава текстовете
        this.textElement.textContent = text;
        this.subtextElement.textContent = subtext;

        // Задава вариант на спинера
        this.spinner.className = `universal-spinner ${variant}`;

        // Показва с анимация
        requestAnimationFrame(() => {
            this.overlay.classList.add('active');
        });

        // Блокира скролинга
        document.body.style.overflow = 'hidden';
        document.body.classList.add('loading-disabled');

        console.log(`🔄 Warehouse Loader: ${operation} - ${text}`);
    }

    /**
     * Скрива loader с плавна анимация
     * @param {number} delay - Забавяне преди скриване (ms)
     */
    hide(delay = 0) {
        if (!this.isActive) return;

        setTimeout(() => {
            this.overlay.classList.remove('active');

            // Почиства след анимацията
            setTimeout(() => {
                this.isActive = false;
                this.currentOperation = null;
                document.body.style.overflow = '';
                document.body.classList.remove('loading-disabled');
            }, 400);

            console.log('✅ Warehouse Loader: Hidden');
        }, delay);
    }

    /**
     * Проверява дали loader-ът е активен
     */
    isShowing() {
        return this.isActive;
    }

    /**
     * Проверява дали текущата операция е критична (не може да се прекъсне)
     */
    isCriticalOperation() {
        const criticalOps = ['checkout', 'payment', 'save', 'delete'];
        return criticalOps.includes(this.currentOperation);
    }

    /**
     * Бърза операция с автоматично скриване
     * @param {string} text
     * @param {string} subtext
     * @param {number} duration
     * @param {string} variant
     */
    showQuick(text, subtext = '', duration = 1500, variant = 'primary') {
        this.show(text, subtext, variant, 'quick');
        this.hide(duration);
    }

    /**
     * Показва loader за количката
     */
    showCart(operation = 'add') {
        const messages = {
            add: ['Добавяне в количката...', 'Обновяване на количеството'],
            update: ['Обновяване...', 'Запазване на промените'],
            remove: ['Премахване...', 'Изтриване от количката'],
            load: ['Зареждане на количката...', 'Получаване на данни']
        };

        const [text, subtext] = messages[operation] || messages.add;
        this.show(text, subtext, 'secondary', `cart_${operation}`);
    }



    /**
     * Унищожава loader-а и почиства ресурсите
     */
    destroy() {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        this.isActive = false;
        document.body.style.overflow = '';
        document.body.classList.remove('loading-disabled');
    }
}

/**
 * UTILITY FUNCTIONS - За лесна интеграция
 * ======================================
 */

/**
 * Добавя loading състояние към бутон
 * @param {HTMLElement} button
 * @param {boolean} loading
 */
function setButtonLoading(button, loading) {
    if (!button) return;

    if (loading) {
        button.classList.add('btn-loading');
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
    } else {
        button.classList.remove('btn-loading');
        button.disabled = false;
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
            delete button.dataset.originalText;
        }
    }
}

/**
 * Добавя loading състояние към панел
 * @param {HTMLElement} panel
 * @param {boolean} loading
 */
function setPanelLoading(panel, loading) {
    if (!panel) return;

    if (loading) {
        panel.classList.add('loading-disabled');

        // Добавя spinner ако няма
        if (!panel.querySelector('.panel-spinner')) {
            const spinner = document.createElement('div');
            spinner.className = 'panel-spinner';
            spinner.style.position = 'absolute';
            spinner.style.top = '50%';
            spinner.style.left = '50%';
            spinner.style.transform = 'translate(-50%, -50%)';
            spinner.style.zIndex = '1000';

            panel.style.position = 'relative';
            panel.appendChild(spinner);
        }
    } else {
        panel.classList.remove('loading-disabled');

        // Премахва spinner
        const spinner = panel.querySelector('.panel-spinner');
        if (spinner) {
            spinner.remove();
        }
    }
}

/**
 * INITIALIZATION - Автоматично създаване при load
 * ==============================================
 */
document.addEventListener('DOMContentLoaded', function() {
    // Създава глобален instance
    if (!window.universalLoader) {
        window.universalLoader = new UniversalLoader();
        console.log('✓ Universal Loader initialized for Warehouse Portal');
    }
});

// Export за модулна употреба
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UniversalLoader, setButtonLoading, setPanelLoading };
}