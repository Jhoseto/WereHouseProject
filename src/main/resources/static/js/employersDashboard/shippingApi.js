/**
 * SHIPPING API - САМО ENDPOINTS
 * =============================
 * Прости функции за API заявки. Нищо друго.
 */

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
            employeeId: window.orderConfig.currentUserId
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
async function getStatus() {
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