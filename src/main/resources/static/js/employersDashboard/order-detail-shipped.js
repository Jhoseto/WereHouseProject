/**
 * ORDER DETAIL SHIPPED - МИНИМАЛНА ЛОГИКА С ВСИЧКИ ENDPOINTS
 * =========================================================
 * Прост код за товарене. Без класове, без сложности.
 * Използва всички API endpoints креативно.
 */

// Глобални променливи
let currentSessionId = null;
let currentTruck = null;
let startTime = null;
let timerInterval = null;
let heartbeatInterval = null;
let warehouseMonitorInterval = null;
let loadedItems = new Set();
let orderItems = [];
let currentMode = 'selection'; // 'selection', 'loading', 'observer'

// Инициализация
document.addEventListener('DOMContentLoaded', async function() {
    orderItems = window.orderConfig.orderItems || [];

    // Setup event listeners
    setupEventListeners();

    // Проверка за активна сесия
    await checkActiveSession();
});

// Event listeners
function setupEventListeners() {
    // Truck input validation
    document.getElementById('truck-input').addEventListener('input', function(e) {
        const value = e.target.value.trim();
        document.getElementById('start-btn').disabled = value.length < 4;
    });

    // Start button
    document.getElementById('start-btn').addEventListener('click', handleStartLoading);

    // Complete button
    document.getElementById('complete-btn').addEventListener('click', handleCompleteLoading);
}

// Проверява за активна сесия
async function checkActiveSession() {
    try {
        const status = await getLoadingStatus();

        if (status.hasActiveSession) {
            const session = status.session;

            if (session.employeeId === window.orderConfig.currentUserId) {
                // Аз съм активният товарач
                switchToLoadingMode(session);
            } else {
                // Някой друг товари - observer mode
                switchToObserverMode(session);
            }
        } else {
            // Няма активна сесия
            switchToSelectionMode();
        }
    } catch (error) {
        console.error('Грешка при проверка на статус:', error);
        switchToSelectionMode();
    }
}

// Превключва режимите
async function switchToSelectionMode() {
    currentMode = 'selection';
    document.getElementById('truck-section').style.display = 'block';
    document.getElementById('loading-section').style.display = 'none';
    document.getElementById('observer-section').style.display = 'none';

    // ✅ WAREHOUSE ACTIVITY DISPLAY
    await showWarehouseActivity();
    startWarehouseMonitoring();
}

function switchToLoadingMode(session) {
    currentMode = 'loading';
    currentSessionId = session.id;
    currentTruck = session.truckNumber;

    document.getElementById('truck-section').style.display = 'none';
    document.getElementById('loading-section').style.display = 'block';
    document.getElementById('observer-section').style.display = 'none';

    // Обновява UI
    document.getElementById('truck-display').textContent = session.truckNumber;

    // Показва информация за оператора в status bar
    const statusBar = document.querySelector('.alert.alert-info');
    if (statusBar) {
        const operatorInfo = statusBar.querySelector('.ms-3') || document.createElement('span');
        operatorInfo.className = 'ms-3';
        operatorInfo.innerHTML = `<i class="bi bi-person-fill"></i> ${window.orderConfig.currentUsername || 'Вие'}`;
        if (!statusBar.contains(operatorInfo)) {
            statusBar.querySelector('div').appendChild(operatorInfo);
        }
    }

    // Синхронизира заредените items
    loadedItems.clear();
    if (session.loadedItems) {
        session.loadedItems.forEach(id => loadedItems.add(id));
    }

    renderItems(true); // true = може да редактира
    updateProgress();

    // ✅ ПОПРАВКА ЗА LOADING STATE
    hideLoadingState();
    showOrderInterface();

    // Стартира timer ако няма startTime
    if (!startTime) {
        startTime = new Date(session.startedAt || Date.now());
        startTimer();
    }

    // ✅ SMART HEARTBEAT с automatic error detection
    startSmartHeartbeat();
    stopWarehouseMonitoring();
}

async function switchToObserverMode(session) {
    currentMode = 'observer';

    document.getElementById('truck-section').style.display = 'none';
    document.getElementById('loading-section').style.display = 'none';
    document.getElementById('observer-section').style.display = 'block';

    // Показва кой товари
    document.getElementById('observer-message').textContent =
        `${session.username || 'Служител'} товари в камион ${session.truckNumber}`;

    // Синхронизира данни
    loadedItems.clear();
    if (session.loadedItems) {
        session.loadedItems.forEach(id => loadedItems.add(id));
    }

    renderObserverItems();
    updateObserverProgress();

    // ✅ TEAM ACTIVITY DISPLAY
    await showTeamActivity();

    // Стартира мониторинг
    startObserverMonitoring();
    stopWarehouseMonitoring();
}

// ==========================================
// ✅ UI STATE MANAGEMENT FUNCTIONS
// ==========================================

function hideLoadingState() {
    const loadingState = document.getElementById('loading-state');
    if (loadingState) {
        loadingState.classList.add('hidden');
        loadingState.style.display = 'none';
    }
}

function showOrderInterface() {
    const itemsContainer = document.getElementById('items-container');
    if (itemsContainer) {
        itemsContainer.classList.remove('hidden');
        itemsContainer.style.display = 'block';
    }

    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
        emptyState.classList.add('hidden');
        emptyState.style.display = 'none';
    }
}

function showLoadingState() {
    const loadingState = document.getElementById('loading-state');
    if (loadingState) {
        loadingState.classList.remove('hidden');
        loadingState.style.display = 'block';
    }

    const itemsContainer = document.getElementById('items-container');
    if (itemsContainer) {
        itemsContainer.classList.add('hidden');
    }
}

// ==========================================
// ✅ WAREHOUSE ACTIVITY FUNCTIONS
// ==========================================

async function showWarehouseActivity() {
    try {
        const count = await getActiveSessionsCount();
        const warehouseStatus = document.getElementById('warehouse-status');

        // ✅ SAFE PROPERTY ACCESS
        const activeCount = count?.activeSessionsCount || count?.count || 0;

        if (activeCount > 0) {
            warehouseStatus.innerHTML = `<span class="text-warning"><i class="bi bi-people"></i> ${activeCount} активни товарни операции</span>`;
        } else {
            warehouseStatus.innerHTML = `<span class="text-success"><i class="bi bi-check-circle"></i> Склад свободен</span>`;
        }
    } catch (error) {
        // Тихо - не нарушаваме потребителското преживяване
        document.getElementById('warehouse-status').innerHTML = `<span class="text-muted">Статус недостъпен</span>`;
    }
}

async function showTeamActivity() {
    try {
        const sessions = await getActiveSessions();
        if (!sessions.activeSessions || !Array.isArray(sessions.activeSessions)) {
            return;
        }

        const otherSessions = sessions.activeSessions.filter(s => s.orderId !== window.orderConfig.orderId);
        const otherActivity = document.getElementById('other-activity');

        if (otherSessions.length > 0) {
            const details = otherSessions.map(s => `Поръчка ${s.orderId}: ${s.completionPercentage || 0}%`).join(' • ');
            otherActivity.innerHTML = `<i class="bi bi-truck"></i> Други товарни операции: ${details}`;
        } else {
            otherActivity.innerHTML = `<i class="bi bi-info-circle"></i> Това е единствената активна товарна операция`;
        }
    } catch (error) {
        // Тихо
        const otherActivity = document.getElementById('other-activity');
        if (otherActivity) {
            otherActivity.innerHTML = '';
        }
    }
}

function startWarehouseMonitoring() {
    warehouseMonitorInterval = setInterval(async () => {
        if (currentMode === 'selection') {
            await showWarehouseActivity();
        }
    }, 15000); // 15 секунди
}

function stopWarehouseMonitoring() {
    if (warehouseMonitorInterval) {
        clearInterval(warehouseMonitorInterval);
        warehouseMonitorInterval = null;
    }
}

// Стартира товарене
async function handleStartLoading() {
    const truckNumber = document.getElementById('truck-input').value.trim();
    const startBtn = document.getElementById('start-btn');

    try {
        startBtn.disabled = true;
        startBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Стартиране...';

        const result = await startLoading(truckNumber);

        // Превключва в loading mode
        switchToLoadingMode({
            id: result.sessionId,
            truckNumber: truckNumber,
            startedAt: new Date(),
            loadedItems: []
        });

    } catch (error) {
        alert('Грешка: ' + error.message);
        startBtn.disabled = false;
        startBtn.innerHTML = '<i class="bi bi-play-circle"></i> Започни товарене';
    }
}

// Завършва товарене
async function handleCompleteLoading() {
    const completeBtn = document.getElementById('complete-btn');

    try {
        completeBtn.disabled = true;
        completeBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Завършване...';

        await completeLoading(currentSessionId);

        // ✅ BACKGROUND MAINTENANCE след завършване
        await backgroundMaintenance();

        // Cleanup и redirect
        stopTimer();
        stopSmartHeartbeat();

        alert('Товарене завършено успешно!');
        window.location.href = '/employer/dashboard';

    } catch (error) {
        alert('Грешка: ' + error.message);
        completeBtn.disabled = false;
        completeBtn.innerHTML = '<i class="bi bi-check-circle"></i> Завърши товарене';
    }
}

// Рендира артикулите (loading mode)
function renderItems(canEdit) {
    const container = document.getElementById('items-container');

    container.innerHTML = orderItems.map(item => {
        // ✅ ИЗПОЛЗВАЙ productId вместо id
        const isLoaded = loadedItems.has(item.productId);
        const toggleHtml = canEdit ?
            `<button class="btn btn-sm ${isLoaded ? 'btn-success' : 'btn-outline-secondary'}" 
                     onclick="toggleItemLoading(${item.productId})">
                <i class="bi ${isLoaded ? 'bi-check-circle-fill' : 'bi-circle'}"></i>
             </button>` :
            `<span class="badge ${isLoaded ? 'bg-success' : 'bg-secondary'}">
                <i class="bi ${isLoaded ? 'bi-check-circle-fill' : 'bi-circle'}"></i>
             </span>`;

        return `
            <div class="d-flex justify-content-between align-items-center border-bottom py-2">
                <div>
                    <strong>${item.productName}</strong><br>
                    <small class="text-muted">${item.quantity} бр.</small>
                </div>
                ${toggleHtml}
            </div>
        `;
    }).join('');
}

// Рендира артикулите (observer mode)
function renderObserverItems() {
    const container = document.getElementById('observer-items');

    container.innerHTML = orderItems.map(item => {
        // ✅ ИЗПОЛЗВАЙ productId вместо id
        const isLoaded = loadedItems.has(item.productId);

        return `
            <div class="d-flex justify-content-between align-items-center border-bottom py-2">
                <div>
                    <strong>${item.productName}</strong><br>
                    <small class="text-muted">${item.quantity} бр.</small>
                </div>
                <span class="badge ${isLoaded ? 'bg-success' : 'bg-secondary'}">
                    <i class="bi ${isLoaded ? 'bi-check-circle-fill' : 'bi-circle'}"></i>
                </span>
            </div>
        `;
    }).join('');
}

// Toggle артикул
async function toggleItemLoading(itemId) {
    try {
        await toggleItem(currentSessionId, itemId);

        // Обновява локалното състояние
        const wasLoaded = loadedItems.has(itemId);
        const isNowLoaded = !wasLoaded; // Toggle логика

        if (isNowLoaded) {
            loadedItems.add(itemId);
        } else {
            loadedItems.delete(itemId);
        }

        // Обновява UI
        renderItems(true);
        updateProgress();

    } catch (error) {
        alert('Грешка: ' + error.message);
    }
}

// Обновява прогреса (loading mode)
function updateProgress() {
    const loaded = loadedItems.size;
    const total = orderItems.length;
    const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;

    document.getElementById('loaded-count').textContent = loaded.toString();
    document.getElementById('total-count').textContent = total.toString();
    document.getElementById('progress-percent').textContent = percent + '%';
    document.getElementById('progress-bar').style.width = percent + '%';

    // Обновява статистиките
    document.getElementById('total-items-stat').textContent = total.toString();
    document.getElementById('loaded-items-stat').textContent = loaded.toString();
    document.getElementById('pending-items-stat').textContent = (total - loaded).toString();

    // Показва complete button при 100%
    document.getElementById('complete-section').style.display =
        (percent === 100 && total > 0) ? 'block' : 'none';
}

// Обновява прогреса (observer mode)
function updateObserverProgress() {
    const loaded = loadedItems.size;
    const total = orderItems.length;
    const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;

    document.getElementById('observer-loaded').textContent = loaded.toString();
    document.getElementById('observer-total').textContent = total.toString();
    document.getElementById('observer-percent').textContent = percent + '%';
    document.getElementById('observer-progress').style.width = percent + '%';
}

// Timer функции
function startTimer() {
    timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimer() {
    if (!startTime) return;

    const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;

    document.getElementById('timer-display').textContent =
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// ==========================================
// ✅ SMART HEARTBEAT FUNCTIONS
// ==========================================

function startSmartHeartbeat() {
    heartbeatInterval = setInterval(async () => {
        try {
            const success = await sendHeartbeat(currentSessionId);

            // ✅ AUTOMATIC LOST SIGNAL DETECTION при проблеми
            if (!success) {
                try {
                    const lostSignalsResponse = await detectLostSignals(3); // 3 минути threshold
                    if (lostSignalsResponse.affectedSessions > 0) {
                        updateSignalStatus('warning', `Открити ${lostSignalsResponse.affectedSessions} проблема с връзката`);
                    } else {
                        updateSignalStatus('warning', 'Временен проблем с връзката');
                    }
                } catch (detectError) {
                    updateSignalStatus('warning', 'Слаб сигнал');
                }
            } else {
                updateSignalStatus('online');
            }

        } catch (error) {
            updateSignalStatus('error', 'Грешка в комуникацията');
        }
    }, 10000); // 10 секунди
}

function stopSmartHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}

function updateSignalStatus(status, message) {
    const signalElement = document.getElementById('signal-status');

    if (status === 'online') {
        signalElement.innerHTML = '<i class="bi bi-wifi text-success"></i> Активен';
    } else if (status === 'warning') {
        signalElement.innerHTML = `<i class="bi bi-wifi text-warning"></i> ${message || 'Слаб сигнал'}`;
    } else {
        signalElement.innerHTML = `<i class="bi bi-wifi text-danger"></i> ${message || 'Без връзка'}`;
    }
}

// Observer monitoring
function startObserverMonitoring() {
    setInterval(async () => {
        if (currentMode === 'observer') {
            try {
                const status = await getLoadingStatus();
                if (status.hasActiveSession) {
                    // Синхронизира данни
                    loadedItems.clear();
                    if (status.session.loadedItems) {
                        status.session.loadedItems.forEach(id => loadedItems.add(id));
                    }
                    renderObserverItems();
                    updateObserverProgress();
                }

                // ✅ REFRESH TEAM ACTIVITY periodically
                await showTeamActivity();

            } catch (error) {
                console.error('Observer monitoring грешка:', error);
            }
        }
    }, 5000); // 5 секунди
}

// ==========================================
// ✅ BACKGROUND MAINTENANCE FUNCTIONS
// ==========================================

async function backgroundMaintenance() {
    try {
        // Тихо почистване на стари сесии (2 часа threshold)
        await cleanupOldSessions(2);
        console.log('Background maintenance завършен успешно');
    } catch (error) {
        // Тихо - не показваме грешки при background операции
        console.warn('Background maintenance неуспешен:', error.message);
    }
}