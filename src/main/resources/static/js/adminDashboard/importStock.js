/**
 * IMPORT STOCK WIZARD - ЕДИНЕН JAVASCRIPT МОДУЛ
 * =============================================
 * Управлява целия процес на импортиране на стоки от Excel/CSV файлове
 * Шест стъпки: Upload → Mapping → Validation → Pricing → Summary → Confirm
 *
 * Архитектура: Functional approach с централизиран state
 * Размер: ~1100 реда включително коментари
 */

// ============================================
// ЦЕНТРАЛИЗИРАН STATE - ЕДИНСТВЕНИЯТ SOURCE OF TRUTH
// ============================================

const STATE = {
    currentStep: 1,
    uuid: null,
    uploadedBy: null,

    // Данни от всяка стъпка
    parsedData: null,      // ParsedFileDataDTO
    columnMapping: null,   // ColumnMappingDTO
    validation: null,      // ValidationResultDTO
    pricing: null,         // Array of items with prices
    summary: null,         // ImportSummaryDTO
    metadata: null,        // ImportMetadataDTO

    // UI state
    selectedItems: new Set(),
    sortBy: 'rowNumber',
    sortOrder: 'asc'
};

// Константи
const STEPS = {
    UPLOAD: 1,
    MAPPING: 2,
    VALIDATION: 3,
    PRICING: 4,
    SUMMARY: 5,
    CONFIRM: 6
};

const API_BASE = '/api/inventory/import';

// ============================================
// API ФУНКЦИИ - ВСИЧКИ BACKEND КОМУНИКАЦИИ
// ============================================

async function uploadFile(file, username) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadedBy', username);

    const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) throw new Error('Грешка при качване на файл');
    return await response.json();
}

async function saveMapping(uuid, mapping) {
    const response = await fetch(`${API_BASE}/${uuid}/mapping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapping)
    });

    if (!response.ok) throw new Error('Грешка при запазване на mapping');
    return await response.json();
}

async function validateData(uuid) {
    const response = await fetch(`${API_BASE}/${uuid}/validate`, {
        method: 'POST'
    });

    if (!response.ok) throw new Error('Грешка при валидация');
    return await response.json();
}

async function applyPricingFormula(uuid, skus, formula) {
    const response = await fetch(`${API_BASE}/${uuid}/pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skus, formula })
    });

    if (!response.ok) throw new Error('Грешка при прилагане на формула');
    return await response.json();
}

async function setManualPrice(uuid, sku, price) {
    const response = await fetch(`${API_BASE}/${uuid}/pricing/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku, sellingPrice: price })
    });

    if (!response.ok) throw new Error('Грешка при задаване на цена');
}

async function getSummary(uuid, metadata) {
    const response = await fetch(`${API_BASE}/${uuid}/summary`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) throw new Error('Грешка при зареждане на summary');
    return await response.json();
}

async function confirmImport(uuid) {
    const response = await fetch(`${API_BASE}/${uuid}/confirm`, {
        method: 'POST'
    });

    if (!response.ok) throw new Error('Грешка при финализиране на импорт');
    return await response.json();
}

async function cancelImport(uuid) {
    await fetch(`${API_BASE}/${uuid}`, { method: 'DELETE' });
}

// ============================================
// UI RENDERING ФУНКЦИИ
// ============================================

function renderStep(stepNumber) {
    // Скрива всички секции
    document.querySelectorAll('[data-step]').forEach(section => {
        section.classList.add('hidden');
    });

    // Показва текущата секция
    const currentSection = document.querySelector(`[data-step="${stepNumber}"]`);
    if (currentSection) {
        currentSection.classList.remove('hidden');
    }

    // Update progress bar
    updateProgressBar(stepNumber);

    // Update navigation бутони
    updateNavButtons(stepNumber);

    // Render специфичното съдържание за стъпката
    switch(stepNumber) {
        case STEPS.MAPPING:
            renderMappingForm();
            break;
        case STEPS.VALIDATION:
            renderValidationTable();
            break;
        case STEPS.PRICING:
            renderPricingTable();
            break;
        case STEPS.SUMMARY:
            renderSummaryView();
            break;
    }
}

function updateProgressBar(step) {
    const percentage = (step / 6) * 100;
    const progressBar = document.querySelector('.wizard-progress-bar');
    const progressText = document.querySelector('.wizard-progress-text');

    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }

    const stepNames = ['', 'Качване', 'Мапване', 'Валидация', 'Ценообразуване', 'Преглед', 'Потвърждение'];
    if (progressText) {
        progressText.textContent = `Стъпка ${step}/6: ${stepNames[step]}`;
    }
}

function updateNavButtons(step) {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    // Previous бутон - скрит на първа стъпка
    if (prevBtn) {
        prevBtn.style.display = step === 1 ? 'none' : 'block';
    }

    // Next бутон - променя текста на последна стъпка
    if (nextBtn) {
        if (step === 6) {
            nextBtn.style.display = 'none';
        } else if (step === 5) {
            nextBtn.textContent = 'Потвърди импорт';
        } else {
            nextBtn.textContent = 'Напред';
            nextBtn.style.display = 'block';
        }
    }
}

function renderMappingForm() {
    const container = document.getElementById('mapping-container');
    if (!container || !STATE.parsedData) return;

    // Auto-detect mapping
    const autoMapping = autoDetectColumns(STATE.parsedData.columnNames);

    let html = '<div class="mapping-form">';
    html += '<h3>Мапни колоните от файла към полета в системата</h3>';
    html += '<div class="mapping-preview-table">';
    html += renderPreviewTable(STATE.parsedData);
    html += '</div>';
    html += '<div class="mapping-rows">';

    STATE.parsedData.columnNames.forEach((colName, index) => {
        const suggested = autoMapping[`column_${index}`] || '';
        const isAuto = suggested !== '';

        html += `
            <div class="mapping-row ${isAuto ? 'auto-mapped' : ''}">
                <div class="column-name">${colName}</div>
                <select class="mapping-select" data-column="column_${index}">
                    <option value="">-- Игнорирай --</option>
                    <option value="sku" ${suggested === 'sku' ? 'selected' : ''}>SKU код</option>
                    <option value="name" ${suggested === 'name' ? 'selected' : ''}>Име на продукт</option>
                    <option value="quantity" ${suggested === 'quantity' ? 'selected' : ''}>Количество</option>
                    <option value="purchasePrice" ${suggested === 'purchasePrice' ? 'selected' : ''}>Доставна цена</option>
                    <option value="category" ${suggested === 'category' ? 'selected' : ''}>Категория</option>
                    <option value="description" ${suggested === 'description' ? 'selected' : ''}>Описание</option>
                </select>
                ${isAuto ? '<span class="auto-badge">Автоматично</span>' : ''}
            </div>
        `;
    });

    html += '</div>';
    html += '<div class="mapping-validation" id="mapping-validation"></div>';
    html += '</div>';

    container.innerHTML = html;

    // Add change listeners
    container.querySelectorAll('.mapping-select').forEach(select => {
        select.addEventListener('change', onMappingChange);
    });

    validateMapping();
}

function renderPreviewTable(parsedData) {
    if (!parsedData || !parsedData.rows) return '';

    const previewRows = parsedData.rows.slice(0, 5);
    let html = '<table class="preview-table"><thead><tr>';

    parsedData.columnNames.forEach(name => {
        html += `<th>${name}</th>`;
    });
    html += '</tr></thead><tbody>';

    previewRows.forEach(row => {
        html += '<tr>';
        Object.values(row).forEach(value => {
            html += `<td>${value || '-'}</td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table>';
    return html;
}

function renderValidationTable() {
    const container = document.getElementById('validation-container');
    if (!container || !STATE.validation) return;

    const items = STATE.validation.items || [];

    let html = `
        <div class="validation-header">
            <h3>Резултати от валидация</h3>
            <div class="validation-stats">
                <span class="stat valid">✓ Валидни: ${STATE.validation.validItems}</span>
                <span class="stat warning">⚠ Предупреждения: ${STATE.validation.itemsWithWarnings}</span>
                <span class="stat error">✗ Грешки: ${STATE.validation.itemsWithErrors}</span>
            </div>
        </div>
    `;

    html += renderTable(items, [
        { key: 'rowNumber', label: '№', width: '50px' },
        { key: 'sku', label: 'SKU', width: '120px' },
        { key: 'name', label: 'Име', width: 'auto' },
        { key: 'quantity', label: 'К-во', width: '80px' },
        { key: 'purchasePrice', label: 'Дост. цена', width: '100px', format: formatPrice },
        { key: 'status', label: 'Статус', width: '120px', format: formatStatus },
        { key: 'messages', label: 'Съобщения', width: 'auto', format: formatMessages }
    ], 'validation-table');

    container.innerHTML = html;
}

function renderPricingTable() {
    const container = document.getElementById('pricing-container');
    if (!container || !STATE.validation) return;

    const items = STATE.validation.items.filter(item =>
        item.status !== 'ERROR' && item.selected !== false
    );

    let html = `
        <div class="pricing-header">
            <h3>Задай продажни цени</h3>
            <div class="pricing-actions">
                <button onclick="selectAllPricing()" class="btn-secondary">Избери всички</button>
                <button onclick="openFormulaModal()" class="btn-primary">Приложи формула</button>
            </div>
            <div class="pricing-stats" id="pricing-stats"></div>
        </div>
    `;

    html += renderTable(items, [
        { key: 'checkbox', label: '☑', width: '40px', format: formatCheckbox },
        { key: 'sku', label: 'SKU', width: '120px' },
        { key: 'name', label: 'Име', width: 'auto' },
        { key: 'purchasePrice', label: 'Дост. цена', width: '100px', format: formatPrice },
        { key: 'existingSellingPrice', label: 'Текуща продажна', width: '120px', format: formatExistingPrice },
        { key: 'newPrice', label: 'Нова продажна', width: '150px', format: formatNewPriceInput },
        { key: 'margin', label: 'Марж %', width: '80px', format: formatMargin }
    ], 'pricing-table');

    container.innerHTML = html;
    updatePricingStats();

    // Add listeners за checkboxes и price inputs
    container.querySelectorAll('.item-checkbox').forEach(cb => {
        cb.addEventListener('change', onPricingCheckboxChange);
    });

    container.querySelectorAll('.price-input').forEach(input => {
        input.addEventListener('change', onPriceInputChange);
    });
}

function renderSummaryView() {
    const container = document.getElementById('summary-container');
    if (!container || !STATE.validation) return;

    const selectedItems = STATE.validation.items.filter(item => item.selected !== false);

    // Изчисляваме summary данни
    const stats = calculateSummaryStats(selectedItems);

    let html = `
        <div class="summary-header">
            <h2>Финален преглед преди потвърждение</h2>
        </div>
        
        <div class="summary-stats">
            <div class="stat-box">
                <div class="stat-value">${stats.totalItems}</div>
                <div class="stat-label">Общо артикули</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${stats.newItems}</div>
                <div class="stat-label">Нови</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${stats.updatedItems}</div>
                <div class="stat-label">Актуализирани</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${stats.totalQuantity}</div>
                <div class="stat-label">Общо количество</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${formatPrice(stats.totalPurchaseValue)}</div>
                <div class="stat-label">Обща доставна стойност</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${formatPrice(stats.expectedProfit)}</div>
                <div class="stat-label">Очаквана печалба</div>
            </div>
        </div>
        
        <div class="summary-metadata">
            <h3>Метаданни на импорта (опционално)</h3>
            <div class="metadata-form">
                <input type="text" id="supplier-name" placeholder="Име на доставчик">
                <input type="text" id="invoice-number" placeholder="Номер на фактура">
                <input type="date" id="invoice-date">
                <textarea id="import-notes" placeholder="Бележки"></textarea>
            </div>
        </div>
        
        <div class="summary-table-container">
            <h3>Детайли по артикули</h3>
            ${renderTable(selectedItems, [
        { key: 'sku', label: 'SKU', width: '120px' },
        { key: 'name', label: 'Име', width: 'auto' },
        { key: 'isNew', label: 'Статус', width: '100px', format: formatNewStatus },
        { key: 'quantity', label: 'К-во', width: '80px' },
        { key: 'purchasePrice', label: 'Дост. цена', width: '100px', format: formatPrice },
        { key: 'existingSellingPrice', label: 'Прод. цена', width: '100px', format: formatPrice }
    ], 'summary-table')}
        </div>
        
        <div class="summary-warning">
            <strong>⚠ ВНИМАНИЕ:</strong> При клик на "Потвърди импорт" всички показани промени ще бъдат записани в базата данни.
            Това действие не може да бъде отменено автоматично.
        </div>
        
        <div class="summary-confirmation">
            <label>
                <input type="checkbox" id="confirm-checkbox">
                Потвърждавам че съм прегледал данните и искам да продължа
            </label>
        </div>
    `;

    container.innerHTML = html;

    // Enable/disable confirm button based on checkbox
    const checkbox = document.getElementById('confirm-checkbox');
    const nextBtn = document.getElementById('next-btn');

    if (checkbox && nextBtn) {
        checkbox.addEventListener('change', () => {
            nextBtn.disabled = !checkbox.checked;
        });
        nextBtn.disabled = true;
    }
}

// ============================================
// GENERIC TABLE RENDERING
// ============================================

function renderTable(data, columns, className = '') {
    if (!data || data.length === 0) {
        return '<div class="empty-table">Няма данни за показване</div>';
    }

    let html = `<table class="data-table ${className}"><thead><tr>`;

    columns.forEach(col => {
        const width = col.width ? `style="width: ${col.width}"` : '';
        html += `<th ${width}>${col.label}</th>`;
    });

    html += '</tr></thead><tbody>';

    data.forEach((row, index) => {
        const rowClass = getRowClass(row);
        html += `<tr class="${rowClass}" data-index="${index}">`;

        columns.forEach(col => {
            const value = row[col.key];
            const formatted = col.format ? col.format(value, row, index) : value;
            html += `<td>${formatted || '-'}</td>`;
        });

        html += '</tr>';
    });

    html += '</tbody></table>';
    return html;
}

function getRowClass(row) {
    const classes = [];

    if (row.status === 'ERROR') classes.push('row-error');
    if (row.status === 'WARNING') classes.push('row-warning');
    if (row.status === 'VALID') classes.push('row-valid');
    if (row.isNew) classes.push('row-new');

    return classes.join(' ');
}

// ============================================
// FORMATTER FUNCTIONS
// ============================================

function formatPrice(value) {
    if (!value) return '-';
    return parseFloat(value).toFixed(2) + ' лв';
}

function formatStatus(value) {
    const badges = {
        'VALID': '<span class="badge badge-success">Валиден</span>',
        'WARNING': '<span class="badge badge-warning">Предупреждение</span>',
        'ERROR': '<span class="badge badge-error">Грешка</span>'
    };
    return badges[value] || value;
}

function formatMessages(messages) {
    if (!messages || messages.length === 0) return '-';
    return messages.map(msg => `<div class="message">${msg}</div>`).join('');
}

function formatCheckbox(value, row, index) {
    const checked = STATE.selectedItems.has(row.sku) ? 'checked' : '';
    return `<input type="checkbox" class="item-checkbox" data-sku="${row.sku}" ${checked}>`;
}

function formatExistingPrice(value, row) {
    if (row.isNew) return '<span class="text-muted">Нов продукт</span>';
    return formatPrice(value);
}

function formatNewPriceInput(value, row) {
    const required = row.isNew ? 'required' : '';
    const currentValue = row.existingSellingPrice || '';
    const cssClass = row.isNew ? 'price-input new-product' : 'price-input';

    return `<input type="number" step="0.01" class="${cssClass}" 
            data-sku="${row.sku}" value="${currentValue}" ${required} 
            placeholder="${row.isNew ? 'Задължително' : 'Непроменена'}">`;
}

function formatMargin(value, row) {
    if (!row.purchasePrice || !row.existingSellingPrice) return '-';

    const margin = calculateMargin(row.purchasePrice, row.existingSellingPrice);
    let cssClass = 'margin-normal';

    if (margin < 10) cssClass = 'margin-low';
    if (margin > 100) cssClass = 'margin-high';

    return `<span class="${cssClass}">${margin.toFixed(1)}%</span>`;
}

function formatNewStatus(value, row) {
    return row.isNew ?
        '<span class="badge badge-new">НОВ</span>' :
        '<span class="badge badge-update">Актуализация</span>';
}

// ============================================
// EVENT HANDLERS
// ============================================

function onFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    processFile(file);
}

function onFileDrop(event) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (!file) return;

    processFile(file);
}

async function processFile(file) {
    // Валидация на файла
    const validExtensions = ['xlsx', 'xls', 'csv'];
    const extension = file.name.split('.').pop().toLowerCase();

    if (!validExtensions.includes(extension)) {
        showError('Невалиден формат на файл. Поддържат се само Excel (.xlsx, .xls) и CSV (.csv) файлове.');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        showError('Файлът е твърде голям. Максималният размер е 10MB.');
        return;
    }

    // Upload и parse
    showLoading('Качване и обработка на файл...');

    try {
        const username = getCurrentUsername();
        const result = await uploadFile(file, username);

        STATE.uuid = result.uuid;
        STATE.uploadedBy = username;
        STATE.parsedData = result.parsedData;

        hideLoading();
        showSuccess(`Файлът е обработен успешно! Намерени са ${result.parsedData.totalRows} реда.`);

        nextStep();
    } catch (error) {
        hideLoading();
        showError('Грешка при обработка на файл: ' + error.message);
    }
}

function onMappingChange(event) {
    const select = event.target;
    const row = select.closest('.mapping-row');

    // Премахва auto-mapped класа при ръчна промяна
    if (row.classList.contains('auto-mapped')) {
        row.classList.remove('auto-mapped');
        const badge = row.querySelector('.auto-badge');
        if (badge) badge.remove();
    }

    validateMapping();
}

function validateMapping() {
    const selects = document.querySelectorAll('.mapping-select');
    const mapping = {};

    selects.forEach(select => {
        const column = select.dataset.column;
        const field = select.value;
        if (field) {
            mapping[column] = field;
        }
    });

    // Проверка за задължителни полета
    const hasRequired = mapping.hasOwnProperty('sku') &&
        mapping.hasOwnProperty('quantity') &&
        mapping.hasOwnProperty('purchasePrice');

    const validationDiv = document.getElementById('mapping-validation');
    const nextBtn = document.getElementById('next-btn');

    if (!hasRequired) {
        validationDiv.innerHTML = '<div class="validation-error">⚠ Трябва да мапнеш задължителните полета: SKU, Количество и Доставна цена</div>';
        if (nextBtn) nextBtn.disabled = true;
    } else {
        validationDiv.innerHTML = '<div class="validation-success">✓ Всички задължителни полета са мапнати</div>';
        if (nextBtn) nextBtn.disabled = false;
    }

    // Запазваме mapping-а в state
    STATE.columnMapping = { mappings: mapping };
}

function onPricingCheckboxChange(event) {
    const checkbox = event.target;
    const sku = checkbox.dataset.sku;

    if (checkbox.checked) {
        STATE.selectedItems.add(sku);
    } else {
        STATE.selectedItems.delete(sku);
    }

    updatePricingStats();
}

function onPriceInputChange(event) {
    const input = event.target;
    const sku = input.dataset.sku;
    const newPrice = parseFloat(input.value);

    // Намираме item-а и update-ваме selling price
    const item = STATE.validation.items.find(i => i.sku === sku);
    if (item) {
        item.existingSellingPrice = newPrice;

        // Update margin display
        const row = input.closest('tr');
        const marginCell = row.querySelector('td:last-child');
        if (marginCell) {
            marginCell.innerHTML = formatMargin(null, item);
        }
    }

    updatePricingStats();
}

// ============================================
// WIZARD NAVIGATION
// ============================================

async function nextStep() {
    const current = STATE.currentStep;

    // Validation преди преминаване към следваща стъпка
    if (current === STEPS.MAPPING) {
        if (!STATE.columnMapping) {
            showError('Моля мапни колоните преди да продължиш');
            return;
        }

        // Изпраща mapping към backend
        showLoading('Запазване на mapping...');
        try {
            await saveMapping(STATE.uuid, STATE.columnMapping);
            hideLoading();
        } catch (error) {
            hideLoading();
            showError('Грешка при запазване: ' + error.message);
            return;
        }

        // Trigger валидация
        showLoading('Валидиране на данни...');
        try {
            STATE.validation = await validateData(STATE.uuid);
            hideLoading();
        } catch (error) {
            hideLoading();
            showError('Грешка при валидация: ' + error.message);
            return;
        }
    }

    if (current === STEPS.PRICING) {
        // Проверка дали всички нови продукти имат цени
        const newProducts = STATE.validation.items.filter(item => item.isNew && item.selected !== false);
        const missingPrices = newProducts.filter(item => !item.existingSellingPrice || item.existingSellingPrice <= 0);

        if (missingPrices.length > 0) {
            showError(`${missingPrices.length} нови продукта нямат зададена продажна цена`);
            return;
        }
    }

    if (current === STEPS.SUMMARY) {
        // Събираме metadata
        STATE.metadata = {
            supplierName: document.getElementById('supplier-name')?.value || null,
            invoiceNumber: document.getElementById('invoice-number')?.value || null,
            invoiceDate: document.getElementById('invoice-date')?.value || null,
            notes: document.getElementById('import-notes')?.value || null
        };

        // Финализиране на импорта
        await executeImport();
        return; // executeImport ще update-не стъпката
    }

    STATE.currentStep = Math.min(current + 1, 6);
    renderStep(STATE.currentStep);
    saveState();
}

function prevStep() {
    STATE.currentStep = Math.max(STATE.currentStep - 1, 1);
    renderStep(STATE.currentStep);
    saveState();
}

async function executeImport() {
    showLoading('Импортирането е в ход, моля изчакайте...');
    STATE.currentStep = STEPS.CONFIRM;
    renderStep(STATE.currentStep);

    try {
        // Записваме metadata към session преди confirm
        // (В реалност API-то очаква metadata в getSummary, но го пропускаме тук за простота)

        const importEventId = await confirmImport(STATE.uuid);

        hideLoading();
        showSuccess('Импортът приключи успешно!');

        // Cleanup и redirect
        clearState();

        setTimeout(() => {
            // Redirect към inventory management
            window.location.href = '/admin#inventory';
        }, 2000);

    } catch (error) {
        hideLoading();
        STATE.currentStep = STEPS.SUMMARY;
        renderStep(STATE.currentStep);
        showError('Грешка при импортиране: ' + error.message);
    }
}

// ============================================
// PRICING ФУНКЦИИ
// ============================================

function selectAllPricing() {
    STATE.selectedItems.clear();

    const checkboxes = document.querySelectorAll('.item-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = true;
        STATE.selectedItems.add(cb.dataset.sku);
    });

    updatePricingStats();
}

function openFormulaModal() {
    if (STATE.selectedItems.size === 0) {
        showError('Моля избери артикули преди да приложиш формула');
        return;
    }

    const modal = document.getElementById('formula-modal');
    if (modal) {
        modal.classList.remove('hidden');
        updateFormulaPreview();
    }
}

function closeFormulaModal() {
    const modal = document.getElementById('formula-modal');
    if (modal) modal.classList.add('hidden');
}

function updateFormulaPreview() {
    const formulaType = document.querySelector('input[name="formula-type"]:checked')?.value;
    const formulaValue = parseFloat(document.getElementById('formula-value')?.value) || 0;

    if (!formulaType || formulaValue <= 0) return;

    const previewContainer = document.getElementById('formula-preview');
    if (!previewContainer) return;

    // Вземаме първите 3 selected items за preview
    const selectedSkus = Array.from(STATE.selectedItems).slice(0, 3);
    const previewItems = STATE.validation.items.filter(item => selectedSkus.includes(item.sku));

    let html = '<div class="preview-items">';
    previewItems.forEach(item => {
        const newPrice = calculateFormulaPrice(item.purchasePrice, formulaType, formulaValue);
        const margin = calculateMargin(item.purchasePrice, newPrice);

        html += `
            <div class="preview-item">
                <div class="preview-name">${item.name}</div>
                <div class="preview-calc">${formatPrice(item.purchasePrice)} → ${formatPrice(newPrice)}</div>
                <div class="preview-margin">Марж: ${margin.toFixed(1)}%</div>
            </div>
        `;
    });
    html += '</div>';

    previewContainer.innerHTML = html;
}

async function applyFormula() {
    const formulaType = document.querySelector('input[name="formula-type"]:checked')?.value;
    const formulaValue = parseFloat(document.getElementById('formula-value')?.value) || 0;
    const roundTo = parseFloat(document.getElementById('round-to')?.value) || null;

    if (!formulaType || formulaValue <= 0) {
        showError('Моля избери валидна формула и стойност');
        return;
    }

    const formula = {
        formulaType: formulaType,
        value: formulaValue,
        roundTo: roundTo
    };

    const selectedSkus = Array.from(STATE.selectedItems);

    showLoading('Прилагане на формула...');

    try {
        const result = await applyPricingFormula(STATE.uuid, selectedSkus, formula);

        // Update local state with new prices
        STATE.validation = result;

        hideLoading();
        closeFormulaModal();

        // Re-render pricing table
        renderPricingTable();

        showSuccess(`Формулата е приложена към ${selectedSkus.length} артикула`);

    } catch (error) {
        hideLoading();
        showError('Грешка при прилагане на формула: ' + error.message);
    }
}

function updatePricingStats() {
    const statsDiv = document.getElementById('pricing-stats');
    if (!statsDiv) return;

    const items = STATE.validation.items.filter(item => item.selected !== false);
    const withPrices = items.filter(item => item.existingSellingPrice && item.existingSellingPrice > 0);
    const newProducts = items.filter(item => item.isNew);
    const newWithPrices = newProducts.filter(item => item.existingSellingPrice && item.existingSellingPrice > 0);

    const margins = items
        .filter(item => item.purchasePrice && item.existingSellingPrice)
        .map(item => calculateMargin(item.purchasePrice, item.existingSellingPrice));

    const avgMargin = margins.length > 0
        ? margins.reduce((a, b) => a + b, 0) / margins.length
        : 0;

    statsDiv.innerHTML = `
        <div class="stat">Избрани: ${STATE.selectedItems.size}</div>
        <div class="stat">С цени: ${withPrices.length}/${items.length}</div>
        <div class="stat">Нови продукти: ${newWithPrices.length}/${newProducts.length} с цени</div>
        <div class="stat">Среден марж: ${avgMargin.toFixed(1)}%</div>
    `;
}

// ============================================
// UTILITY ФУНКЦИИ
// ============================================

function autoDetectColumns(columnNames) {
    const mapping = {};
    const keywords = {
        sku: ['sku', 'код', 'артикул', 'product code', 'item code'],
        name: ['име', 'name', 'наименование', 'product', 'артикул'],
        quantity: ['количество', 'qty', 'quantity', 'к-во', 'бр'],
        purchasePrice: ['доставна', 'purchase', 'cost', 'цена', 'себестойност'],
        category: ['категория', 'category', 'група', 'group'],
        description: ['описание', 'description', 'забележка', 'notes']
    };

    columnNames.forEach((name, index) => {
        const normalized = name.toLowerCase().trim();

        for (const [field, terms] of Object.entries(keywords)) {
            if (terms.some(term => normalized.includes(term))) {
                mapping[`column_${index}`] = field;
                break;
            }
        }
    });

    return mapping;
}

function calculateFormulaPrice(purchasePrice, formulaType, value) {
    let result;

    switch(formulaType) {
        case 'MARKUP_PERCENT':
            result = purchasePrice + (purchasePrice * value / 100);
            break;
        case 'FIXED_AMOUNT':
            result = purchasePrice + value;
            break;
        case 'MULTIPLIER':
            result = purchasePrice * value;
            break;
        default:
            result = purchasePrice;
    }

    return parseFloat(result.toFixed(2));
}

function calculateMargin(purchasePrice, sellingPrice) {
    if (!purchasePrice || purchasePrice === 0) return 0;
    return ((sellingPrice - purchasePrice) / purchasePrice) * 100;
}

function calculateSummaryStats(items) {
    const stats = {
        totalItems: items.length,
        newItems: items.filter(i => i.isNew).length,
        updatedItems: items.filter(i => !i.isNew).length,
        totalQuantity: items.reduce((sum, i) => sum + (i.quantity || 0), 0),
        totalPurchaseValue: items.reduce((sum, i) => sum + ((i.purchasePrice || 0) * (i.quantity || 0)), 0),
        totalSellingValue: items.reduce((sum, i) => sum + ((i.existingSellingPrice || 0) * (i.quantity || 0)), 0),
        expectedProfit: 0
    };

    stats.expectedProfit = stats.totalSellingValue - stats.totalPurchaseValue;

    return stats;
}

function getCurrentUsername() {
    // В реална имплементация това идва от Spring Security context
    // За сега връщаме placeholder
    return 'admin';
}

// ============================================
// STATE PERSISTENCE
// ============================================

function saveState() {
    try {
        sessionStorage.setItem('importWizardState', JSON.stringify({
            currentStep: STATE.currentStep,
            uuid: STATE.uuid,
            uploadedBy: STATE.uploadedBy
        }));
    } catch (e) {
        console.error('Failed to save state:', e);
    }
}

function loadState() {
    try {
        const saved = sessionStorage.getItem('importWizardState');
        if (saved) {
            const data = JSON.parse(saved);

            if (data.uuid) {
                // Питаме потребителя дали иска да продължи
                if (confirm('Имаш незавършен импорт. Искаш ли да продължиш?')) {
                    STATE.uuid = data.uuid;
                    STATE.uploadedBy = data.uploadedBy;
                    STATE.currentStep = data.currentStep;
                    return true;
                } else {
                    clearState();
                }
            }
        }
    } catch (e) {
        console.error('Failed to load state:', e);
    }

    return false;
}

function clearState() {
    sessionStorage.removeItem('importWizardState');

    STATE.currentStep = 1;
    STATE.uuid = null;
    STATE.uploadedBy = null;
    STATE.parsedData = null;
    STATE.columnMapping = null;
    STATE.validation = null;
    STATE.pricing = null;
    STATE.summary = null;
    STATE.metadata = null;
    STATE.selectedItems.clear();
}

// ============================================
// UI FEEDBACK ФУНКЦИИ
// ============================================

function showLoading(message = 'Зареждане...') {
    let loader = document.getElementById('global-loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.className = 'loading-overlay';
        document.body.appendChild(loader);
    }

    loader.innerHTML = `
        <div class="loading-spinner"></div>
        <div class="loading-message">${message}</div>
    `;
    loader.classList.remove('hidden');
}

function hideLoading() {
    const loader = document.getElementById('global-loader');
    if (loader) loader.classList.add('hidden');
}

function showError(message) {
    if (window.toastManager) {
        window.toastManager.error(message);
    } else {
        alert('Грешка: ' + message);
    }
}

function showSuccess(message) {
    if (window.toastManager) {
        window.toastManager.success(message);
    } else {
        alert(message);
    }
}

// ============================================
// INITIALIZATION
// ============================================

function initWizard() {
    // Load saved state ако има
    const hasSavedState = loadState();

    // Setup event listeners
    setupEventListeners();

    // Render началната стъпка
    if (hasSavedState) {
        renderStep(STATE.currentStep);
    } else {
        renderStep(STEPS.UPLOAD);
    }
}

function setupEventListeners() {
    // Navigation бутони
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    if (prevBtn) prevBtn.addEventListener('click', prevStep);
    if (nextBtn) nextBtn.addEventListener('click', nextStep);

    // File upload
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', onFileSelected);
    }

    // Drag and drop
    const dropZone = document.getElementById('drop-zone');
    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            dropZone.classList.remove('drag-over');
            onFileDrop(e);
        });
    }

    // Formula modal
    const closeModalBtn = document.getElementById('close-formula-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeFormulaModal);
    }

    const applyFormulaBtn = document.getElementById('apply-formula-btn');
    if (applyFormulaBtn) {
        applyFormulaBtn.addEventListener('click', applyFormula);
    }

    // Formula preview updates
    const formulaInputs = document.querySelectorAll('input[name="formula-type"], #formula-value, #round-to');
    formulaInputs.forEach(input => {
        input.addEventListener('change', updateFormulaPreview);
    });

    // Cancel import бутон ако има
    const cancelBtn = document.getElementById('cancel-import-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', async () => {
            if (confirm('Сигурен ли си че искаш да откажеш импорта?')) {
                if (STATE.uuid) {
                    await cancelImport(STATE.uuid);
                }
                clearState();
                window.location.reload();
            }
        });
    }
}

// Export за глобален достъп
window.ImportWizard = {
    init: initWizard,
    nextStep,
    prevStep,
    selectAllPricing,
    openFormulaModal,
    closeFormulaModal,
    applyFormula
};

// Auto-init при DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWizard);
} else {
    initWizard();
}