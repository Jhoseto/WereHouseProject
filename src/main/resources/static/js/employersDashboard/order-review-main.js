/**
 * ORDER REVIEW SYSTEM - COMPLETE WORKING IMPLEMENTATION
 * ====================================================
 * Professional order review interface with real-time inventory tracking
 */

class OrderReviewOrchestrator {
    constructor() {
        this.dashboardManager = null;
        this.dashboardApi = null;
        this.orderReviewCatalog = null;
        this.config = window.orderReviewConfig || {};
        this.isInitialized = false;
        this.currentOrderId = this.config.orderId;
        this.orderData = null;
        this.realTimeEnabled = false;
        this.changeTracker = new Map();
        this.eventListeners = new Map();
    }

    async initialize() {
        try {
            this.validateConfiguration();
            await this.initializeDashboardInfrastructure();
            await this.loadInitialOrderData();
            await this.initializeOrderReviewCatalog();
            this.setupUserInterfaceEvents();
            this.completeInitialization();
            return true;
        } catch (error) {
            this.handleInitializationError(error);
            return false;
        }
    }

    validateConfiguration() {
        const requiredConfig = ['orderId', 'csrfToken', 'csrfHeader'];
        const missingConfig = requiredConfig.filter(key => !this.config[key]);

        if (missingConfig.length > 0) {
            throw new Error(`Missing required configuration: ${missingConfig.join(', ')}`);
        }

        if (!Number.isInteger(this.config.orderId) || this.config.orderId <= 0) {
            throw new Error(`Invalid order ID: ${this.config.orderId}`);
        }

        const requiredElements = ['order-items-container', 'loading-state', 'approval-controls', 'order-statistics'];
        const missingElements = requiredElements.filter(id => !document.getElementById(id));

        if (missingElements.length > 0) {
            throw new Error(`Missing required DOM elements: ${missingElements.join(', ')}`);
        }
    }


    async initializeDashboardInfrastructure() {
        if (window.mainDashboard && window.mainDashboard.api && window.mainDashboard.manager) {
            this.dashboardApi = window.mainDashboard.api;
            this.dashboardManager = window.mainDashboard.manager;
            console.log('Using existing dashboard infrastructure');
        } else {
            console.warn('MainDashboard not available, creating standalone instances');
            this.dashboardApi = new DashboardApi();
            await this.dashboardApi.initialize();

            window.dashboardApi = this.dashboardApi;

            const ui = new DashboardUI();
            ui.initialize();

            this.dashboardManager = new DashboardManager();
            await this.dashboardManager.initialize(this.dashboardApi, ui);
        }
    }

    async loadInitialOrderData() {
        this.updateLoadingState('Зареждане на данни за поръчката...');

        try {
            if (this.config.orderData && this.config.orderData.id) {
                this.orderData = this.config.orderData;
                this.updateOrderStatistics(this.orderData);
            }

            const freshOrderData = await this.dashboardApi.getOrderDetails(this.currentOrderId);

            if (freshOrderData.success) {
                this.orderData = {
                    ...this.orderData,
                    ...freshOrderData.data,
                    items: freshOrderData.data.items || [],
                    dataTimestamp: new Date().toISOString(),
                    dataSource: 'fresh'
                };
            } else {
                throw new Error(freshOrderData.message || 'Failed to load order data');
            }
        } catch (error) {
            if (this.orderData && this.orderData.id) {
                this.orderData.dataSource = 'cached';
                this.showDataFreshnessWarning();
            } else {
                throw new Error('No order data available from any source');
            }
        }
    }

    async initializeOrderReviewCatalog() {
        this.updateLoadingState('Настройване на интерфейса...');

        this.orderReviewCatalog = new OrderReviewCatalog(this.currentOrderId);
        await this.orderReviewCatalog.init();
        this.setupCatalogEventHandlers();
    }

    setupUserInterfaceEvents() {
        // Approval controls
        this.addEventHandler('approve-order', 'click', () => this.handleOrderApproval());
        this.addEventHandler('reject-order', 'click', () => this.handleOrderRejection());
        this.addEventHandler('preview-corrections', 'click', () => this.handleCorrectionPreview());

        // Modal controls
        this.addEventHandler('confirm-rejection', 'click', () => this.handleRejectionConfirmation());
        this.addEventHandler('cancel-rejection', 'click', () => this.handleRejectionCancellation());

        // Modal close handlers
        document.querySelectorAll('.modal-close, .preview-close').forEach(btn => {
            this.addEventHandler(btn, 'click', () => {
                this.hideRejectionModal();
                this.hideCorrectionPreview();
            });
        });

        const modal = document.getElementById('rejection-modal');
        if (modal) {
            this.addEventHandler(modal, 'click', (e) => {
                if (e.target === modal) {
                    this.hideRejectionModal();
                }
            });
        }

        // Workflow steps
        document.querySelectorAll('.workflow-step').forEach((step, index) => {
            this.addEventHandler(step, 'click', () => this.handleWorkflowStepClick(index));
        });

        // Keyboard shortcuts
        this.addEventHandler(document, 'keydown', (event) => this.handleKeyboardShortcuts(event));
    }

    completeInitialization() {
        this.hideLoadingState();
        this.showOrderInterface();
        this.isInitialized = true;
        this.updateWorkflowIndicators();

        if (window.toastManager) {
            window.toastManager.success(
                `Поръчка ${this.currentOrderId} заредена с ${this.orderData.items?.length || 0} артикула.`
            );
        }

        setTimeout(() => {
            const overlay = document.querySelector('.approval-controls-overlay');
            if (overlay) overlay.style.display = 'block';
        }, 300);
    }

    // Event Handlers
    async handleOrderApproval() {
        try {
            this.showApprovalInProgress();

            // Провери дали има промени
            const hasLocalChanges = this.orderReviewCatalog.hasUnsavedChanges();
            const hasTrackedChanges = this.changeTracker.size > 0;

            if (!hasLocalChanges && !hasTrackedChanges) {
                // Директно одобри без корекции
                const result = await this.dashboardManager.approveOrder(this.currentOrderId, '');

                if (result.success) {
                    this.handleApprovalSuccess(result);
                } else {
                    this.handleApprovalFailure(result);
                }

            } else {
                // Одобри с корекции
                const correctionNote = this.generateCorrectionNote();
                const modifications = this.orderReviewCatalog.getModifiedItems();

                // Валидира промените
                const validationResult = await this.performFinalValidation();
                if (!validationResult.success) {
                    this.handleValidationFailure(validationResult);
                    return;
                }

                // Подготви данните за промените
                const changes = Array.from(modifications.entries()).map(([productId, change]) => ({
                    productId: productId,
                    originalQuantity: change.originalQuantity,
                    newQuantity: change.newQuantity,
                    changeType: change.changeType
                }));

                // Изпрати заявката
                const result = await this.dashboardApi.approveOrderWithBatchChanges(
                    this.currentOrderId,
                    changes,
                    correctionNote
                );

                if (result.success) {
                    this.handleApprovalSuccess(result);
                } else {
                    this.handleApprovalFailure(result);
                }
            }

        } catch (error) {
            this.handleApprovalError(error);
        } finally {
            this.hideApprovalInProgress();
        }
    }

    handleOrderRejection() {
        this.showRejectionModal();
    }

    handleCorrectionPreview() {
        const preview = document.getElementById('correction-preview');
        const summary = document.getElementById('correction-summary');

        if (preview && summary) {
            if (this.changeTracker.size === 0) {
                summary.innerHTML = '<p class="no-changes"> Няма направени корекции. Поръчката ще бъде одобрена както е поръчана.</p>';
            } else {
                const correctionNote = this.generateCorrectionNote();
                const changesList = this.orderReviewCatalog.getChangesSummary();

                summary.innerHTML = `
                <div class="changes-overview">
                    <h4>Обобщение на промените:</h4>
                    <ul class="changes-list">
                        ${changesList.map(change => `<li>${change}</li>`).join('')}
                    </ul>
                </div>
                <div class="client-message">
                    <h4>Съобщение до клиента:</h4>
                    <div class="message-preview">${correctionNote.replace(/\n/g, '<br>')}</div>
                </div>
            `;
            }

            preview.classList.remove('hidden');
        }
    }

    handleRejectionConfirmation() {
        const selected = document.querySelector('.reason-option.selected');
        const noteField = document.getElementById('rejection-note');
        let reason = '';

        if (selected) {
            // Ако има избрана опция, използвай нея
            reason = selected.dataset.reason;
        } else if (noteField && noteField.value.trim()) {
            // Ако няма избрана опция, но има custom текст
            reason = noteField.value.trim();
        } else {
            // Ако няма нито избрана опция, нито custom текст
            if (window.toastManager) {
                window.toastManager.error('Моля изберете причина за отказ');
            }
            return;
        }

        // Добави custom бележка ако има такава И е различна от избраната причина
        const customNote = noteField ? noteField.value.trim() : '';
        if (customNote && customNote !== reason) {
            reason += ': ' + customNote;
        }

        this.performOrderRejection(reason);
    }

    handleRejectionCancellation() {
        this.hideRejectionModal();
    }

    handleModalClose() {
        this.hideRejectionModal();
        this.hideCorrectionPreview();
    }

    handleWorkflowStepClick(stepIndex) {
        const steps = ['analysis', 'corrections', 'approval'];
        this.currentWorkflowStep = steps[stepIndex];
        this.updateWorkflowIndicators();
    }

    handleKeyboardShortcuts(event) {
        if (event.ctrlKey || event.metaKey) {
            switch(event.key) {
                case 'Enter':
                    event.preventDefault();
                    this.handleOrderApproval();
                    break;
                case 'r':
                    event.preventDefault();
                    this.handleOrderRejection();
                    break;
                case 'p':
                    event.preventDefault();
                    this.handleCorrectionPreview();
                    break;
            }
        }
    }

    // Business Logic Methods
    async performFinalValidation() {
        try {
            // Вместо да правим HTTP заявка, валидираме локално
            const invalidItems = [];

            this.changeTracker.forEach((change, productId) => {
                const product = this.orderData.items.find(item => item.productId === productId);
                if (product && change.newQuantity > product.availableStock) {
                    invalidItems.push({
                        productName: product.productName,
                        requested: change.newQuantity,
                        available: product.availableStock
                    });
                }
            });

            if (invalidItems.length > 0) {
                return {
                    success: false,
                    errors: invalidItems.map(item =>
                        `${item.productName}: искани ${item.requested}, налични ${item.available}`
                    ),
                    canProceed: false
                };
            }

            return { success: true, canProceed: true };

        } catch (error) {
            return {
                success: false,
                errors: ['Грешка при валидация на наличностите'],
                canProceed: false
            };
        }
    }

    generateCorrectionNote() {
        if (this.changeTracker.size === 0) return '';

        let note = 'Корекции в поръчката:\n\n';
        let hasRemovals = false;
        let hasQuantityChanges = false;

        this.changeTracker.forEach((change, productId) => {
            const product = this.orderData.items.find(item => item.productId === productId);
            if (product) {
                if (change.changeType === 'removed') {
                    note += `❌ ${product.productName} - премахнат от поръчката\n`;
                    hasRemovals = true;
                } else if (change.changeType === 'modified') {
                    note += `📝 ${product.productName} - количество променено от ${change.originalQuantity} на ${change.newQuantity}\n`;
                    hasQuantityChanges = true;
                }
            }
        });

        note += '\nПричини за промените:\n';
        if (hasRemovals) note += '• Липса на наличност в склада\n';
        if (hasQuantityChanges) note += '• Корекция според реалните наличности\n';

        note += '\nИзвиняваме се за неудобството!';

        return note;
    }

    async performOrderRejection(reason) {
        try {
            console.log('Rejecting order:', this.currentOrderId, 'Reason:', reason);

            const result = await this.dashboardApi.rejectOrder(this.currentOrderId, reason);

            console.log('Rejection result:', result);

            if (result && result.success) {
                if (window.toastManager) {
                    window.toastManager.success('Поръчката е отказана успешно.');
                }
                setTimeout(() => {
                    window.location.href = '/employer/dashboard';
                }, 2000);
            } else {
                if (window.toastManager) {
                    window.toastManager.error(result?.message || 'Грешка при отказване на поръчката.');
                }
            }
        } catch (error) {
            console.error('Error rejecting order:', error);
            if (window.toastManager) {
                window.toastManager.error('Грешка при отказване на поръчката.');
            }
        } finally {
            this.hideRejectionModal();
        }
    }

    // UI Helper Methods
    updateLoadingState(message) {
        const loadingElement = document.getElementById('loading-state');
        if (loadingElement) {
            const messageElement = loadingElement.querySelector('p');
            if (messageElement) messageElement.textContent = message;
            loadingElement.classList.remove('hidden');
        }
    }

    hideLoadingState() {
        const loadingElement = document.getElementById('loading-state');
        if (loadingElement) loadingElement.classList.add('hidden');

        const containerElement = document.getElementById('order-items-container');
        if (containerElement) containerElement.classList.remove('hidden');
    }

    showOrderInterface() {
        const containerElement = document.getElementById('order-items-container');
        if (containerElement) containerElement.classList.remove('hidden');

        const approvalControls = document.getElementById('approval-controls');
        if (approvalControls) approvalControls.parentElement.style.display = 'block';
    }

    updateWorkflowIndicators() {
        const steps = document.querySelectorAll('.workflow-step');
        steps.forEach((step, index) => {
            step.classList.toggle('active', index === this.getCurrentStepIndex());
        });
    }

    getCurrentStepIndex() {
        const steps = ['analysis', 'corrections', 'approval'];
        return steps.indexOf(this.currentWorkflowStep || 'analysis');
    }

    updateOrderStatistics(orderData) {
        if (!orderData.items) return;

        let available = 0, partial = 0, unavailable = 0;

        orderData.items.forEach(item => {
            if (item.availableStock >= item.quantity) {
                available++;
            } else if (item.availableStock > 0) {
                partial++;
            } else {
                unavailable++;
            }
        });

        this.updateStatElement('available-items', available);
        this.updateStatElement('partial-items', partial);
        this.updateStatElement('unavailable-items', unavailable);
    }

    updateStatElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) element.textContent = value;
    }


    showRejectionModal() {
        const modal = document.getElementById('rejection-modal');
        modal.classList.remove('hidden');
        modal.classList.add('show');

        // Почисти и setup-ни reason options
        document.querySelectorAll('#rejection-modal .reason-option').forEach(option => {
            option.classList.remove('selected');
            option.onclick = function() {
                // Премахни selection от всички
                document.querySelectorAll('#rejection-modal .reason-option').forEach(opt =>
                    opt.classList.remove('selected')
                );
                // Маркирай кликнатата
                this.classList.add('selected');

                // КОПИРАЙ ТЕКСТА В TEXTAREA ПОЛЕТО
                const noteField = document.getElementById('rejection-note');
                const reasonText = this.dataset.reason;
                if (noteField && reasonText) {
                    noteField.value = reasonText;
                }
            };
        });

        // Почисти textarea
        const noteField = document.getElementById('rejection-note');
        if (noteField) noteField.value = '';
    }

    hideRejectionModal() {
        document.getElementById('rejection-modal').classList.remove('show');
    }



    hideCorrectionPreview() {
        const preview = document.getElementById('correction-preview');
        if (preview) preview.classList.add('hidden');
    }

    showApprovalInProgress() {
        const approveBtn = document.getElementById('approve-order');
        if (approveBtn) {
            approveBtn.disabled = true;
            approveBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Обработка...';
        }
    }

    hideApprovalInProgress() {
        const approveBtn = document.getElementById('approve-order');
        if (approveBtn) {
            approveBtn.disabled = false;
            approveBtn.innerHTML = '<i class="bi bi-check-circle"></i> Одобри';
        }
    }

    showDataFreshnessWarning() {
        if (window.toastManager) {
            window.toastManager.warning('Използват се кеширани данни. Моля, обновете страницата за най-актуални данни.');
        }
    }

    handleValidationFailure(validationResult) {
        if (window.toastManager) {
            window.toastManager.error(
                validationResult.errors.join('. ') || 'Валидацията не премина успешно.'
            );
        }
    }

    handleApprovalSuccess(result) {
        if (window.toastManager) {
            window.toastManager.success('Поръчката е одобрена успешно!');
        }
        setTimeout(() => {
            window.location.href = '/employer/dashboard';
        }, 2000);
    }

    handleApprovalFailure(result) {
        if (window.toastManager) {
            window.toastManager.error(result.message || 'Грешка при одобряване на поръчката.');
        }
    }

    handleApprovalError(error) {
        if (window.toastManager) {
            window.toastManager.error('Възникна грешка при одобряване на поръчката.');
        }
    }

    setupCatalogEventHandlers() {
        if (this.orderReviewCatalog) {
            this.orderReviewCatalog.onQuantityChange = (productId, oldQty, newQty) => {
                const product = this.orderData.items.find(item => item.productId === productId);
                this.trackChange(productId, {
                    originalQuantity: oldQty,
                    newQuantity: newQty,
                    changeType: newQty === 0 ? 'removed' : 'modified',
                    productName: product?.productName || 'Неизвестен продукт'
                });
            };

            this.orderReviewCatalog.onItemRemove = (productId) => {
                const product = this.orderData.items.find(item => item.productId === productId);
                this.trackChange(productId, {
                    changeType: 'removed',
                    productName: product?.productName || 'Неизвестен продукт'
                });
            };

            // ДОБАВИ callback за approve individual items
            this.orderReviewCatalog.onItemApprove = (productId) => {
                this.trackChange(productId, {
                    changeType: 'approved',
                    productName: this.orderData.items.find(item => item.productId === productId)?.productName
                });
            };
        }
    }

    trackChange(productId, change) {
        this.changeTracker.set(productId, change);
        this.updateChangesDisplay();
    }

    updateChangesDisplay() {
        const changesCount = document.getElementById('changes-count');
        const approvalStatus = document.getElementById('approval-status');

        if (changesCount) {
            const count = this.changeTracker.size;
            changesCount.textContent = `${count} ${count === 1 ? 'промяна' : 'промени'}`;
        }

        if (approvalStatus) {
            const hasChanges = this.changeTracker.size > 0;
            approvalStatus.textContent = hasChanges ?
                'Има промени - ще се изпрати съобщение до клиента' :
                'Готов за одобрение';
            approvalStatus.className = hasChanges ? 'has-changes' : 'no-changes';
        }

        // Покажи approval controls overlay
        const overlay = document.querySelector('.approval-controls-overlay');
        if (overlay) {
            overlay.style.display = 'block';
        }
    }

    addEventHandler(elementOrId, eventType, handler) {
        const element = typeof elementOrId === 'string'
            ? document.getElementById(elementOrId)
            : elementOrId;

        if (element) {
            element.addEventListener(eventType, handler);

            if (!this.eventListeners.has(element)) {
                this.eventListeners.set(element, []);
            }
            this.eventListeners.get(element).push({ eventType, handler });
        }
    }

    handleInitializationError(error) {
        if (window.toastManager) {
            window.toastManager.error('Системата не може да се инициализира. Моля, обновете страницата.');
        }
        this.showFallbackOrderDisplay();
    }

    showFallbackOrderDisplay() {
        this.hideLoadingState();

        const containerElement = document.getElementById('order-items-container');
        if (containerElement) {
            containerElement.innerHTML = `
                <div style="padding: 2rem; text-align: center; background: white; border-radius: 8px;">
                    <h3>Основен режим</h3>
                    <p>Разширените функции не са достъпни. Моля, обновете страницата.</p>
                    <p>Поръчка ID: ${this.config?.orderId || 'Неизвестна'}</p>
                    <button onclick="window.location.reload()" style="padding: 0.5rem 1rem; margin-top: 1rem;">
                        Обнови страницата
                    </button>
                </div>
            `;
            containerElement.classList.remove('hidden');
        }
    }

    destroy() {
        this.eventListeners.forEach((listeners, element) => {
            listeners.forEach(({ eventType, handler }) => {
                element.removeEventListener(eventType, handler);
            });
        });
        this.eventListeners.clear();

        if (this.orderReviewCatalog && typeof this.orderReviewCatalog.destroy === 'function') {
            this.orderReviewCatalog.destroy();
        }

        if (this.dashboardApi && typeof this.dashboardApi.destroy === 'function') {
            this.dashboardApi.destroy();
        }
    }
}

// Global initialization
async function initializeOrderReviewSystem() {
    try {
        window.orderReviewOrchestrator = new OrderReviewOrchestrator();
        const success = await window.orderReviewOrchestrator.initialize();

        if (!success) {
            throw new Error('System initialization returned false');
        }
    } catch (error) {
        if (window.toastManager) {
            window.toastManager.error('Неуспешно зареждане на системата. Моля, обновете страницата.');
        }

        if (window.orderReviewOrchestrator) {
            window.orderReviewOrchestrator.showFallbackOrderDisplay();
        }
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (window.orderReviewOrchestrator && typeof window.orderReviewOrchestrator.destroy === 'function') {
        window.orderReviewOrchestrator.destroy();
    }
});

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Изчакай главната dashboard система да се инициализира първо
    if (window.orderReviewConfig) {
        if (window.mainDashboard?.isInitialized) {
            initializeOrderReviewSystem();
        } else {
            // Изчакай 500ms и опитай отново
            setTimeout(() => {
                if (window.mainDashboard?.isInitialized) {
                    initializeOrderReviewSystem();
                } else {
                    console.warn('MainDashboard not ready, initializing standalone order review');
                    initializeOrderReviewSystem();
                }
            }, 500);
        }
    }
});

// Export for manual access
window.OrderReviewOrchestrator = OrderReviewOrchestrator;