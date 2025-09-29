/**
 * TOAST SYSTEM АРХИТЕКТУРА
 * ========================
 *
 * ОСНОВНА СИСТЕМА: ToastManager клас в navbar.js
 * - Зарежда се във всички страници чрез bottomImports
 * - Използва се навсякъде: window.toastManager.success(), .error(), .warning()
 * - Управлява обикновени toast съобщения които изчезват автоматично
 *
 * РАЗШИРЕНА СИСТЕМА: Този файл (toastNotificationsAdvanced.js)
 * - Добавя специализирани функции за shipping/offline detection
 * - Sticky toast-ове които остават докато не се реши проблемът
 * - Таймери за показване на времетраене на offline състоянието
 * - Използва се САМО в order-detail-shipped.js за offline detection
 *
 */

// ==========================================
// STICKY OFFLINE TOAST СИСТЕМА
// ==========================================

let currentOfflineToastId = null;
let offlineTimerInterval = null;

// Показва sticky toast за offline състояние с автоматичен таймер
window.showStickyOfflineToast = function(offlineStartTime) {
    // Премахваме всеки предишен offline toast преди да показваме нов
    window.hideStickyOfflineToast();

    currentOfflineToastId = 'offline_toast_' + Date.now();
    const container = document.querySelector('.toast-container');
    if (!container) {
        console.warn('Toast container не е намерен за sticky offline toast');
        return;
    }

    const toastHTML = `
        <div class="toast toast-warning sticky-offline-toast" id="${currentOfflineToastId}">
            <div class="toast-icon">
                <i class="bi bi-exclamation-triangle-fill"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">Мрежова връзка</div>
                <div class="toast-message">Няма връзка от 0с</div>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', toastHTML);
    startOfflineTimer(offlineStartTime);
    return currentOfflineToastId;
};

// Скрива и премахва sticky offline toast
window.hideStickyOfflineToast = function() {
    if (currentOfflineToastId) {
        const toast = document.getElementById(currentOfflineToastId);
        if (toast) {
            toast.remove();
        }

        if (offlineTimerInterval) {
            clearInterval(offlineTimerInterval);
            offlineTimerInterval = null;
        }

        currentOfflineToastId = null;
    }
};

// Стартира таймер който обновява времето в toast-а всяка секунда
function startOfflineTimer(startTime) {
    const updateTimer = () => {
        if (!currentOfflineToastId) {
            clearInterval(offlineTimerInterval);
            return;
        }

        const toast = document.getElementById(currentOfflineToastId);
        if (!toast) {
            clearInterval(offlineTimerInterval);
            offlineTimerInterval = null;
            currentOfflineToastId = null;
            return;
        }

        const elapsed = Date.now() - startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        const timeStr = minutes > 0 ? `${minutes}м ${seconds}с` : `${seconds}с`;

        const messageDiv = toast.querySelector('.toast-message');
        if (messageDiv) {
            if (minutes >= 5) {
                // След 5 минути преминаваме към червен (критичен) режим
                toast.className = toast.className.replace('toast-warning', 'toast-error');
                messageDiv.textContent = `КРИТИЧНО: Няма връзка от ${timeStr}`;
            } else {
                // В първите 5 минути остава жълт (предупредителен) режим
                messageDiv.textContent = `Няма връзка от ${timeStr}`;
            }
        }
    };

    offlineTimerInterval = setInterval(updateTimer, 1000);
    updateTimer(); // Първо обновяване веднага
}