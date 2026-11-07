/**
 * Veerendra - Digital Document Management System
 * Core Frontend JavaScript Controller
 */

// Toast notification helper
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = 'info-circle';
  if (type === 'success') icon = 'check-circle';
  if (type === 'error') icon = 'exclamation-circle';
  if (type === 'warning') icon = 'exclamation-triangle';

  toast.innerHTML = `
    <i class="fas fa-${icon}" style="font-size: 16px;"></i>
    <div style="flex: 1;">${message}</div>
    <button style="background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 14px;" onclick="this.parentElement.remove()">
      <i class="fas fa-times"></i>
    </button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Global user state
let currentUser = null;

// Generic authenticated fetch wrapper
async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    if (res.status === 401) {
      const path = window.location.pathname.toLowerCase();
      if (!path.includes('login.html') && !path.includes('register.html') && !path.includes('index.html') && path !== '/') {
        window.location.href = '/login.html';
      }
      return null;
    }
    return res;
  } catch (err) {
    console.error('API Fetch error:', err);
    showToast('Network error occurred. Please check connection.', 'error');
    return null;
  }
}

// Utility: Format File Size
function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Utility: Format Date
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// Utility: File Type Icon and Class
function getFileIconMeta(fileName = '') {
  const ext = fileName.split('.').pop().toLowerCase();
  if (ext === 'pdf') {
    return { icon: 'fa-file-pdf', class: 'file-icon-pdf', label: 'PDF' };
  } else if (['doc', 'docx'].includes(ext)) {
    return { icon: 'fa-file-word', class: 'file-icon-doc', label: 'DOC' };
  } else if (['jpg', 'jpeg', 'png'].includes(ext)) {
    return { icon: 'fa-file-image', class: 'file-icon-img', label: 'IMG' };
  }
  return { icon: 'fa-file-alt', class: 'file-icon-other', label: ext.toUpperCase() };
}

// Helper to escape quotes in JS string params
function escapeQuote(str = '') {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// Check session & populate user badges
async function checkAuth() {
  const path = window.location.pathname.toLowerCase();
  const isAuthPage = path.includes('login.html') || path.includes('register.html');
  const isLandingPage = path.includes('index.html') || path === '/';

  const res = await apiFetch('/api/auth/me');
  if (res && res.ok) {
    const data = await res.json();
    if (data.authenticated) {
      currentUser = data.user;

      if (isAuthPage) {
        window.location.href = '/dashboard.html';
        return;
      }

      // Populate user info in UI
      const nameElements = document.querySelectorAll('.js-user-name');
      const emailElements = document.querySelectorAll('.js-user-email');
      const avatarElements = document.querySelectorAll('.js-user-avatar');
      const roleElements = document.querySelectorAll('.js-user-role');

      const initials = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

      nameElements.forEach(el => el.textContent = currentUser.name);
      emailElements.forEach(el => el.textContent = currentUser.email);
      avatarElements.forEach(el => el.textContent = initials);
      roleElements.forEach(el => el.textContent = currentUser.role || 'User');
    } else if (!isAuthPage && !isLandingPage) {
      window.location.href = '/login.html';
    }
  } else if (!isAuthPage && !isLandingPage) {
    window.location.href = '/login.html';
  }
}

// Setup Mobile Sidebar Toggle
function setupSidebarToggle() {
  const toggleBtn = document.getElementById('menuToggle');
  const sidebar = document.querySelector('.sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== toggleBtn) {
        sidebar.classList.remove('open');
      }
    });
  }
}

// Setup Global Logout
function setupLogout() {
  const logoutButtons = document.querySelectorAll('.js-btn-logout');
  logoutButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const res = await fetch('/api/auth/logout', { method: 'POST' });
        if (res.ok) {
          showToast('Logged out successfully.', 'info');
          setTimeout(() => {
            window.location.href = '/login.html';
          }, 400);
        }
      } catch (err) {
        window.location.href = '/login.html';
      }
    });
  });
}

// ==========================================================================
// Page: Dashboard Initializer
// ==========================================================================
async function initDashboard() {
  const statDocs = document.getElementById('statTotalDocs');
  if (!statDocs) return;

  try {
    // 1. Fetch Stats from MySQL
    const statsRes = await apiFetch('/api/stats');
    if (statsRes && statsRes.ok) {
      const { stats } = await statsRes.json();
      if (document.getElementById('statTotalUsers')) {
        document.getElementById('statTotalUsers').textContent = stats.totalUsers || 0;
      }
      if (document.getElementById('statTotalCategories')) {
        document.getElementById('statTotalCategories').textContent = stats.totalCategories || 0;
      }
      if (document.getElementById('statTotalDocs')) {
        document.getElementById('statTotalDocs').textContent = stats.totalDocuments || 0;
      }
      if (document.getElementById('statTotalAccess')) {
        document.getElementById('statTotalAccess').textContent = stats.totalAccess || 0;
      }

      // Render Category Breakdown Bars
      const catListContainer = document.getElementById('dashboardCategoryStats');
      if (catListContainer && stats.categoryBreakdown) {
        if (stats.categoryBreakdown.length === 0) {
          catListContainer.innerHTML = '<p class="text-muted" style="padding: 12px 0;">No categories available.</p>';
        } else {
          const maxCount = Math.max(...stats.categoryBreakdown.map(c => c.count), 1);
          catListContainer.innerHTML = stats.categoryBreakdown.map(cat => {
            const pct = Math.round((cat.count / maxCount) * 100);
            return `
              <div style="margin-bottom: 14px;">
                <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 5px;">
                  <span>${cat.category_name}</span>
                  <span style="color: var(--text-muted);">${cat.count} doc${cat.count === 1 ? '' : 's'}</span>
                </div>
                <div style="background-color: #f1f5f9; border-radius: 99px; height: 8px; overflow: hidden;">
                  <div style="background: linear-gradient(90deg, #4f46e5, #0ea5e9); width: ${pct}%; height: 100%; border-radius: 99px; transition: width 0.5s ease;"></div>
                </div>
              </div>
            `;
          }).join('');
        }
      }
    }

    // 2. Fetch Recent Documents from MySQL
    const recentRes = await apiFetch('/api/documents/recent');
    if (recentRes && recentRes.ok) {
      const { recent } = await recentRes.json();
      const recentTbody = document.getElementById('recentDocumentsTable');
      if (recentTbody) {
        if (!recent || recent.length === 0) {
          recentTbody.innerHTML = `
            <tr>
              <td colspan="6" class="empty-state">
                <i class="fas fa-folder-open empty-state-icon"></i>
                <h3>No documents uploaded yet</h3>
                <p>Upload documents into MySQL to see them listed here.</p>
                <a href="/documents.html" class="btn btn-primary btn-sm"><i class="fas fa-folder-open"></i> Go to Documents</a>
              </td>
            </tr>
          `;
        } else {
          recentTbody.innerHTML = recent.map(doc => {
            const meta = getFileIconMeta(doc.file_name);
            const st = (doc.status || '').toLowerCase();
            const statusClass = st === 'active' ? 'badge-active' : (st === 'draft' ? 'badge-draft' : 'badge-archived');

            return `
              <tr>
                <td><strong>#${doc.document_id}</strong></td>
                <td>
                  <div class="file-cell">
                    <div class="file-icon-box ${meta.class}">
                      <i class="fas ${meta.icon}"></i>
                    </div>
                    <div class="file-details">
                      <h4>${doc.title}</h4>
                      <p>${doc.file_name}</p>
                    </div>
                  </div>
                </td>
                <td><span class="badge badge-category">${doc.category_name || 'Uncategorized'}</span></td>
                <td>${formatDate(doc.upload_date)}</td>
                <td><span class="badge ${statusClass}">${doc.status}</span></td>
                <td>
                  <div style="display: flex; gap: 8px;">
                    <button class="btn-icon" title="View Document" onclick="viewDocument(${doc.document_id}, '${escapeQuote(doc.title)}')">
                      <i class="fas fa-eye"></i>
                    </button>
                    <a href="/api/documents/download/${doc.document_id}" class="btn-icon" title="Download Document" download>
                      <i class="fas fa-download"></i>
                    </a>
                  </div>
                </td>
              </tr>
            `;
          }).join('');
        }
      }
    }
  } catch (err) {
    console.error('Error initializing dashboard:', err);
  }
}

// ==========================================================================
// Page 1: Users Table Initializer (users.html)
// ==========================================================================
async function initUsersPage() {
  const tableBody = document.getElementById('usersTableBody');
  if (!tableBody) return;

  await loadUsers();

  // Search input listener
  const searchInput = document.getElementById('userSearchInput');
  let searchTimer;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => loadUsers(searchInput.value.trim()), 300);
    });
  }

  // Add User Form Submission
  const addForm = document.getElementById('addUserForm');
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('addUserName').value.trim();
      const email = document.getElementById('addUserEmail').value.trim();
      const role = document.getElementById('addUserRole').value;
      const password = document.getElementById('addUserPassword').value;

      try {
        const res = await apiFetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, role })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToast(data.message || 'User added successfully!', 'success');
          addForm.reset();
          closeModal('addUserModal');
          loadUsers();
        } else {
          showToast(data.message || 'Failed to add user.', 'error');
        }
      } catch (err) {
        showToast('Error saving user to database.', 'error');
      }
    });
  }

  // Edit User Form Submission
  const editForm = document.getElementById('editUserForm');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('editUserId').value;
      const name = document.getElementById('editUserName').value.trim();
      const email = document.getElementById('editUserEmail').value.trim();
      const role = document.getElementById('editUserRole').value;
      const password = document.getElementById('editUserPassword').value;

      try {
        const res = await apiFetch(`/api/users/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, role, password })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToast(data.message || 'User updated successfully!', 'success');
          closeModal('editUserModal');
          loadUsers();
        } else {
          showToast(data.message || 'Failed to update user.', 'error');
        }
      } catch (err) {
        showToast('Error updating user in database.', 'error');
      }
    });
  }
}

async function loadUsers(search = '') {
  const tbody = document.getElementById('usersTableBody');
  const badge = document.getElementById('userTotalBadge');
  if (!tbody) return;

  try {
    let url = '/api/users';
    if (search) url += `?search=${encodeURIComponent(search)}`;

    const res = await apiFetch(url);
    if (!res || !res.ok) return;

    const data = await res.json();
    const users = data.users || [];

    if (badge) badge.textContent = `${users.length} Users in MySQL`;

    if (users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">
            <i class="fas fa-users-slash empty-state-icon"></i>
            <h3>No users found</h3>
            <p>No matching user records found in MySQL table <code>users</code>.</p>
            <button class="btn btn-primary btn-sm" onclick="openModal('addUserModal')">
              <i class="fas fa-user-plus"></i> Add User
            </button>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = users.map(u => `
      <tr>
        <td><strong>#${u.user_id}</strong></td>
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="user-avatar" style="width: 32px; height: 32px; font-size: 13px;">${u.name.charAt(0).toUpperCase()}</div>
            <div style="font-weight: 600; color: var(--text-main);">${u.name}</div>
          </div>
        </td>
        <td><code>${u.email}</code></td>
        <td>
          <span class="badge" style="background-color: ${u.role === 'admin' ? '#eef2ff' : '#f1f5f9'}; color: ${u.role === 'admin' ? '#4338ca' : '#475569'}; font-weight: 700;">
            ${u.role.toUpperCase()}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 8px;">
            <button class="btn-icon" title="Edit User" onclick="openEditUser(${u.user_id}, '${escapeQuote(u.name)}', '${escapeQuote(u.email)}', '${u.role}')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-icon danger" title="Delete User" onclick="confirmDeleteUser(${u.user_id}, '${escapeQuote(u.name)}')">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading users:', err);
  }
}

function openEditUser(id, name, email, role) {
  document.getElementById('editUserId').value = id;
  document.getElementById('editUserDisplayId').textContent = id;
  document.getElementById('editUserName').value = name;
  document.getElementById('editUserEmail').value = email;
  document.getElementById('editUserRole').value = role;
  document.getElementById('editUserPassword').value = '';
  openModal('editUserModal');
}

let userToDeleteId = null;
function confirmDeleteUser(id, name) {
  userToDeleteId = id;
  document.getElementById('deleteUserName').textContent = `"${name}" (ID: #${id})`;
  openModal('deleteUserModal');
}

async function executeDeleteUser() {
  if (!userToDeleteId) return;

  try {
    const res = await apiFetch(`/api/users/${userToDeleteId}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(data.message || 'User deleted successfully.', 'success');
      closeModal('deleteUserModal');
      userToDeleteId = null;
      loadUsers();
    } else {
      showToast(data.message || 'Failed to delete user.', 'error');
    }
  } catch (err) {
    showToast('Error deleting user from database.', 'error');
  }
}

// ==========================================================================
// Page 2: Categories Table Initializer (categories.html)
// ==========================================================================
async function initCategoriesPage() {
  const catTable = document.getElementById('categoriesTableBody');
  if (!catTable) return;

  await loadCategories();

  // Category Search input
  const searchInput = document.getElementById('categorySearchInput');
  let searchTimer;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => loadCategories(searchInput.value.trim()), 300);
    });
  }

  // Setup Add Category Form Modal
  const addForm = document.getElementById('addCategoryForm');
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('catNameInput').value.trim();
      const desc = document.getElementById('catDescInput').value.trim();

      if (!name) {
        showToast('Category name is required.', 'warning');
        return;
      }

      try {
        const res = await apiFetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category_name: name, description: desc })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Category saved to MySQL successfully!', 'success');
          addForm.reset();
          closeModal('addCategoryModal');
          loadCategories();
        } else {
          showToast(data.message || 'Could not create category.', 'error');
        }
      } catch (err) {
        showToast('Error creating category.', 'error');
      }
    });
  }

  // Setup Edit Category Form Modal
  const editForm = document.getElementById('editCategoryForm');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('editCatId').value;
      const name = document.getElementById('editCatName').value.trim();
      const desc = document.getElementById('editCatDesc').value.trim();

      try {
        const res = await apiFetch(`/api/categories/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category_name: name, description: desc })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Category updated in MySQL successfully!', 'success');
          closeModal('editCategoryModal');
          loadCategories();
        } else {
          showToast(data.message || 'Could not update category.', 'error');
        }
      } catch (err) {
        showToast('Error updating category.', 'error');
      }
    });
  }
}

async function loadCategories(search = '') {
  const tbody = document.getElementById('categoriesTableBody');
  const catTotalBadge = document.getElementById('categoryTotalCount');

  try {
    let url = '/api/categories';
    if (search) url += `?search=${encodeURIComponent(search)}`;

    const res = await apiFetch(url);
    if (!res || !res.ok) return;

    const { categories } = await res.json();

    if (catTotalBadge) catTotalBadge.textContent = `${categories.length} Categories in MySQL`;

    if (!categories || categories.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">
            <i class="fas fa-tags empty-state-icon"></i>
            <h3>No categories found</h3>
            <p>No matching categories in MySQL table <code>categories</code>.</p>
            <button class="btn btn-primary btn-sm" onclick="openModal('addCategoryModal')">
              <i class="fas fa-plus"></i> Add Category
            </button>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = categories.map(cat => `
      <tr>
        <td><strong>#${cat.category_id}</strong></td>
        <td>
          <div style="font-weight: 700; color: var(--text-main); font-size: 15px;">${cat.category_name}</div>
        </td>
        <td>
          <div style="color: var(--text-muted); font-size: 13px; max-width: 380px;">${cat.description || '<em>No description provided</em>'}</div>
        </td>
        <td>
          <span class="badge" style="background-color: #f1f5f9; color: #334155; font-weight: 700;">
            <i class="fas fa-file-alt" style="margin-right: 4px; color: var(--primary);"></i> ${cat.document_count} doc${cat.document_count === 1 ? '' : 's'}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 8px;">
            <button class="btn-icon" title="Edit Category" onclick="openEditCategory(${cat.category_id}, '${escapeQuote(cat.category_name)}', '${escapeQuote(cat.description || '')}')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-icon danger" title="Delete Category" onclick="confirmDeleteCategory(${cat.category_id}, '${escapeQuote(cat.category_name)}', ${cat.document_count})">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading categories:', err);
  }
}

function openEditCategory(id, name, desc) {
  document.getElementById('editCatId').value = id;
  document.getElementById('editCatDisplayId').textContent = id;
  document.getElementById('editCatName').value = name;
  document.getElementById('editCatDesc').value = desc;
  openModal('editCategoryModal');
}

let catToDeleteId = null;
function confirmDeleteCategory(id, name, docCount) {
  catToDeleteId = id;
  const target = document.getElementById('deleteCategoryName');
  const warning = document.getElementById('deleteCatWarning');

  if (target) target.textContent = `"${name}" (#${id})`;
  if (warning) {
    if (docCount > 0) {
      warning.style.display = 'block';
      warning.textContent = `Warning: ${docCount} document(s) in MySQL are currently in this category. They will remain intact but will become Uncategorized.`;
    } else {
      warning.style.display = 'none';
    }
  }

  openModal('deleteCategoryModal');
}

async function executeDeleteCategory() {
  if (!catToDeleteId) return;

  try {
    const res = await apiFetch(`/api/categories/${catToDeleteId}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(data.message || 'Category deleted from MySQL.', 'success');
      closeModal('deleteCategoryModal');
      catToDeleteId = null;
      loadCategories();
    } else {
      showToast(data.message || 'Failed to delete category.', 'error');
    }
  } catch (e) {
    showToast('Error deleting category.', 'error');
  }
}

// ==========================================================================
// Page 3: Documents Table Initializer (documents.html)
// ==========================================================================
async function initDocumentsPage() {
  const docsContainer = document.getElementById('documentsList');
  if (!docsContainer) return;

  // 1. Populate Category Filter Dropdown
  await loadCategoriesDropdown('categoryFilter');
  await loadCategoriesDropdown('modalCategorySelect');

  // 2. Search and Category Filter Listeners
  const searchInput = document.getElementById('docSearchInput');
  const catFilter = document.getElementById('categoryFilter');

  let searchTimeout;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(fetchDocuments, 300);
    });
  }

  if (catFilter) {
    catFilter.addEventListener('change', fetchDocuments);
  }

  // 3. Modal Upload Form Handler inside documents.html
  const modalUploadForm = document.getElementById('modalUploadForm');
  if (modalUploadForm) {
    modalUploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fileInput = document.getElementById('modalFileInput');
      const titleInput = document.getElementById('modalDocTitle');
      const categorySelect = document.getElementById('modalCategorySelect');
      const statusSelect = document.getElementById('modalStatusSelect');
      const submitBtn = document.getElementById('btnModalUploadSubmit');

      if (!fileInput.files || fileInput.files.length === 0) {
        showToast('Please select a file to upload.', 'warning');
        return;
      }

      const formData = new FormData();
      formData.append('document', fileInput.files[0]);
      formData.append('title', titleInput.value.trim());
      if (categorySelect.value) formData.append('category_id', categorySelect.value);
      if (statusSelect.value) formData.append('status', statusSelect.value);

      const origHtml = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

      try {
        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData
        });
        const result = await res.json();
        if (res.ok && result.success) {
          showToast('Document saved to MySQL successfully!', 'success');
          modalUploadForm.reset();
          closeModal('uploadDocModal');
          fetchDocuments();
        } else {
          showToast(result.message || 'Upload failed.', 'error');
        }
      } catch (err) {
        showToast('Upload error occurred.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origHtml;
      }
    });
  }

  // 4. Initial Fetch of all MySQL documents
  await fetchDocuments();
}

async function fetchDocuments() {
  const searchInput = document.getElementById('docSearchInput');
  const catFilter = document.getElementById('categoryFilter');
  const tbody = document.getElementById('documentsTableBody');

  const search = searchInput ? searchInput.value.trim() : '';
  const categoryId = catFilter ? catFilter.value : '';

  let url = '/api/documents?';
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (categoryId) url += `&category_id=${encodeURIComponent(categoryId)}`;

  try {
    const res = await apiFetch(url);
    if (!res || !res.ok) return;

    const data = await res.json();
    const docs = data.documents || [];

    const docCountBadge = document.getElementById('docTotalCountBadge');
    if (docCountBadge) docCountBadge.textContent = `${docs.length} Documents in MySQL`;

    if (!docs || docs.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-state">
            <i class="fas fa-folder-open empty-state-icon"></i>
            <h3>No documents found</h3>
            <p>No matching document records in MySQL table <code>documents</code>.</p>
            <button class="btn btn-primary btn-sm" onclick="openModal('uploadDocModal')">
              <i class="fas fa-cloud-upload-alt"></i> Upload Document
            </button>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = docs.map(doc => {
      const meta = getFileIconMeta(doc.file_name);
      const st = (doc.status || '').toLowerCase();
      const statusClass = st === 'active' ? 'badge-active' : (st === 'draft' ? 'badge-draft' : 'badge-archived');

      return `
        <tr>
          <td><strong>#${doc.document_id}</strong></td>
          <td>
            <div class="file-cell">
              <div class="file-icon-box ${meta.class}">
                <i class="fas ${meta.icon}"></i>
              </div>
              <div class="file-details">
                <h4>${doc.title}</h4>
                <p>${formatBytes(doc.file_size)}</p>
              </div>
            </div>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--text-main);">${doc.owner_name}</div>
          </td>
          <td><span class="badge badge-category">${doc.category_name || 'Uncategorized'}</span></td>
          <td><code style="font-size: 12px;">${doc.file_name}</code></td>
          <td>${formatDate(doc.upload_date)}</td>
          <td><span class="badge ${statusClass}">${doc.status}</span></td>
          <td>
            <div style="display: flex; gap: 8px;">
              <button class="btn-icon" title="View Document" onclick="viewDocument(${doc.document_id}, '${escapeQuote(doc.title)}')">
                <i class="fas fa-eye"></i>
              </button>
              <a href="/api/documents/download/${doc.document_id}" class="btn-icon" title="Download Document" download>
                <i class="fas fa-download"></i>
              </a>
              <button class="btn-icon danger" title="Delete Document" onclick="confirmDeleteDoc(${doc.document_id}, '${escapeQuote(doc.title)}')">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error fetching documents:', err);
  }
}

// View / Preview Document in Modal
function viewDocument(docId, title) {
  const modal = document.getElementById('previewModal');
  const modalTitle = document.getElementById('previewModalTitle');
  const previewBody = document.getElementById('previewModalBody');

  if (!modal || !previewBody) {
    window.open(`/api/documents/view/${docId}`, '_blank');
    return;
  }

  modalTitle.textContent = title || 'Document Preview';
  const url = `/api/documents/view/${docId}`;

  previewBody.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; min-height: 400px; background-color: #f8fafc; border-radius: var(--radius-md);">
      <iframe src="${url}" style="width: 100%; height: 550px; border: none; border-radius: var(--radius-md);" onload="this.style.opacity=1;"></iframe>
    </div>
  `;

  openModal('previewModal');
}

// Delete Document Confirm
let docToDeleteId = null;
function confirmDeleteDoc(docId, title) {
  docToDeleteId = docId;
  const targetName = document.getElementById('deleteTargetName');
  if (targetName) targetName.textContent = `"${title}" (#${docId})`;
  openModal('deleteDocModal');
}

async function executeDeleteDocument() {
  if (!docToDeleteId) return;

  try {
    const res = await apiFetch(`/api/documents/${docToDeleteId}`, { method: 'DELETE' });
    if (res && res.ok) {
      showToast('Document deleted from MySQL successfully.', 'success');
      closeModal('deleteDocModal');
      docToDeleteId = null;
      fetchDocuments();
    } else {
      const err = await res.json();
      showToast(err.message || 'Failed to delete document.', 'error');
    }
  } catch (e) {
    showToast('Failed to delete document.', 'error');
  }
}

// ==========================================================================
// Page 4: Document Access Table Initializer (access.html)
// ==========================================================================
async function initAccessPage() {
  const accessTable = document.getElementById('accessTableBody');
  if (!accessTable) return;

  await loadAccessRecords();
  await loadDocsForSharing();
  await loadUsersForSharing();

  // Search input listener
  const searchInput = document.getElementById('accessSearchInput');
  let searchTimer;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => loadAccessRecords(searchInput.value.trim()), 300);
    });
  }

  // Handle Share Modal Form
  const shareForm = document.getElementById('shareModalForm');
  if (shareForm) {
    shareForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const docId = document.getElementById('shareDocIdSelect').value;
      const userId = document.getElementById('shareUserIdSelect').value;
      const permission = document.getElementById('sharePermSelect').value;
      const btn = document.getElementById('btnSubmitShareModal');

      if (!docId || !userId) {
        showToast('Please select both a document and a user.', 'warning');
        return;
      }

      const origHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

      try {
        const res = await apiFetch('/api/access/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ document_id: docId, user_id: userId, permission })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToast(data.message || 'Permission saved to MySQL successfully!', 'success');
          shareForm.reset();
          closeModal('shareDocModal');
          loadAccessRecords();
        } else {
          showToast(data.message || 'Failed to grant permission.', 'error');
        }
      } catch (err) {
        showToast('Error granting permission.', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = origHtml;
      }
    });
  }
}

async function loadAccessRecords(search = '') {
  const tbody = document.getElementById('accessTableBody');
  const badge = document.getElementById('accessTotalBadge');
  if (!tbody) return;

  try {
    let url = '/api/access';
    if (search) url += `?search=${encodeURIComponent(search)}`;

    const res = await apiFetch(url);
    if (!res || !res.ok) return;

    const data = await res.json();
    const records = data.records || [];

    if (badge) badge.textContent = `${records.length} Access Records in MySQL`;

    if (records.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            <i class="fas fa-user-lock empty-state-icon"></i>
            <h3>No access permissions found</h3>
            <p>No matching records in MySQL table <code>document_access</code>.</p>
            <button class="btn btn-primary btn-sm" onclick="openModal('shareDocModal')">
              <i class="fas fa-share-alt"></i> Share Document
            </button>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = records.map(r => `
      <tr>
        <td><strong>#${r.access_id}</strong></td>
        <td>
          <div style="font-weight: 700; color: var(--text-main); font-size: 14px;">${r.document_title}</div>
          <div style="font-size: 12px; color: var(--text-muted);">${r.file_name}</div>
        </td>
        <td>
          <div style="font-weight: 600;">${r.user_name}</div>
          <div style="font-size: 12px; color: var(--text-muted);">${r.user_email}</div>
        </td>
        <td>
          <span class="badge ${r.permission === 'download' ? 'badge-download' : 'badge-view'}" style="font-size: 12px;">
            <i class="fas ${r.permission === 'download' ? 'fa-download' : 'fa-eye'}"></i> ${r.permission.toUpperCase()}
          </span>
        </td>
        <td>${formatDate(r.granted_date)}</td>
        <td>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-sm btn-outline" style="font-size: 11px;" onclick="updatePermission(${r.access_id}, '${r.permission === 'download' ? 'view' : 'download'}')">
              <i class="fas fa-exchange-alt"></i> Switch to ${r.permission === 'download' ? 'View' : 'Download'}
            </button>
            <button class="btn btn-sm btn-outline" style="color: var(--danger); border-color: var(--danger-border); font-size: 11px;" onclick="revokeAccessRecord(${r.access_id}, '${escapeQuote(r.document_title)}', '${escapeQuote(r.user_name)}')">
              <i class="fas fa-times-circle"></i> Revoke
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading access records:', err);
  }
}

async function updatePermission(accessId, newPerm) {
  try {
    const res = await apiFetch(`/api/access/${accessId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permission: newPerm })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(data.message || 'Permission updated in MySQL.', 'success');
      loadAccessRecords();
    } else {
      showToast(data.message || 'Failed to update permission.', 'error');
    }
  } catch (e) {
    showToast('Error updating permission.', 'error');
  }
}

async function revokeAccessRecord(accessId, docTitle, userName) {
  if (!confirm(`Are you sure you want to revoke permission for ${userName} on "${docTitle}"?`)) {
    return;
  }

  try {
    const res = await apiFetch(`/api/access/${accessId}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast('Access permission revoked from MySQL.', 'success');
      loadAccessRecords();
    } else {
      showToast(data.message || 'Failed to revoke access.', 'error');
    }
  } catch (e) {
    showToast('Error revoking access.', 'error');
  }
}

async function loadDocsForSharing() {
  const select = document.getElementById('shareDocIdSelect');
  if (!select) return;

  try {
    const res = await apiFetch('/api/documents');
    if (res && res.ok) {
      const data = await res.json();
      const docs = data.documents || [];
      select.innerHTML = '<option value="">-- Select Document --</option>' + docs.map(d => `
        <option value="${d.document_id}">#${d.document_id} - ${d.title} (${d.file_name})</option>
      `).join('');
    }
  } catch (e) {}
}

async function loadUsersForSharing() {
  const select = document.getElementById('shareUserIdSelect');
  if (!select) return;

  try {
    const res = await apiFetch('/api/users');
    if (res && res.ok) {
      const data = await res.json();
      const users = data.users || [];
      select.innerHTML = '<option value="">-- Select Recipient User --</option>' + users.map(u => `
        <option value="${u.user_id}">#${u.user_id} - ${u.name} (${u.email}) [${u.role}]</option>
      `).join('');
    }
  } catch (e) {}
}

// Load Categories into dropdown helper
async function loadCategoriesDropdown(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;

  try {
    const res = await apiFetch('/api/categories');
    if (res && res.ok) {
      const { categories } = await res.json();
      const firstOption = select.options[0] ? select.options[0].outerHTML : '<option value="">Select Category</option>';
      select.innerHTML = firstOption + categories.map(c => `
        <option value="${c.category_id}">${c.category_name}</option>
      `).join('');
    }
  } catch (e) {}
}

// ==========================================================================
// Modal Helpers
// ==========================================================================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Close modals when clicking overlay
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
    document.body.style.overflow = '';
  }
});

// ==========================================================================
// Landing Page Controller (index.html / Homepage)
// ==========================================================================
function switchLandingTab(tabName) {
  // Update buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  if (event && event.currentTarget) {
    event.currentTarget.classList.add('active');
  }

  // Update tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  const targetTab = document.getElementById(`tab-${tabName}`);
  if (targetTab) {
    targetTab.classList.add('active');
  }
}

async function initLandingPage() {
  const landingStatUsers = document.getElementById('landingStatUsers');
  if (!landingStatUsers) return;

  // 1. Fetch live stats
  try {
    const statsRes = await apiFetch('/api/stats');
    if (statsRes && statsRes.ok) {
      const statsData = await statsRes.json();
      if (statsData.success && statsData.stats) {
        document.getElementById('landingStatUsers').textContent = statsData.stats.totalUsers;
        document.getElementById('landingStatCategories').textContent = statsData.stats.totalCategories;
        document.getElementById('landingStatDocuments').textContent = statsData.stats.totalDocuments;
        document.getElementById('landingStatAccess').textContent = statsData.stats.totalAccess;
      }
    }
  } catch (e) {
    console.error('Error fetching landing stats:', e);
  }

  // 2. Fetch Users
  try {
    const uRes = await apiFetch('/api/users');
    if (uRes && uRes.ok) {
      const uData = await uRes.json();
      const users = uData.users || [];
      const badge = document.getElementById('landingUsersCount');
      if (badge) badge.textContent = users.length;
      const tbody = document.getElementById('landingUsersTableBody');
      if (tbody) {
        if (users.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No users found in MySQL table users</td></tr>';
        } else {
          tbody.innerHTML = users.map(u => `
            <tr>
              <td><strong>#${u.user_id}</strong></td>
              <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div class="user-avatar" style="width: 28px; height: 28px; font-size: 11px;">${u.name.charAt(0).toUpperCase()}</div>
                  <span style="font-weight: 600;">${u.name}</span>
                </div>
              </td>
              <td><code>${u.email}</code></td>
              <td>
                <span class="badge" style="background-color: ${u.role === 'admin' ? '#eef2ff' : '#f1f5f9'}; color: ${u.role === 'admin' ? '#4338ca' : '#475569'}; font-weight: 700;">
                  ${u.role.toUpperCase()}
                </span>
              </td>
              <td style="text-align: right;">
                <a href="/users.html" class="btn btn-outline btn-sm" style="font-size: 11px; padding: 4px 10px;">
                  Manage <i class="fas fa-arrow-right"></i>
                </a>
              </td>
            </tr>
          `).join('');
        }
      }
    }
  } catch (e) {
    console.error('Error loading landing users:', e);
  }

  // 3. Fetch Categories
  try {
    const cRes = await apiFetch('/api/categories');
    if (cRes && cRes.ok) {
      const cData = await cRes.json();
      const cats = cData.categories || [];
      const badge = document.getElementById('landingCategoriesCount');
      if (badge) badge.textContent = cats.length;
      const tbody = document.getElementById('landingCategoriesTableBody');
      if (tbody) {
        if (cats.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No categories found in MySQL table categories</td></tr>';
        } else {
          tbody.innerHTML = cats.map(c => `
            <tr>
              <td><strong>#${c.category_id}</strong></td>
              <td style="font-weight: 600;">${c.category_name}</td>
              <td style="color: var(--text-muted); font-size: 13px;">${c.description || 'No description'}</td>
              <td>
                <span class="badge" style="background-color: #e0f2fe; color: #0369a1; font-weight: 700;">
                  ${c.document_count || 0} Docs
                </span>
              </td>
              <td style="text-align: right;">
                <a href="/categories.html" class="btn btn-outline btn-sm" style="font-size: 11px; padding: 4px 10px;">
                  Manage <i class="fas fa-arrow-right"></i>
                </a>
              </td>
            </tr>
          `).join('');
        }
      }
    }
  } catch (e) {
    console.error('Error loading landing categories:', e);
  }

  // 4. Fetch Documents
  try {
    const dRes = await apiFetch('/api/documents');
    if (dRes && dRes.ok) {
      const dData = await dRes.json();
      const docs = dData.documents || [];
      const badge = document.getElementById('landingDocumentsCount');
      if (badge) badge.textContent = docs.length;
      const tbody = document.getElementById('landingDocumentsTableBody');
      if (tbody) {
        if (docs.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No documents found in MySQL table documents</td></tr>';
        } else {
          tbody.innerHTML = docs.map(d => `
            <tr>
              <td><strong>#${d.document_id}</strong></td>
              <td style="font-weight: 600; color: var(--text-main);">${d.title}</td>
              <td><i class="fas fa-user-circle" style="color: #64748b;"></i> ${d.owner_name}</td>
              <td>
                <span class="badge" style="background-color: #f1f5f9; color: #334155;">
                  ${d.category_name}
                </span>
              </td>
              <td>
                <span class="badge badge-success">${d.status || 'Active'}</span>
              </td>
              <td style="text-align: right;">
                <a href="/documents.html" class="btn btn-outline btn-sm" style="font-size: 11px; padding: 4px 10px;">
                  Manage <i class="fas fa-arrow-right"></i>
                </a>
              </td>
            </tr>
          `).join('');
        }
      }
    }
  } catch (e) {
    console.error('Error loading landing documents:', e);
  }

  // 5. Fetch Access Records
  try {
    const aRes = await apiFetch('/api/access');
    if (aRes && aRes.ok) {
      const aData = await aRes.json();
      const records = aData.records || [];
      const badge = document.getElementById('landingAccessCount');
      if (badge) badge.textContent = records.length;
      const tbody = document.getElementById('landingAccessTableBody');
      if (tbody) {
        if (records.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No access records found in MySQL table document_access</td></tr>';
        } else {
          tbody.innerHTML = records.map(a => `
            <tr>
              <td><strong>#${a.access_id}</strong></td>
              <td style="font-weight: 600;">${a.document_title}</td>
              <td><i class="fas fa-user" style="color: #64748b;"></i> ${a.user_name}</td>
              <td>
                <span class="badge" style="background-color: ${a.permission === 'download' ? '#dcfce7' : '#e0e7ff'}; color: ${a.permission === 'download' ? '#15803d' : '#3730a3'}; font-weight: 700;">
                  ${a.permission === 'download' ? 'View & Download' : 'View Only'}
                </span>
              </td>
              <td style="font-size: 12px; color: var(--text-muted);">${formatDate(a.granted_date)}</td>
              <td style="text-align: right;">
                <a href="/access.html" class="btn btn-outline btn-sm" style="font-size: 11px; padding: 4px 10px;">
                  Manage <i class="fas fa-arrow-right"></i>
                </a>
              </td>
            </tr>
          `).join('');
        }
      }
    }
  } catch (e) {
    console.error('Error loading landing access:', e);
  }
}

// ==========================================================================
// DOM Ready Controller
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  setupSidebarToggle();
  setupLogout();

  await checkAuth();

  const path = window.location.pathname.toLowerCase();

  if (path.includes('dashboard.html')) {
    initDashboard();
  } else if (path.includes('users.html')) {
    initUsersPage();
  } else if (path.includes('categories.html')) {
    initCategoriesPage();
  } else if (path.includes('documents.html')) {
    initDocumentsPage();
  } else if (path.includes('access.html')) {
    initAccessPage();
  } else if (path === '/' || path.includes('index.html') || path === '') {
    initLandingPage();
  }
});
