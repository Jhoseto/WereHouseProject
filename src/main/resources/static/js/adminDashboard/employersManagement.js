/**
 * EMPLOYERS MANAGEMENT JAVASCRIPT
 * Управление на служители с филтриране, сортиране и CRUD операции
 */

class EmployersManager {
    constructor() {
        this.employers = [];
        this.filteredEmployers = [];
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
        this.initCreateEmployerForm();
        this.initFiltersAndSearch();
        this.initSorting();
        this.loadEmployersData();

        console.log('✓ EmployersManager инициализиран успешно');
    }

    // ==========================================
    // TAB NAVIGATION
    // ==========================================

    initTabNavigation() {
        const tabButtons = document.querySelectorAll('.employers-tab-btn');

        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabId = e.currentTarget.getAttribute('data-employers-tab');
                this.switchTab(tabId);
            });
        });
    }

    switchTab(tabId) {
        // Update buttons
        document.querySelectorAll('.employers-tab-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`[data-employers-tab="${tabId}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        // Update content
        document.querySelectorAll('.employers-tab-content').forEach(content => content.classList.remove('active'));
        const targetTabId = tabId === 'create' ? 'create-employer-tab' : 'manage-employers-tab';
        const targetTab = document.getElementById(targetTabId);
        if (targetTab) targetTab.classList.add('active');

        this.currentTab = tabId;
    }

    // ==========================================
    // CREATE EMPLOYER FORM
    // ==========================================

    initCreateEmployerForm() {
        const form = document.getElementById('createEmployerForm');
        if (!form) return;

        // Real-time username validation
        const usernameInput = document.getElementById('employerUsername');
        if (usernameInput) {
            let debounceTimer;
            usernameInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.checkUsernameAvailability(e.target.value);
                }, 500);
            });
        }

        // Form submit
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createEmployer();
        });
    }

    async checkUsernameAvailability(username) {
        if (!username || username.length < 3) return;

        try {
            const response = await fetch('/admin/employersManagement/check-username', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="_csrf"]').content
                },
                body: JSON.stringify({ username })
            });

            const data = await response.json();
            const input = document.getElementById('employerUsername');

            if (data.available) {
                input.classList.remove('is-invalid');
                input.classList.add('is-valid');
            } else {
                input.classList.remove('is-valid');
                input.classList.add('is-invalid');
            }
        } catch (error) {
            console.error('Username check error:', error);
        }
    }

    async createEmployer() {
        const form = document.getElementById('createEmployerForm');
        const formData = new FormData(form);

        // Password match validation
        const password = formData.get('password');
        const passwordConfirm = formData.get('passwordConfirm');

        if (password !== passwordConfirm) {
            showToast('error', 'Паролите не съвпадат');
            return;
        }

        const employerData = {
            username: formData.get('username'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            location: formData.get('location') || null,
            password: password
        };

        try {
            const response = await fetch('/admin/employersManagement/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="_csrf"]').content
                },
                body: JSON.stringify(employerData)
            });

            const data = await response.json();

            if (data.success) {
                showToast('success', data.message || 'Служителят е създаден успешно');
                form.reset();
                // Clear validation classes
                form.querySelectorAll('.is-valid, .is-invalid').forEach(el => {
                    el.classList.remove('is-valid', 'is-invalid');
                });
                // Reload data and switch to manage tab
                this.loadEmployersData();
                this.switchTab('manage');
            } else {
                showToast('error', data.message || 'Грешка при създаване на служителя');
            }
        } catch (error) {
            console.error('Create employer error:', error);
            showToast('error', 'Възникна грешка при създаване на служителя');
        }
    }

    // ==========================================
    // LOAD EMPLOYERS DATA
    // ==========================================

    async loadEmployersData() {
        try {
            const response = await fetch('/admin/employersManagement/list', {
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="_csrf"]').content
                }
            });

            const data = await response.json();

            if (data.success && data.data && data.data.employers) {
                this.employers = data.data.employers;
                this.filteredEmployers = [...this.employers];
                this.applyFiltersInstantly();
                console.log(`✓ Заредени ${this.employers.length} служители`);
            } else {
                this.employers = [];
                this.filteredEmployers = [];
                this.renderEmployersTable();
            }
        } catch (error) {
            console.error('Load employers error:', error);
            showToast('error', 'Грешка при зареждане на служителите');
        }
    }

    // ==========================================
    // FILTERS AND SEARCH
    // ==========================================

    initFiltersAndSearch() {
        const filterIds = [
            'employersQuickSearch',
            'employersStatusFilter',
            'employersLocationFilter',
            'employersUsernameFilter',
            'employersEmailFilter',
            'employersPhoneFilter'
        ];

        filterIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => this.applyFiltersInstantly());
            }
        });
    }

    applyFiltersInstantly() {
        this.currentPage = 1;

        // Get filter values
        const quickSearch = document.getElementById('employersQuickSearch')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('employersStatusFilter')?.value || '';
        const locationFilter = document.getElementById('employersLocationFilter')?.value.toLowerCase() || '';
        const usernameFilter = document.getElementById('employersUsernameFilter')?.value.toLowerCase() || '';
        const emailFilter = document.getElementById('employersEmailFilter')?.value.toLowerCase() || '';
        const phoneFilter = document.getElementById('employersPhoneFilter')?.value.toLowerCase() || '';

        // Apply filters
        this.filteredEmployers = this.employers.filter(emp => {
            // Quick search
            if (quickSearch) {
                const matchesQuick =
                    emp.username?.toLowerCase().includes(quickSearch) ||
                    emp.email?.toLowerCase().includes(quickSearch) ||
                    emp.phone?.toLowerCase().includes(quickSearch) ||
                    emp.location?.toLowerCase().includes(quickSearch);
                if (!matchesQuick) return false;
            }

            // Status filter
            if (statusFilter && emp.userStatus !== statusFilter) return false;

            // Location filter
            if (locationFilter && !emp.location?.toLowerCase().includes(locationFilter)) return false;

            // Username filter
            if (usernameFilter && !emp.username?.toLowerCase().includes(usernameFilter)) return false;

            // Email filter
            if (emailFilter && !emp.email?.toLowerCase().includes(emailFilter)) return false;

            // Phone filter
            if (phoneFilter && !emp.phone?.toLowerCase().includes(phoneFilter)) return false;

            return true;
        });

        // Show/hide active filter indicator
        const hasActiveFilters = quickSearch || statusFilter || locationFilter ||
            usernameFilter || emailFilter || phoneFilter;
        const filterInfo = document.getElementById('activeFilterInfo');
        if (filterInfo) {
            filterInfo.style.display = hasActiveFilters ? 'inline-flex' : 'none';
        }

        this.sortEmployers();
        this.renderEmployersTable();
    }

    // ==========================================
    // SORTING
    // ==========================================

    initSorting() {
        const sortSelect = document.getElementById('employersSortBy');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.sortEmployers();
                this.renderEmployersTable();
            });
        }

        const sortableHeaders = document.querySelectorAll('.employers-table th.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                const sortKey = e.currentTarget.getAttribute('data-sort');
                if (sortKey) {
                    if (this.sortBy === sortKey) {
                        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
                    } else {
                        this.sortBy = sortKey;
                        this.sortDirection = 'asc';
                    }
                    if (sortSelect) sortSelect.value = sortKey;
                    this.updateSortDirectionButton();
                    this.sortEmployers();
                    this.renderEmployersTable();
                }
            });
        });
    }

    updateSortDirectionButton() {
        const btn = document.getElementById('sortDirectionBtn');
        if (btn) {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = this.sortDirection === 'asc' ? 'bi bi-sort-alpha-down' : 'bi bi-sort-alpha-up';
            }
        }
    }

    sortEmployers() {
        this.filteredEmployers.sort((a, b) => {
            let aVal = a[this.sortBy];
            let bVal = b[this.sortBy];

            // Handle dates
            if (this.sortBy === 'createdAt' || this.sortBy === 'updatedAt') {
                aVal = aVal ? new Date(aVal).getTime() : 0;
                bVal = bVal ? new Date(bVal).getTime() : 0;
            }

            // Handle strings
            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();

            // Handle nulls
            if (aVal == null) return 1;
            if (bVal == null) return -1;

            if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // ==========================================
    // RENDER TABLE
    // ==========================================

    renderEmployersTable() {
        const tbody = document.getElementById('employersTableBody');
        if (!tbody) return;

        // Update counts
        document.getElementById('displayedEmployersCount').textContent = this.filteredEmployers.length;
        document.getElementById('totalEmployersCount').textContent = this.employers.length;

        // Pagination
        const totalPages = Math.ceil(this.filteredEmployers.length / this.itemsPerPage);
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const pageEmployers = this.filteredEmployers.slice(start, end);

        // Update pagination controls
        document.getElementById('currentPageDisplay').textContent = this.currentPage;
        document.getElementById('totalPagesDisplay').textContent = totalPages || 1;
        document.getElementById('pageNumberInput').value = this.currentPage;
        document.getElementById('pageNumberInput').max = totalPages || 1;
        document.getElementById('prevPageBtn').disabled = this.currentPage === 1;
        document.getElementById('nextPageBtn').disabled = this.currentPage >= totalPages;

        // Render rows
        if (pageEmployers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 3rem; color: var(--color-text-muted);">
                        <i class="bi bi-inbox" style="font-size: 2rem;"></i>
                        <p>Няма намерени служители</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = pageEmployers.map(emp => `
            <tr>
                <td class="id-cell">${emp.id}</td>
                <td class="username-cell">${this.escapeHtml(emp.username)}</td>
                <td class="email-cell">
                    <a href="mailto:${this.escapeHtml(emp.email)}" class="email-link">
                        ${this.escapeHtml(emp.email)}
                    </a>
                </td>
                <td class="phone-cell">
                    ${emp.phone ? `<a href="tel:${this.escapeHtml(emp.phone)}" class="phone-link">${this.escapeHtml(emp.phone)}</a>` : '<span class="text-muted">—</span>'}
                </td>
                <td>${emp.location ? this.escapeHtml(emp.location) : '<span class="text-muted">—</span>'}</td>
                <td>${emp.createdAt ? this.formatDate(emp.createdAt) : '<span class="text-muted">—</span>'}</td>
                <td class="status-cell">
                    <span class="status-badge status-${emp.userStatus.toLowerCase()}">
                        <i class="bi bi-${emp.userStatus === 'ACTIVE' ? 'check-circle-fill' : 'x-circle-fill'}"></i>
                        ${emp.userStatus === 'ACTIVE' ? 'Активен' : 'Неактивен'}
                    </span>
                </td>
                <td>
                    <div class="employer-actions">
                        <button type="button" 
                                class="btn btn-${emp.userStatus === 'ACTIVE' ? 'danger' : 'success'} btn-sm" 
                                onclick="toggleEmployerStatus(${emp.id})"
                                title="${emp.userStatus === 'ACTIVE' ? 'Деактивирай' : 'Активирай'}">
                            <i class="bi bi-${emp.userStatus === 'ACTIVE' ? 'x-circle' : 'check-circle'}"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // ==========================================
    // TOGGLE EMPLOYER STATUS
    // ==========================================

    async toggleEmployerStatus(employerId) {
        const employer = this.employers.find(e => e.id === employerId);
        if (!employer) return;

        const action = employer.userStatus === 'ACTIVE' ? 'деактивирате' : 'активирате';
        if (!confirm(`Сигурни ли сте, че искате да ${action} служител "${employer.username}"?`)) {
            return;
        }

        try {
            const response = await fetch(`/admin/employersManagement/${employerId}/toggle-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="_csrf"]').content
                }
            });

            const data = await response.json();

            if (data.success) {
                showToast('success', data.message);
                this.loadEmployersData();
            } else {
                showToast('error', data.message || 'Грешка при промяна на статуса');
            }
        } catch (error) {
            console.error('Toggle status error:', error);
            showToast('error', 'Възникна грешка при промяна на статуса');
        }
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    formatDate(dateString) {
        if (!dateString) return '—';
        const date = new Date(dateString);
        return date.toLocaleDateString('bg-BG', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ==========================================
// GLOBAL FUNCTIONS
// ==========================================

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const btn = input?.nextElementSibling;
    if (!input || !btn) return;

    if (input.type === 'password') {
        input.type = 'text';
        btn.querySelector('i').className = 'bi bi-eye-slash';
    } else {
        input.type = 'password';
        btn.querySelector('i').className = 'bi bi-eye';
    }
}

function resetCreateEmployerForm() {
    const form = document.getElementById('createEmployerForm');
    if (form) {
        form.reset();
        form.querySelectorAll('.is-valid, .is-invalid').forEach(el => {
            el.classList.remove('is-valid', 'is-invalid');
        });
    }
}

function clearQuickSearch() {
    const input = document.getElementById('employersQuickSearch');
    if (input && window.employersManager) {
        input.value = '';
        window.employersManager.applyFiltersInstantly();
    }
}

function clearAllFilters() {
    if (!window.employersManager) return;

    const filterIds = [
        'employersQuickSearch',
        'employersStatusFilter',
        'employersLocationFilter',
        'employersUsernameFilter',
        'employersEmailFilter',
        'employersPhoneFilter'
    ];

    filterIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    window.employersManager.applyFiltersInstantly();
}

function refreshEmployersData() {
    if (window.employersManager) {
        window.employersManager.loadEmployersData();
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

function toggleSortDirection() {
    if (window.employersManager) {
        window.employersManager.sortDirection =
            window.employersManager.sortDirection === 'asc' ? 'desc' : 'asc';
        window.employersManager.updateSortDirectionButton();
        window.employersManager.sortEmployers();
        window.employersManager.renderEmployersTable();
    }
}

function exportEmployersData() {
    if (!window.employersManager) return;

    const employers = window.employersManager.filteredEmployers;
    const headers = ['ID', 'Потребителско име', 'Email', 'Телефон', 'Локация', 'Дата на създаване', 'Статус'];

    const csvContent = [
        headers.join(','),
        ...employers.map(emp => {
            const statusText = emp.userStatus === 'ACTIVE' ? 'Активен' : 'Неактивен';
            const createdAt = emp.createdAt ? new Date(emp.createdAt).toLocaleDateString('bg-BG') : '';

            return [
                emp.id,
                `"${emp.username}"`,
                `"${emp.email || ''}"`,
                `"${emp.phone || ''}"`,
                `"${emp.location || ''}"`,
                `"${createdAt}"`,
                statusText
            ].join(',');
        })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `employers_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

function goToPreviousPage() {
    if (window.employersManager && window.employersManager.currentPage > 1) {
        window.employersManager.currentPage--;
        window.employersManager.renderEmployersTable();
    }
}

function goToNextPage() {
    if (window.employersManager) {
        const totalPages = Math.ceil(window.employersManager.filteredEmployers.length / window.employersManager.itemsPerPage);
        if (window.employersManager.currentPage < totalPages) {
            window.employersManager.currentPage++;
            window.employersManager.renderEmployersTable();
        }
    }
}

function toggleEmployerStatus(employerId) {
    if (window.employersManager) {
        window.employersManager.toggleEmployerStatus(employerId);
    }
}

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('.employers-management-container')) {
        window.employersManager = new EmployersManager();
        console.log('✓ EmployersManager инициализиран');
    }
});