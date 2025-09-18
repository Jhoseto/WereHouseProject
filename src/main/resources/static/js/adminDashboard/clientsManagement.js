/**
 * CLIENTS MANAGEMENT JAVASCRIPT
 * Управление на клиенти - създаване, търсене, филтриране, сортиране
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

    /**
     * Инициализация на класа
     */
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
        const tabContents = document.querySelectorAll('.clients-tab-content');

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
        document.querySelector(`[data-clients-tab="${tabId}"]`).classList.add('active');

        // Обновяваме tab contents
        document.querySelectorAll('.clients-tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabId}-client-tab`).classList.add('active');

        this.currentTab = tabId;

        // Ако превключваме към manage tab, зареждаме данните
        if (tabId === 'manage' && this.clients.length === 0) {
            this.loadClientsData();
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

        // Валидация
        if (!this.validateCreateClientForm(formData)) {
            return;
        }

        // Показваме loading на бутона
        const submitBtn = document.getElementById('createClientBtn');
        const originalText = submitBtn.innerHTML;
        submitBtn.classList.add('btn-loading');
        submitBtn.disabled = true;

        try {
            window.universalLoader?.show('Създаване на клиент...', 'Запазване на данните', 'create-client');

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

                // Изчистваме формата
                form.reset();

                // Презареждаме данните ако сме в manage tab
                if (this.currentTab === 'manage') {
                    await this.loadClientsData();
                }

                // Превключваме към manage tab
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
            submitBtn.classList.remove('btn-loading');
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
            window.toastManager?.error('Потребителското име трябва да е поне 3 символа', 'Валидационна грешка');
            return false;
        }

        if (!email || !this.isValidEmail(email)) {
            window.toastManager?.error('Моля въведете валиден email адрес', 'Валидационна грешка');
            return false;
        }

        if (!password || password.length < 6) {
            window.toastManager?.error('Паролата трябва да е поне 6 символа', 'Валидационна грешка');
            return false;
        }

        if (password !== passwordConfirm) {
            window.toastManager?.error('Паролите не съвпадат', 'Валидационна грешка');
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

            const response = await fetch('/admin/clients/list');
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
        } finally {
            this.showTableLoading(false);
        }
    }

    // ==========================================
    // FILTERS AND SEARCH
    // ==========================================

    initFiltersAndSearch() {
        // Quick search
        const quickSearch = document.getElementById('clientsQuickSearch');
        if (quickSearch) {
            let timeout;
            quickSearch.addEventListener('input', (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.filters.quickSearch = e.target.value.trim();
                    this.applyFilters();
                }, 300);
            });
        }

        // Status filter
        const statusFilter = document.getElementById('clientsStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.applyFilters();
            });
        }

        // Location filter
        const locationFilter = document.getElementById('clientsLocationFilter');
        if (locationFilter) {
            locationFilter.addEventListener('change', (e) => {
                this.filters.location = e.target.value;
                this.applyFilters();
            });
        }

        // Advanced filters
        const advancedFilters = ['clientsUsernameFilter', 'clientsEmailFilter', 'clientsPhoneFilter', 'clientsUserCodeFilter'];
        advancedFilters.forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                let timeout;
                filter.addEventListener('input', (e) => {
                    clearTimeout(timeout);
                    timeout = setTimeout(() => {
                        const filterKey = filterId.replace('clients', '').replace('Filter', '').toLowerCase();
                        this.filters[filterKey] = e.target.value.trim();
                        this.applyFilters();
                    }, 300);
                });
            }
        });
    }

    applyFilters() {
        let filtered = [...this.clients];

        // Quick search - търси в username, email, companyName
        if (this.filters.quickSearch) {
            const search = this.filters.quickSearch.toLowerCase();
            filtered = filtered.filter(client =>
                (client.username && client.username.toLowerCase().includes(search)) ||
                (client.email && client.email.toLowerCase().includes(search)) ||
                (client.companyName && client.companyName.toLowerCase().includes(search))
            );
        }

        // Status filter
        if (this.filters.status) {
            const isActive = this.filters.status === 'active';
            filtered = filtered.filter(client => client.active === isActive);
        }

        // Location filter
        if (this.filters.location) {
            filtered = filtered.filter(client =>
                client.location && client.location === this.filters.location
            );
        }

        // Advanced filters
        Object.keys(this.filters).forEach(key => {
            if (key !== 'quickSearch' && key !== 'status' && key !== 'location' && this.filters[key]) {
                const value = this.filters[key].toLowerCase();
                filtered = filtered.filter(client => {
                    const clientValue = client[key];
                    if (clientValue === null || clientValue === undefined) return false;
                    return clientValue.toString().toLowerCase().includes(value);
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

    initLocationFilter() {
        const locationFilter = document.getElementById('clientsLocationFilter');
        if (!locationFilter) return;

        const locations = [...new Set(this.clients
            .map(client => client.location)
            .filter(location => location && location.trim())
        )].sort();

        // Изчистваме текущите опции (освен първата)
        locationFilter.innerHTML = '<option value="">Всички локации</option>';

        locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location;
            option.textContent = location;
            locationFilter.appendChild(option);
        });
    }

    // ==========================================
    // SORTING
    // ==========================================

    initSorting() {
        // Sort dropdown
        const sortBy = document.getElementById('clientsSortBy');
        if (sortBy) {
            sortBy.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.sortClients();
                this.renderClientsTable();
            });
        }

        // Sort direction button
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
                if (this.sortBy === sortField) {
                    this.toggleSortDirection();
                } else {
                    this.sortBy = sortField;
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
            sortBy.value = this.sortBy;
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

        const statusBadge = client.active
            ? '<span class="status-badge status-active"><i class="bi bi-check-circle-fill"></i> Активен</span>'
            : '<span class="status-badge status-inactive"><i class="bi bi-x-circle-fill"></i> Неактивен</span>';

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
                    <button type="button" 
                            class="btn btn-sm ${client.active ? 'btn-warning' : 'btn-success'}" 
                            onclick="clientsManager.toggleClientStatus(${client.id}, ${!client.active})"
                            title="${client.active ? 'Деактивирай клиент' : 'Активирай клиент'}">
                        <i class="bi bi-${client.active ? 'pause' : 'play'}-circle"></i>
                    </button>
                    
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
    // CLIENT ACTIONS
    // ==========================================

    async toggleClientStatus(clientId, newStatus) {
        const client = this.clients.find(c => c.id === clientId);
        if (!client) return;

        const action = newStatus ? 'активиране' : 'деактивиране';

        try {
            window.universalLoader?.show(
                `${newStatus ? 'Активиране' : 'Деактивиране'} на клиент...`,
                'Обновяване на статуса',
                'toggle-client-status'
            );

            const response = await fetch(`/admin/clients/${clientId}/toggle-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [window.csrfHeader]: window.csrfToken
                },
                body: JSON.stringify({ active: newStatus })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Обновяваме локалните данни
                client.active = newStatus;

                // Пререндериране на таблицата
                this.applyFilters();

                window.toastManager?.success(
                    `Клиент "${client.username}" е ${newStatus ? 'активиран' : 'деактивиран'} успешно`,
                    `Успешно ${action}`
                );
            } else {
                throw new Error(result.message || `Грешка при ${action} на клиента`);
            }

        } catch (error) {
            console.error(`Грешка при ${action} на клиент:`, error);
            window.toastManager?.error(
                `Възникна грешка при ${action} на клиента`,
                'Грешка при обновяване'
            );
        } finally {
            window.universalLoader?.hide();
        }
    }

    openSendMessageModal(clientId) {
        const client = this.clients.find(c => c.id === clientId);
        if (!client) return;

        document.getElementById('messageClientId').value = clientId;
        document.getElementById('messageRecipientName').textContent = client.username;
        document.getElementById('messageRecipientEmail').textContent = client.email || 'Няма email';

        // Изчистваме формата
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
        const subject = formData.get('subject');
        const content = formData.get('content');

        if (!subject || !content) {
            window.toastManager?.error('Моля попълнете всички полета', 'Валидационна грешка');
            return;
        }

        try {
            window.universalLoader?.show('Изпращане на съобщение...', 'Моля изчакайте', 'send-message');

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
                window.toastManager?.success(
                    'Съобщението е изпратено успешно',
                    'Успешно изпращане'
                );
            } else {
                throw new Error(result.message || 'Грешка при изпращане на съобщението');
            }

        } catch (error) {
            console.error('Грешка при изпращане на съобщение:', error);
            window.toastManager?.error(
                'Възникна грешка при изпращане на съобщението',
                'Грешка при изпращане'
            );
        } finally {
            window.universalLoader?.hide();
        }
    }

    openSendEmailModal(clientId) {
        const client = this.clients.find(c => c.id === clientId);
        if (!client) return;

        if (!client.email) {
            window.toastManager?.warning(
                'Този клиент няма настроен email адрес',
                'Няма email адрес'
            );
            return;
        }

        document.getElementById('emailClientId').value = clientId;
        document.getElementById('emailRecipientName').textContent = client.username;
        document.getElementById('emailRecipientEmail').textContent = client.email;

        // Изчистваме формата
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
            window.toastManager?.error('Моля попълнете всички полета', 'Валидационна грешка');
            return;
        }

        try {
            window.universalLoader?.show('Изпращане на email...', 'Моля изчакайте', 'send-email');

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
                window.toastManager?.success(
                    'Email-ът е изпратен успешно',
                    'Успешно изпращане'
                );
            } else {
                throw new Error(result.message || 'Грешка при изпращане на email-а');
            }

        } catch (error) {
            console.error('Грешка при изпращане на email:', error);
            window.toastManager?.error(
                'Възникна грешка при изпращане на email-а',
                'Грешка при изпращане'
            );
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

        if (displayedCount) displayedCount.textContent = this.filteredClients.size;
        if (totalCount) totalCount.textContent = this.clients.size;
    }

    updateFilterIndicator() {
        const indicator = document.getElementById('activeFilterInfo');
        const hasActiveFilters = Object.values(this.filters).some(filter => filter);

        if (indicator) {
            indicator.style.display = hasActiveFilters ? 'inline-flex' : 'none';
        }
    }

    updatePagination() {
        // Базова pagination логика - може да се разшири при нужда
        const totalPages = Math.ceil(this.filteredClients.length / this.itemsPerPage);
        const pagination = document.getElementById('clientsPagination');

        if (pagination) {
            pagination.style.display = totalPages > 1 ? 'flex' : 'none';
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
// GLOBAL FUNCTIONS (за onclick handlers)
// ==========================================

function resetCreateClientForm() {
    const form = document.getElementById('createClientForm');
    if (form) {
        form.reset();
        // Изчистваме validation states
        form.querySelectorAll('.is-valid, .is-invalid').forEach(el => {
            el.classList.remove('is-valid', 'is-invalid');
        });
    }
}

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const button = input.parentElement.querySelector('.password-toggle-btn i');

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
        window.clientsManager.applyFilters();
    }
}

function clearAllFilters() {
    if (!window.clientsManager) return;

    // Изчистваме всички filter inputs
    document.getElementById('clientsQuickSearch').value = '';
    document.getElementById('clientsStatusFilter').value = '';
    document.getElementById('clientsLocationFilter').value = '';
    document.getElementById('clientsUsernameFilter').value = '';
    document.getElementById('clientsEmailFilter').value = '';
    document.getElementById('clientsPhoneFilter').value = '';
    document.getElementById('clientsUserCodeFilter').value = '';

    // Изчистваме filters object
    window.clientsManager.filters = {};
    window.clientsManager.applyFilters();
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

function exportClientsData() {
    if (!window.clientsManager) return;

    // Простa CSV export функционалност
    const clients = window.clientsManager.filteredClients;
    const headers = ['ID', 'Потребителско име', 'Компания', 'Email', 'Телефон', 'Локация', 'Код', 'Статус'];

    const csvContent = [
        headers.join(','),
        ...clients.map(client => [
            client.id,
            `"${client.username}"`,
            `"${client.companyName || ''}"`,
            `"${client.email || ''}"`,
            `"${client.phone || ''}"`,
            `"${client.location || ''}"`,
            client.userCode || '',
            client.active ? 'Активен' : 'Неактивен'
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clients_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    // Инициализираме ClientsManager само ако сме в clients tab
    if (document.querySelector('.clients-management-container')) {
        window.clientsManager = new ClientsManager();
        console.log('✓ ClientsManager инициализиран');
    }
});