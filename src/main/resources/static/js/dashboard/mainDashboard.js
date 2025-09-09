/**
 * MAIN DASHBOARD ORCHESTRATOR - PRODUCTION READY
 * ==============================================
 * Координира всички dashboard модули и обработва HTML конфигурацията
 * Служи като единствена точка за стартиране на dashboard приложението
 * Интегрира се с съществуващите модули без дублиране на код
 */

class MainDashboard {
    constructor() {
        // Референции към модулите - ще бъдат създадени при инициализация
        this.api = null;
        this.manager = null;
        this.ui = null;

        // Конфигурация и данни извлечени от HTML-а
        this.config = {};
        this.initialData = {};

        // Състояние на приложението
        this.isInitialized = false;
        this.hasErrors = false;

        // Global function mapping за onclick handlers от HTML-а
        this.globalFunctions = {};

        console.log('🚀 MainDashboard orchestrator created');
    }

    /**
     * ГЛАВНА ТОЧКА ЗА СТАРТИРАНЕ - извиква се автоматично от DOMContentLoaded
     * Това е единствената функция която се стартира автоматично
     */
    async initialize() {
        try {
            console.log('=== MainDashboard Orchestration Started ===');

            // Стъпка 1: Извличаме конфигурацията от HTML глобалните променливи
            this.extractConfigurationFromHTML();

            // Стъпка 2: Валидираме критичните данни
            this.validateConfiguration();

            // Стъпка 3: Създаваме екземплярите на модулите
            this.createModuleInstances();

            // Стъпка 4: Свързваме модулите помежду си
            this.connectModules();

            // Стъпка 5: Създаваме глобалните функции за onclick handlers
            this.setupGlobalFunctions();

            // Стъпка 6: Инициализираме компонентите
            await this.initializeModules();

            // Стъпка 7: Стартираме dashboard-а с начални данни
            await this.startDashboardApplication();

            this.isInitialized = true;
            console.log('✅ MainDashboard orchestration completed successfully');

        } catch (error) {
            this.hasErrors = true;
            console.error('❌ MainDashboard orchestration failed:', error);
            this.handleCriticalError(error);
        }
    }

    /**
     * Извлича конфигурацията от глобалните променливи създадени от Thymeleaf
     * Това е единственото място където взаимодействаме с HTML данните
     */
    extractConfigurationFromHTML() {
        console.log('📥 Extracting configuration from HTML globals...');

        // Извличаме конфигурацията от window.dashboardConfig (ако съществува)
        const htmlConfig = window.dashboardConfig || {};
        const htmlData = window.dashboardData || {};

        // Построяваме нашата конфигурация за модулите
        this.config = {
            // CSRF и сигурност
            csrfToken: htmlConfig.csrfToken || null,
            csrfHeader: htmlConfig.csrfHeader || null,

            // Потребителска информация
            userId: htmlConfig.userId || null,
            userRole: htmlConfig.userRole || 'GUEST',

            // Функционални настройки
            enableRealTimeUpdates: htmlConfig.enableRealTimeUpdates !== false, // default true
            refreshInterval: htmlConfig.refreshInterval || 180000, // 3 минути

            // UI настройки
            animationDuration: 300,
            autoCollapseDetails: true,

            // Debug режим - активен само в development
            debug: this.isDebugMode(),
            verboseLogging: this.isDebugMode()
        };

        // Извличаме началните данни
        this.initialData = {
            urgentCount: htmlData.urgentCount || 0,
            pendingCount: htmlData.pendingCount || 0,
            readyCount: htmlData.readyCount || 0,
            completedCount: htmlData.completedCount || 0,

            // Meta информация
            isValid: this.isValidDataFromServer(htmlData),
            timestamp: new Date().getTime(),
            source: 'server-initial'
        };

        console.log('✓ Configuration extracted:', this.config);
        console.log('✓ Initial data extracted:', this.initialData);
    }

    /**
     * Валидира дали имаме достатъчно данни за стартиране
     */
    validateConfiguration() {
        console.log('🔍 Validating configuration...');

        const warnings = [];
        const errors = [];

        // Проверяваме критичните настройки
        if (!this.config.csrfToken) {
            warnings.push('CSRF token not found - API calls may fail');
        }

        if (!this.config.userId) {
            errors.push('User ID not available - authentication issue');
        }

        if (!this.initialData.isValid) {
            warnings.push('Initial dashboard data not available - will load from API');
        }

        // Логваме предупрежденията
        warnings.forEach(warning => console.warn('⚠️', warning));

        // Ако има критични грешки, спираме
        if (errors.length > 0) {
            throw new Error('Critical configuration issues: ' + errors.join(', '));
        }

        console.log('✓ Configuration validation passed');
    }

    /**
     * Създава екземплярите на трите основни модула
     * Всеки модул получава нашата конфигурация
     */
    createModuleInstances() {
        console.log('🏗️ Creating module instances...');

        // Проверяваме дали всички класове са заредени
        const requiredClasses = ['DashboardAPI', 'DashboardManager', 'DashboardUI'];
        const missingClasses = requiredClasses.filter(className => typeof window[className] === 'undefined');

        if (missingClasses.length > 0) {
            throw new Error(`Required classes not loaded: ${missingClasses.join(', ')}`);
        }

        // Създаваме екземплярите с нашата конфигурация
        this.api = new window.DashboardAPI(this.config);
        this.manager = new window.DashboardManager(this.config);
        this.ui = new window.DashboardUI(); // UI класът приема конфигурацията в initialize()

        console.log('✓ All module instances created successfully');
    }

    /**
     * Свързва модулите помежду си според тяхната архитектура
     */
    connectModules() {
        console.log('🔗 Connecting modules...');

        // Manager се свързва с UI (това е основната връзка)
        this.manager.setUI(this.ui);
        this.ui.setManager(this.manager);

        // Правим модулите достъпни глобално за debugging (само в dev режим)
        if (this.config.debug) {
            window.dashboardAPI = this.api;
            window.dashboardManager = this.manager;
            window.dashboardUI = this.ui;
            window.mainDashboard = this;
            console.log('🔧 Debug: Global references created');
        }

        console.log('✓ Modules connected successfully');
    }

    /**
     * Създава глобалните функции за onclick handlers от HTML-а
     * Това позволява на HTML onclick атрибутите да работят с новите модули
     */
    setupGlobalFunctions() {
        console.log('🔧 Setting up global functions for HTML onclick handlers...');

        // Функции за tab navigation
        window.switchTab = (tabName) => {
            if (this.manager && this.manager.switchTab) {
                this.manager.switchTab(tabName);
            } else {
                console.warn('switchTab called but manager not ready');
            }
        };

        // Функции за header actions
        window.refreshDashboard = () => {
            if (this.manager && this.manager.refreshDashboard) {
                this.manager.refreshDashboard();
            } else {
                console.warn('refreshDashboard called but manager not ready');
            }
        };

        window.toggleNotifications = () => {
            console.log('Notifications feature - to be implemented');
            if (this.ui && this.ui.showNotifications) {
                this.ui.showNotifications();
            }
        };

        window.showSettings = () => {
            console.log('Settings feature - to be implemented');
            if (this.ui && this.ui.showSettings) {
                this.ui.showSettings();
            }
        };

        // Функции за order operations
        window.toggleOrderDetails = (orderId) => {
            if (this.ui && this.ui.toggleOrderDetails) {
                this.ui.toggleOrderDetails(orderId);
            } else {
                console.warn('toggleOrderDetails called but UI not ready');
            }
        };

        window.confirmOrder = (orderId) => {
            if (this.manager && this.manager.confirmOrder) {
                this.manager.confirmOrder(orderId);
            } else {
                console.warn('confirmOrder called but manager not ready');
            }
        };

        window.adjustQuantity = (orderId, productSku, adjustment) => {
            if (this.manager && this.manager.adjustQuantity) {
                this.manager.adjustQuantity(orderId, productSku, adjustment);
            } else {
                console.warn('adjustQuantity called but manager not ready');
            }
        };

        window.updateQuantity = (orderId, productSku, newQuantity) => {
            if (this.manager && this.manager.updateQuantity) {
                this.manager.updateQuantity(orderId, productSku, newQuantity);
            } else {
                console.warn('updateQuantity called but manager not ready');
            }
        };

        window.approveProduct = (orderId, productSku) => {
            if (this.manager && this.manager.approveProduct) {
                this.manager.approveProduct(orderId, productSku);
            } else {
                console.warn('approveProduct called but manager not ready');
            }
        };

        window.rejectProduct = (orderId, productSku) => {
            if (this.manager && this.manager.rejectProduct) {
                this.manager.rejectProduct(orderId, productSku);
            } else {
                console.warn('rejectProduct called but manager not ready');
            }
        };

        // Функции за rejection modal
        window.selectReason = (element, reason) => {
            if (this.ui && this.ui.selectRejectionReason) {
                this.ui.selectRejectionReason(element, reason);
            } else {
                console.warn('selectReason called but UI not ready');
            }
        };

        window.closeRejectionModal = () => {
            if (this.ui && this.ui.closeRejectionModal) {
                this.ui.closeRejectionModal();
            } else {
                console.warn('closeRejectionModal called but UI not ready');
            }
        };

        window.confirmRejection = () => {
            if (this.ui && this.ui.confirmRejection) {
                this.ui.confirmRejection();
            } else {
                console.warn('confirmRejection called but UI not ready');
            }
        };

        console.log('✓ Global functions set up for HTML onclick handlers');
    }

    /**
     * Инициализира всички модули в правилния ред
     */
    async initializeModules() {
        console.log('⚙️ Initializing modules...');

        // Първо инициализираме UI (той setup-ва DOM listeners)
        await this.ui.initialize();

        // След това инициализираме Manager (той прави API заявки)
        await this.manager.initialize();

        console.log('✓ All modules initialized successfully');
    }

    /**
     * Стартира dashboard-а с начални данни
     */
    async startDashboardApplication() {
        console.log('🎯 Starting dashboard application...');

        // Ако имаме валидни начални данни от сървъра, използваме ги
        if (this.initialData.isValid) {
            console.log('📊 Using initial data from server');
            this.ui.updateCounters(this.initialData);
        } else {
            console.log('🔄 No initial data, loading from API...');
            // Manager-ът ще зареди данните чрез API в своя initialize() метод
        }

        // Показваме статистика в конзолата
        this.logStartupStatistics();

        console.log('✅ Dashboard application started successfully');
    }

    /**
     * Показва статистика за debug и monitoring цели
     */
    logStartupStatistics() {
        if (!this.config.verboseLogging) return;

        const totalOrders = this.initialData.urgentCount +
            this.initialData.pendingCount +
            this.initialData.readyCount +
            this.initialData.completedCount;

        console.log(`📊 Dashboard Startup Statistics:`);
        console.log(`   • Total orders: ${totalOrders}`);
        console.log(`   • Urgent: ${this.initialData.urgentCount}`);
        console.log(`   • Pending: ${this.initialData.pendingCount}`);
        console.log(`   • Ready: ${this.initialData.readyCount}`);
        console.log(`   • Completed: ${this.initialData.completedCount}`);
        console.log(`👤 User: ${this.config.userRole} (ID: ${this.config.userId})`);
        console.log(`🔧 Real-time updates: ${this.config.enableRealTimeUpdates ? 'Enabled' : 'Disabled'}`);
    }

    /**
     * Обработва критични грешки при стартиране
     */
    handleCriticalError(error) {
        console.error('🚨 Critical error in dashboard startup:', error);

        // Опитваме се да покажем поне основните counter-и
        try {
            this.displayBasicFallback();

            // Показваме съобщение на потребителя
            if (window.toastManager) {
                window.toastManager.show(
                    'Dashboard-ът се стартира в ограничен режим поради техническа грешка',
                    'warning'
                );
            }
        } catch (fallbackError) {
            console.error('💥 Even fallback failed:', fallbackError);

            // Последна опция - показваме alert
            if (window.toastManager) {
                window.toastManager.show(
                    'Възникна критична грешка при зареждане на dashboard-а',
                    'error'
                );
            } else {
                // Ако дори toastManager не работи
                alert('Критична грешка при зареждане на dashboard-а. Моля, презаредете страницата.');
            }
        }
    }

    /**
     * Fallback функция за основно показване на данни ако модулите се счупят
     */
    displayBasicFallback() {
        console.log('🛟 Applying basic fallback display...');

        // Обновяваме counter елементите директно
        const counterElements = {
            'urgent-count': this.initialData.urgentCount,
            'pending-count': this.initialData.pendingCount,
            'ready-count': this.initialData.readyCount,
            'completed-count': this.initialData.completedCount
        };

        Object.entries(counterElements).forEach(([elementId, value]) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = value || 0;
            }
        });

        // Обновяваме и badge елементите ако съществуват
        const badgeElements = {
            'urgent-badge': this.initialData.urgentCount,
            'pending-badge': this.initialData.pendingCount,
            'ready-badge': this.initialData.readyCount
        };

        Object.entries(badgeElements).forEach(([elementId, value]) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = value || 0;
            }
        });

        console.log('✓ Basic fallback applied successfully');
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    /**
     * Проверява дали сме в debug режим
     */
    isDebugMode() {
        return window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.search.includes('debug=true') ||
            localStorage.getItem('dashboard-debug') === 'true';
    }

    /**
     * Проверява дали данните от сървъра са валидни
     */
    isValidDataFromServer(data) {
        return data &&
            typeof data.urgentCount === 'number' &&
            typeof data.pendingCount === 'number' &&
            typeof data.readyCount === 'number' &&
            typeof data.completedCount === 'number';
    }

    /**
     * Публичен API за рестартиране на dashboard-а
     */
    async restart() {
        console.log('🔄 Restarting dashboard...');

        // Спираме текущите процеси
        if (this.manager && this.manager.destroy) {
            this.manager.destroy();
        }

        // Рестартираме
        this.isInitialized = false;
        this.hasErrors = false;
        await this.initialize();
    }

    /**
     * Публичен API за получаване на статус на dashboard-а
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            hasErrors: this.hasErrors,
            config: this.config,
            initialData: this.initialData,
            modules: {
                api: !!this.api,
                manager: !!this.manager,
                ui: !!this.ui
            },
            timestamp: new Date().getTime()
        };
    }
}

// ==========================================
// АВТОМАТИЧНО СТАРТИРАНЕ
// ==========================================

// Създаваме единствена глобална инстанция
window.mainDashboard = new MainDashboard();

// Стартираме когато DOM-ът е готов
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌟 DOM ready, starting MainDashboard...');
    window.mainDashboard.initialize();
});

// Export за модулни системи ако се използва
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MainDashboard;
}