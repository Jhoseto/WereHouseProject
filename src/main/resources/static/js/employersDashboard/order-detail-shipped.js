/**
 * ORDER DETAIL SHIPPED - МИНИМАЛНА ЛОГИКА
 * =======================================
 * Прост код за товарене. Без класове, без сложности.
 */

// Глобални променливи
let currentSessionId = null;
let currentTruck = null;
let startTime = null;
let timerInterval = null;
let heartbeatInterval = null;
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
        const status = await getStatus();

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
function switchToSelectionMode() {
    currentMode = 'selection';
    document.getElementById('truck-section').style.display = 'block';
    document.getElementById('loading-section').style.display = 'none';
    document.getElementById('observer-section').style.display = 'none';
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
        operatorInfo.innerHTML = `<i class="bi bi-person-fill"></i> ${window.orderConfig.currentUser.username || 'Вие'}`;
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

    // Стартира timer ако няма startTime
    if (!startTime) {
        startTime = new Date(session.startedAt || Date.now());
        startTimer();
    }

    // Стартира heartbeat
    startHeartbeat();
}

function switchToObserverMode(session) {
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

    // Стартира мониторинг
    startObserverMonitoring();
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

        // Cleanup и redirect
        stopTimer();
        stopHeartbeat();

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
        const isLoaded = loadedItems.has(item.id);
        const toggleHtml = canEdit ?
            `<button class="btn btn-sm ${isLoaded ? 'btn-success' : 'btn-outline-secondary'}" 
                     onclick="toggleItemLoading(${item.id})">
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
        const isLoaded = loadedItems.has(item.id);

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

// Heartbeat функции
function startHeartbeat() {
    heartbeatInterval = setInterval(async () => {
        try {
            const success = await sendHeartbeat(currentSessionId);
            updateSignalStatus(success ? 'online' : 'warning');
        } catch (error) {
            updateSignalStatus('warning');
        }
    }, 10000); // 10 секунди
}

function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}

function updateSignalStatus(status) {
    const signalElement = document.getElementById('signal-status');

    if (status === 'online') {
        signalElement.innerHTML = '<i class="bi bi-wifi text-success"></i> Активен';
    } else {
        signalElement.innerHTML = '<i class="bi bi-wifi text-warning"></i> Слаб сигнал';
    }
}

// Observer monitoring
function startObserverMonitoring() {
    setInterval(async () => {
        if (currentMode === 'observer') {
            try {
                const status = await getStatus();
                if (status.hasActiveSession) {
                    // Синхронизира данни
                    loadedItems.clear();
                    if (status.session.loadedItems) {
                        status.session.loadedItems.forEach(id => loadedItems.add(id));
                    }
                    renderObserverItems();
                    updateObserverProgress();
                }
            } catch (error) {
                console.error('Observer monitoring грешка:', error);
            }
        }
    }, 5000); // 5 секунди
}