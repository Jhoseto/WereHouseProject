/**
 * SHIPPING API - САМО ENDPOINTS
 * =============================
 * Прости функции за API заявки. Нищо друго.
 */

// ==========================================
// ОСНОВНИ SHIPPING ОПЕРАЦИИ
// ==========================================

// Стартира товарене
async function startLoading(truckNumber) {
    const response = await fetch('/api/loading/start', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            [window.orderConfig.csrfHeader]: window.orderConfig.csrfToken
        },
        body: JSON.stringify({
            orderId: window.orderConfig.orderId,
            truckNumber: truckNumber,
            employeeId: window.orderConfig.currentUserId,
            employeeUsername: window.orderConfig.currentUsername
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Грешка при стартиране');
    }

    return await response.json();
}

// Toggle артикул
async function toggleItem(sessionId, itemId) {
    const response = await fetch('/api/loading/toggle-item', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            [window.orderConfig.csrfHeader]: window.orderConfig.csrfToken
        },
        body: JSON.stringify({
            sessionId: sessionId,
            itemId: itemId
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Грешка при промяна');
    }

    return await response.json();
}

// Завършва товарене
async function completeLoading(sessionId) {
    const response = await fetch('/api/loading/complete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            [window.orderConfig.csrfHeader]: window.orderConfig.csrfToken
        },
        body: JSON.stringify({
            sessionId: sessionId
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Грешка при завършване');
    }

    return await response.json();
}

// Получава статус
async function getLoadingStatus() {
    const response = await fetch(`/api/loading/status/${window.orderConfig.orderId}`, {
        headers: {
            [window.orderConfig.csrfHeader]: window.orderConfig.csrfToken
        }
    });

    if (response.status === 404) {
        return { hasActiveSession: false };
    }

    if (!response.ok) {
        throw new Error('Грешка при получаване на статус');
    }

    return await response.json();
}

// Heartbeat
async function sendHeartbeat(sessionId) {
    const response = await fetch('/api/loading/heartbeat', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            [window.orderConfig.csrfHeader]: window.orderConfig.csrfToken
        },
        body: JSON.stringify({
            sessionId: sessionId
        })
    });

    return response.ok;
}

// ==========================================
// MONITORING ОПЕРАЦИИ
// ==========================================

// Получава активни сесии
async function getActiveSessions() {
    const response = await fetch('/api/loading/active-sessions', {
        headers: {
            [window.orderConfig.csrfHeader]: window.orderConfig.csrfToken
        }
    });

    if (!response.ok) {
        throw new Error('Грешка при получаване на активни сесии');
    }

    return await response.json();
}

// Получава брой активни сесии
async function getActiveSessionsCount() {
    const response = await fetch('/api/loading/active-count', {
        headers: {
            [window.orderConfig.csrfHeader]: window.orderConfig.csrfToken
        }
    });

    if (!response.ok) {
        throw new Error('Грешка при получаване на брой активни сесии');
    }

    return await response.json();
}

// ==========================================
// ADMIN ОПЕРАЦИИ
// ==========================================

// Открива изгубени сигнали
async function detectLostSignals(thresholdMinutes = 10) {
    const response = await fetch('/api/loading/detect-lost-signals', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            [window.orderConfig.csrfHeader]: window.orderConfig.csrfToken
        },
        body: JSON.stringify({
            thresholdMinutes: thresholdMinutes
        })
    });

    if (!response.ok) {
        throw new Error('Грешка при откриване на изгубени сигнали');
    }

    return await response.json();
}

// Изтрива стари сесии
async function cleanupOldSessions(maxAgeHours = 24) {
    const response = await fetch('/api/loading/cleanup-old-sessions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            [window.orderConfig.csrfHeader]: window.orderConfig.csrfToken
        },
        body: JSON.stringify({
            maxAgeHours: maxAgeHours
        })
    });

    if (!response.ok) {
        throw new Error('Грешка при изтриване на стари сесии');
    }

    return await response.json();
}