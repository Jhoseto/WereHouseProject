/**
 * CLIENTS MANAGEMENT JAVASCRIPT - ПЪЛНО ПОПРАВЕНА ВЕРСИЯ
 * Управление на клиенти с правилна логика за филтриране и търсене
 */

class ClientsManager {
    constructor() {
        this.clients = [];
        this.filteredClients = [];
        this.currentTab = 'create';
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.sortBy = 'username';
        this.sortDirection = 'asc';
        this.filters = {};

        this.init();
    }

    init() {
        this.initTabNavigation();
        this.initCreateClientForm();
        this.initFiltersAndSearch();
        this.initSorting();
        this.loadClientsData();

        console.log('ClientsManager инициализиран успешно');
    }

    // ==========================================
    // TAB NAVIGATION
    // ==========================================

    initTabNavigation() {
        const tabButtons = document.querySelectorAll('.clients-tab-btn');

        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabId = e.currentTarget.getAttribute('data-clients-tab');
                this.switchTab(tabId);
            });
        });
    }

    switchTab(tabId) {
        // Обновяваме tab buttons
        document.querySelectorAll('.clients-tab-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`[data-clients-tab="${tabId}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // Обновяваме tab contents
        document.querySelectorAll('.clients-tab-content').forEach(content => content.classList.remove('active'));

        const targetTabId = tabId === 'create' ? 'create-client-tab' : 'manage-clients-tab';
        const targetTab = document.getElementById(targetTabId);

        if (targetTab) {
            targetTab.classList.add('active');
            this.currentTab = tabId;

            if (tabId === 'manage' && this.clients.length === 0) {
                this.loadClientsData();
            }
        } else {
            console.error(`Tab element not found: ${targetTabId}`);
        }
    }

    // ==========================================
    // CREATE CLIENT FORM
    // ==========================================

    initCreateClientForm() {
        const form = document.getElementById('createClientForm');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateClient();
        });

        // Password confirmation validation
        const password = document.getElementById('clientPassword');
        const confirmPassword = document.getElementById('clientPasswordConfirm');

        if (password && confirmPassword) {
            [password, confirmPassword].forEach(input => {
                input.addEventListener('input', () => this.validatePasswordMatch());
            });
        }

        // Username uniqueness check
        const username = document.getElementById('clientUsername');
        if (username) {
            let timeout;
            username.addEventListener('input', (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.checkUsernameAvailability(e.target.value);
                }, 500);
            });
        }
    }

    async handleCreateClient() {
        const form = document.getElementById('createClientForm');
        const formData = new FormData(form);

        if (!this.validateCreateClientForm(formData)) {
            return;
        }

        const submitBtn = document.getElementById('createClientBtn');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;

        try {
            window.universalLoader?.show('Създаване на клиент...', 'Запазване на данните');

            const clientData = {
                username: formData.get('username'),
                companyName: formData.get('companyName') || null,
                email: formData.get('email'),
                phone: formData.get('phone') || null,
                location: formData.get('location') || null,
                userCode: formData.get('userCode') ? parseInt(formData.get('userCode')) : null,
                password: formData.get('password'),
                role: 'CLIENT'
            };

            const response = await fetch('/admin/clients/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [window.csrfHeader]: window.csrfToken
                },
                body: JSON.stringify(clientData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                window.toastManager?.success(
                    `Клиент "${clientData.username}" е създаден успешно!`,
                    'Успешно създаване'
                );

                form.reset();

                if (this.currentTab === 'manage') {
                    await this.loadClientsData();
                }
                this.switchTab('manage');

            } else {
                window.toastManager?.error(
                    result.message || 'Възникна грешка при създаване на клиента',
                    'Грешка при създаване'
                );
            }

        } catch (error) {
            console.error('Грешка при създаване на клиент:', error);
            window.toastManager?.error(
                'Възникна мрежова грешка. Моля опитайте отново.',
                'Мрежова грешка'
            );
        } finally {
            window.universalLoader?.hide();
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    validateCreateClientForm(formData) {
        const username = formData.get('username');
        const email = formData.get('email');
        const password = formData.get('password');
        const passwordConfirm = formData.get('passwordConfirm');

        if (!username || username.trim().length < 3) {
            window.toastManager?.error('Потребителското име трябва да е поне 3 символа');
            return false;
        }

        if (!email || !this.isValidEmail(email)) {
            window.toastManager?.error('Моля въведете валиден email адрес');
            return false;
        }

        if (!password || password.length < 6) {
            window.toastManager?.error('Паролата трябва да е поне 6 символа');
            return false;
        }

        if (password !== passwordConfirm) {
            window.toastManager?.error('Паролите не съвпадат');
            return false;
        }

        return true;
    }

    validatePasswordMatch() {
        const password = document.getElementById('clientPassword').value;
        const confirmPassword = document.getElementById('clientPasswordConfirm').value;
        const confirmField = document.getElementById('clientPasswordConfirm');

        if (confirmPassword && password !== confirmPassword) {
            confirmField.setCustomValidity('Паролите не съвпадат');
            confirmField.classList.add('is-invalid');
        } else {
            confirmField.setCustomValidity('');
            confirmField.classList.remove('is-invalid');
        }
    }

    async checkUsernameAvailability(username) {
        if (!username || username.length < 3) return;

        try {
            const response = await fetch(`/admin/clients/check-username?username=${encodeURIComponent(username)}`);
            const result = await response.json();

            const usernameField = document.getElementById('clientUsername');

            if (result.available) {
                usernameField.classList.remove('is-invalid');
                usernameField.classList.add('is-valid');
            } else {
                usernameField.classList.remove('is-valid');
                usernameField.classList.add('is-invalid');
                usernameField.setCustomValidity('Потребителското име вече съществува');
            }
        } catch (error) {
            console.error('Грешка при проверка на потребителско име:', error);
        }
    }

    // ==========================================
    // LOAD CLIENTS DATA
    // ==========================================

    async loadClientsData() {
        try {
            this.showTableLoading(true);

            const response = await fetch('/admin/clients/list', {
                headers: {
                    'Accept': 'application/json',
                    [window.csrfHeader]: window.csrfToken
                }
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.clients = result.data || [];
                this.initLocationFilter();
                this.applyFilters();
                this.updateResultsSummary();

                console.log(`Заредени ${this.clients.length} клиента`);
            } else {
                throw new Error(result.message || 'Грешка при зареждане на клиенти');
            }

        } catch (error) {
            console.error('Грешка при зареждане на клиенти:', error);
            window.toastManager?.error(
                'Възникна грешка при зареждане на клиентите',
                'Грешка при зареждане'
            );
            this.clients = [];
            this.filteredClients = [];
        } finally {
            this.showTableLoading(false);
        }
    }

    // ==========================================
    // IMPROVED FILTERS AND SEARCH - МИГНОВЕНО ТЪРСЕНЕ
    // ==========================================

    initFiltersAndSearch() {
        // Quick search - мигновено интелигентно търсене
        const quickSearch = document.getElementById('clientsQuickSearch');
        if (quickSearch) {
            quickSearch.addEventListener('input', (e) => {
                this.filters.quickSearch = e.target.value.trim();
                this.applyFiltersInstantly(); // Мигновено без timeout
            });
        }

        // Status filter - поправена логика
        const statusFilter = document.getElementById('clientsStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.applyFiltersInstantly();
            });
        }

        // Location filter
        const locationFilter = document.getElementById('clientsLocationFilter');
        if (locationFilter) {
            locationFilter.addEventListener('change', (e) => {
                this.filters.location = e.target.value;
                this.applyFiltersInstantly();
            });
        }

        // Advanced filters - поправени имена на полетата
        const advancedFilters = [
            { id: 'clientsUsernameFilter', key: 'username' },
            { id: 'clientsEmailFilter', key: 'email' },
            { id: 'clientsPhoneFilter', key: 'phone' },
            { id: 'clientsLocationFilter', key: 'location' } // Променено от userCode на location
        ];

        advancedFilters.forEach(filterConfig => {
            const filter = document.getElementById(filterConfig.id);
            if (filter) {
                filter.addEventListener('input', (e) => {
                    this.filters[filterConfig.key] = e.target.value.trim();
                    this.applyFiltersInstantly(); // Мигновено
                });
            }
        });
    }

    /**
     * Мигновено прилагане на филтри без timeout
     */
    applyFiltersInstantly() {
        this.applyFilters();
    }

    /**
     * ЧИСТА ENUM ЛОГИКА ЗА ФИЛТРИРАНЕ И ТЪРСЕНЕ
     */
    applyFilters() {
        let filtered = [...this.clients];

        // Интелигентно бързо търсене - търси във всички текстови полета
        if (this.filters.quickSearch) {
            const searchTerms = this.normalizeSearchText(this.filters.quickSearch);
            filtered = filtered.filter(client => {
                // Създаваме "търсимия текст" от всички полета на клиента
                const searchableText = [
                    client.username,
                    client.companyName,
                    client.email,
                    client.phone,
                    client.location,
                    client.userCode?.toString()
                ].filter(field => field) // Премахваме null/undefined
                    .join(' ') // Съединяваме всичко в един текст
                    .toLowerCase();

                // Проверяваме дали ВСИЧКИ думи от търсенето са включени
                return searchTerms.every(term => searchableText.includes(term));
            });
        }

        // Status filter - само ENUM логика
        if (this.filters.status) {
            filtered = filtered.filter(client => {
                const clientStatus = this.getClientEffectiveStatus(client);

                if (this.filters.status === 'active') {
                    return clientStatus === 'ACTIVE';
                } else if (this.filters.status === 'inactive') {
                    return clientStatus === 'INACTIVE' || clientStatus === 'PENDING';
                } else if (this.filters.status === 'pending') {
                    return clientStatus === 'PENDING';
                }
                return true;
            });
        }

        // Location filter
        if (this.filters.location) {
            filtered = filtered.filter(client =>
                client.location && client.location === this.filters.location
            );
        }

        // Advanced filters - точно търсене в специфични полета
        Object.keys(this.filters).forEach(key => {
            if (key !== 'quickSearch' && key !== 'status' && key !== 'location' && this.filters[key]) {
                const searchValue = this.filters[key].toLowerCase();
                filtered = filtered.filter(client => {
                    const clientValue = client[key];
                    if (clientValue === null || clientValue === undefined) return false;
                    return clientValue.toString().toLowerCase().includes(searchValue);
                });
            }
        });

        this.filteredClients = filtered;
        this.sortClients();
        this.currentPage = 1;
        this.renderClientsTable();
        this.updateResultsSummary();
        this.updateFilterIndicator();
    }

    /**
     * Нормализира текста за търсене - разделя на думи и ги подготвя
     */
    normalizeSearchText(searchText) {
        return searchText
            .toLowerCase()
            .trim()
            .split(/\s+/) // Разделяме по space, tab, newline
            .filter(term => term.length > 0); // Премахваме празни думи
    }

    /**
     * ЧИСТА ENUM ЛОГИКА - без булеви полета
     * Работи изключително с userStatus полето от backend-а
     */
    getClientEffectiveStatus(client) {
        // Работим само с userStatus ENUM полето
        if (client.userStatus) {
            return client.userStatus;
        }

        // Ако няма userStatus, връщаме INACTIVE като безопасен default
        // Това означава че клиентът не е правилно конфигуриран в системата
        return 'INACTIVE';
    }

    initLocationFilter() {
        const locationFilter = document.getElementById('clientsLocationFilter');
        if (!locationFilter) return;

        const locations = [...new Set(this.clients
            .map(client => client.location)
            .filter(location => location && location.trim())
        )].sort();

        locationFilter.innerHTML = '<option value="">Всички локации</option>';

        locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location;
            option.textContent = location;
            locationFilter.appendChild(option);
        });
    }

    // ==========================================
    // SORTING - ПОПРАВЕНА ЛОГИКА
    // ==========================================

    initSorting() {
        const sortBy = document.getElementById('clientsSortBy');
        if (sortBy) {
            sortBy.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.updateSortUI();
                this.sortClients();
                this.renderClientsTable();
            });
        }

        const sortDirectionBtn = document.getElementById('sortDirectionBtn');
        if (sortDirectionBtn) {
            sortDirectionBtn.addEventListener('click', () => {
                this.toggleSortDirection();
            });
        }

        // Table header sorting
        const sortableHeaders = document.querySelectorAll('.clients-table th.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                const sortField = header.getAttribute('data-sort');
                this.sortBy = sortField === 'active' ? 'userStatus' : sortField;

                if (this.sortBy === sortField) {
                    this.toggleSortDirection();
                } else {
                    this.sortDirection = 'asc';
                }
                this.updateSortUI();
                this.sortClients();
                this.renderClientsTable();
            });
        });
    }

    sortClients() {
        this.filteredClients.sort((a, b) => {
            let aValue = a[this.sortBy];
            let bValue = b[this.sortBy];

            // Специална логика за userStatus sorting
            if (this.sortBy === 'userStatus' || this.sortBy === 'active') {
                aValue = this.getClientEffectiveStatus(a);
                bValue = this.getClientEffectiveStatus(b);
            }

            // Handle null/undefined values
            if (aValue === null || aValue === undefined) aValue = '';
            if (bValue === null || bValue === undefined) bValue = '';

            // Convert to string for comparison
            aValue = aValue.toString().toLowerCase();
            bValue = bValue.toString().toLowerCase();

            let result = aValue.localeCompare(bValue);
            return this.sortDirection === 'desc' ? -result : result;
        });
    }

    toggleSortDirection() {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        this.updateSortUI();
        this.sortClients();
        this.renderClientsTable();
    }

    updateSortUI() {
        const sortDirectionIcon = document.getElementById('sortDirectionIcon');
        const sortBy = document.getElementById('clientsSortBy');

        if (sortDirectionIcon) {
            sortDirectionIcon.className = this.sortDirection === 'asc'
                ? 'bi bi-sort-alpha-down'
                : 'bi bi-sort-alpha-up';
        }

        if (sortBy) {
            const htmlSortValue = this.sortBy === 'userStatus' ? 'active' : this.sortBy;
            sortBy.value = htmlSortValue;
        }
    }

    // ==========================================
    // TABLE RENDERING
    // ==========================================

    renderClientsTable() {
        const tableBody = document.getElementById('clientsTableBody');
        const emptyState = document.getElementById('clientsEmptyState');
        const table = document.getElementById('clientsTable');

        if (!tableBody) return;

        if (this.filteredClients.length === 0) {
            table.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        table.style.display = 'table';
        emptyState.style.display = 'none';

        // Pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageClients = this.filteredClients.slice(startIndex, endIndex);

        tableBody.innerHTML = '';

        pageClients.forEach(client => {
            const row = this.createClientRow(client);
            tableBody.appendChild(row);
        });

        this.updatePagination();
    }

    createClientRow(client) {
        const row = document.createElement('tr');
        row.setAttribute('data-client-id', client.id);

        const statusBadge = this.createStatusBadge(client);
        const actionButtons = this.createActionButtons(client);

        row.innerHTML = `
            <td class="id-cell">${client.id}</td>
            <td class="username-cell">
                <div class="username-info">
                    <strong>${this.escapeHtml(client.username)}</strong>
                    ${client.userCode ? `<small class="user-code">#${client.userCode}</small>` : ''}
                </div>
            </td>
            <td class="company-cell">${client.companyName ? this.escapeHtml(client.companyName) : '<span class="text-muted">—</span>'}</td>
            <td class="email-cell">
                ${client.email ? `<a href="mailto:${client.email}" class="email-link">${this.escapeHtml(client.email)}</a>` : '<span class="text-muted">—</span>'}
            </td>
            <td class="phone-cell">
                ${client.phone ? `<a href="tel:${client.phone}" class="phone-link">${this.escapeHtml(client.phone)}</a>` : '<span class="text-muted">—</span>'}
            </td>
            <td class="location-cell">${client.location ? this.escapeHtml(client.location) : '<span class="text-muted">—</span>'}</td>
            <td class="code-cell">${client.userCode || '<span class="text-muted">—</span>'}</td>
            <td class="status-cell">${statusBadge}</td>
            <td class="actions-cell">
                <div class="action-buttons">
                    ${actionButtons}
                    
                    <button type="button" 
                            class="btn btn-sm btn-info" 
                            onclick="clientsManager.openSendMessageModal(${client.id})"
                            title="Изпрати съобщение">
                        <i class="bi bi-chat-dots"></i>
                    </button>
                    
                    <button type="button" 
                            class="btn btn-sm btn-primary" 
                            onclick="clientsManager.openSendEmailModal(${client.id})"
                            title="Изпрати email">
                        <i class="bi bi-envelope"></i>
                    </button>
                </div>
            </td>
        `;

        return row;
    }

    // ==========================================
    // HELPER METHODS - ПОПРАВЕНИ
    // ==========================================

    isClientActive(client) {
        return this.getClientEffectiveStatus(client) === 'ACTIVE';
    }

    isClientPending(client) {
        return this.getClientEffectiveStatus(client) === 'PENDING';
    }

    isClientInactive(client) {
        return this.getClientEffectiveStatus(client) === 'INACTIVE';
    }

    getClientStatusForSorting(client) {
        return this.getClientEffectiveStatus(client);
    }

    createStatusBadge(client) {
        const status = this.getClientEffectiveStatus(client);

        switch(status) {
            case 'PENDING':
                return '<span class="status-badge status-pending"><i class="bi bi-clock-fill"></i> Чака одобрение</span>';
            case 'ACTIVE':
                return '<span class="status-badge status-active"><i class="bi bi-check-circle-fill"></i> Активен</span>';
            case 'INACTIVE':
                return '<span class="status-badge status-inactive"><i class="bi bi-x-circle-fill"></i> Неактивен</span>';
            default:
                return '<span class="status-badge status-unknown"><i class="bi bi-question-circle-fill"></i> Неизвестен</span>';
        }
    }

    /**
     * ПОПРАВЕНИ ACTION BUTTONS БЕЗ ONCHANGE КОНФЛИКТИ
     */
    createActionButtons(client) {
        const status = this.getClientEffectiveStatus(client);

        if (status === 'PENDING') {
            // PENDING клиенти - toggle е OFF и disabled, плюс approve/reject бутони
            return `
            <div class="client-controls">
                <div class="toggle-container">
                    <label class="client-status-toggle" title="Чака одобрение">
                        <input type="checkbox" disabled>
                        <span class="toggle-slider"></span>
                    </label>
                    <small class="toggle-label">Изключен</small>
                </div>
                <div class="pending-actions">
                    <button type="button" 
                            class="btn btn-sm btn-success" 
                            onclick="clientsManager.approveClient(${client.id})"
                            title="Одобри и активирай клиент">
                        <i class="bi bi-check"></i> Одобри
                    </button>
                    <button type="button" 
                            class="btn btn-sm btn-danger" 
                            onclick="clientsManager.rejectClient(${client.id})"
                            title="Отхвърли клиент">
                        <i class="bi bi-x"></i> Отхвърли
                    </button>
                </div>
            </div>`;
        } else {
            // ACTIVE/INACTIVE клиенти - работещ toggle превключвател БЕЗ onchange
            const isActive = status === 'ACTIVE';
            return `
            <div class="client-controls">
                <div class="toggle-container">
                    <label class="client-status-toggle" 
                           title="${isActive ? 'Включен - кликни за изключване' : 'Изключен - кликни за включване'}"
                           onclick="clientsManager.handleToggleClick(${client.id}, event)">
                        <input type="checkbox" ${isActive ? 'checked' : ''} readonly>
                        <span class="toggle-slider"></span>
                    </label>
                    <small class="toggle-label">${isActive ? 'Включен' : 'Изключен'}</small>
                </div>
            </div>`;
        }
    }

    /**
     * НОВА ЛОГИКА ЗА TOGGLE БЕЗ ONCHANGE КОНФЛИКТИ
     */
    handleToggleClick(clientId, event) {
        event.preventDefault(); // Спираме default поведението
        event.stopPropagation(); // Спираме propagation

        this.toggleClientStatus(clientId);
    }

    // ==========================================
    // CLIENT ACTIONS - ПОПРАВЕНИ
    // ==========================================

    async approveClient(clientId) {
        const client = this.clients.find(c => c.id === clientId);
        if (!client) return;

        try {
            window.universalLoader?.show('Одобряване на клиент...', 'Автоматично активиране');

            const response = await fetch(`/admin/clients/${clientId}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [window.csrfHeader]: window.csrfToken
                }
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Само ENUM логика - премахваме client.active
                client.userStatus = 'ACTIVE';

                // Мигновено пререндериране
                this.applyFiltersInstantly();

                window.toastManager?.success(
                    `Клиент "${client.username}" е одобрен и активиран`,
                    'Включен в системата'
                );
            } else {
                throw new Error(result.message || 'Грешка при одобрение на клиента');
            }

        } catch (error) {
            console.error('Грешка при одобрение на клиент:', error);
            window.toastManager?.error(
                'Възникна грешка при одобрение на клиента',
                'Грешка при активиране'
            );
        } finally {
            window.universalLoader?.hide();
        }
    }

    async rejectClient(clientId) {
        const client = this.clients.find(c => c.id === clientId);
        if (!client) return;

        try {
            window.universalLoader?.show('Отхвърляне на клиент...', 'Обновяване на статуса');

            const response = await fetch(`/admin/clients/${clientId}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [window.csrfHeader]: window.csrfToken
                }
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Само ENUM логика - премахваме client.active
                client.userStatus = 'INACTIVE';

                // Мигновено пререндериране
                this.applyFiltersInstantly();

                window.toastManager?.success(
                    `Клиент "${client.username}" е отхвърлен`,
                    'Успешно отхвърляне'
                );
            } else {
                throw new Error(result.message || 'Грешка при отхвърляне на клиента');
            }

        } catch (error) {
            console.error('Грешка при отхвърляне на клиент:', error);
            window.toastManager?.error(
                'Възникна грешка при отхвърляне на клиента',
                'Грешка при обновяване'
            );
        } finally {
            window.universalLoader?.hide();
        }
    }

    async toggleClientStatus(clientId) {
        const client = this.clients.find(c => c.id === clientId);
        if (!client) return;

        const currentStatus = this.getClientEffectiveStatus(client);

        // Проверяваме че не е PENDING
        if (currentStatus === 'PENDING') {
            window.toastManager?.warning('Този клиент чака одобрение и не може да бъде променян директно');
            return;
        }

        const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        const action = newStatus === 'ACTIVE' ? 'Активиране' : 'Деактивиране';

        try {
            window.universalLoader?.show(
                `${newStatus === 'ACTIVE' ? 'Активиране' : 'Деактивиране'} на клиент...`,
                'Обновяване на статуса'
            );

            const response = await fetch(`/admin/clients/${clientId}/toggle-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [window.csrfHeader]: window.csrfToken
                },
                body: JSON.stringify({
                    userStatus: newStatus
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // САМО ENUM логика - премахваме client.active
                client.userStatus = newStatus;

                // МИГНОВЕНО пререндериране без забавяне
                this.applyFiltersInstantly();

                window.toastManager?.success(
                    `Клиент "${client.username}" е ${newStatus === 'ACTIVE' ? 'включен' : 'изключен'}`,
                    `Статус обновен`
                );
            } else {
                throw new Error(result.message || `Грешка при ${action} на клиента`);
            }

        } catch (error) {
            console.error(`Грешка при ${action} на клиент:`, error);
            window.toastManager?.error(
                `Възникна грешка при ${action} на клиента`,
                'Грешка при промяна'
            );
        } finally {
            window.universalLoader?.hide();
        }
    }

    // ==========================================
    // MESSAGE/EMAIL FUNCTIONALITY
    // ==========================================

    openSendMessageModal(clientId) {
        const client = this.clients.find(c => c.id === clientId);
        if (!client) return;

        document.getElementById('messageClientId').value = clientId;
        document.getElementById('messageRecipientName').textContent = client.username;
        document.getElementById('messageRecipientEmail').textContent = client.email || 'Няма email';

        document.getElementById('sendMessageForm').reset();
        document.getElementById('messageClientId').value = clientId;

        document.getElementById('sendMessageModal').style.display = 'flex';
    }

    closeSendMessageModal() {
        document.getElementById('sendMessageModal').style.display = 'none';
    }

    async sendClientMessage() {
        const form = document.getElementById('sendMessageForm');
        const formData = new FormData(form);

        const clientId = formData.get('clientId');
        const subject = document.getElementById('messageSubject').value;
        const content = document.getElementById('messageContent').value;

        if (!subject || !content) {
            window.toastManager?.error('Моля попълнете всички полета');
            return;
        }

        try {
            window.universalLoader?.show('Изпращане на съобщение...', 'Моля изчакайте');

            const response = await fetch('/admin/clients/send-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [window.csrfHeader]: window.csrfToken
                },
                body: JSON.stringify({
                    clientId: parseInt(clientId),
                    subject,
                    content
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.closeSendMessageModal();
                window.toastManager?.success('Съобщението е изпратено успешно');
            } else {
                throw new Error(result.message || 'Грешка при изпращане на съобщението');
            }

        } catch (error) {
            console.error('Грешка при изпращане на съобщение:', error);
            window.toastManager?.error('Възникна грешка при изпращане на съобщението');
        } finally {
            window.universalLoader?.hide();
        }
    }

    openSendEmailModal(clientId) {
        const client = this.clients.find(c => c.id === clientId);
        if (!client || !client.email) {
            window.toastManager?.warning('Този клиент няма настроен email адрес');
            return;
        }

        document.getElementById('emailClientId').value = clientId;
        document.getElementById('emailRecipientName').textContent = client.username;
        document.getElementById('emailRecipientEmail').textContent = client.email;

        document.getElementById('sendEmailForm').reset();
        document.getElementById('emailClientId').value = clientId;

        document.getElementById('sendEmailModal').style.display = 'flex';
    }

    closeSendEmailModal() {
        document.getElementById('sendEmailModal').style.display = 'none';
    }

    async sendClientEmail() {
        const form = document.getElementById('sendEmailForm');
        const formData = new FormData(form);

        const clientId = formData.get('clientId');
        const subject = formData.get('subject');
        const content = formData.get('content');
        const copyToAdmin = formData.get('copyToAdmin') === 'on';

        if (!subject || !content) {
            window.toastManager?.error('Моля попълнете всички полета');
            return;
        }

        try {
            window.universalLoader?.show('Изпращане на email...', 'Моля изчакайте');

            const response = await fetch('/admin/clients/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [window.csrfHeader]: window.csrfToken
                },
                body: JSON.stringify({
                    clientId: parseInt(clientId),
                    subject,
                    content,
                    copyToAdmin
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.closeSendEmailModal();
                window.toastManager?.success('Email-ът е изпратен успешно');
            } else {
                throw new Error(result.message || 'Грешка при изпращане на email-а');
            }

        } catch (error) {
            console.error('Грешка при изпращане на email:', error);
            window.toastManager?.error('Възникна грешка при изпращане на email-а');
        } finally {
            window.universalLoader?.hide();
        }
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    showTableLoading(show) {
        const loading = document.getElementById('clientsTableLoading');
        const table = document.getElementById('clientsTable');

        if (loading) loading.style.display = show ? 'flex' : 'none';
        if (table) table.style.display = show ? 'none' : 'table';
    }

    updateResultsSummary() {
        const displayedCount = document.getElementById('displayedClientsCount');
        const totalCount = document.getElementById('totalClientsCount');

        if (displayedCount) displayedCount.textContent = this.filteredClients.length;
        if (totalCount) totalCount.textContent = this.clients.length;
    }

    updateFilterIndicator() {
        const indicator = document.getElementById('activeFilterInfo');
        const hasActiveFilters = Object.values(this.filters).some(filter => filter);

        if (indicator) {
            indicator.style.display = hasActiveFilters ? 'inline-flex' : 'none';
        }
    }

    updatePagination() {
        const totalPages = Math.ceil(this.filteredClients.length / this.itemsPerPage);
        const pagination = document.getElementById('clientsPagination');

        if (pagination) {
            pagination.style.display = totalPages > 1 ? 'flex' : 'none';
        }

        const paginationStart = document.getElementById('paginationStart');
        const paginationEnd = document.getElementById('paginationEnd');
        const paginationTotal = document.getElementById('paginationTotal');

        if (paginationStart && paginationEnd && paginationTotal) {
            const startIndex = (this.currentPage - 1) * this.itemsPerPage + 1;
            const endIndex = Math.min(this.currentPage * this.itemsPerPage, this.filteredClients.length);

            paginationStart.textContent = startIndex;
            paginationEnd.textContent = endIndex;
            paginationTotal.textContent = this.filteredClients.length;
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ==========================================
// GLOBAL FUNCTIONS
// ==========================================

function resetCreateClientForm() {
    const form = document.getElementById('createClientForm');
    if (form) {
        form.reset();
        form.querySelectorAll('.is-valid, .is-invalid').forEach(el => {
            el.classList.remove('is-valid', 'is-invalid');
        });
    }
}

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const button = input.parentElement.querySelector('.password-toggle-btn i');
    if (!button) return;

    if (input.type === 'password') {
        input.type = 'text';
        button.className = 'bi bi-eye-slash';
    } else {
        input.type = 'password';
        button.className = 'bi bi-eye';
    }
}

function clearQuickSearch() {
    const input = document.getElementById('clientsQuickSearch');
    if (input && window.clientsManager) {
        input.value = '';
        window.clientsManager.filters.quickSearch = '';
        window.clientsManager.applyFiltersInstantly();
    }
}

function clearAllFilters() {
    if (!window.clientsManager) return;

    // Изчистваме всички filter inputs
    const filterIds = [
        'clientsQuickSearch',
        'clientsStatusFilter',
        'clientsLocationFilter',
        'clientsUsernameFilter',
        'clientsEmailFilter',
        'clientsPhoneFilter'
    ];

    filterIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.value = '';
        }
    });

    window.clientsManager.filters = {};
    window.clientsManager.applyFiltersInstantly();
}

function refreshClientsData() {
    if (window.clientsManager) {
        window.clientsManager.loadClientsData();
    }
}

function toggleAdvancedFilters() {
    const advancedFilters = document.getElementById('advancedFilters');
    const toggleIcon = document.getElementById('advancedToggleIcon');
    const toggleText = document.getElementById('advancedToggleText');

    if (advancedFilters && toggleIcon && toggleText) {
        if (advancedFilters.style.display === 'none') {
            advancedFilters.style.display = 'block';
            toggleIcon.className = 'bi bi-chevron-up';
            toggleText.textContent = 'Скрий разширени филтри';
        } else {
            advancedFilters.style.display = 'none';
            toggleIcon.className = 'bi bi-chevron-down';
            toggleText.textContent = 'Покажи разширени филтри';
        }
    }
}

function exportClientsData() {
    if (!window.clientsManager) return;

    const clients = window.clientsManager.filteredClients;
    const headers = ['ID', 'Потребителско име', 'Компания', 'Email', 'Телефон', 'Локация', 'Код', 'Статус'];

    const csvContent = [
        headers.join(','),
        ...clients.map(client => {
            // Само ENUM логика за определяне на статуса
            const status = window.clientsManager.getClientEffectiveStatus(client);
            const statusText = status === 'PENDING' ? 'Чака одобрение' :
                status === 'ACTIVE' ? 'Активен' : 'Неактивен';

            return [
                client.id,
                `"${client.username}"`,
                `"${client.companyName || ''}"`,
                `"${client.email || ''}"`,
                `"${client.phone || ''}"`,
                `"${client.location || ''}"`,
                client.userCode || '',
                statusText
            ].join(',');
        })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clients_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

function goToPreviousPage() {
    if (window.clientsManager && window.clientsManager.currentPage > 1) {
        window.clientsManager.currentPage--;
        window.clientsManager.renderClientsTable();
    }
}

function goToNextPage() {
    if (window.clientsManager) {
        const totalPages = Math.ceil(window.clientsManager.filteredClients.length / window.clientsManager.itemsPerPage);
        if (window.clientsManager.currentPage < totalPages) {
            window.clientsManager.currentPage++;
            window.clientsManager.renderClientsTable();
        }
    }
}

function closeSendMessageModal() {
    if (window.clientsManager) {
        window.clientsManager.closeSendMessageModal();
    }
}

function sendClientMessage() {
    if (window.clientsManager) {
        window.clientsManager.sendClientMessage();
    }
}

function closeSendEmailModal() {
    if (window.clientsManager) {
        window.clientsManager.closeSendEmailModal();
    }
}

function sendClientEmail() {
    if (window.clientsManager) {
        window.clientsManager.sendClientEmail();
    }
}

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('.clients-management-container')) {
        window.clientsManager = new ClientsManager();
        console.log('✓ ClientsManager инициализиран');
    }
});