/**
 * ORDER SHIPPING SYSTEM - CLEAN IMPLEMENTATION
 * ==========================================
 * Прост и надежден код за товарене на поръчки
 * Използва всички методи от shippingApi.js
 * Следва бизнес логиката: един служител - една поръчка - един камион
 */

// ==========================================
// ГЛОБАЛНИ ПРОМЕНЛИВИ
// ==========================================
let currentMode = 'initial'; // 'initial', 'loading', 'observer'
let currentSessionId = null;
let currentTruck = null;
let startTime = null;
let loadedItems = new Set();
let orderItems = [];

// Intervals за автоматичните операции
let heartbeatInterval = null;
let warehouseMonitorInterval = null;
let durationUpdateInterval = null;
let lostSignalsInterval = null;

// CONNECTION STATUS MONITORING
let isConnectionHealthy = true;
let lastHeartbeatSuccess = Date.now();

// ==========================================
// ИНИЦИАЛИЗАЦИЯ
// ==========================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Initializing shipping system');

    try {
        // Валидация на конфигурацията
        validateConfiguration();

        // Зареждаме данни от window.orderConfig
        orderItems = window.orderConfig?.orderItems || [];
        console.log(`Loaded ${orderItems.length} order items`);

        // Setup event listeners
        setupEventListeners();

        // Проверяваме за активна сесия
        await checkActiveSession();

        // Стартираме background операции
        startBackgroundOperations();

        console.log('System initialized successfully');

    } catch (error) {
        console.error('Initialization error:', error);
        showError('Грешка при зареждане на системата: ' + error.message);
        await enterInitialMode();
    }
});

// ==========================================
// CONFIGURATION VALIDATION
// ==========================================
function validateConfiguration() {
    const config = window.orderConfig;
    if (!config) {
        throw new Error('window.orderConfig не е дефинирано');
    }

    const required = ['orderId', 'csrfToken', 'csrfHeader', 'currentUserId', 'currentUsername'];
    const missing = required.filter(key => !config[key]);

    if (missing.length > 0) {
        throw new Error(`Липсват задължителни конфигурации: ${missing.join(', ')}`);
    }

    if (!Array.isArray(config.orderItems)) {
        throw new Error('orderItems трябва да бъде масив');
    }
}

// ==========================================
// EVENT LISTENERS
// ==========================================
function setupEventListeners() {
    // Truck input validation
    const truckInput = document.getElementById('truck-input');
    const startBtn = document.getElementById('start-loading-btn');

    if (truckInput && startBtn) {
        truckInput.addEventListener('input', function(e) {
            const value = e.target.value.trim().toUpperCase();
            e.target.value = value;

            // Валидация - между 4 и 12 символа, само букви и цифри
            const isValid = /^[A-Z0-9]{4,12}$/.test(value);
            startBtn.disabled = !isValid;

            // Visual feedback
            e.target.style.borderColor = isValid ? 'var(--success-color)' : (value.length > 0 ? 'var(--error-color)' : 'var(--gray-300)');
        });

        startBtn.addEventListener('click', handleStartLoading);
    }

    // Complete button
    const completeBtn = document.getElementById('complete-loading-btn');
    if (completeBtn) {
        completeBtn.addEventListener('click', handleCompleteLoading);
    }
}

// ==========================================
// CONNECTION STATUS MANAGEMENT
// ==========================================

// Обновява connection status (извиква се от heartbeat функцията)
function updateConnectionStatus(isHealthy) {
    isConnectionHealthy = isHealthy;
    if (isHealthy) {
        lastHeartbeatSuccess = Date.now();
    }

    // Визуален индикатор за connection status
    updateConnectionIndicator(isHealthy);
}

// Визуален индикатор за connection
function updateConnectionIndicator(isHealthy) {
    const indicator = document.getElementById('connection-status') || createConnectionIndicator();

    if (isHealthy) {
        indicator.className = 'connection-status online';
        indicator.innerHTML = '<i class="bi bi-wifi"></i> Онлайн';
    } else {
        indicator.className = 'connection-status offline';
        indicator.innerHTML = '<i class="bi bi-wifi-off"></i> Офлайн';
    }
}

// Създава connection индикатор ако не съществува
function createConnectionIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'connection-status';
    indicator.className = 'connection-status online';
    indicator.style.cssText = `
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: 500;
        margin-left: 10px;
    `;

    // Добави в employee panel или другаде
    const employeePanel = document.querySelector('.employee-panel .panel-header');
    if (employeePanel) {
        employeePanel.appendChild(indicator);
    }

    return indicator;
}

// ==========================================
// SESSION DETECTION
// ==========================================
async function checkActiveSession() {
    try {
        console.log('Checking for active session...');

        // Използваме getLoadingStatus от shippingApi.js
        const statusData = await getLoadingStatus();
        console.log('Session status response:', statusData);

        if (statusData.hasActiveSession && statusData.session) {
            const session = statusData.session;

            // Надеждна проверка на user identity
            const sessionEmployeeId = Number(session.employeeId);
            const currentUserId = Number(window.orderConfig.currentUserId);
            const sessionUsername = (session.employeeUsername || '').toLowerCase().trim();
            const currentUsername = (window.orderConfig.currentUsername || '').toLowerCase().trim();

            console.log('User comparison:', {
                sessionEmployeeId,
                currentUserId,
                sessionUsername,
                currentUsername,
                idMatch: sessionEmployeeId === currentUserId,
                usernameMatch: sessionUsername === currentUsername
            });

            // Определяваме ownership с двойна проверка
            let isMySession = false;
            if (sessionEmployeeId && currentUserId) {
                isMySession = sessionEmployeeId === currentUserId;
            } else if (sessionUsername && currentUsername) {
                isMySession = sessionUsername === currentUsername;
            }

            if (isMySession) {
                console.log('Restoring my loading session');
                await enterLoadingMode(session);
            } else {
                console.log('Entering observer mode for other user');
                await enterObserverMode(session);
            }
        } else {
            console.log('No active session - entering initial mode');
            await enterInitialMode();
        }

    } catch (error) {
        console.error('Error checking session status:', error);
        await enterInitialMode();
    }
}

// ==========================================
// MODE MANAGEMENT
// ==========================================

// Initial mode - чакане за стартиране
async function enterInitialMode() {
    console.log('Entering initial mode');

    currentMode = 'initial';
    currentSessionId = null;
    currentTruck = null;
    startTime = null;
    loadedItems.clear();

    // Stop session-specific intervals
    stopHeartbeat();
    stopDurationTimer();

    // UI updates
    const contentArea = document.getElementById('loading-content');
    if (contentArea) {
        contentArea.classList.add('disabled');
        contentArea.classList.remove('observer-mode');
    }

    // Reset truck UI
    resetTruckUI();

    // Hide employee info
    hideEmployeeInfo();

    // Clear alerts
    clearAlerts();

    // Зареждаме артикулите (деактивирани)
    await loadOrderItems(false);

    // Reset progress
    updateProgress(0, orderItems.length);

    // Hide complete button
    hideCompleteButton();

    // Start warehouse monitoring
    startWarehouseMonitoring();
}

// Loading mode - активно товарене
async function enterLoadingMode(sessionData) {
    console.log('Entering loading mode with session:', sessionData);

    try {
        currentMode = 'loading';
        currentSessionId = sessionData.id || sessionData.sessionId;
        currentTruck = sessionData.truckNumber;
        startTime = sessionData.startedAt ? new Date(sessionData.startedAt) : new Date();

        // Възстановяване на loadedItems от sessionData
        if (sessionData.loadedItems) {
            if (Array.isArray(sessionData.loadedItems)) {
                loadedItems = new Set(sessionData.loadedItems.map(id => Number(id)));
            } else if (typeof sessionData.loadedItems === 'string') {
                try {
                    const parsed = JSON.parse(sessionData.loadedItems);
                    loadedItems = new Set(Array.isArray(parsed) ? parsed.map(id => Number(id)) : []);
                } catch {
                    loadedItems = new Set();
                }
            } else {
                loadedItems = new Set();
            }
        } else {
            loadedItems = new Set();
        }

        console.log(`Session restored: ${loadedItems.size}/${orderItems.length} items loaded`);

        // Stop warehouse monitoring
        stopWarehouseMonitoring();

        // UI updates - активираме loading content
        const contentArea = document.getElementById('loading-content');
        if (contentArea) {
            contentArea.classList.remove('disabled');
            contentArea.classList.remove('observer-mode');
        }

        // Update truck UI for active session
        updateTruckUI(currentTruck, true);

        // Show employee info
        showEmployeeInfo(sessionData);

        // Clear alerts
        clearAlerts();

        // Зареждаме артикулите (активни)
        await loadOrderItems(true);

        // Update progress
        updateProgress(loadedItems.size, orderItems.length);

        // Check if ready to complete
        checkCompletion();

        // Start heartbeat (всеки 10 секунди според документацията)
        startHeartbeat();

        // Start duration timer
        startDurationTimer();

        console.log('Loading mode activated successfully');

    } catch (error) {
        console.error('Error entering loading mode:', error);
        showError('Грешка при активиране на режим товарене: ' + error.message);
        await enterInitialMode();
    }
}

// Observer mode - наблюдение на чужда сесия
async function enterObserverMode(sessionData) {
    console.log('Entering observer mode for session:', sessionData);

    try {
        currentMode = 'observer';
        currentTruck = sessionData.truckNumber;
        startTime = sessionData.startedAt ? new Date(sessionData.startedAt) : new Date();

        // Load other user's progress
        if (sessionData.loadedItems) {
            if (Array.isArray(sessionData.loadedItems)) {
                loadedItems = new Set(sessionData.loadedItems.map(id => Number(id)));
            } else {
                loadedItems = new Set();
            }
        } else {
            loadedItems = new Set();
        }

        // Stop warehouse monitoring
        stopWarehouseMonitoring();

        // UI updates - observer mode
        const contentArea = document.getElementById('loading-content');
        if (contentArea) {
            contentArea.classList.remove('disabled');
            contentArea.classList.add('observer-mode');
        }

        // Update truck UI (read-only)
        updateTruckUI(currentTruck, false);

        // Show other employee info
        showOtherEmployeeInfo(sessionData);

        // Show observer alert
        showObserverAlert(sessionData.employeeUsername || 'друг служител');

        // Load items (read-only)
        await loadOrderItems(false);

        // Update progress
        updateProgress(loadedItems.size, orderItems.length);

        // Start monitoring for live updates
        startObserverMonitoring();

        console.log('Observer mode activated');

    } catch (error) {
        console.error('Error entering observer mode:', error);
        showError('Грешка при влизане в режим на наблюдение: ' + error.message);
        await enterInitialMode();
    }
}

// ==========================================
// ORDER ITEMS MANAGEMENT
// ==========================================

// Зарежда и рендира артикулите
async function loadOrderItems(interactive) {
    console.log(`Loading ${orderItems.length} items (interactive: ${interactive})`);

    const container = document.getElementById('items-container');
    if (!container) {
        console.error('Items container not found');
        return;
    }

    // Show loading briefly
    showLoading();

    try {
        // Simulate loading delay
        await delay(200);

        if (orderItems.length === 0) {
            showEmptyState();
            return;
        }

        // Render items
        renderItems(container, interactive);

        // Show container
        hideLoading();
        showItemsContainer();

        // АКТИВИРАНЕ НА КОНТРОЛИТЕ ако е interactive режим
        if (interactive) {
            setupCatalogControls();
        }

        console.log('Items rendered successfully');

    } catch (error) {
        console.error('Error loading items:', error);
        showEmptyState();
    }
}

// Рендира артикулите в контейнера
function renderItems(container, interactive) {
    if (!container) return;

    container.innerHTML = orderItems.map(item => {
        const isLoaded = loadedItems.has(item.productId);
        const buttonClass = isLoaded ? 'loaded' : 'pending';
        const iconClass = isLoaded ? 'bi-check-circle-fill' : 'bi-circle';
        const disabled = interactive ? '' : 'disabled';
        const productSku = item.productSku || item.sku || 'N/A';

        return `
            <div class="order-item ${isLoaded ? 'loaded' : 'pending'}" data-product-id="${item.productId}">
                <div class="item-details">
                    <div class="item-name">${escapeHtml(item.productName)}</div>
                    <div class="item-info">
                        <span class="item-sku">SKU: ${escapeHtml(productSku)}</span>
                        <span class="item-quantity">Количество: ${item.quantity} бр.</span>
                        ${item.category ? `<span class="item-category">${escapeHtml(item.category)}</span>` : ''}
                    </div>
                </div>
                <button class="item-toggle ${buttonClass}" 
                        onclick="toggleItem(${item.productId})" 
                        ${disabled}
                        type="button"
                        data-product-id="${item.productId}">
                    <i class="bi ${iconClass}"></i>
                </button>
            </div>
        `;
    }).join('');

    console.log(`Rendered ${orderItems.length} items`);
}

// ==========================================
// CATALOG CONTROLS - НОВИ ФУНКЦИИ
// ==========================================

// ПОПРАВКА НА ФИЛТЪРНИТЕ БУТОНИ
function setupCatalogControls() {
    console.log('Setting up catalog controls');

    // Активиране на search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.disabled = false;
        searchInput.addEventListener('input', handleSearch);
    }

    // Активиране на filter бутони
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.disabled = false;
        btn.addEventListener('click', handleFilter);
    });

    // Активиране на sort select
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.disabled = false;
        sortSelect.addEventListener('change', handleSort);
    }

    console.log('Catalog controls activated');
}

// Search функция
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    const items = document.querySelectorAll('.order-item');

    items.forEach(item => {
        const productName = item.querySelector('.item-name')?.textContent.toLowerCase() || '';
        const productSku = item.querySelector('.item-sku')?.textContent.toLowerCase() || '';

        const matches = productName.includes(searchTerm) || productSku.includes(searchTerm);
        item.style.display = matches ? 'flex' : 'none';
    });
}

// Filter функция
function handleFilter(e) {
    const filterType = e.target.dataset.filter;
    const items = document.querySelectorAll('.order-item');

    // Обнови active състоянието на бутоните
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');

    items.forEach(item => {
        const isLoaded = item.classList.contains('loaded');

        let shouldShow = true;
        if (filterType === 'loaded') {
            shouldShow = isLoaded;
        } else if (filterType === 'pending') {
            shouldShow = !isLoaded;
        }
        // 'all' показва всички

        item.style.display = shouldShow ? 'flex' : 'none';
    });
}

// Sort функция
function handleSort(e) {
    const sortType = e.target.value;
    const container = document.getElementById('items-container');
    const items = Array.from(container.querySelectorAll('.order-item'));

    items.sort((a, b) => {
        let aValue, bValue;

        switch(sortType) {
            case 'name':
                aValue = a.querySelector('.item-name')?.textContent || '';
                bValue = b.querySelector('.item-name')?.textContent || '';
                return aValue.localeCompare(bValue);

            case 'category':
                aValue = a.querySelector('.item-category')?.textContent || 'Без категория';
                bValue = b.querySelector('.item-category')?.textContent || 'Без категория';
                return aValue.localeCompare(bValue);

            case 'quantity':
                aValue = parseInt(a.querySelector('.item-quantity')?.textContent.match(/\d+/)?.[0] || '0');
                bValue = parseInt(b.querySelector('.item-quantity')?.textContent.match(/\d+/)?.[0] || '0');
                return bValue - aValue; // Descending order

            default:
                return 0;
        }
    });

    // Пренареди елементите
    items.forEach(item => container.appendChild(item));
}

// ==========================================
// TOGGLE FUNCTIONALITY - С CONNECTION ПРОВЕРКА
// ==========================================

// Toggle артикул - ГЛОБАЛНА ФУНКЦИЯ
window.toggleItem = async function(productId) {
    // 1. Основни проверки
    if (currentMode !== 'loading') {
        showWarning('Не можете да променяте артикули в този режим');
        return;
    }

    if (!currentSessionId) {
        showError('Няма активна сесия за товарене!');
        return;
    }

    if (!productId || !Number.isInteger(Number(productId))) {
        showError('Невалиден ID на артикул');
        return;
    }

    // 2. CONNECTION STATUS ПРОВЕРКА
    if (!isConnectionHealthy) {
        showError('Няма връзка със сървъра. Моля изчакайте да се възстанови връзката.');
        return;
    }

    // Проверка дали heartbeat-ът не е стар повече от 30 секунди
    const timeSinceLastHeartbeat = Date.now() - lastHeartbeatSuccess;
    if (timeSinceLastHeartbeat > 30000) { // 30 секунди
        showWarning('Връзката със сървъра може да е нестабилна. Моля опитайте отново.');
        return;
    }

    console.log(`Toggling item: ${productId} in session: ${currentSessionId}`);

    const button = document.querySelector(`[data-product-id="${productId}"] .item-toggle`);
    const itemElement = document.querySelector(`[data-product-id="${productId}"]`);

    // 3. ЗАЩИТА 1: Button disabled проверка
    if (button && button.disabled) {
        console.log('Button already disabled, ignoring click');
        return;
    }

    try {
        // UI feedback - disable button
        if (button) {
            button.disabled = true;
            button.innerHTML = '<i class="bi bi-hourglass-split"></i>';
        }

        // Използвай toggleItemAPI вместо toggleItem
        const result = await toggleItemAPI(currentSessionId, productId);
        console.log('Toggle API response:', result);

        if (result.success !== true) {
            throw new Error(result.message || 'API върна неуспешен резултат');
        }

        // Update local state според response
        const isNowLoaded = result.isLoaded === true || result.loaded === true;

        if (isNowLoaded) {
            loadedItems.add(productId);
        } else {
            loadedItems.delete(productId);
        }

        // Update UI
        updateItemUI(itemElement, button, isNowLoaded);
        updateProgress(loadedItems.size, orderItems.length);
        checkCompletion();

        console.log(`Item ${productId} toggled successfully - now ${isNowLoaded ? 'loaded' : 'pending'}`);

    } catch (error) {
        console.error('Toggle error:', error);

        // Ако е network error, обнови connection status
        if (error.message && (error.message.includes('network') || error.message.includes('fetch'))) {
            updateConnectionStatus(false);
        }

        showError('Грешка при промяна на артикул: ' + error.message);

        // 4. ЗАЩИТА 2: Възстанови бутона при грешка
        if (button) {
            const isLoaded = loadedItems.has(productId);
            updateItemButton(button, isLoaded);
        }
    }
};

// Обновява UI на конкретен артикул
function updateItemUI(itemElement, button, isLoaded) {
    if (!itemElement || !button) return;

    // Update item classes
    itemElement.className = `order-item ${isLoaded ? 'loaded' : 'pending'}`;

    // Update button
    updateItemButton(button, isLoaded);
}

// Обновява само бутона
function updateItemButton(button, isLoaded) {
    if (!button) return;

    button.disabled = false;
    button.className = `item-toggle ${isLoaded ? 'loaded' : 'pending'}`;
    button.innerHTML = `<i class="bi ${isLoaded ? 'bi-check-circle-fill' : 'bi-circle'}"></i>`;
}

// ==========================================
// LOADING OPERATIONS
// ==========================================

// Стартира товарене
async function handleStartLoading() {
    const truckInput = document.getElementById('truck-input');
    const startBtn = document.getElementById('start-loading-btn');

    if (!truckInput || !startBtn) {
        showError('UI елементи не са намерени');
        return;
    }

    const truckNumber = truckInput.value.trim().toUpperCase();

    // Validation
    if (!truckNumber) {
        showError('Моля въведете номер на камион!');
        truckInput.focus();
        return;
    }

    if (!/^[A-Z0-9]{4,12}$/.test(truckNumber)) {
        showError('Номерът на камиона трябва да е между 4 и 12 символа (букви и цифри)!');
        truckInput.focus();
        return;
    }

    try {
        console.log(`Starting loading for truck: ${truckNumber}`);

        // UI feedback
        startBtn.disabled = true;
        startBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Стартиране...';
        truckInput.disabled = true;

        // Използваме startLoading от shippingApi.js
        const result = await startLoading(truckNumber);
        console.log('Start loading response:', result);

        if (result.success !== true || !result.sessionId) {
            throw new Error(result.message || 'API не върна sessionId');
        }

        // Създаваме session data за loading mode
        const sessionData = {
            id: result.sessionId,
            sessionId: result.sessionId,
            truckNumber: truckNumber,
            startedAt: new Date(),
            employeeId: window.orderConfig.currentUserId,
            employeeUsername: window.orderConfig.currentUsername,
            totalItems: result.totalItems || orderItems.length,
            loadedItems: []
        };

        // Превключваме в loading mode
        await enterLoadingMode(sessionData);

        showSuccess('Товарене стартирано успешно!');

    } catch (error) {
        console.error('Start loading error:', error);
        showError('Грешка при стартиране на товарене: ' + error.message);

        // Restore UI
        startBtn.disabled = false;
        startBtn.innerHTML = '<i class="bi bi-play-circle"></i> Започни товарене';
        truckInput.disabled = false;
    }
}

// Завършва товарене
async function handleCompleteLoading() {
    if (currentMode !== 'loading') {
        showError('Не сте в режим на товарене!');
        return;
    }

    if (!currentSessionId) {
        showError('Няма активна сесия за товарене!');
        return;
    }

    // Check if all items are loaded
    if (loadedItems.size !== orderItems.length) {
        showError(`Не всички артикули са заредени! Заредени: ${loadedItems.size}/${orderItems.length}`);
        return;
    }

    // Confirmation
    if (!confirm(`Сигурни ли сте, че искате да завършите товаренето?\n\nЗаредени артикули: ${loadedItems.size}/${orderItems.length}\nКамион: ${currentTruck}\n\nТова действие не може да бъде отменено.`)) {
        return;
    }

    const completeBtn = document.getElementById('complete-loading-btn');

    try {
        console.log('Completing loading for session:', currentSessionId);

        if (completeBtn) {
            completeBtn.disabled = true;
            completeBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Завършване...';
        }

        // Използваме completeLoading от shippingApi.js
        const result = await completeLoading(currentSessionId);
        console.log('Complete loading response:', result);

        if (result.success !== true) {
            throw new Error(result.message || 'Товаренето не беше завършено успешно');
        }

        // Success cleanup
        stopHeartbeat();
        stopDurationTimer();

        // Show success with duration info if available
        const duration = result.totalDuration ? formatDuration(result.totalDuration) : '';
        showSuccess(`Товарене завършено успешно!${duration ? ` Времетраене: ${duration}` : ''}`);

        console.log('Loading completed successfully');

        // Redirect to dashboard after delay
        setTimeout(() => {
            window.location.href = '/employer/dashboard';
        }, 2000);

    } catch (error) {
        console.error('Complete loading error:', error);
        showError('Грешка при завършване на товарене: ' + error.message);

        // Restore complete button
        if (completeBtn) {
            completeBtn.disabled = false;
            completeBtn.innerHTML = '<i class="bi bi-check-circle"></i> Завърши товарене';
        }
    }
}

// ==========================================
// PROGRESS & UI UPDATES
// ==========================================

// Обновява прогрес дисплея
function updateProgress(loaded, total) {
    const percentage = total > 0 ? Math.round((loaded / total) * 100) : 0;

    // Update numbers
    const elements = {
        loadedCount: document.getElementById('loaded-count'),
        totalCount: document.getElementById('total-count'),
        progressPercentage: document.getElementById('progress-percentage'),
        progressFill: document.getElementById('progress-fill')
    };

    if (elements.loadedCount) elements.loadedCount.textContent = loaded;
    if (elements.totalCount) elements.totalCount.textContent = total;
    if (elements.progressPercentage) elements.progressPercentage.textContent = percentage + '%';
    if (elements.progressFill) elements.progressFill.style.width = percentage + '%';

    console.log(`Progress updated: ${loaded}/${total} (${percentage}%)`);
}

// Проверява дали може да завърши товаренето
function checkCompletion() {
    const completeBtn = document.getElementById('complete-loading-btn');
    const allLoaded = loadedItems.size === orderItems.length;

    if (completeBtn && currentMode === 'loading') {
        completeBtn.disabled = !allLoaded;

        if (allLoaded) {
            completeBtn.classList.remove('btn-secondary');
            completeBtn.classList.add('btn-success');
            completeBtn.innerHTML = '<i class="bi bi-check-circle"></i> Завърши товарене';
            showCompleteButton();
        } else {
            completeBtn.classList.remove('btn-success');
            completeBtn.classList.add('btn-secondary');
            completeBtn.innerHTML = `<i class="bi bi-hourglass-half"></i> ${loadedItems.size}/${orderItems.length} заредени`;
            hideCompleteButton();
        }
    }
}

// ==========================================
// UI STATE MANAGEMENT
// ==========================================

// Truck UI управление
function updateTruckUI(truckNumber, isActive) {
    const truckInput = document.getElementById('truck-input');
    const startBtn = document.getElementById('start-loading-btn');

    if (truckInput) {
        truckInput.value = truckNumber || '';
        truckInput.disabled = isActive;
        truckInput.style.borderColor = isActive ? 'var(--success-color)' : 'var(--gray-300)';
    }

    if (startBtn) {
        if (isActive) {
            startBtn.style.display = 'none';
        } else {
            startBtn.style.display = 'flex';
            startBtn.disabled = !(truckNumber && truckNumber.length >= 4);
        }
    }
}

// Reset truck UI
function resetTruckUI() {
    const truckInput = document.getElementById('truck-input');
    const startBtn = document.getElementById('start-loading-btn');

    if (truckInput) {
        truckInput.value = '';
        truckInput.disabled = false;
        truckInput.style.borderColor = 'var(--gray-300)';
    }

    if (startBtn) {
        startBtn.style.display = 'flex';
        startBtn.disabled = true;
        startBtn.innerHTML = '<i class="bi bi-play-circle"></i> Започни товарене';
    }
}

// Employee info панел
function showEmployeeInfo(sessionData) {
    const elements = {
        employeeName: document.getElementById('employee-name'),
        employeeUsername: document.getElementById('employee-username'),
        employeeEmail: document.getElementById('employee-email'),
        employeePhone: document.getElementById('employee-phone'),
        activeTruck: document.getElementById('active-truck-number'),
        sessionStart: document.getElementById('session-start-time'),
        sessionDuration: document.getElementById('session-duration'),
        employeeStatusBadge: document.getElementById('employee-status-badge'),
        employeeDetails: document.getElementById('employee-details'),
        employeePlaceholder: document.getElementById('employee-placeholder')
    };

    // Update employee info
    if (elements.employeeName) elements.employeeName.textContent = window.orderConfig.currentUsername;
    if (elements.employeeUsername) elements.employeeUsername.textContent = '@' + window.orderConfig.currentUsername;
    if (elements.employeeEmail) elements.employeeEmail.textContent = window.orderConfig.loadingEmployer?.email || 'Няма данни';
    if (elements.employeePhone) elements.employeePhone.textContent = window.orderConfig.loadingEmployer?.phone || 'Няма данни';
    if (elements.activeTruck) elements.activeTruck.textContent = currentTruck;
    if (elements.sessionStart) elements.sessionStart.textContent = formatDateTime(startTime);

    // Update status badge
    if (elements.employeeStatusBadge) {
        elements.employeeStatusBadge.className = 'status-badge status-active';
        elements.employeeStatusBadge.textContent = 'Активен';
    }

    // Show panels
    if (elements.employeeDetails) elements.employeeDetails.classList.remove('hidden');
    if (elements.employeePlaceholder) elements.employeePlaceholder.style.display = 'none';
}

// Hide employee info
function hideEmployeeInfo() {
    const elements = {
        employeeDetails: document.getElementById('employee-details'),
        employeePlaceholder: document.getElementById('employee-placeholder')
    };

    if (elements.employeeDetails) elements.employeeDetails.classList.add('hidden');
    if (elements.employeePlaceholder) elements.employeePlaceholder.style.display = 'block';
}

// Show other employee info (observer mode)
function showOtherEmployeeInfo(sessionData) {
    const elements = {
        employeeName: document.getElementById('employee-name'),
        employeeUsername: document.getElementById('employee-username'),
        employeeEmail: document.getElementById('employee-email'),
        employeePhone: document.getElementById('employee-phone'),
        activeTruck: document.getElementById('active-truck-number'),
        sessionStart: document.getElementById('session-start-time'),
        employeeStatusBadge: document.getElementById('employee-status-badge'),
        employeeDetails: document.getElementById('employee-details'),
        employeePlaceholder: document.getElementById('employee-placeholder')
    };

    // Update with other user info
    if (elements.employeeName) elements.employeeName.textContent = sessionData.employeeUsername || 'Неизвестен служител';
    if (elements.employeeUsername) elements.employeeUsername.textContent = '@' + (sessionData.employeeUsername || 'unknown');
    if (elements.employeeEmail) elements.employeeEmail.textContent = sessionData.employeeEmail || 'Няма данни';
    if (elements.employeePhone) elements.employeePhone.textContent = sessionData.employeePhone || 'Няма данни';
    if (elements.activeTruck) elements.activeTruck.textContent = sessionData.truckNumber;
    if (elements.sessionStart) elements.sessionStart.textContent = formatDateTime(startTime);

    // Update status badge
    if (elements.employeeStatusBadge) {
        elements.employeeStatusBadge.className = 'status-badge status-active';
        elements.employeeStatusBadge.textContent = 'Активен';
    }

    // Show panels
    if (elements.employeeDetails) elements.employeeDetails.classList.remove('hidden');
    if (elements.employeePlaceholder) elements.employeePlaceholder.style.display = 'none';
}

// Show observer alert
function showObserverAlert(employeeUsername) {
    // Remove existing alert
    const existingAlert = document.querySelector('.observer-alert');
    if (existingAlert) existingAlert.remove();

    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert-warning observer-alert';
    alertDiv.innerHTML = `
        <i class="bi bi-eye-fill"></i>
        <strong>Режим на наблюдение:</strong> 
        Служител ${escapeHtml(employeeUsername)} товари тази поръчка в момента.
        Вие можете само да наблюдавате процеса.
    `;

    const container = document.getElementById('loading-content');
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);
    }
}

// Clear all alerts
function clearAlerts() {
    const alerts = document.querySelectorAll('.observer-alert');
    alerts.forEach(alert => alert.remove());
}

// Complete button управление
function showCompleteButton() {
    const completeBtn = document.getElementById('complete-loading-btn');
    if (completeBtn) {
        completeBtn.style.display = 'block';
    }
}

function hideCompleteButton() {
    const completeBtn = document.getElementById('complete-loading-btn');
    if (completeBtn) {
        completeBtn.style.display = 'none';
    }
}

// ==========================================
// BACKGROUND OPERATIONS - ИЗПОЛЗВАМЕ ВСИЧКИ API МЕТОДИ
// ==========================================

// Стартира background операции
function startBackgroundOperations() {
    console.log('Starting background operations');

    // Периодично изчистване на стари сесии (всеки час)
    setInterval(async () => {
        try {
            const result = await cleanupOldSessions(24); // 24 часа
            if (result.deletedSessions > 0) {
                console.log(`Cleaned up ${result.deletedSessions} old sessions`);
            }
        } catch (error) {
            console.warn('Cleanup error:', error);
        }
    }, 3600000); // 1 час

    // Периодично откриване на загубени сигнали (всеки 5 минути)
    lostSignalsInterval = setInterval(async () => {
        try {
            const result = await detectLostSignals(10); // 10 минути threshold
            if (result.affectedSessions > 0) {
                console.log(`Found ${result.affectedSessions} lost signals`);
            }
        } catch (error) {
            console.warn('Lost signals detection error:', error);
        }
    }, 300000); // 5 минути
}

// ОБНОВЕНА HEARTBEAT СИСТЕМА С CONNECTION MONITORING
function startHeartbeat() {
    if (heartbeatInterval || !currentSessionId) return;

    heartbeatInterval = setInterval(async () => {
        try {
            // Използваме sendHeartbeat от shippingApi.js
            const success = await sendHeartbeat(currentSessionId);

            // Обнови connection status
            updateConnectionStatus(success);

            if (success) {
                console.log('Heartbeat sent successfully');
            } else {
                console.warn('Heartbeat failed');
            }

        } catch (error) {
            console.error('Heartbeat error:', error);
            updateConnectionStatus(false);
        }
    }, 10000); // 10 секунди според документацията

    console.log('Heartbeat started with connection monitoring (10 second intervals)');
}

function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
        console.log('Heartbeat stopped');
    }
}

// WAREHOUSE MONITORING (използва getActiveSessionsCount)
function startWarehouseMonitoring() {
    if (warehouseMonitorInterval) return;

    warehouseMonitorInterval = setInterval(async () => {
        if (currentMode === 'initial') {
            await updateWarehouseActivity();
        }
    }, 30000); // 30 секунди

    // Initial load
    updateWarehouseActivity();

    console.log('Warehouse monitoring started');
}

function stopWarehouseMonitoring() {
    if (warehouseMonitorInterval) {
        clearInterval(warehouseMonitorInterval);
        warehouseMonitorInterval = null;
        console.log('Warehouse monitoring stopped');
    }
}

// Update warehouse activity display
async function updateWarehouseActivity() {
    try {
        // Използваме getActiveSessionsCount от shippingApi.js
        const result = await getActiveSessionsCount();
        const activeCount = result.activeSessionsCount || result.count || 0;

        // Update warehouse status display
        const warehouseStatus = document.getElementById('warehouse-status');
        if (warehouseStatus) {
            if (activeCount > 0) {
                warehouseStatus.innerHTML = `
                    <strong>${activeCount}</strong> активни товарения в момента
                    <small class="d-block text-muted mt-1">Последно обновено: ${new Date().toLocaleTimeString('bg-BG')}</small>
                `;
                warehouseStatus.className = 'warehouse-status active';
            } else {
                warehouseStatus.innerHTML = `
                    Няма активни товарения
                    <small class="d-block text-muted mt-1">Складът е в готовност</small>
                `;
                warehouseStatus.className = 'warehouse-status idle';
            }
        }

    } catch (error) {
        console.warn('Error updating warehouse activity:', error);
        const warehouseStatus = document.getElementById('warehouse-status');
        if (warehouseStatus) {
            warehouseStatus.innerHTML = 'Информацията не е налична';
            warehouseStatus.className = 'warehouse-status error';
        }
    }
}

// OBSERVER MONITORING (използва getLoadingStatus)
function startObserverMonitoring() {
    if (currentMode !== 'observer') return;

    // Check for updates every minute in observer mode
    const observerInterval = setInterval(async () => {
        if (currentMode !== 'observer') {
            clearInterval(observerInterval);
            return;
        }

        try {
            await checkActiveSession();
        } catch (error) {
            console.warn('Observer monitoring error:', error);
        }
    }, 60000); // 1 минута

    console.log('Observer monitoring started');
}

// DURATION TIMER
function startDurationTimer() {
    if (durationUpdateInterval) return;

    durationUpdateInterval = setInterval(() => {
        updateDurationDisplay();
    }, 1000);

    updateDurationDisplay(); // Initial update
    console.log('Duration timer started');
}

function stopDurationTimer() {
    if (durationUpdateInterval) {
        clearInterval(durationUpdateInterval);
        durationUpdateInterval = null;
        console.log('Duration timer stopped');
    }
}

function updateDurationDisplay() {
    if (!startTime) return;

    const now = new Date();
    const diffMs = now - startTime;
    const duration = formatDuration(Math.floor(diffMs / 1000));

    const durationElement = document.getElementById('session-duration');
    if (durationElement) {
        durationElement.textContent = duration;
    }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

// DOM helpers
function showLoading() {
    const loading = document.getElementById('loading-state');
    if (loading) loading.style.display = 'block';
}

function hideLoading() {
    const loading = document.getElementById('loading-state');
    if (loading) loading.style.display = 'none';
}

function showItemsContainer() {
    const container = document.getElementById('items-container');
    if (container) container.classList.remove('hidden');
}

function showEmptyState() {
    hideLoading();
    const emptyState = document.getElementById('empty-state');
    if (emptyState) emptyState.classList.remove('hidden');

    const container = document.getElementById('items-container');
    if (container) container.classList.add('hidden');
}

// Notification helpers
function showSuccess(message) {
    if (window.toastManager) {
        window.toastManager.success(message);
    } else {
        alert('✅ ' + message);
    }
}

function showError(message) {
    if (window.toastManager) {
        window.toastManager.error(message);
    } else {
        alert('❌ Грешка: ' + message);
    }
}

function showWarning(message) {
    if (window.toastManager) {
        window.toastManager.warning(message);
    } else {
        alert('⚠️ ' + message);
    }
}

// Formatting helpers
function formatDateTime(date) {
    if (!date) return '-';
    return date.toLocaleString('bg-BG', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDuration(seconds) {
    if (!seconds || seconds < 0) return '00:00:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==========================================
// CLEANUP & ERROR HANDLING
// ==========================================

// Global error handler
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    console.log('Cleaning up before unload...');
    stopHeartbeat();
    stopWarehouseMonitoring();
    stopDurationTimer();

    if (lostSignalsInterval) {
        clearInterval(lostSignalsInterval);
        lostSignalsInterval = null;
    }
});

// Handle visibility change (tab switch)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Tab hidden - reducing activity');
    } else {
        console.log('Tab visible - resuming normal activity');
        // Refresh data when tab becomes visible again
        if (currentMode === 'observer') {
            checkActiveSession();
        } else if (currentMode === 'initial') {
            updateWarehouseActivity();
        }
    }
});

// ==========================================
// INITIALIZATION COMPLETE
// ==========================================
console.log('Order shipping system fully loaded and ready');