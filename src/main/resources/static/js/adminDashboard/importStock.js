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
    sortOrder: 'asc',
    validationSortBy: 'rowNumber',
    validationSortOrder: 'asc',
    pricingSortBy: 'sku',
    pricingSortOrder: 'asc'
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

const API_BASE = '/admin/inventory/importStock';

// ============================================
// CSRF TOKEN HELPER
// ============================================

function getCsrfToken() {
    return {
        token: document.querySelector('meta[name="_csrf"]')?.content || window.csrfToken || '',
        header: document.querySelector('meta[name="_csrf_header"]')?.content || window.csrfHeader || 'X-CSRF-TOKEN'
    };
}

function getHeaders(includeContentType = true) {
    const csrf = getCsrfToken();
    const headers = {
        [csrf.header]: csrf.token
    };

    if (includeContentType) {
        headers['Content-Type'] = 'application/json';
    }

    return headers;
}

// ============================================
// API ФУНКЦИИ - ВСИЧКИ BACKEND КОМУНИКАЦИИ
// ============================================

/**
 * СТЪПКА 1: Upload на файл към сървъра
 * FormData автоматично задава Content-Type, затова не го слагаме ръчно
 */
async function uploadFile(file, username) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadedBy', username);

    const csrf = getCsrfToken();

    const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
            [csrf.header]: csrf.token
            // Не слагаме Content-Type - браузърът го прави автоматично за FormData
        },
        body: formData
    });

    if (!response.ok) throw new Error('Грешка при качване на файл');
    return await response.json();
}

/**
 * СТЪПКА 2: Запазване на column mapping
 * Казва на системата коя колона от файла съответства на кое поле
 */
async function saveMapping(uuid, mapping) {
    const response = await fetch(`${API_BASE}/${uuid}/mapping`, {
        method: 'POST',
        headers: getHeaders(), // Включва CSRF токен и Content-Type
        body: JSON.stringify(mapping)
    });

    if (!response.ok) throw new Error('Грешка при запазване на mapping');
    return await response.json();
}

/**
 * СТЪПКА 3: Валидация на данните
 * Проверява всеки артикул и връща статус (VALID/WARNING/ERROR)
 */
async function validateData(uuid) {
    const csrf = getCsrfToken();

    const response = await fetch(`${API_BASE}/${uuid}/validate`, {
        method: 'POST',
        headers: {
            [csrf.header]: csrf.token
        }
    });

    if (!response.ok) throw new Error('Грешка при валидация');
    return await response.json();
}

/**
 * СТЪПКА 4a: Прилагане на ценообразуваща формула към избрани артикули
 * Изчислява продажни цени базирани на доставните цени
 */
async function applyPricingFormula(uuid, skus, formula) {
    const response = await fetch(`${API_BASE}/${uuid}/pricing`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ skus, formula })
    });

    if (!response.ok) throw new Error('Грешка при прилагане на формула');
    return await response.json();
}

/**
 * СТЪПКА 4b: Ръчно задаване на цена за конкретен артикул
 * Използва се когато потребителят иска да override формулата
 */
async function setManualPrice(uuid, sku, price) {
    const response = await fetch(`${API_BASE}/${uuid}/pricing/manual`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ sku, sellingPrice: price })
    });

    if (!response.ok) throw new Error('Грешка при задаване на цена');
}

/**
 * СТЪПКА 5: Генериране на финално резюме
 * Връща обобщена информация преди потвърждението
 */
async function getSummary(uuid, metadata) {
    const csrf = getCsrfToken();

    const response = await fetch(`${API_BASE}/${uuid}/summary`, {
        method: 'GET',
        headers: {
            [csrf.header]: csrf.token
        }
    });

    if (!response.ok) throw new Error('Грешка при зареждане на summary');
    return await response.json();
}

/**
 * СТЪПКА 6: Финално потвърждение и записване в базата
 * Това е необратима операция - създава продуктите в системата
 */
async function confirmImport(uuid) {
    const csrf = getCsrfToken();

    const response = await fetch(`${API_BASE}/${uuid}/confirm`, {
        method: 'POST',
        headers: {
            [csrf.header]: csrf.token
        }
    });

    if (!response.ok) throw new Error('Грешка при финализиране на импорт');
    return await response.json();
}

/**
 * Отказване на импорт сесия
 * Изтрива временните данни от сървъра
 */
async function cancelImport(uuid) {
    const csrf = getCsrfToken();

    await fetch(`${API_BASE}/${uuid}`, {
        method: 'DELETE',
        headers: {
            [csrf.header]: csrf.token
        }
    });
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

    const autoMapping = autoDetectColumns(STATE.parsedData.columnNames);

    let html = '<div class="mapping-form">';
    html += '<h3>Интелигентна система прихваща данните от колоните в файла но има ситуации в, които може да се наложи да го направите ръчно</h3>';
    html += '<div class="mapping-preview-table">';
    html += renderPreviewTable(STATE.parsedData);
    html += '</div>';
    html += '<div class="mapping-rows">';

    STATE.parsedData.columnNames.forEach((colName, index) => {
        const columnKey = `column_${index}`;
        const suggested = autoMapping[columnKey] || '';
        const isAuto = suggested !== '';

        html += `
            <div class="mapping-row ${isAuto ? 'auto-mapped' : ''}">
                <div class="column-name">${colName}</div>
                <select class="mapping-select" data-column="${columnKey}">
                    ${generateMappingOptions(suggested, columnKey)}
                </select>
                ${isAuto ? '<span class="auto-badge">Автоматично</span>' : ''}
            </div>
        `;
    });

    html += '</div>';
    html += '<div class="mapping-validation" id="mapping-validation"></div>';
    html += '</div>';

    container.innerHTML = html;

    container.querySelectorAll('.mapping-select').forEach(select => {
        select.addEventListener('change', onMappingChange);
    });

    validateMapping(); // Проверяваме веднага
}

// Генерира options като премахва вече избраните
function generateMappingOptions(selectedValue, currentColumn) {
    const allOptions = [
        { value: '', label: '-- Игнорирай --' },
        { value: 'sku', label: 'SKU код' },
        { value: 'name', label: 'Име на продукт' },
        { value: 'quantity', label: 'Количество' },
        { value: 'purchasePrice', label: 'Доставна цена' },
        { value: 'category', label: 'Категория' },
        { value: 'description', label: 'Описание' }
    ];

    // Намираме вече избраните стойности от другите dropdown-ове
    const selectedValues = new Set();
    document.querySelectorAll('.mapping-select').forEach(select => {
        if (select.dataset.column !== currentColumn && select.value) {
            selectedValues.add(select.value);
        }
    });

    // Генерираме options, като disable-ваме вече избраните
    return allOptions.map(opt => {
        const isSelected = opt.value === selectedValue;
        const isDisabled = selectedValues.has(opt.value) && !isSelected;

        return `<option value="${opt.value}" 
                ${isSelected ? 'selected' : ''} 
                ${isDisabled ? 'disabled' : ''}>
                ${opt.label}
                ${isDisabled ? ' (вече избрано)' : ''}
            </option>`;
    }).join('');
}


function renderPreviewTable(parsedData) {
    if (!parsedData || !parsedData.rows) return '';

    let previewRows = parsedData.rows.slice(0, 5);

    // Сортиране ако има активно
    if (STATE.sortBy && STATE.sortOrder) {
        previewRows = [...previewRows].sort((a, b) => {
            const aVal = String(a[STATE.sortBy] || '');
            const bVal = String(b[STATE.sortBy] || '');

            const comparison = aVal.localeCompare(bVal, 'bg', { numeric: true });
            return STATE.sortOrder === 'asc' ? comparison : -comparison;
        });
    }

    let html = '<table class="preview-table"><thead><tr>';

    parsedData.columnNames.forEach((name, index) => {
        const sortClass = STATE.sortBy === name ? `sorted-${STATE.sortOrder}` : '';
        html += `<th class="${sortClass}" onclick="sortPreviewTable('${name}')">${name}</th>`;
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
    const errorItems = items.filter(i => i.status === 'ERROR');
    const hasErrors = errorItems.length > 0;

    let html = `
        <div class="validation-header">
            <h3>Резултати от валидация</h3>
            <div class="validation-stats">
                <span class="stat valid">✓ Валидни: ${STATE.validation.validItems}</span>
                <span class="stat warning">⚠ Предупреждения: ${STATE.validation.itemsWithWarnings}</span>
                <span class="stat error">✗ Грешки: ${STATE.validation.itemsWithErrors}</span>
            </div>
        </div>
        
        <div class="validation-search-bar">
            <input type="text" 
                   id="validation-search-input" 
                   placeholder="Търси по SKU или име..." 
                   class="search-input">
        </div>
    `;

    // 🔥 СЪОБЩЕНИЕ КОГАТО ИМА ГРЕШКИ
    if (hasErrors) {
        html += `
            <div class="validation-error-notice">
                <div class="error-icon">⚠️</div>
                <div class="error-content">
                    <strong>Открити са ${errorItems.length} артикула с грешки</strong>
                    <p>Имате два варианта:</p>
                    <ul>
                        <li><strong>Поправи данните:</strong> Върни се назад, коригирай данните в самия файла и качи отново</li>
                        <li><strong>Редактирай данните:</strong> Редактирай данните в полетата, които са отбелязани като грешни или редактирай тези, които
                        мислиш че са сбъркани в файла.</li>
                    </ul>
                    <p class="note">Редактираните артикули ще се запишат в бележките към импорта за справка</p>
                </div>
            </div>
        `;
    }

    // Добавяме checkbox колона за ERROR items
    const columns = [
        { key: 'rowNumber', label: '№', width: '50px' },
        { key: 'sku', label: 'SKU', width: '120px' },
        { key: 'name', label: 'Име', width: 'auto' },
        { key: 'quantity', label: 'К-во', width: '100px', format: formatEditableQuantity },
        { key: 'purchasePrice', label: 'Дост. цена', width: '120px', format: formatEditablePurchasePrice },
        { key: 'status', label: 'Статус', width: '120px', format: formatStatus },
        { key: 'messages', label: 'Съобщения', width: 'auto', format: formatMessages }
    ];

    html += renderTable(items, columns, 'validation-table', 'validation');
    container.innerHTML = html;

    // Event listener за search
    const searchInput = document.getElementById('validation-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', filterValidationTable);
    }

}


function renderPricingTable() {
    const container = document.getElementById('pricing-container');
    if (!container || !STATE.validation) return;

    const items = STATE.validation.items.filter(item =>
        item.status !== 'ERROR' && item.selected !== false
    );
    const sortedItems = sortItems(items, STATE.pricingSortBy, STATE.pricingSortOrder);

    let html = `
        <div class="pricing-header">
            <h3>Задай продажни цени</h3>
            <div class="pricing-actions">
                <button onclick="selectAllPricing()" class="btn-secondary">Избери всички</button>
                <button onclick="openFormulaModal()" class="btn-primary">Приложи формула</button>
            </div>
            <div class="pricing-stats" id="pricing-stats"></div>
            <div class="validation-search-bar">
               <input type="text" 
           id="pricing-search-input" 
           placeholder="Търси по SKU или име..." 
           class="search-input">
             </div>
        </div>
    `;

    html += renderTable(sortedItems, [
        { key: 'checkbox', label: '☑', width: '40px', format: formatCheckbox },
        { key: 'newStatus', label: 'Тип', width: '100px', format: formatNewStatus },
        { key: 'sku', label: 'SKU', width: '120px' },
        { key: 'name', label: 'Име', width: 'auto' },
        { key: 'purchasePrice', label: 'Дост. цена', width: '100px', format: formatPrice },
        { key: 'existingSellingPrice', label: 'Текуща продажна', width: '120px', format: formatExistingPrice },
        { key: 'newPrice', label: 'Нова продажна', width: '150px', format: formatNewPriceInput },
        { key: 'margin', label: 'Марж %', width: '80px', format: formatMargin }

    ], 'pricing-table', 'pricing');

    container.innerHTML = html;
    updatePricingStats();

    // Add listeners за checkboxes и price inputs
    container.querySelectorAll('.item-checkbox').forEach(cb => {
        cb.addEventListener('change', onPricingCheckboxChange);
    });

    container.querySelectorAll('.price-input').forEach(input => {
        input.addEventListener('change', onPriceInputChange);
    });

    updateSelectAllButton();
}

function renderSummaryView() {
    const container = document.getElementById('summary-container');
    if (!container || !STATE.validation) return;

    const selectedItems = STATE.validation.items.filter(item => item.selected !== false);
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
        </div>
        
        <div class="summary-confirmation">
            <label class="confirmation-checkbox">
                <input type="checkbox" id="confirm-checkbox">
                <span>Потвърждавам че съм прегледал данните и искам да продължа с импорта</span>
            </label>
        </div>
    `;

    container.innerHTML = html;

    const checkbox = document.getElementById('confirm-checkbox');
    const nextBtn = document.getElementById('next-btn');

    // Бутонът е disabled по подразбиране
    nextBtn.disabled = true;
    nextBtn.style.opacity = '0.5';
    nextBtn.style.cursor = 'not-allowed';

    if (checkbox) {
        checkbox.addEventListener('change', () => {
            nextBtn.disabled = !checkbox.checked;
            nextBtn.style.opacity = checkbox.checked ? '1' : '0.5';
            nextBtn.style.cursor = checkbox.checked ? 'pointer' : 'not-allowed';
        });
    }
}

// ============================================
// GENERIC TABLE RENDERING
// ============================================

function renderTable(data, columns, className = '', tableName = '') {
    if (!data || data.length === 0) {
        return '<div class="empty-table">Няма данни за показване</div>';
    }

    let html = `<table class="data-table ${className}"><thead><tr>`;

    columns.forEach(col => {
        const width = col.width ? `style="width: ${col.width}"` : '';

        // Ако е сортируема колона, добави onclick и CSS класове
        if (tableName && col.key !== 'checkbox' && col.key !== 'messages') {
            const currentSortBy = tableName === 'validation' ? STATE.validationSortBy : STATE.pricingSortBy;
            const currentSortOrder = tableName === 'validation' ? STATE.validationSortOrder : STATE.pricingSortOrder;
            const sortClass = currentSortBy === col.key ? `sorted-${currentSortOrder}` : '';
            const cursorStyle = 'style="cursor: pointer; user-select: none;"';

            html += `<th ${width} ${cursorStyle} class="${sortClass}" onclick="sortTableByColumn('${tableName}', '${col.key}')">${col.label}</th>`;
        } else {
            html += `<th ${width}>${col.label}</th>`;
        }
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
    if (row.newProduct) classes.push('row-new');

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
    if (row.newProduct) return '<span class="text-muted">Нов продукт</span>';
    return formatPrice(value);
}

function formatNewPriceInput(value, row) {
    const required = row.newProduct ? 'required' : '';
    const currentValue = row.existingSellingPrice || '';
    const cssClass = row.newProduct ? 'price-input new-product' : 'price-input';

    return `<input type="number" step="0.01" class="${cssClass}" 
            data-sku="${row.sku}" value="${currentValue}" ${required} 
            placeholder="${row.newProduct ? 'Задължително' : 'Непроменена'}">`;
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
    return row.newProduct ?
        '<span class="badge badge-new">НОВ</span>' :
        '<span class="badge badge-update">Актуализация</span>';
}

// Редактируемо поле за количество
function formatEditableQuantity(value, row) {
    const hasError = row.messages.some(m => m.includes('Количество'));
    const isEdited = row.editedFields && row.editedFields.includes('quantity');

    let cssClass = 'editable-field';
    if (hasError) cssClass += ' field-error';
    else if (isEdited) cssClass += ' field-edited';
    else if (row.quantity) cssClass += ' field-valid';

    const displayValue = row.quantity || value || '';

    return `
        <input type="number" 
               class="${cssClass}" 
               value="${displayValue}"
               data-sku="${row.sku}"
               data-field="quantity"
               onchange="onFieldEdit(event)"
               min="1"
               step="1">
        ${isEdited ? '<span class="edit-indicator">✎</span>' : ''}
    `;
}

// Редактируемо поле за доставна цена
function formatEditablePurchasePrice(value, row) {
    const hasError = row.messages.some(m => m.includes('цена'));
    const isEdited = row.editedFields && row.editedFields.includes('purchasePrice');

    let cssClass = 'editable-field';
    if (hasError) cssClass += ' field-error';
    else if (isEdited) cssClass += ' field-edited';
    else if (row.purchasePrice) cssClass += ' field-valid';

    const displayValue = row.purchasePrice || value || '';

    return `
        <input type="number" 
               class="${cssClass}" 
               value="${displayValue}"
               data-sku="${row.sku}"
               data-field="purchasePrice"
               onchange="onFieldEdit(event)"
               min="0.01"
               step="0.01">
        ${isEdited ? '<span class="edit-indicator">✎</span>' : ''}
    `;
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
    // Client-side валидация - НЕ изпращаме невалидни файлове
    const validExtensions = ['xlsx', 'xls', 'csv'];
    const extension = file.name.split('.').pop().toLowerCase();

    if (!validExtensions.includes(extension)) {
        showError('Невалиден формат на файл. Поддържат се само Excel (.xlsx, .xls) и CSV (.csv) файлове.');
        return; // Спираме тук - никога не стигаме до сървъра
    }

    if (file.size > 10 * 1024 * 1024) {
        showError('Файлът е твърде голям. Максималният размер е 10MB.');
        return;
    }

    // Ако стигнем тук, файлът е валиден - можем да upload-ваме
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

    // Събираме избраните полета от всички dropdown-ове
    selects.forEach(select => {
        const column = select.dataset.column;  // "column_0", "column_1", ...
        const field = select.value;             // "sku", "name", "quantity", ...

        if (field) {  // Игнорираме празните избори
            mapping[column] = field;
        }
    });

    // Критична поправка: Проверяваме VALUES, не KEYS
    // mapping = { "column_0": "sku", "column_3": "quantity", ... }
    // Object.values(mapping) = ["sku", "quantity", ...]
    const mappedFields = Object.values(mapping);

    const hasRequired = mappedFields.includes('sku') &&
        mappedFields.includes('quantity') &&
        mappedFields.includes('purchasePrice');

    const validationDiv = document.getElementById('mapping-validation');
    const nextBtn = document.getElementById('next-btn');

    if (!hasRequired) {
        // Показваме кои точно полета липсват за да е по-ясно
        const missing = [];
        if (!mappedFields.includes('sku')) missing.push('SKU код');
        if (!mappedFields.includes('quantity')) missing.push('Количество');
        if (!mappedFields.includes('purchasePrice')) missing.push('Доставна цена');

        validationDiv.innerHTML = `<div class="validation-error">⚠ Липсват задължителни полета: ${missing.join(', ')}</div>`;
        nextBtn.disabled = true;
        nextBtn.style.opacity = '0.5';
        nextBtn.style.cursor = 'not-allowed';
    } else {
        validationDiv.innerHTML = '<div class="validation-success">✓ Всички задължителни полета са мапнати</div>';
        nextBtn.disabled = false;
        nextBtn.style.opacity = '1';
        nextBtn.style.cursor = 'pointer';
    }

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

    updateSelectAllButton();
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

// Обработка на редакция на поле
function onFieldEdit(event) {
    const input = event.target;
    const sku = input.dataset.sku;
    const field = input.dataset.field;
    const newValue = input.value.trim();

    // Намери артикула в STATE
    const item = STATE.validation.items.find(i => i.sku === sku);
    if (!item) return;

    // Инициализирай editedFields ако липсва
    if (!item.editedFields) {
        item.editedFields = [];
    }

    // Валидирай новата стойност
    let isValid = false;
    let errorMessage = '';

    if (field === 'quantity') {
        const qty = parseInt(newValue);
        if (isNaN(qty) || qty <= 0) {
            errorMessage = 'Количеството трябва да е положително число';
        } else {
            item.quantity = qty;
            isValid = true;
        }
    } else if (field === 'purchasePrice') {
        const price = parseFloat(newValue);
        if (isNaN(price) || price <= 0) {
            errorMessage = 'Доставната цена трябва да е положително число';
        } else {
            item.purchasePrice = price;
            isValid = true;
        }
    }

    if (isValid) {
        // Премахни грешката за това поле ако има такава
        item.messages = item.messages.filter(m =>
            !m.includes(field === 'quantity' ? 'Количество' : 'цена')
        );

        // Маркирай полето като редактирано
        if (!item.editedFields.includes(field)) {
            item.editedFields.push(field);
        }

        // Update статуса ако вече няма грешки
        if (item.messages.length === 0 || !item.messages.some(m => m.includes('ГРЕШКА'))) {
            item.status = 'VALID';
        }

        // Визуална обратна връзка
        input.classList.remove('field-error');
        input.classList.add('field-edited');

    } else {
        // Покажи грешката
        input.classList.add('field-error');
        input.classList.remove('field-edited');

        // Добави съобщение за грешка ако липсва
        if (!item.messages.some(m => m.includes(errorMessage))) {
            item.messages.push('ГРЕШКА: ' + errorMessage);
        }
        item.status = 'ERROR';
    }

    // Re-render таблицата за да покаже промените
    renderValidationTable();
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

    // КРИТИЧНА ПРОВЕРКА: Блокираме преминаване от VALIDATION стъпка ако има ERROR артикули
    if (current === STEPS.VALIDATION) {
        const errorItems = STATE.validation.items.filter(i => i.status === 'ERROR');

        if (errorItems.length > 0) {
            showError(`Има ${errorItems.length} артикула с грешки. Коригирай данните директно в таблицата.`);
            return;
        }

        // Изпрати редактираните артикули към backend за синхронизация
        const editedItems = STATE.validation.items.filter(item =>
            item.editedFields && item.editedFields.length > 0
        );

        if (editedItems.length > 0) {
            showLoading('Синхронизиране на данни...');
            try {
                const response = await fetch(`${API_BASE}/${STATE.uuid}/syncValidation`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(editedItems)
                });

                if (!response.ok) throw new Error('Грешка при синхронизиране');
                hideLoading();
            } catch (error) {
                hideLoading();
                showError('Грешка: ' + error.message);
                return;
            }
        }
    }

    if (current === STEPS.PRICING) {
        // Проверка дали всички нови продукти имат цени
        const newProducts = STATE.validation.items.filter(item => item.newProduct && item.selected !== false);
        const missingPrices = newProducts.filter(item => !item.existingSellingPrice || item.existingSellingPrice <= 0);

        if (missingPrices.length > 0) {
            showError(`${missingPrices.length} нови продукта нямат зададена продажна цена`);
            return;
        }
    }

    if (current === STEPS.SUMMARY) {
        STATE.metadata = {
            supplierName: document.getElementById('supplier-name')?.value || null,
            invoiceNumber: document.getElementById('invoice-number')?.value || null,
            invoiceDate: document.getElementById('invoice-date')?.value || null,
            notes: document.getElementById('import-notes')?.value || null
        };

        // ВАЖНО: Първо изпращаме summary към backend който update-ва статуса на READY
        showLoading('Подготовка за финализиране...');
        try {
            await getSummary(STATE.uuid, STATE.metadata);
            hideLoading();
        } catch (error) {
            hideLoading();
            showError('Грешка при подготовка: ' + error.message);
            return;
        }

        await executeImport();
        return;
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
            window.location.href = '/admin/dashboard?tab=inventory';
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
    const checkboxes = document.querySelectorAll('.item-checkbox');

    // Проверяваме колко са маркирани в момента
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    const totalCount = checkboxes.length;

    // Ако всички или повечето са маркирани, размаркираме всички
    // Иначе маркираме всички
    const shouldCheck = checkedCount < totalCount / 2;

    STATE.selectedItems.clear();

    checkboxes.forEach(cb => {
        cb.checked = shouldCheck;
        if (shouldCheck) {
            STATE.selectedItems.add(cb.dataset.sku);
        }
    });

    // Update-ваме текста на бутона
    updateSelectAllButton();
    updatePricingStats();
}

// обновява текста на бутона според състоянието
function updateSelectAllButton() {
    const button = document.querySelector('.pricing-actions button[onclick="selectAllPricing()"]');
    if (!button) return;

    const checkboxes = document.querySelectorAll('.item-checkbox');
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    const totalCount = checkboxes.length;

    if (checkedCount === 0) {
        button.textContent = 'Избери всички';
    } else if (checkedCount === totalCount) {
        button.textContent = 'Размаркирай всички';
    } else {
        button.textContent = `Избери всички (${checkedCount}/${totalCount})`;
    }
}

// ============================================
// FORMULA MODAL ФУНКЦИИ - ПОПРАВЕНИ
// ============================================

function openFormulaModal() {
    // Проверка дали има избрани артикули
    if (STATE.selectedItems.size === 0) {
        showError('Моля избери артикули преди да приложиш формула');
        return;
    }

    const modal = document.getElementById('formula-modal');
    if (modal) {
        // КРИТИЧНО: Трябва да добавим 'show' класа за да се покаже модалът
        // CSS-ът използва .modal.show за opacity: 1 и visibility: visible
        modal.classList.remove('hidden');
        modal.classList.add('show');
        updateFormulaPreview();
    } else {
        console.error('Formula modal element not found in DOM');
        showError('Грешка при отваряне на modal прозорец');
    }
}

function closeFormulaModal() {
    const modal = document.getElementById('formula-modal');
    if (modal) {
        // Премахваме 'show' и добавяме 'hidden'
        modal.classList.remove('show');
        modal.classList.add('hidden');
    }
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

    const items = STATE.validation.items.filter(item => item.status !== 'ERROR' && item.selected !== false);
    const newProducts = items.filter(item => item.newProduct);
    const newWithPrices = newProducts.filter(item => item.existingSellingPrice && item.existingSellingPrice > 0);

    const allNewHavePrices = newProducts.length === 0 || newProducts.length === newWithPrices.length;

    const nextBtn = document.getElementById('next-btn');

    if (!allNewHavePrices) {
        nextBtn.disabled = true;
        nextBtn.style.opacity = '0.5';
        nextBtn.style.cursor = 'not-allowed';
        nextBtn.title = `${newProducts.length - newWithPrices.length} нови продукта нямат зададена цена`;
    } else {
        nextBtn.disabled = false;
        nextBtn.style.opacity = '1';
        nextBtn.style.cursor = 'pointer';
        nextBtn.title = '';
    }

    // Update stats display
    const margins = items
        .filter(item => item.purchasePrice && item.existingSellingPrice)
        .map(item => calculateMargin(item.purchasePrice, item.existingSellingPrice));

    const avgMargin = margins.length > 0
        ? margins.reduce((a, b) => a + b, 0) / margins.length
        : 0;

    statsDiv.innerHTML = `
        <div class="stat">Избрани: ${STATE.selectedItems.size}</div>
        <div class="stat">Нови продукти: ${newWithPrices.length}/${newProducts.length} с цени</div>
        <div class="stat">Среден марж: ${avgMargin.toFixed(1)}%</div>
        ${!allNewHavePrices ? '<div class="stat error">⚠ Задай цени на всички нови продукти</div>' : ''}
    `;
}

// ============================================
// UTILITY ФУНКЦИИ
// ============================================

function autoDetectColumns(columnNames) {
    const mapping = {};

    // Разширен списък с ключови думи за всяко поле
    // Включва български, английски, съкращения и вариации
    const keywords = {
        sku: [
            // Български варианти
            'sku', 'арт', 'артикул', 'артикулен', 'код', 'номер', 'каталожен',
            // Английски варианти
            'product code', 'item code', 'article', 'catalog', 'catalogue',
            // Съкращения
            'art', 'art.', 'cat', 'cat.', 'no', 'no.'
        ],

        name: [
            // Български варианти
            'наименование', 'име', 'название', 'продукт', 'стока', 'артикул',
            // Английски варианти
            'name', 'product', 'item', 'description', 'title',
            // Комбинации
            'product name', 'item name', 'product description'
        ],

        quantity: [
            // Български варианти
            'количество', 'брой', 'бройка', 'к-во', 'кво', 'бр',
            // Английски варианти
            'quantity', 'qty', 'amount', 'units', 'pieces', 'pcs',
            // Вариации
            'к во', 'к. во'
        ],

        purchasePrice: [
            // Български варианти за цена
            'цена', 'доставна', 'себестойност', 'единична', 'ед цена', 'ед. цена',
            // Английски варианти
            'price', 'cost', 'purchase', 'unit price', 'buy price',
            // Вариации
            'без ддс', 'without vat', 'net price', 'purchase price'
        ],

        category: [
            // Български варианти
            'категория', 'група', 'тип', 'вид', 'класификация',
            // Английски варианти
            'category', 'group', 'type', 'class', 'classification'
        ],

        description: [
            // Български варианти
            'описание', 'забележка', 'коментар', 'бележки', 'детайли',
            // Английски варианти
            'description', 'notes', 'remarks', 'details', 'comments'
        ]
    };

    columnNames.forEach((name, index) => {
        // Стъпка 1: Нормализация на името
        // Премахваме ВСИЧКИ специални символи и множество интервали
        const normalized = name
            .toLowerCase()                          // Малки букви
            .trim()                                 // Премахваме whitespace от краищата
            .replace(/[^\wа-я\s]/gi, ' ')          // Заменяме специални символи с интервал
            .replace(/\s+/g, ' ')                  // Множество интервали стават един
            .trim();                               // Отново trim след почистването

        const columnKey = `column_${index}`;
        let matched = false;

        // Стъпка 2: Търсим match с приоритет
        // По-специфичните термини се проверяват първи
        for (const [field, terms] of Object.entries(keywords)) {
            // Сортираме термините по дължина (по-дългите първи)
            // Така "unit price" ще match-не преди просто "price"
            const sortedTerms = [...terms].sort((a, b) => b.length - a.length);

            for (const term of sortedTerms) {
                if (normalized.includes(term)) {
                    mapping[columnKey] = field;
                    matched = true;
                    break;
                }
            }

            if (matched) break;
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
        newItems: items.filter(i => i.newProduct).length,
        updatedItems: items.filter(i => !i.newProduct).length,
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
    console.log('showLoading called with:', message);  // DEBUG

    let loader = document.getElementById('table-loading');
    let createdNew = false;

    if (!loader) {
        console.log('Creating new loader element');  // DEBUG
        loader = document.createElement('div');
        loader.id = 'table-loading';
        loader.className = 'table-loading';
        document.body.appendChild(loader);
        createdNew = true;
    }

    // Задължителни стилове: FIXED POSITION + OVERLAY (като в теста)
    loader.style.cssText = `
        position: fixed !important;
        top: 0 !important; 
        left: 0 !important; 
        width: 100% !important; 
        height: 100% !important;
        background: rgba(0, 0, 0, 0.5) !important;  /* По-тъмен за видимост (черен overlay) */
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        z-index: 99999 !important;  /* Много висок, за да покрие всичко */
        font-family: sans-serif !important;
        color: white !important;  /* Бял текст за контраст */
    `;

    // Съдържание с inline стилове (спинър винаги видим)
    loader.innerHTML = `
        <div class="spinner" style="
            border: 6px solid rgba(255, 255, 255, 0.3) !important;
            border-top: 6px solid #ffffff !important;  /* Бял спинър */
            border-radius: 50% !important;
            width: 50px !important; 
            height: 50px !important;
            animation: spin 1s linear infinite !important;
            margin-bottom: 20px !important;
        "></div>
        <p style="margin: 0 !important; font-size: 18px !important; font-weight: bold !important;">${message}</p>
    `;

    // Keyframes директно (ако CSS липсва)
    if (!window.spinKeyframesAdded) {
        const style = document.createElement('style');
        style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
        document.head.appendChild(style);
        window.spinKeyframesAdded = true;
    }

    console.log('Loader shown. Element:', loader, 'Display:', loader.style.display, 'Position:', loader.style.position);  // DEBUG
}

function hideLoading() {
    console.log('hideLoading called');  // DEBUG
    const loader = document.getElementById('table-loading');
    if (loader) {
        loader.style.display = 'none !important';
        console.log('Loader hidden successfully');
    } else {
        console.warn('No loader element found to hide');
    }
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

/**
 * Сортира масив от обекти по дадено поле
 * Поддържа numbers, strings и dates
 */
function sortItems(items, sortBy, sortOrder) {
    if (!items || items.length === 0) return items;

    const sorted = [...items];
    sorted.sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];

        // Handle null/undefined
        if (valA == null && valB == null) return 0;
        if (valA == null) return 1;
        if (valB == null) return -1;

        // Числови стойности
        if (typeof valA === 'number' && typeof valB === 'number') {
            return sortOrder === 'asc' ? valA - valB : valB - valA;
        }

        // Текстови стойности (използва bulgarian locale)
        const comparison = String(valA).localeCompare(String(valB), 'bg');
        return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
}

/**
 * Сортира таблица при клик на header
 */
function sortTableByColumn(tableName, columnKey) {
    if (tableName === 'validation') {
        // Toggle sort order ако е същата колона
        if (STATE.validationSortBy === columnKey) {
            STATE.validationSortOrder = STATE.validationSortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            STATE.validationSortBy = columnKey;
            STATE.validationSortOrder = 'asc';
        }

        // Сортирай данните
        STATE.validation.items = sortItems(
            STATE.validation.items,
            STATE.validationSortBy,
            STATE.validationSortOrder
        );

        // Re-render таблицата
        renderValidationTable();

    } else if (tableName === 'pricing') {
        // Toggle sort order ако е същата колона
        if (STATE.pricingSortBy === columnKey) {
            STATE.pricingSortOrder = STATE.pricingSortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            STATE.pricingSortBy = columnKey;
            STATE.pricingSortOrder = 'asc';
        }

        // Re-render таблицата със сортирани данни
        renderPricingTable();
    }
}

/**
 * Филтрира pricing таблицата в реално време по SKU или име
 */
function filterPricingTable(event) {
    const query = event.target.value.toLowerCase().trim();
    const rows = document.querySelectorAll('.pricing-table tbody tr');

    rows.forEach(row => {
        const sku = row.querySelector('td:nth-child(3)')?.textContent.toLowerCase() || '';
        const name = row.querySelector('td:nth-child(4)')?.textContent.toLowerCase() || '';

        if (!query || sku.includes(query) || name.includes(query)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}


function sortPreviewTable(columnName) {
    if (STATE.sortBy === columnName) {
        STATE.sortOrder = STATE.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        STATE.sortBy = columnName;
        STATE.sortOrder = 'asc';
    }

    renderMappingForm();
}

function filterValidationTable(event) {
    const query = event.target.value.toLowerCase().trim();
    const rows = document.querySelectorAll('.validation-table tbody tr');

    rows.forEach(row => {
        const sku = row.querySelector('td:nth-child(2)')?.textContent.toLowerCase() || '';
        const name = row.querySelector('td:nth-child(3)')?.textContent.toLowerCase() || '';

        if (!query || sku.includes(query) || name.includes(query)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}


// Export за глобален достъп
window.sortPreviewTable = sortPreviewTable;
window.sortTableByColumn = sortTableByColumn;
window.filterPricingTable = filterPricingTable;

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