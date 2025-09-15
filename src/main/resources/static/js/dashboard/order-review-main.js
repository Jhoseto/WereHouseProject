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
        if (window.mainDashboard && window.mainDashboard.api) {
            this.dashboardApi = window.mainDashboard.api;
            this.dashboardManager = window.mainDashboard.manager;
        } else {
            this.dashboardApi = new DashboardApi();
            await this.dashboardApi.initialize();
            this.dashboardManager = new DashboardManager();
            await this.dashboardManager.initialize(this.dashboardApi, null);
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
        document.querySelectorAll('.modal-close').forEach(btn => {
            this.addEventHandler(btn, 'click', () => this.handleModalClose());
        });

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
    }

    // Event Handlers
    async handleOrderApproval() {
        try {
            this.showApprovalInProgress();
            const correctionNote = this.generateCorrectionNote();
            const validationResult = await this.performFinalValidation();

            if (!validationResult.success) {
                this.handleValidationFailure(validationResult);
                return;
            }

            const approvalResult = await this.dashboardManager.approveOrder(
                this.currentOrderId,
                correctionNote
            );

            if (approvalResult.success) {
                this.handleApprovalSuccess(approvalResult);
            } else {
                this.handleApprovalFailure(approvalResult);
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
        this.showCorrectionPreview();
    }

    handleRejectionConfirmation() {
        const selectedReason = document.querySelector('.reason-option.selected')?.dataset.reason || '';
        const additionalNote = document.getElementById('rejection-note')?.value || '';
        const fullReason = selectedReason + (additionalNote ? ': ' + additionalNote : '');

        this.performOrderRejection(fullReason);
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
            const modificationsToValidate = {
                orderId: this.currentOrderId,
                modifications: Array.from(this.changeTracker.entries()),
                timestamp: new Date().toISOString()
            };

            const response = await fetch('/employer/dashboard/validate-order-approval', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [this.config.csrfHeader]: this.config.csrfToken
                },
                body: JSON.stringify(modificationsToValidate)
            });

            return await response.json();
        } catch (error) {
            return {
                success: false,
                errors: ['Unable to perform final validation. Please try again.'],
                canProceed: false
            };
        }
    }

    generateCorrectionNote() {
        if (this.changeTracker.size === 0) return '';

        let note = 'Корекции в поръчката:\n';
        this.changeTracker.forEach((change, productId) => {
            const product = this.orderData.items.find(item => item.productId === productId);
            if (product) {
                if (change.changeType === 'removed') {
                    note += `• ${product.productName} - премахнат от поръчката\n`;
                } else {
                    note += `• ${product.productName} - количество променено от ${change.originalQuantity} на ${change.newQuantity}\n`;
                }
            }
        });

        return note;
    }

    async performOrderRejection(reason) {
        try {
            const result = await this.dashboardManager.rejectOrder(this.currentOrderId, reason);

            if (result.success) {
                if (window.toastManager) {
                    window.toastManager.success('Поръчката е отказана успешно.');
                }
                setTimeout(() => {
                    window.location.href = '/employer/dashboard';
                }, 2000);
            } else {
                if (window.toastManager) {
                    window.toastManager.error(result.message || 'Грешка при отказване на поръчката.');
                }
            }
        } catch (error) {
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
        if (modal) {
            modal.classList.add('show');

            // Setup reason selection
            modal.querySelectorAll('.reason-option').forEach(option => {
                option.addEventListener('click', () => {
                    modal.querySelectorAll('.reason-option').forEach(opt => opt.classList.remove('selected'));
                    option.classList.add('selected');
                });
            });
        }
    }

    hideRejectionModal() {
        const modal = document.getElementById('rejection-modal');
        if (modal) {
            modal.classList.remove('show');
            modal.querySelectorAll('.reason-option').forEach(opt => opt.classList.remove('selected'));
            const noteField = document.getElementById('rejection-note');
            if (noteField) noteField.value = '';
        }
    }

    showCorrectionPreview() {
        const preview = document.getElementById('correction-preview');
        if (preview) {
            const summary = document.getElementById('correction-summary');
            if (summary) {
                summary.innerHTML = this.generateCorrectionNote().replace(/\n/g, '<br>') || 'Няма направени корекции.';
            }
            preview.classList.remove('hidden');
        }
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
                this.trackChange(productId, { originalQuantity: oldQty, newQuantity: newQty, changeType: 'modified' });
            };

            this.orderReviewCatalog.onItemRemove = (productId) => {
                this.trackChange(productId, { changeType: 'removed' });
            };
        }
    }

    trackChange(productId, change) {
        this.changeTracker.set(productId, change);
        this.updateChangesDisplay();
    }

    updateChangesDisplay() {
        const changesCount = document.getElementById('changes-count');
        if (changesCount) {
            const count = this.changeTracker.size;
            changesCount.textContent = `${count} ${count === 1 ? 'промяна' : 'промени'}`;
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
    setTimeout(initializeOrderReviewSystem, 100);
});

// Export for manual access
window.OrderReviewOrchestrator = OrderReviewOrchestrator;